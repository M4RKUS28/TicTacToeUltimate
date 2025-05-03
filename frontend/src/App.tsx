import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import './App.css';
import UltimateTicTacToeGame from './components/UltimateTicTacToeGame';
import LobbyScreen from './components/LobbyScreen';

// Define app routes
type AppRoute = 'lobby' | 'game';

const App: React.FC = () => {
  // App state
  const [currentRoute, setCurrentRoute] = useState<AppRoute>('lobby');
  const [lobbyId, setLobbyId] = useState<number | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  
  // Handle joining a game
  const handleJoinGame = (lobby_id: number, player_id: string | null) => {
    setLobbyId(lobby_id);
    setPlayerId(player_id);
    setCurrentRoute('game');
  };
  
  // Handle returning to lobby
  const handleReturnToLobby = () => {
    setLobbyId(null);
    setPlayerId(null);
    setCurrentRoute('lobby');
  };
  
  return (
    <div className="App">
      <AnimatePresence mode="wait">
        {currentRoute === 'lobby' && (
          <LobbyScreen onJoinGame={handleJoinGame} />
        )}
        
        {currentRoute === 'game' && lobbyId !== null && (
          <UltimateTicTacToeGame 
            lobbyId={lobbyId}
            playerId={playerId}
            onReturnToLobby={handleReturnToLobby}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;