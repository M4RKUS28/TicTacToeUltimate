import { BoardState, CellValue, GameState, Move, Player, UltimateBoardState } from '../types/GameTypes';

/**
 * Creates an empty 3x3 board filled with null values
 */
export const createEmptyBoard = (): BoardState => 
  Array(3).fill(null).map(() => Array(3).fill(null));

/**
 * Creates an empty ultimate board (9 small boards)
 */
export const createEmptyUltimateBoard = (): UltimateBoardState => 
  Array(9).fill(null).map(() => createEmptyBoard());

/**
 * Checks if a board has a winner or is a draw
 * @param board The board to check
 * @returns The winner ('X', 'O') or null if no winner or draw
 */
export const checkWinner = (board: BoardState): CellValue => {
  // Check rows
  for (let i = 0; i < 3; i++) {
    if (board[i][0] && board[i][0] === board[i][1] && board[i][0] === board[i][2]) {
      return board[i][0];
    }
  }

  // Check columns
  for (let i = 0; i < 3; i++) {
    if (board[0][i] && board[0][i] === board[1][i] && board[0][i] === board[2][i]) {
      return board[0][i];
    }
  }

  // Check diagonals
  if (board[0][0] && board[0][0] === board[1][1] && board[0][0] === board[2][2]) {
    return board[0][0];
  }
  if (board[0][2] && board[0][2] === board[1][1] && board[0][2] === board[2][0]) {
    return board[0][2];
  }

  return null;
};

/**
 * Checks if a board is full (all cells filled)
 * @param board The board to check
 * @returns True if the board is full, false otherwise
 */
export const isBoardFull = (board: BoardState): boolean => {
  return board.every(row => row.every(cell => cell !== null));
};

/**
 * Checks if a move is valid according to the game rules
 * @param gameState Current game state
 * @param move The move to validate
 * @returns True if the move is valid, false otherwise
 */
export const isValidMove = (
  gameState: GameState,
  move: Omit<Move, 'player'>
): boolean => {
  const { boards, nextBoard, boardWinners, gameOver } = gameState;
  const { boardIndex, row, col } = move;
  
  // Game is over
  if (gameOver) return false;
  
  // Invalid board index
  if (boardIndex < 0 || boardIndex > 8) return false;
  
  // Invalid cell position
  if (row < 0 || row > 2 || col < 0 || col > 2) return false;
  
  // Cell is already filled
  if (boards[boardIndex][row][col] !== null) return false;
  
  // Board is already won
  if (boardWinners[boardIndex] !== null) return false;
  
  // Playing on wrong board
  if (nextBoard !== null && nextBoard !== boardIndex && boardWinners[nextBoard] === null) {
    return false;
  }
  
  return true;
};

/**
 * Transforms the board state into a format for display/analysis
 * @param ultimateBoard The current ultimate board state
 * @param boardWinners Array of board winners
 * @returns 3x3 grid representing the macro state of the game
 */
export const getMacroBoard = (
  ultimateBoard: UltimateBoardState,
  boardWinners: CellValue[]
): BoardState => {
  return [
    [boardWinners[0], boardWinners[1], boardWinners[2]],
    [boardWinners[3], boardWinners[4], boardWinners[5]],
    [boardWinners[6], boardWinners[7], boardWinners[8]]
  ];
};

/**
 * Converts from board index to row and column
 * @param index Board index (0-8)
 * @returns {row, col} coordinates
 */
export const indexToCoordinates = (index: number): { row: number; col: number } => {
  return {
    row: Math.floor(index / 3),
    col: index % 3
  };
};

/**
 * Converts from row and column to board index
 * @param row Row (0-2)
 * @param col Column (0-2)
 * @returns Board index (0-8)
 */
export const coordinatesToIndex = (row: number, col: number): number => {
  return row * 3 + col;
};

/**
 * Makes a deep clone of the game state to avoid mutation
 * @param gameState The game state to clone
 * @returns A deep copy of the game state
 */
export const cloneGameState = (gameState: GameState): GameState => {
  return {
    ...gameState,
    boards: JSON.parse(JSON.stringify(gameState.boards)),
    boardWinners: [...gameState.boardWinners]
  };
};

/**
 * Simple AI implementation - gets a random valid move
 * @param gameState Current game state
 * @returns A valid move for the AI to make
 */
export const getAIMove = (gameState: GameState): Omit<Move, 'player'> => {
  const { boards, nextBoard, boardWinners, currentPlayer } = gameState;
  
  // Determine which board to play on
  let validBoardIndices: number[] = [];
  
  if (nextBoard !== null && boardWinners[nextBoard] === null) {
    // Must play on the designated board
    validBoardIndices = [nextBoard];
  } else {
    // Can play on any board that isn't won yet
    validBoardIndices = boardWinners
      .map((winner, index) => winner === null ? index : -1)
      .filter(index => index !== -1);
  }
  
  // If no valid boards (shouldn't happen in a normal game), return null
  if (validBoardIndices.length === 0) {
    console.error('No valid boards for AI to play on');
    return { boardIndex: 0, row: 0, col: 0 };
  }
  
  // Randomly select a board to play on
  const boardIndex = validBoardIndices[Math.floor(Math.random() * validBoardIndices.length)];
  
  // Find all empty cells on this board
  const emptyCells: Array<{ row: number; col: number }> = [];
  
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (boards[boardIndex][row][col] === null) {
        emptyCells.push({ row, col });
      }
    }
  }
  
  // If no empty cells (shouldn't happen in a normal game), return null
  if (emptyCells.length === 0) {
    console.error('No empty cells on the selected board');
    return { boardIndex: 0, row: 0, col: 0 };
  }
  
  // Randomly select an empty cell
  const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  
  return { boardIndex, row, col };
};

/**
 * Apply a move to the game state and return the new state
 * @param gameState Current game state
 * @param move The move to apply
 * @returns New game state after the move is applied
 */
export const applyMove = (
  gameState: GameState,
  move: Move
): GameState => {
  // Validate move
  if (!isValidMove(gameState, move)) {
    console.error('Invalid move', move);
    return gameState;
  }
  
  // Clone the game state to avoid mutation
  const newState = cloneGameState(gameState);
  const { boardIndex, row, col, player } = move;
  
  // Update the cell
  newState.boards[boardIndex][row][col] = player;
  
  // Check if the board has a winner
  const boardWinner = checkWinner(newState.boards[boardIndex]);
  if (boardWinner) {
    newState.boardWinners[boardIndex] = boardWinner;
  } else if (isBoardFull(newState.boards[boardIndex])) {
    // Board is full but no winner (draw)
    // We still use null here but the game logic knows it's a draw
    newState.boardWinners[boardIndex] = null;
  }
  
  // Determine the next board (corresponding to the cell position clicked)
  const calculatedNextBoard = coordinatesToIndex(row, col);
  newState.nextBoard = newState.boardWinners[calculatedNextBoard] === null 
    ? calculatedNextBoard 
    : null;
  
  // Update current board
  newState.currentBoard = boardIndex;
  
  // Check if there's an ultimate winner
  const macroBoard = getMacroBoard(newState.boards, newState.boardWinners);
  const ultimateWinner = checkWinner(macroBoard);
  if (ultimateWinner) {
    newState.winner = ultimateWinner;
    newState.gameOver = true;
  } else if (newState.boardWinners.every(winner => winner !== null)) {
    // All boards are full/won but no ultimate winner (draw)
    newState.gameOver = true;
  }
  
  // Switch player
  newState.currentPlayer = player === 'X' ? 'O' : 'X';
  
  return newState;
};