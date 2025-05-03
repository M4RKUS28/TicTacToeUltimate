import socketio

# Create Socket.IO client
sio = socketio.Client()

@sio.event
def connect():
    print('Bot connected to server')
    sio.emit('register_bot', {'bot_name': 'PythonBot'})

@sio.event
def disconnect():
    print('Bot disconnected from server')

@sio.on('request_move')
def handle_move_request(data):
    print('Move requested:', data)
    
    # Your bot's move logic here
    row = 0  # Calculate based on game state
    col = 0  # Calculate based on game state
    
    # Send the move back to the server
    sio.emit('bot_move', {
        'lobby_id': data['lobby_id'],
        'row': row,
        'col': col
    })

# Connect to the server
sio.connect('http://localhost:5000')
sio.wait()