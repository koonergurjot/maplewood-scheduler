export function historySAN(game) {
  // Return the history of moves in standard algebraic notation for the given game
  if (!game) return [];
  return game.history();
}
