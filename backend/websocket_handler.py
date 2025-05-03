"""
Raw WebSocket handler for bot communication in Tic Tac Toe Ultimate
"""
import json
import threading
from flask import request, current_app
from simple_websocket import Server
import uuid

# Import database models
from models import db, Lobby

# Import game logic
from game import initialize_game_state, apply_move

# Store connected bots via raw WebSockets
connected_bots_ws = {}  # Format: {bot_name: {'ws': websocket_connection, 'id': unique_id}}
active_games = {}  # This will be shared with socket_events.py

class WebSocketHandler:
    """Handler for raw WebSocket connections for bots"""
    
    def __init__(self, active_games_ref):
        """
        Initialize WebSocket handler
        
        Args:
            active_games_ref: Reference to the active_games dictionary from socket_events.py
        """
        self.active_games = active_games_ref
    
    def handle_websocket_connection(self, ws):
        """
        Handle a new WebSocket connection
        
        Args:
            ws: WebSocket connection
        """
        try:
            # Generate a unique ID for this connection
            connection_id = str(uuid.uuid4())
            
            # First message should be bot registration
            message = ws.receive()
            data = json.loads(message)
            
            if 'action' not in data or data['action'] != 'register_bot' or 'bot_name' not in data:
                ws.send(json.dumps({
                    'status': 'error',
                    'message': 'First message must be bot registration'
                }))
                return
            
            bot_name = data['bot_name']
            
            # Register the bot
            connected_bots_ws[bot_name] = {
                'ws': ws,
                'id': connection_id
            }
            
            print(f"Bot registered via WebSocket: {bot_name} with ID: {connection_id}")
            
            # Acknowledge registration
            ws.send(json.dumps({
                'status': 'success',
                'action': 'bot_registered',
                'bot_name': bot_name,
                'message': f"Bot {bot_name} registered successfully"
            }))
            
            # Main message handling loop
            while True:
                try:
                    message = ws.receive()
                    if message is None:
                        break
                    
                    data = json.loads(message)
                    self.handle_bot_message(ws, bot_name, data)
                except json.JSONDecodeError:
                    ws.send(json.dumps({
                        'status': 'error',
                        'message': 'Invalid JSON'
                    }))
                    continue
        except Exception as e:
            print(f"WebSocket error: {str(e)}")
        finally:
            # Clean up when connection closes
            for bot_name, bot_info in list(connected_bots_ws.items()):
                if bot_info['ws'] == ws:
                    del connected_bots_ws[bot_name]
                    print(f"Bot disconnected via WebSocket: {bot_name}")
                    break
    
    def handle_bot_message(self, ws, bot_name, data):
        """
        Handle a message from a bot
        
        Args:
            ws: WebSocket connection
            bot_name: Name of the bot
            data: Message data
        """
        action = data.get('action')
        
        if action == 'bot_move':
            self.handle_bot_move(ws, bot_name, data)
        else:
            ws.send(json.dumps({
                'status': 'error',
                'message': f"Unknown action: {action}"
            }))
    
    def handle_bot_move(self, ws, bot_name, data):
        """
        Handle a move from a bot
        
        Args:
            ws: WebSocket connection
            bot_name: Name of the bot
            data: Message data containing move details
        """
        lobby_id = data.get('lobby_id')
        row = data.get('row')
        col = data.get('col')
        
        if not all([lobby_id, row is not None, col is not None]):
            ws.send(json.dumps({
                'status': 'error',
                'message': 'Missing required fields'
            }))
            return
        
        # Find lobby
        lobby = Lobby.query.get(lobby_id)
        if not lobby or not lobby.is_active or not lobby.is_vs_bot:
            ws.send(json.dumps({
                'status': 'error',
                'message': 'Invalid lobby'
            }))
            return
        
        # Verify bot is in this lobby
        if lobby.bot_name != bot_name:
            ws.send(json.dumps({
                'status': 'error',
                'message': 'Bot is not in this lobby'
            }))
            return
        
        # Get game state
        game_state = self.active_games.get(lobby_id)
        if not game_state:
            ws.send(json.dumps({
                'status': 'error',
                'message': 'Game not found'
            }))
            return
        
        # Determine player symbol (1 for player1, 2 for player2)
        player_symbol = 1 if bot_name == lobby.player1 else 2
        
        # Apply move
        updated_state = apply_move(game_state, player_symbol, row, col)
        
        # Update server state
        self.active_games[lobby_id] = updated_state
        
        # Acknowledge move
        ws.send(json.dumps({
            'status': 'success',
            'action': 'move_confirmed',
            'lobby_id': lobby_id,
            'row': row,
            'col': col
        }))
        
        # Use Socket.IO to notify human players (handled by socket_events.py)
        # This will be done by the socket_events module that observes the active_games dict
        
        # Forward this to the Socket.IO handler via a callback in app.py
        from socket_events import emit_bot_move
        emit_bot_move(lobby_id, bot_name, row, col)
    
    def request_bot_move(self, lobby_id, bot_name, game_state, last_move):
        """
        Request a move from a bot via WebSocket
        
        Args:
            lobby_id: ID of the lobby
            bot_name: Name of the bot
            game_state: Current game state
            last_move: Last move made by the player
        """
        # Check if bot is connected via WebSocket
        if bot_name not in connected_bots_ws:
            from socket_events import emit_error_to_lobby
            emit_error_to_lobby(lobby_id, f"Bot '{bot_name}' is not connected")
            return
        
        try:
            # Get bot's WebSocket connection
            ws = connected_bots_ws[bot_name]['ws']
            
            # Send request to bot
            ws.send(json.dumps({
                'action': 'request_move',
                'lobby_id': lobby_id,
                'game_state': game_state,
                'last_move': last_move
            }))
            
            # Start a timer for bot response
            threading.Timer(3.0, self.bot_timeout, args=[lobby_id, bot_name]).start()
        except Exception as e:
            print(f"Error requesting bot move: {str(e)}")
            # Remove the bot if there's an error
            if bot_name in connected_bots_ws:
                del connected_bots_ws[bot_name]
    
    def bot_timeout(self, lobby_id, bot_name):
        """
        Handle bot timeout
        
        Args:
            lobby_id: ID of the lobby
            bot_name: Name of the bot
        """
        # Check if game still exists
        game_state = self.active_games.get(lobby_id)
        if not game_state:
            return
        
        # Get lobby
        lobby = Lobby.query.get(lobby_id)
        if not lobby or not lobby.is_active:
            return
        
        # Check if bot still needs to move
        last_move = game_state.get('last_move')
        if not last_move:
            # No moves yet, bot would go first if it's player1
            if lobby.player1 != bot_name:
                return
        else:
            # If last move was by bot, bot doesn't need to move
            last_player = lobby.player1 if last_move.get('player') == 1 else lobby.player2
            if last_player == bot_name:
                return
        
        # Bot timeout, other player wins
        winner = lobby.player1 if bot_name == lobby.player2 else lobby.player2
        winner_symbol = 1 if winner == lobby.player1 else 2
        
        # Update game state
        game_state['is_complete'] = True
        game_state['winner'] = winner_symbol
        
        # Notify players
        from socket_events import socketio
        socketio.emit('game_completed', {
            'lobby_id': lobby_id,
            'winner': winner,
            'winner_symbol': winner_symbol,
            'final_state': game_state,
            'reason': 'Bot timeout'
        }, room=lobby_id)
    
    def get_available_bots(self):
        """
        Get list of available bots
        
        Returns:
            List of bot names
        """
        return list(connected_bots_ws.keys())

# Initialize handler (will be properly initialized in app.py)
websocket_handler = None