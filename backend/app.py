"""
Main application entry point for Tic Tac Toe Ultimate backend
"""
import os
import eventlet

# Patch the standard library to use Eventlet's green versions
eventlet.monkey_patch()

from flask import Flask, render_template, request
from flask_cors import CORS
from simple_websocket import Server, ConnectionClosed

# Import configuration
import config

# Import database models
from models import db, Lobby

# Import Socket.IO events
from socket_events import socketio, active_games, websocket_handler

# Import WebSocket handler
from websocket_handler import WebSocketHandler

def create_app():
    """Create and configure the Flask application"""
    app = Flask(__name__)
    
    # Configure app
    app.config['SECRET_KEY'] = config.SECRET_KEY
    app.config['SQLALCHEMY_DATABASE_URI'] = config.SQLALCHEMY_DATABASE_URI
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = config.SQLALCHEMY_TRACK_MODIFICATIONS
    
    # Initialize CORS - allow all origins for both Socket.IO and WebSockets
    CORS(app, resources={r"/*": {"origins": "*"}})
    
    # Initialize database
    db.init_app(app)
    
    # Initialize Socket.IO with explicit WebSocket transport
    socketio.init_app(app, 
                     cors_allowed_origins="*", 
                     async_mode='eventlet',
                     logger=True,  # Enable logging
                     engineio_logger=True)  # Engine.IO logging
    
    # Initialize WebSocket handler with reference to active_games
    global websocket_handler
    from websocket_handler import websocket_handler as ws_handler_module
    ws_handler = WebSocketHandler(active_games)
    ws_handler_module = ws_handler
    
    # Set the WebSocket handler reference in socket_events.py
    import socket_events
    socket_events.websocket_handler = ws_handler
    
    # Create database tables if they don't exist
    with app.app_context():
        db.create_all()
    
    # Add a basic route for testing
    @app.route('/')
    def index():
        return "Tic Tac Toe Ultimate Server is running!"
    
    # Add WebSocket endpoint for bots
    @app.route('/bot', websocket=True)
    def bot_websocket():
        """Handle WebSocket connections for bots"""
        ws = Server(request.environ)
        try:
            ws_handler.handle_websocket_connection(ws)
        except ConnectionClosed:
            pass
        return ''
    
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