import React, { useState } from 'react';
import { motion } from 'framer-motion';
import apiService, { CreateGameResponse } from '../services/ApiService';
import { APIGameMode } from '../types/GameTypes';
import { buttonVariants, containerVariants, textVariants } from '../utils/AnimationVariants';
import './CreateGameForm.css';

interface CreateGameFormProps {
  onSuccess: (lobby_id: number, player_id: string | null) => void;
  onCancel: () => void;
}

const CreateGameForm: React.FC<CreateGameFormProps> = ({ onSuccess, onCancel }) => {
  const [lobbyName, setLobbyName] = useState<string>("");
  const [gameMode, setGameMode] = useState<APIGameMode>("HUMAN");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!lobbyName.trim()) {
      setError("Please enter a lobby name");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiService.createGame(lobbyName, gameMode);
      
      if (result) {
        onSuccess(result.lobby_id, result.player_id);
      } else {
        setError("Failed to create game. Please try again.");
      }
    } catch (err) {
      console.error("Error creating game:", err);
      setError("An error occurred while creating the game.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="create-game-form"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.h2 variants={textVariants}>Create New Game</motion.h2>
      
      {error && (
        <motion.div 
          className="form-error"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error}
        </motion.div>
      )}
      
      <form onSubmit={handleSubmit}>
        <motion.div className="form-group" variants={textVariants}>
          <label htmlFor="lobbyName">Game Name:</label>
          <input
            type="text"
            id="lobbyName"
            value={lobbyName}
            onChange={(e) => setLobbyName(e.target.value)}
            placeholder="Enter a name for your game"
            required
            disabled={loading}
          />
        </motion.div>
        
        <motion.div className="form-group" variants={textVariants}>
          <label htmlFor="gameMode">Game Mode:</label>
          <select
            id="gameMode"
            value={gameMode}
            onChange={(e) => setGameMode(e.target.value as APIGameMode)}
            disabled={loading}
          >
            <option value="HUMAN">Player vs Player</option>
            <option value="AI1">Player vs AI (Easy)</option>
            <option value="AI2">Player vs AI (Hard)</option>
            <option value="AI_vsAI">AI vs AI (Spectate)</option>
          </select>
        </motion.div>
        
        <motion.div className="form-actions" variants={containerVariants}>
          <motion.button
            type="button"
            className="cancel-btn"
            onClick={onCancel}
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            disabled={loading}
          >
            Cancel
          </motion.button>
          
          <motion.button
            type="submit"
            className="submit-btn"
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Game"}
          </motion.button>
        </motion.div>
      </form>
    </motion.div>
  );
};

export default CreateGameForm;