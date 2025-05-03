// frontend/src/services/WebSocketService.ts
import { GameState } from '../types/GameTypes';

interface WebSocketMessage {
  message_type: string;
  lobby_id: string;
  game_state?: GameState;
  last_move?: [number, number];
  winner?: string;
  error?: string;
}

export class WebSocketService {
  private socket: WebSocket | null = null;
  private messageListeners: ((message: any) => void)[] = [];
  private reconnectInterval: number = 3000; // 3 seconds
  private reconnectTimer: NodeJS.Timeout | null = null;
  private url: string;
  private lobbyId: string = '';
  private playerId: string = '';
  
  constructor(url: string = 'ws://localhost:9001') {
    this.url = url;
  }
  
  connect(lobbyId: string, playerId: string): Promise<boolean> {
    this.lobbyId = lobbyId;
    this.playerId = playerId;
    
    return new Promise((resolve) => {
      try {
        this.socket = new WebSocket(this.url);
        
        this.socket.onopen = () => {
          console.log('WebSocket connected');
          
          // Send connection info
          this.sendMessage({
            message_type: 'player_connect',
            lobby_id: this.lobbyId,
            player_name: this.playerId,
            client_type: 'player',
            coordinates: null
          });
          
          // Clear any reconnect timer
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
          }
          
          resolve(true);
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
          resolve(false);
        };
        
        this.socket.onclose = () => {
          console.log('WebSocket disconnected, attempting to reconnect...');
          
          // Try to reconnect
          this.reconnectTimer = setTimeout(() => {
            this.connect(this.lobbyId, this.playerId);
          }, this.reconnectInterval);
        };
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        resolve(false);
      }
    });
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    // Clear any reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
  
  sendMove(boardIndex: number, row: number, col: number) {
    // Calculate global coordinates
    const globalRow = Math.floor(boardIndex / 3) * 3 + row;
    const globalCol = (boardIndex % 3) * 3 + col;
    
    this.sendMessage({
      message_type: 'move',
      lobby_id: this.lobbyId,
      coordinates: [globalRow, globalCol]
    });
  }
  
  startGame() {
    this.sendMessage({
      message_type: 'start_game',
      lobby_id: this.lobbyId
    });
  }
  
  ping() {
    this.sendMessage({
      message_type: 'ping',
      lobby_id: this.lobbyId
    });
  }
  
  private sendMessage(message: any) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      alert('Connection lost. Please refresh the page.');
      return;
    }
    
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