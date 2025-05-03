// ultimate-ttt.js
// Fetches and renders an Ultimate Tic Tac Toe board every 5 seconds

const API_URL = '/api/gamestate';

// Cache DOM nodes
const statusEl = document.getElementById('status');
const container = document.getElementById('game-container');

/**
 * Renders the overall 3x3 grid of small boards
 * @param {Array<Array<string|null>>} gameState 9×9 array of 'X', 'O', or null
 * @param {[number, number]} lastMove [row, col] zero-based indices
 * @param {string} currentPlayer 'X' or 'O'
 */
function renderBoard(gameState, lastMove, currentPlayer) {
  // Update status
  statusEl.textContent = `Current player: ${currentPlayer}`;

  // Clear existing
  container.innerHTML = '';

  // Main 3×3 of small boards
  for (let br = 0; br < 3; br++) {
    const rowWrap = document.createElement('div');
    rowWrap.className = 'flex';

    for (let bc = 0; bc < 3; bc++) {
      const small = document.createElement('div');
      small.className = 'grid grid-cols-3 grid-rows-3 gap-1 border-2 border-gray-800 p-1';

      // 3×3 cells in this small board
      for (let sr = 0; sr < 3; sr++) {
        for (let sc = 0; sc < 3; sc++) {
          const gr = br * 3 + sr;
          const gc = bc * 3 + sc;
          const val = gameState[gr][gc];

          const cell = document.createElement('div');
          cell.className = 'w-12 h-12 flex items-center justify-center border border-gray-400';
          cell.textContent = val || '';

          // Highlight last move
          if (lastMove && lastMove[0] === gr && lastMove[1] === gc) {
            cell.classList.add('bg-yellow-200');
          }

          small.appendChild(cell);
        }
      }
      rowWrap.appendChild(small);
    }
    container.appendChild(rowWrap);
  }
}

/**
 * Fetches game state and triggers rendering
 */
async function fetchGameState() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { player, last_move, game_state } = await res.json();
    renderBoard(game_state, last_move, player);
  } catch (err) {
    console.error('Unable to fetch game state:', err);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  fetchGameState();
  setInterval(fetchGameState, 5000);
});
