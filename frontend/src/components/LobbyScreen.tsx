import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import apiService, { Lobby } from '../services/ApiService';
import CreateGameForm from './CreateGameForm';
import { buttonVariants, containerVariants, textVariants } from '../utils/AnimationVariants';
import './LobbyScreen.css';

interface LobbyScreenProps {
  onJoinGame: (lobby_id: number, player_id: string | null) => void;
}

const LobbyScreen: React.FC<LobbyScreenProps> = ({ onJoinGame }) => {
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Load lobbies on component mount and when refresh is triggered
  useEffect(() => {
    const fetchLobbies = async () => {
      setLoading(true);
      try {
        const lobbiesList = await apiService.getLobbies();
        setLobbies(lobbiesList);
        setError(null);
      } catch (err) {
        setError('Failed to load lobbies. Please try again.');
        console.error('Error fetching lobbies:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLobbies();
    
    // Set up polling to refresh lobbies
    const intervalId = setInterval(() => {
      fetchLobbies();
    }, 5000); // Refresh every 5 seconds
    
    return () => clearInterval(intervalId);
  }, [refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleJoinGame = async (lobby_id: number) => {
    // When joining an existing game, we'll be an observer with no player_id
    onJoinGame(lobby_id, null);
  };

  const handleCreateGameSuccess = (lobby_id: number, player_id: string | null) => {
    setShowCreateForm(false);
    onJoinGame(lobby_id, player_id);
  };

  return (
    <div className="lobby-screen">
      <motion.div
        className="lobby-container"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h1 
          className="lobby-title"
          variants={textVariants}
        >
          Ultimate Tic Tac Toe
        </motion.h1>
        
        <motion.div 
          className="lobby-controls"
          variants={containerVariants}
        >
          <motion.button
            className="create-game-btn"
            onClick={() => setShowCreateForm(true)}
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
          >
            Create New Game
          </motion.button>
          
          <motion.button
            className="refresh-btn"
            onClick={handleRefresh}
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Lobbies'}
          </motion.button>
        </motion.div>
        
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              className="error-message"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
        
        <motion.div 
          className="lobbies-list"
          variants={containerVariants}
        >
          <h2>Available Games</h2>
          
          {loading && lobbies.length === 0 ? (
            <div className="loading-indicator">Loading available games...</div>
          ) : lobbies.length > 0 ? (
            <div className="lobbies-grid">
              {lobbies.map((lobby) => (
                <motion.div
                  key={lobby.lobby_id}
                  className="lobby-card"
                  variants={textVariants}
                  whileHover={{ scale: 1.03 }}
                  onClick={() => handleJoinGame(lobby.lobby_id)}
                >
                  <h3>{lobby.name}</h3>
                  <p>Game ID: {lobby.lobby_id}</p>
                  <motion.button
                    className="join-btn"
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    Join Game
                  </motion.button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="no-lobbies">
              No active games found. Create a new game to get started!
            </div>
          )}
        </motion.div>
      </motion.div>
      
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCreateForm(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <CreateGameForm 
                onSuccess={handleCreateGameSuccess} 
                onCancel={() => setShowCreateForm(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LobbyScreen;