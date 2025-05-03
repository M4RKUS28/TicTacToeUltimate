import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState, GameMode, Move } from '../types/GameTypes';
import { applyMove, createEmptyUltimateBoard, isValidMove } from '../utils/GameUtils';
import apiService from '../services/ApiService';
import GameBoard from './GameBoard';
import ConfettiEffect from './ConfettiEffect';
import './UltimateTicTacToeGame.css';

import {
  buttonVariants,
  textVariants,
  winnerVariants,
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

interface GameProps {
  lobbyId: number;
  playerId: string | null;
  onReturnToLobby: () => void;
}

/**
 * Main component for the Ultimate Tic Tac Toe game
 */
const UltimateTicTacToeGame: React.FC<GameProps> = ({ 
  lobbyId,
  playerId, 
  onReturnToLobby 
}) => {
  // Game state
  const [gameState, setGameState] = useState<GameState>({ 
    ...initialGameState,
    lobby_id: lobbyId,
    player_id: playerId,
    gameStarted: true
  });
  const [aiThinking, setAiThinking] = useState<boolean>(false);
  const [showWinAnimation, setShowWinAnimation] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const animatingRef = useRef<boolean>(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Handle cell click for player moves
  const handleCellClick = useCallback(async (boardIndex: number, row: number, col: number) => {
    if (animatingRef.current || aiThinking || loading) return;
    
    const { currentPlayer, gameOver, player_id, player } = gameState;
    
    // Check if it's this player's turn
    if (gameOver || !player_id || player !== player_id) {
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
    
    // Apply move animation
    animatingRef.current = true;
    
    try {
      // Make API call to make the move
      await apiService.makeMove(lobbyId, player_id, {
        boardIndex,
        row,
        col
      });
      
      // Local state update will happen in the next polling cycle
    } catch (err) {
      console.error("Error making move:", err);
      setError("Failed to make move. Please try again.");
    } finally {
      // Animation delay
      setTimeout(() => {
        animatingRef.current = false;
      }, 500);
    }
  }, [gameState, aiThinking, loading, lobbyId]);
  
  // Fetch game state from API
  const fetchGameState = useCallback(async () => {
    if (!lobbyId) return;
    
    try {
      const updatedState = await apiService.getGameState(lobbyId);
      
      if (updatedState) {
        setGameState(prevState => ({
          ...prevState,
          ...updatedState,
          lobby_id: lobbyId,
          player_id: playerId,
          gameStarted: true
        }));
        
        // Check if there's a winner
        if (updatedState.winner && !showWinAnimation) {
          setShowWinAnimation(true);
        }
        
        setError(null);
      }
    } catch (err) {
      console.error("Error fetching game state:", err);
      setError("Failed to get game updates. Retrying...");
    } finally {
      setLoading(false);
    }
  }, [lobbyId, playerId, showWinAnimation]);
  
  // Set up polling for game state updates
  useEffect(() => {
    // Initial fetch
    fetchGameState();
    
    // Set up polling interval
    pollingIntervalRef.current = setInterval(fetchGameState, 1000);
    
    // Clean up on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [fetchGameState]);
  
  // Reset the current game
  const resetGame = () => {
    // Currently not implemented as it would require a backend endpoint
    // In a real implementation, you would call an API to reset the game
    setShowWinAnimation(false);
    setAiThinking(false);
    animatingRef.current = false;
    
    // For now, just redirect to the lobby
    onReturnToLobby();
  };
  
  // Return to main menu
  const goToLobby = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    onReturnToLobby();
  };
  
  // Determine if the current player can make moves
  const canMakeMoves = (): boolean => {
    if (!gameState.player_id) return false;
    return gameState.player === gameState.player_id;
  };
  
  // Render game mode text
  const renderGameModeText = () => {
    const { gameMode } = gameState;
    
    let modeText = "";
    switch (gameMode) {
      case 'player-vs-player':
        modeText = "Player vs Player";
        break;
      case 'ai-vs-player':
        modeText = "Player vs AI";
        break;
      case 'ai-vs-ai':
        modeText = "AI vs AI (Spectator Mode)";
        break;
      default:
        modeText = "Unknown Mode";
    }
    
    // Add player role info
    if (playerId) {
      modeText += ` - You are ${gameState.player_id === playerId ? 'a player' : 'spectating'}`;
    } else {
      modeText += " - Spectating";
    }
    
    return modeText;
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
        {loading ? (
          <div className="loading-game">
            <div className="loading-spinner"></div>
            <p>Loading game...</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="game-error-message">
                {error}
              </div>
            )}
            
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
                        className="menu-btn"
                        onClick={goToLobby}
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                      >
                        Return to Lobby
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
                        className="menu-btn"
                        onClick={goToLobby}
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                      >
                        Return to Lobby
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
              <div className="game-status">
                <div className="current-player">
                  <h3>Current Player: 
                    <span className={gameState.currentPlayer === 'X' ? 'x-text' : 'o-text'}>
                      {gameState.currentPlayer}
                    </span>
                    {!canMakeMoves() && gameState.player_id && (
                      <span className="waiting-indicator"> Waiting for opponent...</span>
                    )}
                  </h3>
                </div>
                
                <div className="game-mode">
                  <h3>
                    Game Mode: {renderGameModeText()}
                  </h3>
                </div>
                
                <div className="game-id">
                  <p>Game ID: {lobbyId}</p>
                </div>
              </div>
              
              <div className="game-controls">
                <motion.button
                  className="menu-btn"
                  onClick={goToLobby}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  Return to Lobby
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </motion.div>
    );
  };
  
  // Main render
  return (
    <div className="ultimate-tic-tac-toe">
      {renderGameBoard()}
    </div>
  );
};

export default UltimateTicTacToeGame;