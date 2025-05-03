"""
Socket.IO event handlers for Tic Tac Toe Ultimate - with WebSocket integration
"""
import json
import threading
import time
from flask import request
from flask_socketio import SocketIO, emit, join_room, leave_room

from models import db, Lobby
from game import initialize_game_state, apply_move

# Initialize Socket.IO instance
socketio = SocketIO()

# Store active games in memory (will be shared with websocket_handler.py)
active_games = {}

# Store connected bots via Socket.IO (legacy)
connected_bots_socketio = {}

# Store player to SID mapping
player_sids = {}

# Store SID to player mapping
sid_players = {}

# Reference to WebSocket handler (will be set in app.py)
websocket_handler = None

def emit_error_to_lobby(lobby_id, message):
    """
    Emit an error message to a lobby
    
    Args:
        lobby_id: ID of the lobby
        message: Error message
    """
    socketio.emit('error', {
        'message': message
    }, room=lobby_id)

def emit_bot_move(lobby_id, bot_name, row, col):
    """
    Emit a bot move event from WebSocket to Socket.IO clients
    
    Args:
        lobby_id: ID of the lobby
        bot_name: Name of the bot
        row: Row index of the move
        col: Column index of the move
    """
    # Find lobby
    lobby = Lobby.query.get(lobby_id)
    if not lobby or not lobby.is_active:
        return
    
    # Notify players about the move
    socketio.emit('move_made', {
        'lobby_id': lobby_id,
        'player': bot_name,
        'row': row,
        'col': col,
        'state': active_games.get(lobby_id, {})
    }, room=lobby_id)

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    print(f"Client connected: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    sid = request.sid
    print(f"Client disconnected: {sid}")
    
    # Check if this is a player
    if sid in sid_players:
        player_name = sid_players[sid]
        
        # Remove from mappings
        del player_sids[player_name]
        del sid_players[sid]
        
        # Check if player is in a lobby
        lobbies = Lobby.query.filter(
            ((Lobby.player1 == player_name) | (Lobby.player2 == player_name)) & 
            (Lobby.is_active == True)
        ).all()
        
        for lobby in lobbies:
            if lobby.player1 == player_name:
                # Creator left, close the lobby
                lobby.is_active = False
                db.session.commit()
                
                # Notify other player if exists
                if lobby.player2 and lobby.player2 in player_sids:
                    emit('lobby_closed', {
                        'lobby': lobby.to_dict(),
                        'reason': 'Creator left'
                    }, room=player_sids[lobby.player2])
            else:
                # Player 2 left, mark as not full
                lobby.player2 = None
                lobby.is_full = False
                db.session.commit()
                
                # Notify creator
                if lobby.player1 in player_sids:
                    emit('player_left', {
                        'lobby': lobby.to_dict(),
                        'player': player_name
                    }, room=player_sids[lobby.player1])
    
    # Check if this is a bot (legacy Socket.IO bots)
    for bot_name, bot_sid in list(connected_bots_socketio.items()):
        if bot_sid == sid:
            print(f"Bot disconnected (Socket.IO): {bot_name}")
            del connected_bots_socketio[bot_name]
            break

@socketio.on('register_player')
def handle_register_player(data):
    """
    Register a player with their name
    
    Expected data:
    {
        'player_name': str
    }
    """
    player_name = data.get('player_name')
    
    if not player_name:
        emit('error', {'message': 'Missing player_name'})
        return
    
    # Register this SID for the player
    player_sids[player_name] = request.sid
    sid_players[request.sid] = player_name
    
    emit('registered', {'player_name': player_name})

@socketio.on('register_bot')
def handle_register_bot(data):
    """
    Register a bot with the server via Socket.IO (legacy method)
    
    Expected data:
    {
        'bot_name': str
    }
    """
    bot_name = data.get('bot_name')
    
    if not bot_name:
        emit('error', {'message': 'Missing bot_name'})
        return
    
    # Register this SID for the bot
    connected_bots_socketio[bot_name] = request.sid
    
    print(f"Bot registered via Socket.IO (legacy): {bot_name} with SID: {request.sid}")
    emit('bot_registered', {
        'bot_name': bot_name,
        'message': f"Bot {bot_name} registered successfully via Socket.IO (legacy)"
    })

@socketio.on('get_lobbies')
def handle_get_lobbies():
    """Get list of available lobbies"""
    lobbies = Lobby.query.filter_by(is_active=True, is_full=False).all()
    emit('lobbies', [lobby.to_dict() for lobby in lobbies])

@socketio.on('get_bots')
def handle_get_bots():
    """Get list of available bots"""
    # Combine bots from both Socket.IO and WebSockets
    socketio_bots = list(connected_bots_socketio.keys())
    websocket_bots = websocket_handler.get_available_bots() if websocket_handler else []
    
    emit('bots', list(set(socketio_bots + websocket_bots)))

@socketio.on('create_lobby')
def handle_create_lobby(data):
    """
    Create a new lobby
    
    Expected data:
    {
        'name': str,
        'player_name': str,
        'is_vs_bot': bool,
        'bot_name': str (optional, required if is_vs_bot is True)
    }
    """
    name = data.get('name')
    player_name = data.get('player_name')
    is_vs_bot = data.get('is_vs_bot', False)
    bot_name = data.get('bot_name') if is_vs_bot else None
    
    if not name or not player_name:
        emit('error', {'message': 'Missing required fields'})
        return
    
    # If bot game, verify bot exists
    if is_vs_bot:
        if not bot_name:
            emit('error', {'message': 'Bot name is required for bot games'})
            return
        
        # Check both Socket.IO and WebSocket bots
        socketio_bots = list(connected_bots_socketio.keys())
        websocket_bots = websocket_handler.get_available_bots() if websocket_handler else []
        all_bots = set(socketio_bots + websocket_bots)
        
        if bot_name not in all_bots:
            emit('error', {'message': f"Bot '{bot_name}' is not available"})
            return
    
    # Create new lobby
    lobby = Lobby(
        name=name,
        creator=player_name,
        is_vs_bot=is_vs_bot,
        bot_name=bot_name,
        player1=player_name,
        player2=bot_name if is_vs_bot else None,
        is_full=is_vs_bot  # Bot games are full immediately
    )
    
    db.session.add(lobby)
    db.session.commit()
    
    # Join the lobby room
    join_room(lobby.id)
    
    emit('lobby_created', lobby.to_dict())

@socketio.on('join_lobby')
def handle_join_lobby(data):
    """
    Join an existing lobby
    
    Expected data:
    {
        'lobby_id': str,
        'player_name': str
    }
    """
    lobby_id = data.get('lobby_id')
    player_name = data.get('player_name')
    
    if not lobby_id or not player_name:
        emit('error', {'message': 'Missing required fields'})
        return
    
    # Find lobby in database
    lobby = Lobby.query.get(lobby_id)
    if not lobby:
        emit('error', {'message': 'Lobby not found'})
        return
    
    if not lobby.is_active:
        emit('error', {'message': 'Lobby is no longer active'})
        return
    
    if lobby.is_full:
        emit('error', {'message': 'Lobby is full'})
        return
    
    # Add player to lobby
    lobby.player2 = player_name
    lobby.is_full = True
    db.session.commit()
    
    # Join socket.io room
    join_room(lobby_id)
    
    # Notify lobby creator
    if lobby.player1 in player_sids:
        emit('player_joined', {
            'lobby': lobby.to_dict(),
            'player': player_name
        }, room=player_sids[lobby.player1])
    
    emit('joined_lobby', {
        'lobby': lobby.to_dict()
    })

@socketio.on('start_game')
def handle_start_game(data):
    """
    Start a game
    
    Expected data:
    {
        'lobby_id': str,
        'player_name': str
    }
    """
    lobby_id = data.get('lobby_id')
    player_name = data.get('player_name')
    
    if not lobby_id or not player_name:
        emit('error', {'message': 'Missing required fields'})
        return
    
    # Find lobby in database
    lobby = Lobby.query.get(lobby_id)
    if not lobby:
        emit('error', {'message': 'Lobby not found'})
        return
    
    if not lobby.is_active:
        emit('error', {'message': 'Lobby is no longer active'})
        return
    
    if lobby.creator != player_name:
        emit('error', {'message': 'Only the creator can start the game'})
        return
    
    if not lobby.is_full:
        emit('error', {'message': 'Cannot start game, lobby not full'})
        return
    
    # Initialize game state
    game_state = initialize_game_state()
    active_games[lobby_id] = game_state
    
    # Notify both players
    emit('game_started', {
        'lobby_id': lobby_id,
        'initial_state': game_state,
        'current_player': lobby.player1
    }, room=lobby_id)
    
    # If vs bot and bot goes first, get bot's move
    if lobby.is_vs_bot and lobby.player1 == lobby.bot_name:
        request_bot_move(lobby_id, lobby.bot_name, game_state, None)

@socketio.on('make_move')
def handle_make_move(data):
    """
    Make a move in a game - client is responsible for validating moves and determining turns
    
    Expected data:
    {
        'lobby_id': str,
        'player_name': str,
        'row': int,
        'col': int,
        'game_state': dict (optional, client can send updated state)
    }
    """
    lobby_id = data.get('lobby_id')
    player_name = data.get('player_name')
    row = data.get('row')
    col = data.get('col')
    client_game_state = data.get('game_state')
    
    if not all([lobby_id, player_name, row is not None, col is not None]):
        emit('error', {'message': 'Missing required fields'})
        return
    
    # Find lobby in database
    lobby = Lobby.query.get(lobby_id)
    if not lobby:
        emit('error', {'message': 'Lobby not found'})
        return
    
    if not lobby.is_active:
        emit('error', {'message': 'Lobby is no longer active'})
        return
    
    # Get game state
    game_state = active_games.get(lobby_id)
    if not game_state:
        emit('error', {'message': 'Game not found'})
        return
    
    # Use client state if provided, otherwise update server state
    if client_game_state:
        updated_state = client_game_state
    else:
        # Determine player symbol (1 for player1, 2 for player2)
        player_symbol = 1 if player_name == lobby.player1 else 2
        updated_state = apply_move(game_state, player_symbol, row, col)
    
    # Update server state
    active_games[lobby_id] = updated_state
    
    # Notify both players about the move
    emit('move_made', {
        'lobby_id': lobby_id,
        'player': player_name,
        'row': row,
        'col': col,
        'state': updated_state
    }, room=lobby_id)
    
    # If game is complete (client reports this), notify both players
    if updated_state.get('is_complete'):
        emit('game_completed', {
            'lobby_id': lobby_id,
            'winner': updated_state.get('winner'),
            'final_state': updated_state
        }, room=lobby_id)
    
    # If vs bot and it's bot's turn, get bot's move
    elif lobby.is_vs_bot:
        # Get the other player
        next_player = lobby.player2 if player_name == lobby.player1 else lobby.player1
        
        # If next player is a bot, request move
        if next_player == lobby.bot_name:
            request_bot_move(lobby_id, lobby.bot_name, updated_state, {'row': row, 'col': col})

@socketio.on('game_won')
def handle_game_won(data):
    """
    Handle client reporting that a game is won
    
    Expected data:
    {
        'lobby_id': str,
        'winner': str,
        'final_state': dict
    }
    """
    lobby_id = data.get('lobby_id')
    winner = data.get('winner')
    final_state = data.get('final_state')
    
    if not all([lobby_id, winner, final_state]):
        return
    
    # Update server state
    active_games[lobby_id] = final_state
    
    # Broadcast to all players in the lobby
    emit('game_completed', {
        'lobby_id': lobby_id,
        'winner': winner,
        'final_state': final_state
    }, room=lobby_id)

@socketio.on('bot_move')
def handle_bot_move(data):
    """
    Handle a move from a bot via Socket.IO (legacy method)
    
    Expected data:
    {
        'lobby_id': str,
        'row': int,
        'col': int
    }
    """
    lobby_id = data.get('lobby_id')
    row = data.get('row')
    col = data.get('col')
    
    if not all([lobby_id, row is not None, col is not None]):
        return
    
    # Find lobby
    lobby = Lobby.query.get(lobby_id)
    if not lobby or not lobby.is_active or not lobby.is_vs_bot:
        return
    
    # Get bot name
    bot_name = lobby.bot_name
    if not bot_name:
        return
    
    # Verify bot is making the move
    if connected_bots_socketio.get(bot_name) != request.sid:
        return
    
    # Make the move
    socketio.emit('make_move', {
        'lobby_id': lobby_id,
        'player_name': bot_name,
        'row': row,
        'col': col
    })

def request_bot_move(lobby_id, bot_name, game_state, last_move):
    """
    Request a move from a bot
    
    Args:
        lobby_id: ID of the lobby
        bot_name: Name of the bot
        game_state: Current game state
        last_move: Last move made by the player
    """
    # First check if the bot is connected via WebSocket (preferred method)
    if websocket_handler and bot_name in websocket_handler.get_available_bots():
        websocket_handler.request_bot_move(lobby_id, bot_name, game_state, last_move)
        return
    
    # Fall back to Socket.IO if bot is not connected via WebSocket
    bot_sid = connected_bots_socketio.get(bot_name)
    if not bot_sid:
        socketio.emit('error', {
            'message': f"Bot '{bot_name}' is not connected"
        }, room=lobby_id)
        return
    
    # Request move from bot
    socketio.emit('request_move', {
        'lobby_id': lobby_id,
        'game_state': game_state,
        'last_move': last_move
    }, room=bot_sid)
    
    # Start a timer for bot response
    threading.Timer(3.0, bot_timeout, args=[lobby_id, bot_name]).start()

def bot_timeout(lobby_id, bot_name):
    """
    Handle bot timeout
    
    Args:
        lobby_id: ID of the lobby
        bot_name: Name of the bot
    """
    # Check if game still exists
    game_state = active_games.get(lobby_id)
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
        # If last move was by bot's opponent, bot should move
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
    socketio.emit('game_completed', {
        'lobby_id': lobby_id,
        'winner': winner,
        'winner_symbol': winner_symbol,
        'final_state': game_state,
        'reason': 'Bot timeout'
    }, room=lobby_id)