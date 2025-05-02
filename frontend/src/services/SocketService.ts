// Socket service for handling the WebSocket connection to the backend
export interface SocketService {
    connect: () => void;
    disconnect: () => void;
    emit: (event: string, data: any) => void;
    on: (event: string, callback: (data: any) => void) => () => void;
  }
  
  // Mock implementation for development
  export class MockSocketService implements SocketService {
    private callbacks: Record<string, Array<(data: any) => void>> = {};
    private connected = false;
  
    connect(): void {
      if (this.connected) return;
      this.connected = true;
      console.log('Connected to mock socket server');
      
      // Simulate server events
      setTimeout(() => {
        this.triggerEvent('connect', {});
      }, 500);
    }
  
    disconnect(): void {
      if (!this.connected) return;
      this.connected = false;
      this.callbacks = {};
      console.log('Disconnected from mock socket server');
    }
  
    emit(event: string, data: any): void {
      if (!this.connected) {
        console.warn('Cannot emit events when disconnected');
        return;
      }
      
      console.log(`Emitting event: ${event}`, data);
      
      // Simulate server response
      switch (event) {
        case 'makeMove':
          // In a real implementation, the server would broadcast this to other players
          setTimeout(() => {
            this.triggerEvent('serverMove', data);
          }, 300);
          break;
          
        case 'requestBoardState':
          // Simulate server sending current board state
          setTimeout(() => {
            this.triggerEvent('boardState', {
              boards: data.boards,
              currentPlayer: data.currentPlayer
            });
          }, 300);
          break;
      }
    }
  
    on(event: string, callback: (data: any) => void): () => void {
      if (!this.callbacks[event]) {
        this.callbacks[event] = [];
      }
      
      this.callbacks[event].push(callback);
      console.log(`Registered callback for event: ${event}`);
      
      // Return a function to unregister this callback
      return () => {
        if (this.callbacks[event]) {
          this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
        }
      };
    }
  
    // Helper to trigger events
    private triggerEvent(event: string, data: any): void {
      if (!this.callbacks[event]) return;
      
      this.callbacks[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in callback for event ${event}:`, error);
        }
      });
    }
  }
  
  // Factory function to create the appropriate socket service
  export const createSocketService = (): SocketService => {
    // Here you would implement real WebSocket connection for production
    // if (process.env.NODE_ENV === 'production') {
    //   return new RealSocketService();
    // }
    
    return new MockSocketService();
  };
  
  export default createSocketService;