import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState, GameMode, Move, Player } from '../types/GameTypes';
import { 
  createEmptyUltimateBoard, 
  checkWinner, 
  isBoardFull, 
  applyMove,
  getAIMove,
  isValidMove,
  coordinatesToIndex,
  getMacroBoard
} from '../utils/GameUtils';
import { createSocketService, SocketService } from '../services/SocketService';
import aiService from '../services/AIService';
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
  
  // Refs
  const socketRef = useRef<SocketService>(createSocketService());
  const animatingRef = useRef<boolean>(false);
  
  // Handle cell click
  const handleCellClick = useCallback((boardIndex: number, row: number, col: number) => {
    if (animatingRef.current || aiThinking) return;
    
    const { gameMode, currentPlayer, gameOver } = gameState;
    
    // Check if it's AI's turn or game is over
    if (gameOver ||
        (gameMode === 'ai-vs-player' && currentPlayer === 'O') ||
        gameMode === 'ai-vs-ai') {
      return;
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
    
    // Apply the move
    animatingRef.current = true;
    const updatedState = applyMove(gameState, move);
    
    // Emit the move to the socket
    socketRef.current.emit('makeMove', move);
    
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
  }, [gameState, aiThinking]);
  
  // Handle AI moves
  useEffect(() => {
    if (!gameState.gameStarted || gameState.gameOver || animatingRef.current) return;
    
    const { gameMode, currentPlayer } = gameState;
    
    // AI vs AI mode
    if (gameMode === 'ai-vs-ai') {
      setAiThinking(true);
      
      const timer = setTimeout(async () => {
        animatingRef.current = true;
        
        try {
          const aiMove = await aiService.getMove(gameState);
          
          const move: Move = {
            ...aiMove,
            player: currentPlayer
          };
          
          // Apply the move
          const updatedState = applyMove(gameState, move);
          
          // Emit the move to the socket
          socketRef.current.emit('makeMove', move);
          
          // Update game state
          setGameState(updatedState);
          
          // Set win animation if game is over
          if (updatedState.winner) {
            setShowWinAnimation(true);
          }
        } catch (error) {
          console.error('Error getting AI move:', error);
        } finally {
          setTimeout(() => {
            animatingRef.current = false;
            setAiThinking(false);
          }, 500);
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
    
    // AI vs Player mode (AI is always O)
    if (gameMode === 'ai-vs-player' && currentPlayer === 'O') {
      setAiThinking(true);
      
      const timer = setTimeout(async () => {
        animatingRef.current = true;
        
        try {
          const aiMove = await aiService.getMove(gameState);
          
          const move: Move = {
            ...aiMove,
            player: currentPlayer
          };
          
          // Apply the move
          const updatedState = applyMove(gameState, move);
          
          // Emit the move to the socket
          socketRef.current.emit('makeMove', move);
          
          // Update game state
          setGameState(updatedState);
          
          // Set win animation if game is over
          if (updatedState.winner) {
            setShowWinAnimation(true);
          }
        } catch (error) {
          console.error('Error getting AI move:', error);
        } finally {
          setTimeout(() => {
            animatingRef.current = false;
            setAiThinking(false);
          }, 500);
        }
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [gameState]);
  
  // Socket event listeners
  useEffect(() => {
    const socket = socketRef.current;
    
    // Connect to the socket
    socket.connect();
    
    // Handler for board state updates
    const handleBoardState = (data: any) => {
      console.log('Received board state from server', data);
      // We would implement board state updates here in a real app
      // As per requirements, we're ignoring player actions from the server
    };
    
    // Register event handlers
    socket.on('boardState', handleBoardState);
    
    // Cleanup
    return () => {
      socket.disconnect();
    };
  }, []);
  
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
    
    // Emit event to server
    socketRef.current.emit('startGame', { gameMode: mode });
  };
  
  // Reset the current game
  const resetGame = () => {
    setShowWinAnimation(false);
    setAiThinking(false);
    animatingRef.current = false;
    
    setGameState(prev => ({
      ...initialGameState,
      gameMode: prev.gameMode,
      gameStarted: true
    }));
    
    // Emit event to server
    socketRef.current.emit('resetGame', {});
  };
  
  // Return to main menu
  const goToMenu = () => {
    setShowWinAnimation(false);
    setAiThinking(false);
    animatingRef.current = false;
    
    setGameState({
      ...initialGameState
    });
    
    // Emit event to server
    socketRef.current.emit('leaveGame', {});
  };
  
  // Check if a cell is playable
  const isCellPlayable = (boardIndex: number, row: number, col: number): boolean => {
    const move: Omit<Move, 'player'> = { boardIndex, row, col };
    return isValidMove(gameState, move);
  };
  
  // Render a single cell in a small board
  const renderCell = (boardIndex: number, row: number, col: number) => {
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
          
          <div className="game-controls">
            <motion.button
              className="reset-btn"
              onClick={resetGame}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
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
            onClick={() => startGame('player-vs-player')}
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
          >
            Player vs Player
          </motion.button>
          
          <motion.button
            className="menu-btn player-vs-ai"
            onClick={() => startGame('ai-vs-player')}
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
          >
            Player vs AI
          </motion.button>
          
          <motion.button
            className="menu-btn ai-vs-ai"
            onClick={() => startGame('ai-vs-ai')}
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
          >
            AI vs AI
          </motion.button>
        </motion.div>
        
        <motion.div
          className="game-instructions"
          variants={textVariants}
        >
          <h3>How to Play</h3>
          <p>
            Play in the small board corresponding to the last move.
            Win three small boards in a row to win the game!
          </p>
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