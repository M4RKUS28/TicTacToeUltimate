"""
Main application entry point for Tic Tac Toe Ultimate backend
"""
import os
import eventlet

# Patch the standard library to use Eventlet's green versions
eventlet.monkey_patch()

from flask import Flask, render_template
from flask_cors import CORS

# Import configuration
import config

# Import database models
from models import db, Lobby

# Import Socket.IO events
from socket_events import socketio

def create_app():
    """Create and configure the Flask application"""
    app = Flask(__name__)
    
    # Configure app
    app.config['SECRET_KEY'] = config.SECRET_KEY
    app.config['SQLALCHEMY_DATABASE_URI'] = config.SQLALCHEMY_DATABASE_URI
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = config.SQLALCHEMY_TRACK_MODIFICATIONS
    
    # Initialize CORS - allow all origins for Socket.IO
    CORS(app, resources={r"/*": {"origins": "*"}})
    
    # Initialize database
    db.init_app(app)
    
    # Initialize Socket.IO with explicit WebSocket transport
    socketio.init_app(app, 
                     cors_allowed_origins="*", 
                     async_mode='eventlet',
                     logger=True,  # Enable logging
                     engineio_logger=True)  # Engine.IO logging
    
    # Create database tables if they don't exist
    with app.app_context():
        db.create_all()
    
    # Add a basic route for testing
    @app.route('/')
    def index():
        return "Tic Tac Toe Ultimate Server is running!"
    
    return app

if __name__ == '__main__':
    # Create app
    app = create_app()
    
    try:
        # Get port from environment or use default
        port = int(os.environ.get('PORT', 5000))
        
        # Start server
        print(f"Starting server on port {port}")
        socketio.run(app, host='0.0.0.0', port=port, debug=True)
    except KeyboardInterrupt:
        print("Server stopped by user")