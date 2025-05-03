// frontend/src/routes.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import UltimateTicTacToeGame from './components/UltimateTicTacToeGame';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<LobbyPage />} />
      <Route path="/game/:lobbyId" element={<UltimateTicTacToeGame />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;