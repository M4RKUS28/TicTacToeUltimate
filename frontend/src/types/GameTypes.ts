// Game related type definitions

// Cell value types
export type CellValue = 'X' | 'O' | null;
export type Player = 'X' | 'O';

// Board states
export type BoardState = CellValue[][];
export type UltimateBoardState = BoardState[];

// Game modes
export type GameMode = 'ai-vs-ai' | 'ai-vs-player' | 'player-vs-player';

// Game state interface
export interface GameState {
  boards: UltimateBoardState;
  currentBoard: number | null;
  nextBoard: number | null;
  winner: CellValue;
  boardWinners: CellValue[];
  currentPlayer: Player;
  gameMode: GameMode;
  gameStarted: boolean;
  gameOver: boolean;
}

// Move interface
export interface Move {
  boardIndex: number;
  row: number;
  col: number;
  player: Player;
}

// Socket event payloads
export interface BoardStatePayload {
  boards: UltimateBoardState;
  currentPlayer: Player;
  nextBoard: number | null;
}

export interface ServerMovePayload extends Move {
  timestamp: number;
}

// AI difficulty levels (for future implementation)
export type AIDifficulty = 'easy' | 'medium' | 'hard';

// Game result for statistics
export interface GameResult {
  winner: CellValue;
  gameMode: GameMode;
  moves: number;
  duration: number; // in seconds
  timestamp: number;
}