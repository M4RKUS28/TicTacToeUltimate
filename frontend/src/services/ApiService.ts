// src/services/ApiService.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

class ApiService {
  async getLobbies() {
    try {
      const response = await axios.get(`${API_BASE_URL}/lobbies`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch lobbies:', error);
      return [];
    }
  }

  async getGameState(lobby_id) {
    try {
      const response = await axios.get(`${API_BASE_URL}/game_state/${lobby_id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch getGameState:', error);
      return [];
    }
  }


  async makeMove(lobby_id, player_id, coords) {
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

  async createGame(lobbyName, enemy) {
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

  // Start a game
  async startGame(id: string): Promise<boolean> {
    try {
      await axios.post(`${API_BASE_URL}/lobbies/${id}/start`);
      return true;
    } catch (error) {
      console.error(`Failed to start game ${id}:`, error);
      return false;
    }
  }

  // Get available bots
  async getAvailableBots(): Promise<string[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/bots`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch available bots:', error);
      return [];
    }
  }
}

export const apiService = new ApiService();
export default apiService;
