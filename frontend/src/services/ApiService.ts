//src/services/ApiService.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

// Types
export interface Lobby {
  id: string;
  name: string;
  status: string;
  players: Player[];
}

export interface Player {
  id: string;
  name: string;
  player_type: string;
}

export interface CreateLobbyResponse {
  lobby_id: string;
  player_id: string;
}

export interface JoinLobbyResponse {
  lobby_id: string;
  player_id: string;
}

// API Service
class ApiService {
  // Get all available lobbies
  async getLobbies(): Promise<Lobby[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/lobbies`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch lobbies:', error);
      return [];
    }
  }

  // Get a specific lobby
  async getLobby(id: string): Promise<Lobby | null> {
    try {
      const response = await axios.get(`${API_BASE_URL}/lobbies/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch lobby ${id}:`, error);
      return null;
    }
  }

  // Create a new lobby
  async createLobby(
    name: string,
    playerName: string,
    lobbyType: 'player_vs_player' | 'player_vs_bot' | 'bot_vs_bot'
  ): Promise<CreateLobbyResponse | null> {
    try {
      const response = await axios.post(`${API_BASE_URL}/lobbies`, {
        name,
        player_name: playerName,
        lobby_type: lobbyType
      });
      return response.data;
    } catch (error) {
      console.error('Failed to create lobby:', error);
      return null;
    }
  }

  // Join a lobby
  async joinLobby(id: string, playerName: string): Promise<JoinLobbyResponse | null> {
    try {
      const response = await axios.post(`${API_BASE_URL}/lobbies/${id}/join`, {
        player_name: playerName
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to join lobby ${id}:`, error);
      return null;
    }
  }
}

export const apiService = new ApiService();
export default apiService;