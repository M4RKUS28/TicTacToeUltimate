import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../services/ApiService';
import {
  boardVariants,
  cellVariants,
  gameBoardVariants,
  xMarkVariants,
  oMarkVariants,
  buttonVariants,
  textVariants,
  winnerVariants,
  winLineVariants,
  menuVariants,
  containerVariants
} from '../utils/AnimationVariants';

// Utility functions
const createEmptyUltimateBoard = () => {
  return Array(9).fill(null).map(() => 
    Array(3).fill(null).map(() => Array(3).fill(null))
  );
};

const isBoardFull = (board) => {
  return board.every(row => row.every(cell => cell !== null));
};

const checkWinner = (board) => {
  // Check rows
  for (let i = 0; i < 3; i++) {
    if (board[i][0] && board[i][0] === board[i][1] && board[i][1] === board[i][2]) {
      return board[i][0];
    }
  }

  // Check columns
  for (let i = 0; i < 3; i++) {
    if (board[0][i] && board[0][i] === board[1][i] && board[1][i] === board[2][i]) {
      return board[0][i];
    }
  }

  // Check diagonals
  if (board[0][0] && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
    return board[0][0];
  }
  if (board[0][2] && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
    return board[0][2];
  }

  return null;
};

const getMacroBoard = (boardWinners) => {
  return [
    [boardWinners[0], boardWinners[1], boardWinners[2]],
    [boardWinners[3], boardWinners[4], boardWinners[5]],
    [boardWinners[6], boardWinners[7], boardWinners[8]]
  ];
};

const isValidMove = (gameState, move) => {
  const { boardIndex, row, col } = move;
  const { boards, nextBoard, boardWinners } = gameState;

  // Check if the cell is already filled
  if (boards[boardIndex][row][col] !== null) {
    return false;
  }

  // Check if this board already has a winner
  if (boardWinners[boardIndex] !== null) {
    return false;
  }

  // Check if we're restricted to a specific board and this isn't it
  if (nextBoard !== null && nextBoard !== boardIndex) {
    return false;
  }

  return true;
};

const applyMove = (gameState, move) => {
  const { boardIndex, row, col, player } = move;
  const updatedGameState = { ...gameState };
  
  // Make a deep copy of the boards
  updatedGameState.boards = JSON.parse(JSON.stringify(gameState.boards));
  
  // Apply the move
  updatedGameState.boards[boardIndex][row][col] = player;
  
  // Check if this board now has a winner
  const boardWinner = checkWinner(updatedGameState.boards[boardIndex]);
  
  if (boardWinner || isBoardFull(updatedGameState.boards[boardIndex])) {
    // Update board winners
    updatedGameState.boardWinners = [...gameState.boardWinners];
    updatedGameState.boardWinners[boardIndex] = boardWinner;
    
    // Check if the game now has a winner
    const macroBoard = getMacroBoard(updatedGameState.boardWinners);
    updatedGameState.winner = checkWinner(macroBoard);
    
    if (updatedGameState.winner || updatedGameState.boardWinners.every(winner => winner !== null || winner === 'draw')) {
      updatedGameState.gameOver = true;
    }
  }
  
  // Determine the next board (corresponds to the cell position)
  const nextBoardIndex = row * 3 + col;
  
  // If the next board already has a winner or is full, allow any board
  if (updatedGameState.boardWinners[nextBoardIndex] !== null || isBoardFull(updatedGameState.boards[nextBoardIndex])) {
    updatedGameState.nextBoard = null;
  } else {
    updatedGameState.nextBoard = nextBoardIndex;
  }
  
  // Switch player
  updatedGameState.currentPlayer = player === 'X' ? 'O' : 'X';
  
  return updatedGameState;
};

// Initial game state
const initialGameState = {
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
const UltimateTicTacToeGame = () => {
  // Game state
  const [gameState, setGameState] = useState({ ...initialGameState });
  const [aiThinking, setAiThinking] = useState(false);
  const [showWinAnimation, setShowWinAnimation] = useState(false);
  
  // API state
  const [lobbyInfo, setLobbyInfo] = useState(null);
  const [playerInfo, setPlayerInfo] = useState(null);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [lastApiCheck, setLastApiCheck] = useState(null);
  
  // Refs
  const animatingRef = useRef(false);
  const pollIntervalRef = useRef(null);
  
  const { lobbyId } = useParams();
  const navigate = useNavigate();

  // Initialize game and lobby info
  useEffect(() => {
    const playerId = localStorage.getItem('playerId');
    const playerName = localStorage.getItem('playerName');
    
    if (!lobbyId || !playerId || !playerName) {
      // Redirect to lobby page if missing info
      navigate('/');
      return;
    }
    
    setPlayerInfo({ id: playerId, name: playerName });
    
    // Fetch lobby and game state
    const fetchGameData = async () => {
      try {
        // Fetch initial game state
        const gameStateData = await apiService.getGameState(lobbyId);
        
        if (gameStateData) {
          // Convert API game state to our format
          const convertedState = convertApiGameState(gameStateData);
          setGameState(prevState => ({
            ...prevState,
            ...convertedState,
            gameStarted: true
          }));
          
          // Check if waiting for opponent
          const isWaiting = gameStateData.status === 'WAITING_FOR_PLAYER';
          setWaitingForOpponent(isWaiting);
          
          if (isWaiting) {
            setLoadingMessage('Waiting for another player to join...');
          } else {
            // Start polling for game updates
            startPolling(lobbyId);
          }
          
          setLastApiCheck(Date.now());
        } else {
          // Game not found
          alert('Game not found');
          navigate('/');
        }
      } catch (error) {
        console.error('Error fetching game data:', error);
        alert('Failed to fetch game data');
        navigate('/');
      }
    };
    
    fetchGameData();
    
    // Set up polling to check for opponent joining
    const opponentCheckInterval = setInterval(async () => {
      if (waitingForOpponent) {
        const gameStateData = await apiService.getGameState(lobbyId);
        
        if (gameStateData && gameStateData.status === 'ACTIVE') {
          setWaitingForOpponent(false);
          
          // Start polling for game updates once opponent has joined
          startPolling(lobbyId);
        }
      }
    }, 3000);
    
    return () => {
      clearInterval(opponentCheckInterval);
      
      // Clear the polling interval on unmount
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [lobbyId, navigate, waitingForOpponent]);
  
  // Start polling for game state updates
  const startPolling = (lobbyId) => {
    // Clear any existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    
    // Set up polling interval
    pollIntervalRef.current = setInterval(async () => {
      try {
        const gameStateData = await apiService.getGameState(lobbyId);
        
        if (gameStateData) {
          // Check if the game state has been updated since last check
          if (gameStateData.last_updated > lastApiCheck) {
            // Convert API game state to our format
            const convertedState = convertApiGameState(gameStateData);
            
            setGameState(prevState => ({
              ...prevState,
              ...convertedState
            }));
            
            // Set win animation if game is over
            if (convertedState.winner || convertedState.gameOver) {
              setShowWinAnimation(true);
            }
            
            setLastApiCheck(Date.now());
          }
        }
      } catch (error) {
        console.error('Error polling game state:', error);
      }
    }, 1000); // Poll every second
  };
  
  // Convert API game state to our format
  const convertApiGameState = (apiState) => {
    // This function would need to be customized based on your API's response structure
    // Here's a simplified example:
    const convertedState = {
      boards: [...initialGameState.boards], // Start with empty boards
      currentPlayer: apiState.current_player === 1 ? 'X' : 'O',
      nextBoard: apiState.next_board,
      winner: apiState.winner ? (apiState.winner === 1 ? 'X' : 'O') : null,
      boardWinners: apiState.board_winners ? 
        apiState.board_winners.map(w => w === 0 ? null : (w === 1 ? 'X' : 'O')) : 
        Array(9).fill(null),
      gameOver: apiState.status === 'FINISHED'
    };
    
    // Fill in the board state from the API's board representation
    if (apiState.board) {
      for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 3; j++) {
          for (let k = 0; k < 3; k++) {
            const value = apiState.board[i][j][k];
            convertedState.boards[i][j][k] = value === 0 ? null : (value === 1 ? 'X' : 'O');
          }
        }
      }
    }
    
    return convertedState;
  };
  
  // Handle cell click
  const handleCellClick = useCallback((boardIndex, row, col) => {
    if (animatingRef.current || aiThinking || waitingForOpponent) return;
    
    const { currentPlayer, gameOver } = gameState;
    
    // Check if game is over
    if (gameOver) {
      return;
    }
    
    // Determine player number based on lobby info and player info
    let isPlayerTurn = true;
    if (lobbyInfo && playerInfo) {
      const player = lobbyInfo.players.find(p => p.id === playerInfo.id);
      const playerNumber = player ? player.player_number : null;
      
      // Check if it's this player's turn
      isPlayerTurn = 
        (playerNumber === 1 && currentPlayer === 'X') || 
        (playerNumber === 2 && currentPlayer === 'O');
      
      if (!isPlayerTurn) {
        alert("It's not your turn!");
        return;
      }
    }
    
    // Create move object
    const move = {
      boardIndex,
      row,
      col,
      player: currentPlayer
    };
    
    // Validate move
    if (!isValidMove(gameState, move)) {
      return;
    }
    
    // Calculate global row and col for the API
    const globalRow = Math.floor(boardIndex / 3) * 3 + row;
    const globalCol = (boardIndex % 3) * 3 + col;
    
    // Make the move locally (optimistic update)
    animatingRef.current = true;
    const updatedState = applyMove(gameState, move);
    setGameState(updatedState);
    
    // Send the move to the API
    apiService.makeMove(lobbyId, playerInfo.id, [globalRow, globalCol])
      .then(response => {
        // The next poll will update the game state
        setLastApiCheck(Date.now() - 2000); // Force next poll to update
      })
      .catch(error => {
        console.error('Failed to make move:', error);
        alert('Failed to make move. Please try again.');
        
        // Revert to previous state
        setGameState(gameState);
      })
      .finally(() => {
        // Animation delay
        setTimeout(() => {
          animatingRef.current = false;
        }, 500);
      });
    
  }, [gameState, aiThinking, waitingForOpponent, lobbyId, lobbyInfo, playerInfo]);
  
  // Reset the current game
  const resetGame = () => {
    // Reset game locally
    setShowWinAnimation(false);
    setAiThinking(false);
    animatingRef.current = false;
    
    setGameState(prev => ({
      ...initialGameState,
      gameMode: prev.gameMode,
      gameStarted: true
    }));
    
    // API call to reset the game
    // This would depend on your API implementation
    alert('Game reset');
  };
  
  // Return to main menu
  const goToMenu = () => {
    // Clear local storage
    localStorage.removeItem('playerId');
    localStorage.removeItem('playerName');
    localStorage.removeItem('lobbyId');
    
    // Clear polling interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    
    // Reset state
    setShowWinAnimation(false);
    setAiThinking(false);
    animatingRef.current = false;
    setLobbyInfo(null);
    setPlayerInfo(null);
    setWaitingForOpponent(false);
    
    // Navigate to lobby page
    navigate('/');
  };
  
  // Check if a cell is playable
  const isCellPlayable = (boardIndex, row, col) => {
    if (waitingForOpponent) return false;
    
    const move = { boardIndex, row, col };
    let isPlayable = isValidMove(gameState, move);
    
    // Check if it's this player's turn
    if (lobbyInfo && playerInfo) {
      const player = lobbyInfo.players.find(p => p.id === playerInfo.id);
      const playerNumber = player ? player.player_number : null;
      
      const isPlayerTurn = 
        (playerNumber === 1 && gameState.currentPlayer === 'X') || 
        (playerNumber === 2 && gameState.currentPlayer === 'O');
      
      isPlayable = isPlayable && isPlayerTurn;
    }
    
    return isPlayable;
  };
  
  // Render a single cell in a small board
  const renderCell = (boardIndex, row, col) => {
    const cellValue = gameState.boards[boardIndex][row][col];
    const playable = isCellPlayable(boardIndex, row, col);
    
    return (
      <motion.div
        className={`cell ${playable ? 'playable' : ''}`}
        variants={cellVariants}
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
                  variants={xMarkVariants}
                />
                <motion.path
                  d="M 19 5 L 5 19"
                  stroke="#FF5252"
                  strokeWidth="3"
                  strokeLinecap="round"
                  variants={xMarkVariants}
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
                  variants={oMarkVariants}
                />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };
  
  // Render a win line for a small board
  const renderWinLine = (boardIndex) => {
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
          <motion.div className="win-line horizontal" custom={i} variants={winLineVariants}>
            <svg width="100%" height="100%" viewBox="0 0 100 100">
              <motion.line
                x1="10"
                y1={(i * 33.33) + 16.67}
                x2="90"
                y2={(i * 33.33) + 16.67}
                stroke={winner === 'X' ? '#FF5252' : '#4CAF50'}
                strokeWidth="3"
                strokeLinecap="round"
                variants={winLineVariants}
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
          <motion.div className="win-line vertical" custom={i} variants={winLineVariants}>
            <svg width="100%" height="100%" viewBox="0 0 100 100">
              <motion.line
                x1={(i * 33.33) + 16.67}
                y1="10"
                x2={(i * 33.33) + 16.67}
                y2="90"
                stroke={winner === 'X' ? '#FF5252' : '#4CAF50'}
                strokeWidth="3"
                strokeLinecap="round"
                variants={winLineVariants}
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
        <motion.div className="win-line diagonal-1" variants={winLineVariants}>
          <svg width="100%" height="100%" viewBox="0 0 100 100">
            <motion.line
              x1="10"
              y1="10"
              x2="90"
              y2="90"
              stroke={winner === 'X' ? '#FF5252' : '#4CAF50'}
              strokeWidth="3"
              strokeLinecap="round"
              variants={winLineVariants}
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
        <motion.div className="win-line diagonal-2" variants={winLineVariants}>
          <svg width="100%" height="100%" viewBox="0 0 100 100">
            <motion.line
              x1="90"
              y1="10"
              x2="10"
              y2="90"
              stroke={winner === 'X' ? '#FF5252' : '#4CAF50'}
              strokeWidth="3"
              strokeLinecap="round"
              variants={winLineVariants}
            />
          </svg>
        </motion.div>
      );
    }
    
    return null;
  };
  
  // Render a small board
  const renderBoard = (boardIndex) => {
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
        variants={boardVariants}
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
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {waitingForOpponent ? (
          <motion.div
            className="waiting-message"
            variants={textVariants}
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
              variants={gameBoardVariants}
            >
              {Array(9).fill(null).map((_, index) => (
                <div key={`board-${index}`} className="board-wrapper">
                  {renderBoard(index)}
                </div>
              ))}
              
              {showWinAnimation && gameState.winner && (
                <motion.div
                  className="game-winner"
                  variants={winnerVariants}
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
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                    >
                      Play Again
                    </motion.button>
                    <motion.button
                      className="menu-btn"
                      onClick={goToMenu}
                      variants={buttonVariants}
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
                  variants={winnerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <h2>It's a Draw!</h2>
                  <div className="winner-buttons">
                    <motion.button
                      className="play-again-btn"
                      onClick={resetGame}
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                    >
                      Play Again
                    </motion.button>
                    <motion.button
                      className="menu-btn"
                      onClick={goToMenu}
                      variants={buttonVariants}
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
              variants={textVariants}
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
                    Players: {lobbyInfo.players.map(p => p.name).join(' vs ')}
                  </p>
                </div>
              )}
              
              <div className="connection-status">
                <p>
                  Status: <span className={!waitingForOpponent ? 'connected' : 'disconnected'}>
                    {!waitingForOpponent ? 'Active' : 'Waiting'}
                  </span>
                </p>
              </div>
              
              <div className="game-controls">
                <motion.button
                  className="reset-btn"
                  onClick={resetGame}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  disabled={waitingForOpponent}
                >
                  Reset Game
                </motion.button>
                <motion.button
                  className="menu-btn"
                  onClick={goToMenu}
                  variants={buttonVariants}
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
        variants={menuVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <motion.h1
          className="game-title"
          variants={textVariants}
        >
          Ultimate Tic Tac Toe
        </motion.h1>
        
        <motion.div
          className="menu-buttons"
          variants={containerVariants}
        >
          <motion.button
            className="menu-btn player-vs-player"
            onClick={() => navigate('/')}
            variants={buttonVariants}
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