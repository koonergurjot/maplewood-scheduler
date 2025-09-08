import { historySAN } from '../rules.js';

// Mount or update the move list UI using the provided game instance
export function mountMoveList(game) {
  const container = document.getElementById('move-list');
  if (!container) return;
  const moves = historySAN(game);
  container.innerHTML = '';
  const list = document.createElement('ol');
  moves.forEach((san) => {
    const item = document.createElement('li');
    item.textContent = san;
    list.appendChild(item);
  });
  container.appendChild(list);
}
