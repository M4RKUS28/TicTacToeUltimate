// src/types.ts
export interface Lobby {
    lobby_id: number;
    name: string;
  }
  
  export type GameMode = "HUMAN" | "AI1" | "AI2" | "AI_VS_AI";
  
  export interface GameState {
    status: "draw" | "won" | "running";
    winner: number | null;
    last_move: any; // We'll ignore this as per requirements
    player: number | null;
    board_state: number[][];
  }
  
  export interface CreateGameRequest {
    enemy: GameMode;
    name: string;
  }
  
  export interface CreateGameResponse {
    lobby_id: number;
    player_id: number | null;
  }
  
  export interface MakeMoveRequest {
    player: number;
    coords: [number, number];
  }