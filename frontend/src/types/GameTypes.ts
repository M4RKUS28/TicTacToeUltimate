// Game related type definitions

// Cell value types
export type CellValue = 'X' | 'O' | null;
export type Player = 'X' | 'O';

// Board states
export type BoardState = CellValue[][];
export type UltimateBoardState = BoardState[];

// Game modes
export type GameMode = 'player-vs-player' | 'ai-vs-player' | 'ai-vs-ai';
export type APIGameMode = 'HUMAN' | 'AI1' | 'AI2' | 'AI_vsAI';

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
  lobby_id?: number;
  player_id?: string | null;
  player?: string; // Current player's turn according to API
}

// Move interface
export interface Move {
  boardIndex: number;
  row: number;
  col: number;
  player: Player;
}

// Game result for statistics
export interface GameResult {
  winner: CellValue;
  gameMode: GameMode;
  moves: number;
  duration: number; // in seconds
  timestamp: number;
}

// Mapping from API game modes to local game modes
export const mapAPIGameMode = (apiMode: APIGameMode): GameMode => {
  switch (apiMode) {
    case 'HUMAN':
      return 'player-vs-player';
    case 'AI1':
    case 'AI2':
      return 'ai-vs-player';
    case 'AI_vsAI':
      return 'ai-vs-ai';
    default:
      return 'player-vs-player';
  }
};

// Mapping from local game modes to API game modes
export const mapLocalGameMode = (localMode: GameMode): APIGameMode => {
  switch (localMode) {
    case 'player-vs-player':
      return 'HUMAN';
    case 'ai-vs-player':
      return 'AI1'; // Default to AI1, can be changed
    case 'ai-vs-ai':
      return 'AI_vsAI';
    default:
      return 'HUMAN';
  }
};