
  
  
  // src/App.tsx
  import React from 'react';
  import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
  import Home from './components/Home';
  import GameBoard from './components/GameBoard';
  import './App.css';
  
  const App: React.FC = () => {
    return (
      <Router>
        <div className="app">
          <Routes>
            <Route path="/game/:lobbyId/:playerId" element={<GameBoard />} />
            <Route path="/" element={<Home />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    );
  };
  
  export default App;
