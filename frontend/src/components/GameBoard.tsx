import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Mark from './Mark';
import { GameState, Move } from '../types/GameTypes';
import { isValidMove } from '../utils/GameUtils';
import { boardVariants, cellVariants, winLineVariants } from '../utils/AnimationVariants';

interface GameBoardProps {
  gameState: GameState;
  onCellClick: (boardIndex: number, row: number, col: number) => void;
  aiThinking: boolean;
}

/**
 * Component for rendering the Ultimate Tic Tac Toe game board
 */
const GameBoard: React.FC<GameBoardProps> = ({ 
  gameState, 
  onCellClick, 
  aiThinking 
}) => {
  const { boards, boardWinners, nextBoard, currentPlayer, gameMode } = gameState;
  
  // Determine if a cell is playable
  const isCellPlayable = useCallback((boardIndex: number, row: number, col: number): boolean => {
    const move: Omit<Move, 'player'> = { boardIndex, row, col };
    
    // Check if it's AI's turn in AI vs Player mode
    if (gameMode === 'ai-vs-player' && currentPlayer === 'O') {
      return false;
    }
    
    // Check if it's AI vs AI mode (no human interaction)
    if (gameMode === 'ai-vs-ai') {
      return false;
    }
    
    return isValidMove(gameState, move);
  }, [gameState, currentPlayer, gameMode]);
  
  // Render a single cell
  const renderCell = useCallback((boardIndex: number, row: number, col: number) => {
    const cellValue = boards[boardIndex][row][col];
    const playable = isCellPlayable(boardIndex, row, col);
    
    return (
      <motion.div
        className={`cell ${playable ? 'playable' : ''}`}
        variants={cellVariants}
        onClick={() => onCellClick(boardIndex, row, col)}
        whileHover={playable ? 'hover' : undefined}
        whileTap={playable ? 'tap' : undefined}
        custom={cellValue}
      >
        <AnimatePresence mode="wait">
          {cellValue && (
            <Mark 
              key={`mark-${boardIndex}-${row}-${col}`} 
              type={cellValue} 
              animated={true}
            />
          )}
        </AnimatePresence>
      </motion.div>
    );
  }, [boards, isCellPlayable, onCellClick]);
  
  // Render a win line for a small board
  const renderWinLine = useCallback((boardIndex: number) => {
    const winner = boardWinners[boardIndex];
    
    if (!winner) return null;
    
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
  }, [boards, boardWinners]);
  
  // Render a small board
  const renderBoard = useCallback((boardIndex: number) => {
    const winner = boardWinners[boardIndex];
    const isActive = nextBoard === null || nextBoard === boardIndex || boardWinners[nextBoard] !== null;
    const isNextBoard = nextBoard === boardIndex && boardWinners[boardIndex] === null;
    
    // Board state for animation variants
    let boardState = 'visible';
    if (winner === 'X') boardState = 'won';
    else if (winner === 'O') boardState = 'lost';
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
            <Mark type={winner} size="80%" animated={false} />
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
  }, [boardWinners, nextBoard, renderCell, renderWinLine]);
  
  return (
    <motion.div 
      className="ultimate-board"
      variants={boardVariants}
      initial="hidden"
      animate="visible"
    >
      {Array(9).fill(null).map((_, index) => (
        <div key={`board-${index}`} className="board-wrapper">
          {renderBoard(index)}
        </div>
      ))}
    </motion.div>
  );
};

export default GameBoard;