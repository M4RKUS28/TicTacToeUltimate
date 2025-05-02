import { BoardState, CellValue, GameState, Move, Player } from '../types/GameTypes';
import { checkWinner, coordinatesToIndex, isBoardFull } from '../utils/GameUtils';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

interface AIService {
  getMove: (gameState: GameState) => Promise<Omit<Move, 'player'>>;
  setDifficulty: (difficulty: AIDifficulty) => void;
}

class BasicAIService implements AIService {
  private difficulty: AIDifficulty = 'medium';
  
  /**
   * Set the AI difficulty level
   * @param difficulty The desired difficulty level
   */
  setDifficulty(difficulty: AIDifficulty): void {
    this.difficulty = difficulty;
  }
  
  /**
   * Get an AI move based on the current game state
   * @param gameState Current game state
   * @returns Promise that resolves to the AI's move
   */
  async getMove(gameState: GameState): Promise<Omit<Move, 'player'>> {
    // Add small delay to make it look like AI is "thinking"
    await new Promise(resolve => setTimeout(resolve, 600));
    
    switch (this.difficulty) {
      case 'easy':
        return this.getRandomMove(gameState);
      case 'medium':
        return this.getMediumMove(gameState);
      case 'hard':
        return this.getMinimaxMove(gameState);
      default:
        return this.getRandomMove(gameState);
    }
  }
  
  /**
   * Get a completely random valid move
   * @param gameState Current game state
   * @returns A random valid move
   */
  private getRandomMove(gameState: GameState): Omit<Move, 'player'> {
    const { boards, nextBoard, boardWinners } = gameState;
    
    // Determine which board to play on
    let validBoardIndices: number[] = [];
    
    if (nextBoard !== null && boardWinners[nextBoard] === null) {
      // Must play on the designated board
      validBoardIndices = [nextBoard];
    } else {
      // Can play on any board that isn't won yet
      validBoardIndices = boardWinners
        .map((winner, index) => winner === null ? index : -1)
        .filter(index => index !== -1);
    }
    
    // Randomly select a board to play on
    const boardIndex = validBoardIndices[Math.floor(Math.random() * validBoardIndices.length)];
    
    // Find all empty cells on this board
    const emptyCells: Array<{ row: number; col: number }> = [];
    
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        if (boards[boardIndex][row][col] === null) {
          emptyCells.push({ row, col });
        }
      }
    }
    
    // Randomly select an empty cell
    const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    
    return { boardIndex, row, col };
  }
  
  /**
   * Medium difficulty - prioritizes winning moves and blocking opponent wins
   * @param gameState Current game state
   * @returns A strategic move
   */
  private getMediumMove(gameState: GameState): Omit<Move, 'player'> {
    const { boards, nextBoard, boardWinners, currentPlayer } = gameState;
    
    // Determine which board to play on
    let validBoardIndices: number[] = [];
    
    if (nextBoard !== null && boardWinners[nextBoard] === null) {
      // Must play on the designated board
      validBoardIndices = [nextBoard];
    } else {
      // Can play on any board that isn't won yet
      validBoardIndices = boardWinners
        .map((winner, index) => winner === null ? index : -1)
        .filter(index => index !== -1);
    }
    
    // For each valid board, check if we can win or block
    for (const boardIndex of validBoardIndices) {
      // Check if we can win in this board
      const winningMove = this.findWinningMove(boards[boardIndex], currentPlayer);
      if (winningMove) {
        return { boardIndex, ...winningMove };
      }
      
      // Check if we need to block opponent
      const opponentPlayer = currentPlayer === 'X' ? 'O' : 'X';
      const blockingMove = this.findWinningMove(boards[boardIndex], opponentPlayer);
      if (blockingMove) {
        return { boardIndex, ...blockingMove };
      }
    }
    
    // No winning or blocking moves, pick center if available
    for (const boardIndex of validBoardIndices) {
      if (boards[boardIndex][1][1] === null) {
        return { boardIndex, row: 1, col: 1 };
      }
    }
    
    // Otherwise, pick a random corner if available
    const corners = [
      { row: 0, col: 0 },
      { row: 0, col: 2 },
      { row: 2, col: 0 },
      { row: 2, col: 2 }
    ];
    
    for (const boardIndex of validBoardIndices) {
      const availableCorners = corners.filter(
        ({ row, col }) => boards[boardIndex][row][col] === null
      );
      
      if (availableCorners.length > 0) {
        const corner = availableCorners[Math.floor(Math.random() * availableCorners.length)];
        return { boardIndex, ...corner };
      }
    }
    
    // If all else fails, pick a random move
    return this.getRandomMove(gameState);
  }
  
  /**
   * Find a winning move for the given player on the given board
   * @param board The board to check
   * @param player The player to find a winning move for
   * @returns The winning move, or null if none exists
   */
  private findWinningMove(board: BoardState, player: Player): { row: number, col: number } | null {
    // Check rows
    for (let row = 0; row < 3; row++) {
      if (this.isTwoInARow(board[row], player)) {
        // Find the empty cell
        for (let col = 0; col < 3; col++) {
          if (board[row][col] === null) {
            return { row, col };
          }
        }
      }
    }
    
    // Check columns
    for (let col = 0; col < 3; col++) {
      const column = [board[0][col], board[1][col], board[2][col]];
      if (this.isTwoInARow(column, player)) {
        // Find the empty cell
        for (let row = 0; row < 3; row++) {
          if (board[row][col] === null) {
            return { row, col };
          }
        }
      }
    }
    
    // Check diagonals
    const diagonal1 = [board[0][0], board[1][1], board[2][2]];
    if (this.isTwoInARow(diagonal1, player)) {
      for (let i = 0; i < 3; i++) {
        if (board[i][i] === null) {
          return { row: i, col: i };
        }
      }
    }
    
    const diagonal2 = [board[0][2], board[1][1], board[2][0]];
    if (this.isTwoInARow(diagonal2, player)) {
      const positions = [[0, 2], [1, 1], [2, 0]];
      for (let i = 0; i < 3; i++) {
        const [row, col] = positions[i];
        if (board[row][col] === null) {
          return { row, col };
        }
      }
    }
    
    return null;
  }
  
  /**
   * Check if the given line has two of the player's marks and one empty cell
   * @param line Array of three cells
   * @param player The player to check for
   * @returns True if the line has two of the player's marks and one empty cell
   */
  private isTwoInARow(line: CellValue[], player: Player): boolean {
    const playerCount = line.filter(cell => cell === player).length;
    const emptyCount = line.filter(cell => cell === null).length;
    return playerCount === 2 && emptyCount === 1;
  }
  
  /**
   * Hard difficulty - uses minimax algorithm to find optimal move
   * Note: This is a simplified implementation and doesn't consider the full game tree
   * @param gameState Current game state
   * @returns The optimal move
   */
  private getMinimaxMove(gameState: GameState): Omit<Move, 'player'> {
    // For simplicity, we'll just focus on the current board
    // A full implementation would consider the entire game tree
    
    const { boards, nextBoard, boardWinners, currentPlayer } = gameState;
    
    // Determine which board to play on
    let boardToPlay: number;
    
    if (nextBoard !== null && boardWinners[nextBoard] === null) {
      boardToPlay = nextBoard;
    } else {
      // Find a strategic board
      const availableBoards = boardWinners
        .map((winner, index) => winner === null ? index : -1)
        .filter(index => index !== -1);
      
      // Prefer boards that would send opponent to a won board
      const strategicBoard = availableBoards.find(boardIndex => {
        const board = boards[boardIndex];
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 3; col++) {
            if (board[row][col] === null) {
              const nextBoardIndex = coordinatesToIndex(row, col);
              if (boardWinners[nextBoardIndex] !== null) {
                return true;
              }
            }
          }
        }
        return false;
      });
      
      if (strategicBoard !== undefined) {
        boardToPlay = strategicBoard;
      } else {
        // Fallback to medium move if no strategic board
        return this.getMediumMove(gameState);
      }
    }
    
    // Find the best move on this board
    let bestScore = -Infinity;
    let bestMove: { row: number, col: number } = { row: 0, col: 0 };
    
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        // Check if cell is empty
        if (boards[boardToPlay][row][col] === null) {
          // Make the move
          const boardCopy = JSON.parse(JSON.stringify(boards[boardToPlay]));
          boardCopy[row][col] = currentPlayer;
          
          // Calculate score with minimax
          const score = this.minimax(boardCopy, 0, false, currentPlayer);
          
          // Update best move
          if (score > bestScore) {
            bestScore = score;
            bestMove = { row, col };
          }
        }
      }
    }
    
    return { boardIndex: boardToPlay, ...bestMove };
  }
  
  /**
   * Minimax algorithm for finding optimal move
   * @param board Current board state
   * @param depth Current depth in the search tree
   * @param isMaximizing Whether we're maximizing or minimizing
   * @param player The AI player
   * @returns The score for this board position
   */
  private minimax(
    board: BoardState,
    depth: number,
    isMaximizing: boolean,
    player: Player
  ): number {
    // Terminal states
    const winner = checkWinner(board);
    if (winner === player) return 10 - depth;
    if (winner && winner !== player) return depth - 10;
    if (isBoardFull(board)) return 0;
    
    const opponent = player === 'X' ? 'O' : 'X';
    
    if (isMaximizing) {
      let bestScore = -Infinity;
      
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          // Check if cell is empty
          if (board[row][col] === null) {
            // Make the move
            board[row][col] = player;
            
            // Calculate score
            const score = this.minimax(board, depth + 1, false, player);
            
            // Undo the move
            board[row][col] = null;
            
            // Update best score
            bestScore = Math.max(bestScore, score);
          }
        }
      }
      
      return bestScore;
    } else {
      let bestScore = Infinity;
      
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          // Check if cell is empty
          if (board[row][col] === null) {
            // Make the move
            board[row][col] = opponent;
            
            // Calculate score
            const score = this.minimax(board, depth + 1, true, player);
            
            // Undo the move
            board[row][col] = null;
            
            // Update best score
            bestScore = Math.min(bestScore, score);
          }
        }
      }
      
      return bestScore;
    }
  }
}

// Export a singleton instance
export const aiService = new BasicAIService();
export default aiService;