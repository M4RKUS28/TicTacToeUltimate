
  // src/Home.tsx
  import React, { useState, useEffect } from 'react';
  import { useNavigate } from 'react-router-dom';
  import { fetchLobbies, createGame } from '../api/api';
  import { Lobby, GameMode } from '../interface/types';
  import './Home.css';
  
  const Home: React.FC = () => {
    const [lobbies, setLobbies] = useState<Lobby[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
    const [lobbyName, setLobbyName] = useState<string>('');
    const [selectedMode, setSelectedMode] = useState<GameMode>('HUMAN');
    
    const navigate = useNavigate();
  
    const fetchLobbyList = async () => {
      try {
        setIsLoading(true);
        const data = await fetchLobbies();
        setLobbies(data);
        setError(null);
      } catch (error) {
        setError('Failed to load lobbies. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
  
    useEffect(() => {
      fetchLobbyList();
      
      const interval = setInterval(fetchLobbyList, 5000); // Refresh every 5 seconds
      
      return () => clearInterval(interval);
    }, []);
  
    const handleJoinLobby = async (lobbyId: number) => {
      try {
        const response = await createGame({
          enemy: 'HUMAN', // When joining, assuming it's player vs player
          name: lobbies.find(lobby => lobby.lobby_id === lobbyId)?.name || 'Unknown'
        });
        
        navigate(`/game/${lobbyId}/${response.player_id}`);
      } catch (error) {
        setError('Failed to join lobby. Please try again.');
      }
    };
  
    const handleCreateLobby = async () => {
      if (!lobbyName.trim()) {
        setError('Please enter a lobby name');
        return;
      }
      
      try {
        const response = await createGame({
          enemy: selectedMode,
          name: lobbyName.trim()
        });
        
        setIsCreateModalOpen(false);
        navigate(`/game/${response.lobby_id}/${response.player_id}`);
      } catch (error) {
        setError('Failed to create lobby. Please try again.');
      }
    };
  
    return (
      <div className="home">
        <h1>Ultimate Tic Tac Toe</h1>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="lobby-controls">
          <button className="create-btn" onClick={() => setIsCreateModalOpen(true)}>
            Create New Lobby
          </button>
          <button className="refresh-btn" onClick={fetchLobbyList} disabled={isLoading}>
            {isLoading ? 'Refreshing...' : 'Refresh Lobbies'}
          </button>
        </div>
        
        <div className="lobbies-container">
          <h2>Available Lobbies</h2>
          {isLoading && <div className="loading">Loading lobbies...</div>}
          {!isLoading && lobbies.length === 0 && (
            <div className="no-lobbies">No lobbies available. Create one to start playing!</div>
          )}
          <div className="lobbies-list">
            {lobbies.map((lobby) => (
              <div key={lobby.lobby_id} className="lobby-item">
                <span className="lobby-name">{lobby.name}</span>
                <button 
                  className="join-btn"
                  onClick={() => handleJoinLobby(lobby.lobby_id)}
                >
                  Join
                </button>
              </div>
            ))}
          </div>
        </div>
        
        {isCreateModalOpen && (
          <div className="modal-overlay">
            <div className="create-modal">
              <h2>Create New Lobby</h2>
              <div className="modal-content">
                <div className="form-group">
                  <label htmlFor="lobby-name">Lobby Name:</label>
                  <input
                    id="lobby-name"
                    type="text"
                    value={lobbyName}
                    onChange={(e) => setLobbyName(e.target.value)}
                    placeholder="Enter lobby name"
                  />
                </div>
                
                <div className="form-group">
                  <label>Game Mode:</label>
                  <div className="game-modes">
                    <div 
                      className={`mode-option ${selectedMode === 'HUMAN' ? 'selected' : ''}`}
                      onClick={() => setSelectedMode('HUMAN')}
                    >
                      Player vs Player
                    </div>
                    <div 
                      className={`mode-option ${selectedMode === 'AI1' ? 'selected' : ''}`}
                      onClick={() => setSelectedMode('AI1')}
                    >
                      Player vs AI1
                    </div>
                    <div 
                      className={`mode-option ${selectedMode === 'AI2' ? 'selected' : ''}`}
                      onClick={() => setSelectedMode('AI2')}
                    >
                      Player vs AI2
                    </div>
                    <div 
                      className={`mode-option ${selectedMode === 'AI_VS_AI' ? 'selected' : ''}`}
                      onClick={() => setSelectedMode('AI_VS_AI')}
                    >
                      AI1 vs AI2
                    </div>
                  </div>
                </div>
                
                <div className="modal-actions">
                  <button className="cancel-btn" onClick={() => setIsCreateModalOpen(false)}>
                    Cancel
                  </button>
                  <button className="create-btn" onClick={handleCreateLobby}>
                    Create Lobby
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  export default Home;