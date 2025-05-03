import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState, GameMode, Move, Player } from '../types/GameTypes';
import { 
  createEmptyUltimateBoard, 
  checkWinner, 
  isBoardFull, 
  applyMove,
  isValidMove,
  coordinatesToIndex,
  getMacroBoard
} from '../utils/GameUtils';
import { webSocketService } from '../services/WebSocketService';
import apiService from '../services/ApiService';
import { useParams, useNavigate } from 'react-router-dom';


// Initial game state
const initialGameState: GameState = {
  boards: createEmptyUltimateBoard(),
  currentBoard: null,
  nextBoard: null,
  winner: null,
  boardWinners: Array(9).fill(null),
  currentPlayer: 'X',
  gameMode: 'player-vs-player',
  gameStarted: false,
  gameOver: false
};

// Component for the Ultimate Tic Tac Toe game
const UltimateTicTacToeGame: React.FC = () => {
  // Game state
  const [gameState, setGameState] = useState<GameState>({ ...initialGameState });
  const [aiThinking, setAiThinking] = useState<boolean>(false);
  const [showWinAnimation, setShowWinAnimation] = useState<boolean>(false);
  
  // WebSocket and lobby state
  const [connected, setConnected] = useState<boolean>(false);
  const [lobbyInfo, setLobbyInfo] = useState<any>(null);
  const [playerInfo, setPlayerInfo] = useState<{ id: string, name: string } | null>(null);
  const [waitingForOpponent, setWaitingForOpponent] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  
  // Refs
  const animatingRef = useRef<boolean>(false);
  
  const { lobbyId } = useParams<{ lobbyId: string }>();
  const navigate = useNavigate();

  // Initialize WebSocket connection and lobby info
  useEffect(() => {
    const playerId = localStorage.getItem('playerId');
    const playerName = localStorage.getItem('playerName');
    
    if (!lobbyId || !playerId || !playerName) {
      // Redirect to lobby page if missing info
      navigate('/');
      return;
    }
    
    setPlayerInfo({ id: playerId, name: playerName });
    
    // Fetch lobby info
    const fetchLobbyInfo = async () => {
      const lobby = await apiService.getLobby(lobbyId);
      if (lobby) {
        setLobbyInfo(lobby);
        
        // Set game mode based on lobby type
        let gameMode: GameMode = 'player-vs-player';
        
        if (lobby.lobby_type === 'PLAYER_VS_BOT') {
          gameMode = 'ai-vs-player';
          setLoadingMessage('Waiting for a bot to join...');
        } else if (lobby.lobby_type === 'BOT_VS_BOT') {
          gameMode = 'ai-vs-ai';
          setLoadingMessage('Waiting for bots to start playing...');
        }
        
        // Check if we're waiting for an opponent
        if (lobby.players.length < 2) {
          setWaitingForOpponent(true);
          if (gameMode === 'player-vs-player') {
            setLoadingMessage('Waiting for another player to join...');
          }
        }
        
        setGameState(prev => ({
          ...prev,
          gameMode,
          gameStarted: true
        }));
      } else {
        // Lobby not found, redirect to main menu
        alert('Lobby not found');
        navigate('/');
      }
    };
    
    fetchLobbyInfo();
    
    // Set up polling to check lobby status
    const pollInterval = setInterval(async () => {
      if (waitingForOpponent) {
        const updatedLobby = await apiService.getLobby(lobbyId);
        if (updatedLobby && updatedLobby.players.length === 2) {
          setWaitingForOpponent(false);
          setLobbyInfo(updatedLobby);
          
          // Start the connection once opponent has joined
          connectToWebSocket(lobbyId, playerId);
        }
      }
    }, 3000);
    
    // Connect to WebSocket if lobby is already full
    if (lobbyInfo && lobbyInfo.players.length === 2) {
      connectToWebSocket(lobbyId, playerId);
    }
    
    return () => {
      clearInterval(pollInterval);
      webSocketService.disconnect();
    };
  }, [lobbyId, navigate, lobbyInfo, waitingForOpponent]);
  
  // Function to connect to WebSocket
  const connectToWebSocket = async (lobbyId: string, playerId: string) => {
    const success = await webSocketService.connect(lobbyId, playerId);
    setConnected(success);
    
    if (success) {
      // Add message listener
      const unsubscribe = webSocketService.addMessageListener((message) => {
        // Handle incoming messages
        if (message.last_move) {
          // Apply the move
          const [row, col] = message.last_move;
          
          // Calculate board index and cell
          const boardIndex = Math.floor(row / 3) * 3 + Math.floor(col / 3);
          const cellRow = row % 3;
          const cellCol = col % 3;
          
          // Create move object
          const move: Move = {
            boardIndex,
            row: cellRow,
            col: cellCol,
            player: gameState.currentPlayer
          };
          
          // Apply the move
          const updatedState = applyMove(gameState, move);
          setGameState(updatedState);
        } else if (typeof message === 'string') {
          // Game over message
          if (message.startsWith('Winner:') || message === 'Draw') {
            setShowWinAnimation(true);
          }
        }
      });
      
      return unsubscribe;
    } else {
      alert('Failed to connect to game server. Please try again.');
      navigate('/');
    }
  };
  
  // Handle cell click
  const handleCellClick = useCallback((boardIndex: number, row: number, col: number) => {
    if (animatingRef.current || aiThinking || !connected || waitingForOpponent) return;
    
    const { gameMode, currentPlayer, gameOver } = gameState;
    
    // Check if it's AI's turn or game is over
    if (gameOver ||
        (gameMode === 'ai-vs-player' && currentPlayer === 'O') ||
        gameMode === 'ai-vs-ai') {
      return;
    }
    
    // Determine player number based on lobby info and player info
    if (lobbyInfo && playerInfo) {
      const player = lobbyInfo.players.find((p: any) => p.id === playerInfo.id);
      const playerNumber = player ? player.player_number : null;
      
      // Check if it's this player's turn
      const isPlayerTurn = 
        (playerNumber === 1 && currentPlayer === 'X') || 
        (playerNumber === 2 && currentPlayer === 'O');
      
      if (!isPlayerTurn) {
        alert("It's not your turn!");
        return;
      }
    }
    
    // Create move object
    const move: Move = {
      boardIndex,
      row,
      col,
      player: currentPlayer
    };
    
    // Validate move
    if (!isValidMove(gameState, move)) {
      return;
    }
    
    // Calculate global row and col for the backend
    const globalRow = Math.floor(boardIndex / 3) * 3 + row;
    const globalCol = (boardIndex % 3) * 3 + col;
    
    // Send the move to the WebSocket
    webSocketService.sendMove({
      boardIndex,
      row: globalRow,
      col: globalCol,
      player: currentPlayer
    });
    
    // Apply the move locally - this will be overridden by server response
    animatingRef.current = true;
    const updatedState = applyMove(gameState, move);
    
    // Update game state
    setGameState(updatedState);
    
    // Set win animation if game is over
    if (updatedState.winner) {
      setShowWinAnimation(true);
    }
    
    // Animation delay
    setTimeout(() => {
      animatingRef.current = false;
    }, 500);
  }, [gameState, aiThinking, connected, waitingForOpponent, lobbyInfo, playerInfo]);
  
  // Start a new game
  const startGame = (mode: GameMode) => {
    setShowWinAnimation(false);
    setAiThinking(false);
    animatingRef.current = false;
    
    setGameState({
      ...initialGameState,
      gameMode: mode,
      gameStarted: true
    });
  };
  
  // Reset the current game
  const resetGame = () => {
    if (!connected) {
      alert('Not connected to server');
      return;
    }
    
    // Ask the server to reset the game
    webSocketService.sendMove({
      boardIndex: -1, // Special value for reset
      row: -1,
      col: -1,
      player: gameState.currentPlayer
    });
    
    // Local reset
    setShowWinAnimation(false);
    setAiThinking(false);
    animatingRef.current = false;
    
    setGameState(prev => ({
      ...initialGameState,
      gameMode: prev.gameMode,
      gameStarted: true
    }));
  };
  
  // Return to main menu
  const goToMenu = () => {
    // Disconnect WebSocket
    webSocketService.disconnect();
    
    // Clear local storage
    localStorage.removeItem('playerId');
    localStorage.removeItem('playerName');
    localStorage.removeItem('lobbyId');
    
    // Reset state
    setShowWinAnimation(false);
    setAiThinking(false);
    animatingRef.current = false;
    setConnected(false);
    setLobbyInfo(null);
    setPlayerInfo(null);
    setWaitingForOpponent(false);
    
    // Navigate to lobby page
    navigate('/');
  };
  
  // Check if a cell is playable
  const isCellPlayable = (boardIndex: number, row: number, col: number): boolean => {
    if (!connected || waitingForOpponent) return false;
    
    const move: Omit<Move, 'player'> = { boardIndex, row, col };
    let isPlayable = isValidMove(gameState, move);
    
    // Check if it's this player's turn
    if (lobbyInfo && playerInfo) {
      const player = lobbyInfo.players.find((p: any) => p.id === playerInfo.id);
      const playerNumber = player ? player.player_number : null;
      
      const isPlayerTurn = 
        (playerNumber === 1 && gameState.currentPlayer === 'X') || 
        (playerNumber === 2 && gameState.currentPlayer === 'O');
      
      isPlayable = isPlayable && isPlayerTurn;
    }
    
    return isPlayable;
  };
  
  // Render a single cell in a small board
  const renderCell = (boardIndex: number, row: number, col: number) => {
    const cellValue = gameState.boards[boardIndex][row][col];
    const playable = isCellPlayable(boardIndex, row, col);
    
    return (
      <motion.div
        className={`cell ${playable ? 'playable' : ''}`}
        onClick={() => handleCellClick(boardIndex, row, col)}
        whileHover={playable ? 'hover' : undefined}
        whileTap={playable ? 'tap' : undefined}
        custom={cellValue}
      >
        <AnimatePresence mode="wait">
          {cellValue === 'X' && (
            <motion.div
              key={`x-${boardIndex}-${row}-${col}`}
              className="mark x-mark"
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <svg viewBox="0 0 24 24" width="100%" height="100%">
                <motion.path
                  d="M 5 5 L 19 19"
                  stroke="#FF5252"
                  strokeWidth="3"
                  strokeLinecap="round"

                  />
                <motion.path
                  d="M 19 5 L 5 19"
                  stroke="#FF5252"
                  strokeWidth="3"
                  strokeLinecap="round"
                  transition={{ delay: 0.1 }}
                />
              </svg>
            </motion.div>
          )}
          
          {cellValue === 'O' && (
            <motion.div
              key={`o-${boardIndex}-${row}-${col}`}
              className="mark o-mark"
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <svg viewBox="0 0 24 24" width="100%" height="100%">
                <motion.circle
                  cx="12"
                  cy="12"
                  r="7"
                  fill="none"
                  stroke="#4CAF50"
                  strokeWidth="3"
                />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };
  
  // Render a win line for a small board
  const renderWinLine = (boardIndex: number) => {
    const { boards, boardWinners } = gameState;
    const winner = boardWinners[boardIndex];
    
    if (!winner) return null;
    
    // Determine the winning line (row, column, or diagonal)
    
    // Check rows
    for (let i = 0; i < 3; i++) {
      if (boards[boardIndex][i][0] === winner && 
          boards[boardIndex][i][1] === winner && 
          boards[boardIndex][i][2] === winner) {
        return (
          <motion.div className="win-line horizontal" custom={i} >
            <svg width="100%" height="100%" viewBox="0 0 100 100">
              <motion.line
                x1="10"
                y1={(i * 33.33) + 16.67}
                x2="90"
                y2={(i * 33.33) + 16.67}
                stroke={winner === 'X' ? '#FF5252' : '#4CAF50'}
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </motion.div>
        );
      }
    }
    
    // Check columns
    for (let i = 0; i < 3; i++) {
      if (boards[boardIndex][0][i] === winner && 
          boards[boardIndex][1][i] === winner && 
          boards[boardIndex][2][i] === winner) {
        return (
          <motion.div className="win-line vertical" custom={i} >
            <svg width="100%" height="100%" viewBox="0 0 100 100">
              <motion.line
                x1={(i * 33.33) + 16.67}
                y1="10"
                x2={(i * 33.33) + 16.67}
                y2="90"
                stroke={winner === 'X' ? '#FF5252' : '#4CAF50'}
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </motion.div>
        );
      }
    }
    
    // Check diagonal (top-left to bottom-right)
    if (boards[boardIndex][0][0] === winner && 
        boards[boardIndex][1][1] === winner && 
        boards[boardIndex][2][2] === winner) {
      return (
        <motion.div className="win-line diagonal-1" >
          <svg width="100%" height="100%" viewBox="0 0 100 100">
            <motion.line
              x1="10"
              y1="10"
              x2="90"
              y2="90"
              stroke={winner === 'X' ? '#FF5252' : '#4CAF50'}
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </motion.div>
      );
    }
    
    // Check diagonal (top-right to bottom-left)
    if (boards[boardIndex][0][2] === winner && 
        boards[boardIndex][1][1] === winner && 
        boards[boardIndex][2][0] === winner) {
      return (
        <motion.div className="win-line diagonal-2" >
          <svg width="100%" height="100%" viewBox="0 0 100 100">
            <motion.line
              x1="90"
              y1="10"
              x2="10"
              y2="90"
              stroke={winner === 'X' ? '#FF5252' : '#4CAF50'}
              strokeWidth="3"
              strokeLinecap="round"
              
            />
          </svg>
        </motion.div>
      );
    }
    
    return null;
  };
  
  // Render a small board
  const renderBoard = (boardIndex: number) => {
    const { boardWinners, nextBoard } = gameState;
    const winner = boardWinners[boardIndex];
    const isActive = nextBoard === null || nextBoard === boardIndex || boardWinners[nextBoard] !== null;
    const isNextBoard = nextBoard === boardIndex && boardWinners[boardIndex] === null;
    
    // Board state for animation variants
    let boardState = 'visible';
    if (winner === 'X') boardState = 'won';
    else if (winner === 'O') boardState = 'lost';
    else if (winner === null && isBoardFull(gameState.boards[boardIndex])) boardState = 'draw';
    else if (isNextBoard) boardState = 'active';
    else if (!isActive) boardState = 'inactive';
    
    return (
      <motion.div 
        className={`board ${isActive ? 'active' : ''} ${isNextBoard ? 'next-board' : ''} ${winner ? `winner-${winner}` : ''}`}
        animate={boardState}
      >
        {winner ? (
          <motion.div 
            className={`board-winner winner-${winner}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 8 }}
          >
            {winner === 'X' ? (
              <svg viewBox="0 0 24 24" width="80%" height="80%">
                <motion.path
                  d="M 5 5 L 19 19"
                  stroke="#FF5252"
                  strokeWidth="3"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.4 }}
                />
                <motion.path
                  d="M 19 5 L 5 19"
                  stroke="#FF5252"
                  strokeWidth="3"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="80%" height="80%">
                <motion.circle
                  cx="12"
                  cy="12"
                  r="7"
                  fill="none"
                  stroke="#4CAF50"
                  strokeWidth="3"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5 }}
                />
              </svg>
            )}
          </motion.div>
        ) : (
          <div className="board-grid">
            {Array(3).fill(null).map((_, row) => (
              Array(3).fill(null).map((_, col) => (
                <div key={`cell-${boardIndex}-${row}-${col}`} className="cell-wrapper">
                  {renderCell(boardIndex, row, col)}
                </div>
              ))
            ))}
            {renderWinLine(boardIndex)}
          </div>
        )}
      </motion.div>
    );
  };
  
  // Render the ultimate game board
  const renderGameBoard = () => {
    return (
      <motion.div 
        className="game-container"
        
        initial="hidden"
        animate="visible"
      >
        {waitingForOpponent ? (
          <motion.div
            className="waiting-message"
            
            initial="hidden"
            animate="visible"
          >
            <h2>{loadingMessage}</h2>
            <div className="loading-spinner"></div>
          </motion.div>
        ) : (
          <>
            <motion.div
              className="ultimate-board"
              
            >
              {Array(9).fill(null).map((_, index) => (
                <div key={`board-${index}`} className="board-wrapper">
                  {renderBoard(index)}
                </div>
              ))}
              
              {showWinAnimation && gameState.winner && (
                <motion.div
                  className="game-winner"
                  
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <h2>
                    {gameState.winner === 'X' ? 'X Wins!' : 'O Wins!'}
                  </h2>
                  <div className="winner-buttons">
                    <motion.button
                      className="play-again-btn"
                      onClick={resetGame}
                      
                      whileHover="hover"
                      whileTap="tap"
                    >
                      Play Again
                    </motion.button>
                    <motion.button
                      className="menu-btn"
                      onClick={goToMenu}
                      
                      whileHover="hover"
                      whileTap="tap"
                    >
                      Main Menu
                    </motion.button>
                  </div>
                </motion.div>
              )}
              
              {gameState.gameOver && !gameState.winner && (
                <motion.div
                  className="game-winner"
                  
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <h2>It's a Draw!</h2>
                  <div className="winner-buttons">
                    <motion.button
                      className="play-again-btn"
                      onClick={resetGame}
                      
                      whileHover="hover"
                      whileTap="tap"
                    >
                      Play Again
                    </motion.button>
                    <motion.button
                      className="menu-btn"
                      onClick={goToMenu}
                      
                      whileHover="hover"
                      whileTap="tap"
                    >
                      Main Menu
                    </motion.button>
                  </div>
                </motion.div>
              )}
              
            </motion.div>
            
            <motion.div
              className="game-info"
              
            >
              <div className="current-player">
                <h3>Current Player: 
                  <span className={gameState.currentPlayer === 'X' ? 'x-text' : 'o-text'}>
                    {gameState.currentPlayer}
                  </span>
                  {aiThinking && <span className="thinking-indicator">AI is thinking...</span>}
                </h3>
              </div>
              
              <div className="game-mode">
                <h3>
                  Game Mode: {gameState.gameMode.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' vs ')}
                </h3>
              </div>
              
              {lobbyInfo && lobbyInfo.players && (
                <div className="player-info">
                  <p>
                    Players: {lobbyInfo.players.map((p: any) => p.name).join(' vs ')}
                  </p>
                </div>
              )}
              
              <div className="connection-status">
                <p>
                  Connection: <span className={connected ? 'connected' : 'disconnected'}>
                    {connected ? 'Connected' : 'Disconnected'}
                  </span>
                </p>
              </div>
              
              <div className="game-controls">
                <motion.button
                  className="reset-btn"
                  onClick={resetGame}
                  
                  whileHover="hover"
                  whileTap="tap"
                  disabled={!connected}
                >
                  Reset Game
                </motion.button>
                <motion.button
                  className="menu-btn"
                  onClick={goToMenu}
                  
                  whileHover="hover"
                  whileTap="tap"
                >
                  Main Menu
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </motion.div>
    );
  };
  
  // Render the main menu
  const renderMenu = () => {
    return (
      <motion.div
        className="menu-container"
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <motion.h1
          className="game-title"
          
        >
          Ultimate Tic Tac Toe
        </motion.h1>
        
        <motion.div
          className="menu-buttons"
          
        >
          <motion.button
            className="menu-btn player-vs-player"
            onClick={() => navigate('/')}
            
            whileHover="hover"
            whileTap="tap"
          >
            Back to Lobby
          </motion.button>
        </motion.div>
      </motion.div>
    );
  };
  
  // Main render
  return (
    <div className="ultimate-tic-tac-toe">
      <AnimatePresence mode="wait">
        {gameState.gameStarted ? renderGameBoard() : renderMenu()}
      </AnimatePresence>
    </div>
  );
};

export default UltimateTicTacToeGame;