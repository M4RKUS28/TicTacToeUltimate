// frontend/src/components/LobbyPage.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import apiService, { Lobby } from '../services/ApiService';
import { useNavigate } from 'react-router-dom';
import './LobbyPage.css';

const LobbyPage: React.FC = () => {
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [showJoinForm, setShowJoinForm] = useState<boolean>(false);
  const [selectedLobby, setSelectedLobby] = useState<Lobby | null>(null);
  
  // Form states
  const [playerName, setPlayerName] = useState<string>('');
  const [lobbyName, setLobbyName] = useState<string>('');
  const [lobbyType, setLobbyType] = useState<'player_vs_player' | 'player_vs_bot' | 'bot_vs_bot'>('player_vs_player');
  const [selectedBots, setSelectedBots] = useState<string[]>([]);
  const [availableBots, setAvailableBots] = useState<string[]>([]);
  
  const navigate = useNavigate();
  
  // Fetch lobbies on component mount
  useEffect(() => {
    fetchLobbies();
    fetchAvailableBots();
    
    // Refresh lobbies every 5 seconds
    const interval = setInterval(fetchLobbies, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  const fetchLobbies = async () => {
    setLoading(true);
    const fetchedLobbies = await apiService.getLobbies();
    setLobbies(fetchedLobbies);
    setLoading(false);
  };
  
  const fetchAvailableBots = async () => {
    const bots = await apiService.getAvailableBots();
    setAvailableBots(bots);
  };
  
  const handleCreateLobby = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!playerName || !lobbyName) {
      alert('Please fill in all fields');
      return;
    }
    
    // Validate bot selection based on lobby type
    if (lobbyType === 'player_vs_bot' && selectedBots.length !== 1) {
      alert('Please select 1 bot for Player vs Bot mode');
      return;
    }
    
    if (lobbyType === 'bot_vs_bot' && selectedBots.length !== 2) {
      alert('Please select 2 bots for Bot vs Bot mode');
      return;
    }
    
    const botsToSend = lobbyType !== 'player_vs_player' ? selectedBots : undefined;
    
    const response = await apiService.createLobby(lobbyName, playerName, lobbyType, botsToSend);
    
    if (response) {
      // Save player info to localStorage
      localStorage.setItem('playerId', response.player_id);
      localStorage.setItem('playerName', playerName);
      localStorage.setItem('lobbyId', response.lobby_id);
      
      // Navigate to game page
      navigate(`/game/${response.lobby_id}`);
    }
  };
  
  const handleJoinLobby = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!playerName || !selectedLobby) {
      alert('Please fill in all fields and select a lobby');
      return;
    }
    
    const response = await apiService.joinLobby(selectedLobby.id, playerName);
    
    if (response) {
      // Save player info to localStorage
      localStorage.setItem('playerId', response.player_id);
      localStorage.setItem('playerName', playerName);
      localStorage.setItem('lobbyId', response.lobby_id);
      
      // Navigate to game page
      navigate(`/game/${response.lobby_id}`);
    }
  };
  
  const handleBotSelection = (botName: string) => {
    // If already selected, remove it
    if (selectedBots.includes(botName)) {
      setSelectedBots(selectedBots.filter(name => name !== botName));
      return;
    }
    
    // If we're selecting the first bot for player vs bot
    if (lobbyType === 'player_vs_bot' && selectedBots.length === 0) {
      setSelectedBots([botName]);
      return;
    }
    
    // If we're selecting bots for bot vs bot (max 2)
    if (lobbyType === 'bot_vs_bot' && selectedBots.length < 2) {
      setSelectedBots([...selectedBots, botName]);
    }
  };
  
  return (
    <div className="lobby-page">
      <motion.div 
        className="lobby-container"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="lobby-title">Ultimate Tic Tac Toe</h1>
        
        <div className="lobby-buttons">
          <motion.button
            className="lobby-button create-button"
            onClick={() => {
              setShowCreateForm(true);
              setShowJoinForm(false);
              fetchAvailableBots();
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Create Lobby
          </motion.button>
          
          <motion.button
            className="lobby-button join-button"
            onClick={() => {
              setShowJoinForm(true);
              setShowCreateForm(false);
              fetchLobbies();
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Join Lobby
          </motion.button>
        </div>
        
        {showCreateForm && (
          <motion.div
            className="lobby-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h2>Create New Lobby</h2>
            <form onSubmit={handleCreateLobby}>
              <div className="form-group">
                <label htmlFor="playerName">Your Name</label>
                <input 
                  type="text" 
                  id="playerName" 
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  required
                  disabled={lobbyType === 'bot_vs_bot'}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="lobbyName">Lobby Name</label>
                <input 
                  type="text" 
                  id="lobbyName" 
                  value={lobbyName}
                  onChange={(e) => setLobbyName(e.target.value)}
                  placeholder="Enter lobby name"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="lobbyType">Lobby Type</label>
                <select 
                  id="lobbyType" 
                  value={lobbyType}
                  onChange={(e) => {
                    setLobbyType(e.target.value as any);
                    setSelectedBots([]);
                  }}
                  required
                >
                  <option value="player_vs_player">Player vs Player</option>
                  <option value="player_vs_bot">Player vs Bot</option>
                  <option value="bot_vs_bot">Bot vs Bot (Spectate)</option>
                </select>
              </div>
              
              {(lobbyType === 'player_vs_bot' || lobbyType === 'bot_vs_bot') && (
                <div className="form-group">
                  <label>Select Bots</label>
                  {availableBots.length === 0 ? (
                    <div className="no-bots-message">
                      No bots available. Please wait for bots to connect.
                    </div>
                  ) : (
                    <div className="bot-selection">
                      {availableBots.map((botName) => (
                        <div 
                          key={botName}
                          className={`bot-option ${selectedBots.includes(botName) ? 'selected' : ''}`}
                          onClick={() => handleBotSelection(botName)}
                        >
                          {botName}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="selected-bots-info">
                    {lobbyType === 'player_vs_bot' && (
                      <p>Selected bot: {selectedBots[0] || 'None'}</p>
                    )}
                    {lobbyType === 'bot_vs_bot' && (
                      <p>Selected bots: {selectedBots.join(' vs ') || 'None'}</p>
                    )}
                  </div>
                </div>
              )}
              
              <div className="form-actions">
                <motion.button
                  type="submit"
                  className="form-button submit-button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Create Lobby
                </motion.button>
                
                <motion.button
                  type="button"
                  className="form-button cancel-button"
                  onClick={() => setShowCreateForm(false)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Cancel
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
        
        {showJoinForm && (
          <motion.div
            className="lobby-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h2>Join Lobby</h2>
            
            <div className="lobbies-list">
              {loading ? (
                <div className="loading">Loading lobbies...</div>
              ) : lobbies.length === 0 ? (
                <div className="no-lobbies">No lobbies available</div>
              ) : (
                <div className="lobbies-grid">
                  {lobbies.map((lobby) => (
                    <motion.div
                      key={lobby.id}
                      className={`lobby-card ${selectedLobby?.id === lobby.id ? 'selected' : ''}`}
                      onClick={() => setSelectedLobby(lobby)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <h3>{lobby.name}</h3>
                      <p>Players: {lobby.players.length}/2</p>
                      <p>Type: {lobby.lobby_type.replace('_', ' ')}</p>
                      <p>Status: {lobby.status}</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
            
            <form onSubmit={handleJoinLobby}>
              <div className="form-group">
                <label htmlFor="playerNameJoin">Your Name</label>
                <input 
                  type="text" 
                  id="playerNameJoin" 
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  required
                />
              </div>
              
              <div className="form-actions">
                <motion.button
                  type="submit"
                  className="form-button submit-button"
                  disabled={!selectedLobby}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Join Selected Lobby
                </motion.button>
                
                <motion.button
                  type="button"
                  className="form-button cancel-button"
                  onClick={() => setShowJoinForm(false)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Cancel
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default LobbyPage;