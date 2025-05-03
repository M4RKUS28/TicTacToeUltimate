"""
Database models for the Tic Tac Toe Ultimate backend
"""
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, String, Boolean, DateTime
from datetime import datetime
import uuid

db = SQLAlchemy()

class Lobby(db.Model):
    """Represents a game lobby where players join and play"""
    __tablename__ = 'lobbies'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    creator = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_vs_bot = Column(Boolean, default=False)
    bot_name = Column(String(100), nullable=True)
    is_full = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    player1 = Column(String(100), nullable=False)
    player2 = Column(String(100), nullable=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'creator': self.creator,
            'created_at': self.created_at.isoformat(),
            'is_vs_bot': self.is_vs_bot,
            'bot_name': self.bot_name,
            'is_full': self.is_full,
            'is_active': self.is_active,
            'player1': self.player1,
            'player2': self.player2
        }