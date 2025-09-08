export function historySAN(game) {
  // Return the history of moves in standard algebraic notation for the given game
  if (!game) return [];
  return game.history();
}

// Determine the current status of the game using the modern chess.js API
export function gameStatus(game) {
  if (!game) return '';

  if (game.inCheckmate()) return 'Checkmate';
  if (game.inStalemate()) return 'Stalemate';
  if (game.inThreefoldRepetition()) return 'Threefold repetition';
  if (game.insufficientMaterial()) return 'Insufficient material';
  if (game.isDraw && game.isDraw()) return 'Draw';
  if (game.inCheck()) return 'Check';

  return `${game.turn() === 'w' ? 'White' : 'Black'} to move`;
}
