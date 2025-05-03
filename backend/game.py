"""
Minimal game state representation for Tic Tac Toe Ultimate
"""

def initialize_game_state():
    """
    Initialize a new game state with empty board
    
    Returns:
        A dictionary containing the minimal game state
    """
    # Initialize a 9x9 board with all cells set to 0 (empty)
    # 0 = empty, 1 = player 1 (X), 2 = player 2 (O)
    board = [[0 for _ in range(9)] for _ in range(9)]
    
    return {
        'board': board,
        'last_move': None,
        'is_complete': False
    }

def apply_move(game_state, player_symbol, row, col):
    """
    Simply record a move without checking game rules
    
    Args:
        game_state: The current game state
        player_symbol: 1 for player 1 (X), 2 for player 2 (O)
        row: Row index (0-8)
        col: Column index (0-8)
    
    Returns:
        Updated game state with the new move
    """
    # Make a copy of the game state
    updated_state = {
        'board': [row[:] for row in game_state['board']],
        'last_move': {'row': row, 'col': col, 'player': player_symbol},
        'is_complete': game_state.get('is_complete', False)
    }
    
    # Record the move on the board
    updated_state['board'][row][col] = player_symbol
    
    return updated_state