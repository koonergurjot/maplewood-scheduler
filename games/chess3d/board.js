import * as THREE from './lib/three.module.js';

const BOARD_SIZE = 8;
const SQUARE_SIZE = 1;

export function squareToPosition(square) {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = parseInt(square[1], 10) - 1;
  const x = file - (BOARD_SIZE / 2 - 0.5);
  const z = rank - (BOARD_SIZE / 2 - 0.5);
  return new THREE.Vector3(x * SQUARE_SIZE, 0, z * SQUARE_SIZE);
}

export function positionToSquare(position) {
  const fileIndex = Math.round(position.x / SQUARE_SIZE + BOARD_SIZE / 2 - 0.5);
  const rankIndex = Math.round(position.z / SQUARE_SIZE + BOARD_SIZE / 2 - 0.5);
  if (
    fileIndex < 0 ||
    fileIndex >= BOARD_SIZE ||
    rankIndex < 0 ||
    rankIndex >= BOARD_SIZE
  ) {
    return null;
  }
  const file = String.fromCharCode('a'.charCodeAt(0) + fileIndex);
  const rank = (rankIndex + 1).toString();
  return file + rank;
}

export function createBoard(scene) {
  const board = new THREE.Group();
  for (let f = 0; f < BOARD_SIZE; f++) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      const color = (f + r) % 2 === 0 ? 0xffffff : 0x333333;
      const geometry = new THREE.BoxGeometry(SQUARE_SIZE, 0.1, SQUARE_SIZE);
      const material = new THREE.MeshStandardMaterial({ color });
      const square = new THREE.Mesh(geometry, material);
      const pos = squareToPosition(String.fromCharCode(97 + f) + (r + 1));
      square.position.set(pos.x, -0.05, pos.z);
      board.add(square);
    }
  }
  scene.add(board);
  return board;
}

