
  
  // src/GameBoard.tsx
  import React, { useState, useEffect, useCallback } from 'react';
  import { useParams, useNavigate } from 'react-router-dom';
  import { fetchGameState, makeMove } from '../api/api';
  import { GameState } from '../interface/types';
  import './GameBoard.css';
  
  const GameBoard: React.FC = () => {
    const { lobbyId, playerId } = useParams<{ lobbyId: string, playerId: string }>();
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [lastPlayedPosition, setLastPlayedPosition] = useState<[number, number] | null>(null);
    const [nextBoardToPlay, setNextBoardToPlay] = useState<number | null>(null);
    const navigate = useNavigate();
  
    // Function to determine if a small board is won or drawn
    const getBoardStatus = (boardIndex: number): { status: 'won' | 'draw' | null, winner: number | null } => {
      if (!gameState) return { status: null, winner: null };
  
      const startRow = Math.floor(boardIndex / 3) * 3;
      const startCol = (boardIndex % 3) * 3;
      
      const board = [
        [
          gameState.board_state[(startRow * 3) + 0][(startCol * 3) + 0],
          gameState.board_state[(startRow * 3) + 0][(startCol * 3) + 1],
          gameState.board_state[(startRow * 3) + 0][(startCol * 3) + 2],
        ],
        [
          gameState.board_state[(startRow * 3) + 1][(startCol * 3) + 0],
          gameState.board_state[(startRow * 3) + 1][(startCol * 3) + 1],
          gameState.board_state[(startRow * 3) + 1][(startCol * 3) + 2],
        ],
        [
          gameState.board_state[(startRow * 3) + 2][(startCol * 3) + 0],
          gameState.board_state[(startRow * 3) + 2][(startCol * 3) + 1],
          gameState.board_state[(startRow * 3) + 2][(startCol * 3) + 2],
        ],
      ];
  
      // Check rows
      for (let i = 0; i < 3; i++) {
        if (board[i][0] !== 0 && board[i][0] === board[i][1] && board[i][1] === board[i][2]) {
          return { status: 'won', winner: board[i][0] };
        }
      }
  
      // Check columns
      for (let i = 0; i < 3; i++) {
        if (board[0][i] !== 0 && board[0][i] === board[1][i] && board[1][i] === board[2][i]) {
          return { status: 'won', winner: board[0][i] };
        }
      }
  
      // Check diagonals
      if (board[0][0] !== 0 && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
        return { status: 'won', winner: board[0][0] };
      }
      if (board[0][2] !== 0 && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
        return { status: 'won', winner: board[0][2] };
      }
  
      // Check if drawn (all filled)
      const isDrawn = board.flat().every(cell => cell !== 0);
      if (isDrawn) {
        return { status: 'draw', winner: null };
      }
  
      return { status: null, winner: null };
    };
  
    // Function to determine if a cell is playable
    const isCellPlayable = (row: number, col: number): boolean => {
      if (!gameState || gameState.status !== 'running') return false;
      
      // If AI vs AI, no moves are playable
      if (gameState.player === null) return false;
      
      // If it's not current player's turn
      if (gameState.player !== Number(playerId)) return false;
      
      // If cell is already filled
      if (gameState.board_state[row][col] !== 0) return false;
      
      // Board calculation
      const boardRow = Math.floor(row / 3);
      const boardCol = Math.floor(col / 3);
      const boardIndex = (boardRow * 3) + boardCol;
      
      // If no next board is specified (first move or after a completed board)
      if (nextBoardToPlay === null) return true;
      
      // If this cell is not in the next board to play
      if (boardIndex !== nextBoardToPlay) return false;
      
      // Check if the target board is already won or drawn
      const boardStatus = getBoardStatus(boardIndex);
      if (boardStatus.status === 'won' || boardStatus.status === 'draw') {
        // If board is won/drawn, player can play anywhere
        return true;
      }
      
      return true;
    };
  
    // Function to update the next board to play based on the last move
    const updateNextBoardToPlay = useCallback((row: number, col: number) => {
      const innerRow = row % 3;
      const innerCol = col % 3;
      const innerPos = (innerRow * 3) + innerCol;
    
      const boardStatus = getBoardStatus(innerPos);
      if (boardStatus.status === 'won' || boardStatus.status === 'draw') {
        setNextBoardToPlay(null);
      } else {
        setNextBoardToPlay(innerPos);
      }
    }, [getBoardStatus]);
  
    const fetchGameStateData = useCallback(async () => {
      if (!lobbyId) return;
    
      try {
        setIsLoading(true);
        
        console.log('Fetching game state for lobby:', lobbyId);
        console.log('Fetching game state for lobby int:', Number(lobbyId));


        const data = await fetchGameState(Number(lobbyId));
        setGameState(data);
        setError(null);
    
        if (lastPlayedPosition) {
          updateNextBoardToPlay(lastPlayedPosition[0], lastPlayedPosition[1]);
        }
      } catch (error) {
        setError('Failed to fetch game state. Returning to home screen.');
        setTimeout(() => navigate('/'), 3000);
      } finally {
        setIsLoading(false);
      }
    }, [lobbyId, lastPlayedPosition, navigate]);
  
    useEffect(() => {
      fetchGameStateData();
      const interval = setInterval(fetchGameStateData, 1000);
    
      return () => clearInterval(interval);
    }, [fetchGameStateData]);
  
    const handleCellClick = async (row: number, col: number) => {
      if (!lobbyId || !playerId || !gameState) return;
      
      if (!isCellPlayable(row, col)) return;
      
      try {
        await makeMove(Number(lobbyId), {
          player: Number(playerId),
          coords: [row, col]
        });
        
        setLastPlayedPosition([row, col]);
        
        // Immediately fetch the new game state
        fetchGameStateData();
      } catch (error) {
        setError('Failed to make move. Please try again.');
      }
    };
  
    const renderSmallBoard = (startRow: number, startCol: number, boardIndex: number) => {
      const cells = [];
      const boardStatus = getBoardStatus(boardIndex);
      const isBoardActive = nextBoardToPlay === null || nextBoardToPlay === boardIndex;
      
      // Add a class to show the active board
      const boardClass = `small-board ${isBoardActive && gameState?.status === 'running' ? 'active-board' : ''} ${
        boardStatus.status === 'won' ? `won-by-player${boardStatus.winner}` : ''
      } ${boardStatus.status === 'draw' ? 'drawn-board' : ''}`;
      
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const row = startRow + i;
          const col = startCol + j;
          
          const cellValue = gameState?.board_state[row][col] || 0;
          const isPlayable = isCellPlayable(row, col);
          
          const cellClass = `cell ${
            cellValue === 1 ? 'player1' : cellValue === 2 ? 'player2' : ''
          } ${isPlayable ? 'playable' : ''}`;
          
          cells.push(
            <div 
              key={`${row}-${col}`} 
              className={cellClass}
              onClick={() => handleCellClick(row, col)}
            >
              {cellValue === 1 ? 'X' : cellValue === 2 ? 'O' : ''}
            </div>
          );
        }
      }
      
      return (
        <div className={boardClass}>
          {cells}
        </div>
      );
    };
  
    const renderBoard = () => {
      const boards = [];
      
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const startRow = i * 3;
          const startCol = j * 3;
          const boardIndex = i * 3 + j;
          
          boards.push(
            <div key={`board-${boardIndex}`} className="board-position">
              {renderSmallBoard(startRow, startCol, boardIndex)}
            </div>
          );
        }
      }
      
      return (
        <div className="game-board">
          {boards}
        </div>
      );
    };
  
    const renderGameStatus = () => {
      if (!gameState) return null;
      
      let message = '';
      
      if (gameState.status === 'running') {
        if (gameState.player === Number(playerId)) {
          message = 'Your turn';
        } else if (gameState.player === null) {
          message = 'AI vs AI game - watch the moves';
        } else {
          message = "Opponent's turn";
        }
      } else if (gameState.status === 'won') {
        if (gameState.winner === Number(playerId)) {
          message = 'You won!';
        } else {
          message = 'You lost!';
        }
      } else if (gameState.status === 'draw') {
        message = 'Game ended in a draw';
      }
      
      return (
        <div className={`game-status ${gameState.status !== 'running' ? 'game-end' : ''}`}>
          {message}
        </div>
      );
    };
  
    const renderEndGameModal = () => {
      if (!gameState || gameState.status === 'running') return null;
      
      let message = '';
      
      if (gameState.status === 'won') {
        if (gameState.winner === Number(playerId)) {
          message = 'Congratulations! You won!';
        } else if (gameState.player === null) {
          // AI vs AI game
          message = `AI ${gameState.winner} won the game!`;
        } else {
          message = 'You lost the game.';
        }
      } else if (gameState.status === 'draw') {
        message = 'Game ended in a draw';
      }
      
      return (
        <div className="modal-overlay">
          <div className="end-game-modal">
            <h2>Game Over</h2>
            <p>{message}</p>
            <button className="home-btn" onClick={() => navigate('/')}>
              Return to Home
            </button>
          </div>
        </div>
      );
    };
  
    return (
      <div className="game-container">
        <div className="game-header">
          <h1>Ultimate Tic Tac Toe</h1>
          <button className="home-btn" onClick={() => navigate('/')}>
            Back to Home
          </button>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        {isLoading && !gameState && (
          <div className="loading">Loading game...</div>
        )}
        
        {gameState && (
          <>
            {renderGameStatus()}
            {renderBoard()}
            {renderEndGameModal()}
          </>
        )}
      </div>
    );
  };
  
  export default GameBoard;
  