import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState, GameMode, Move } from '../types/GameTypes';
import { applyMove, createEmptyUltimateBoard, isValidMove } from '../utils/GameUtils';
import { createSocketService, SocketService } from '../services/SocketService';
import aiService from '../services/AIService';
import GameBoard from './GameBoard';
import ConfettiEffect from './ConfettiEffect';
import './UltimateTicTacToeGame.css';

import {
  buttonVariants,
  textVariants,
  winnerVariants,
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

/**
 * Main component for the Ultimate Tic Tac Toe game
 */
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
  
  // Render the game board and controls
  const renderGameBoard = () => {
    return (
      <motion.div 
        className="game-container"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="game-board-container">
          <GameBoard 
            gameState={gameState}
            onCellClick={handleCellClick}
            aiThinking={aiThinking}
          />
          
          <AnimatePresence>
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
          </AnimatePresence>
          
          {/* Confetti effect when there's a winner */}
          <ConfettiEffect winner={gameState.winner} />
        </div>
        
        <motion.div
          className="game-info"
          variants={textVariants}
        >
          <div className="current-player">
            <h3>Current Player: 
              <span className={gameState.currentPlayer === 'X' ? 'x-text' : 'o-text'}>
                {gameState.currentPlayer}
              </span>
              {aiThinking && <span className="thinking-indicator"> AI is thinking...</span>}
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
            Each small board is like a regular tic tac toe game. Win three small boards in a row to win the game!
          </p>
          <p>
            The trick: When a player places their mark, the next player must play in the small board corresponding to the cell position of the previous move. If that board is already won or full, you can choose any available board.
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