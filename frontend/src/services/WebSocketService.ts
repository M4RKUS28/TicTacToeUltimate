// frontend/src/services/WebSocketService.ts
import { GameState, Move } from '../types/GameTypes';

interface WebSocketMessage {
  type: string;
  payload: any;
}

interface GameStateMessage {
  boards: any[][];
  currentPlayer: string;
  nextBoard: number | null;
}

interface MoveMessage {
  boardIndex: number;
  row: number;
  col: number;
  player: string;
}

export class WebSocketService {
  private socket: WebSocket | null = null;
  private messageListeners: ((message: any) => void)[] = [];
  
  connect(lobbyId: string, playerId: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.socket = new WebSocket('ws://localhost:9001');
        
        this.socket.onopen = () => {
          console.log('WebSocket connected');
          
          // Send connection info with null check
          if (this.socket) {
            this.socket.send(JSON.stringify({
              lobby_id: lobbyId,
              player_id: playerId
            }));
            resolve(true);
          } else {
            console.error('Socket is null after connection');
            alert('Failed to establish WebSocket connection');
            resolve(false);
          }
        };
        
        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.notifyListeners(message);
          } catch (error) {
            console.error('Failed to parse message:', error);
          }
        };
        
        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          alert('WebSocket connection error. Please try again later.');
          resolve(false);
        };
        
        this.socket.onclose = () => {
          console.log('WebSocket disconnected');
        };
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        alert('Failed to create WebSocket connection');
        resolve(false);
      }
    });
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
  
  sendMove(move: Move) {
    if (!this.socket) {
      console.error('WebSocket not connected');
      alert('Connection lost. Please refresh the page.');
      return;
    }
    
    const message = {
      move: [move.row, move.col]
    };
    
    this.socket.send(JSON.stringify(message));
  }
  
  addMessageListener(listener: (message: any) => void) {
    this.messageListeners.push(listener);
    return () => {
      this.messageListeners = this.messageListeners.filter(l => l !== listener);
    };
  }
  
  private notifyListeners(message: any) {
    for (const listener of this.messageListeners) {
      listener(message);
    }
  }
  
  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }
}

export const webSocketService = new WebSocketService();
export default webSocketService;