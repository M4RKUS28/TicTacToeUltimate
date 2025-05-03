// src/api.ts
import { CreateGameRequest, CreateGameResponse, GameState, Lobby, MakeMoveRequest } from '../interface/types';
  
const API_BASE_URL = 'http://localhost:8000/api';

export const fetchLobbies = async (): Promise<Lobby[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/lobbies`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch lobbies');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching lobbies:', error);
    throw error;
  }
};

export const createGame = async (request: CreateGameRequest): Promise<CreateGameResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/create_game`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create game');
    }
    
    return await response.json();

    
  } catch (error) {
    console.error('Error creating game:', error);
    throw error;
  }
};

export const fetchGameState = async (lobbyId: number): Promise<GameState> => {
  try {
    const response = await fetch(`${API_BASE_URL}/game_state/${lobbyId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch game state');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching game state:', error);
    throw error;
  }
};

export const makeMove = async (lobbyId: number, request: MakeMoveRequest): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/make_move/${lobbyId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      throw new Error('Failed to make move');
    }
  } catch (error) {
    console.error('Error making move:', error);
    throw error;
  }
};
