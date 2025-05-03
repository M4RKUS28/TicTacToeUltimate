import axios from 'axios';
import { GameState } from '../types/GameTypes';

const API_BASE_URL = 'http://localhost:8080/api';

export interface Lobby {
  lobby_id: number;
  name: string;
}

export interface CreateGameResponse {
  lobby_id: number;
  player_id: string | null;
}

class ApiService {
  async getLobbies(): Promise<Lobby[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/lobbies`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch lobbies:', error);
      return [];
    }
  }

  async getGameState(lobby_id: number): Promise<GameState | null> {
    try {
      const response = await axios.get(`${API_BASE_URL}/game_state/${lobby_id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch getGameState:', error);
      return null;
    }
  }

  async makeMove(lobby_id: number, player_id: string, coords: { boardIndex: number, row: number, col: number }) {
    try {
      const response = await axios.post(`${API_BASE_URL}/make_move/${lobby_id}`, {
        player: player_id,
        coords: coords
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to makeMove`, error);
      return null;
    }
  }

  async createGame(lobbyName: string, enemy: 'AI_vsAI' | 'HUMAN' | 'AI1' | 'AI2'): Promise<CreateGameResponse | null> {
    try {
      const response = await axios.post(`${API_BASE_URL}/create_game`, {
        name: lobbyName,
        enemy,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to create game:', error);
      return null;
    }
  }
}

export const apiService = new ApiService();
export default apiService;