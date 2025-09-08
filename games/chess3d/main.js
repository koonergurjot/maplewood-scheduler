import * as THREE from './lib/three.module.js';
import { OrbitControls } from './lib/OrbitControls.js';
import { createBoard, squareToPosition } from './board.js';
import {
  createPieces,
  placeInitialPosition,
  getPieceBySquare,
  movePieceByUci,
} from './pieces.js';
import { mountHud } from './ui/hud.js';
import { mountMoveList } from './ui/moveList.js';
import { getMode, getDifficulty } from './ui/modeBar.js';
import { initEngine, requestBestMove, cancel } from './ai/ai.js';
import { Chess } from 'https://cdn.jsdelivr.net/npm/chess.js@1.0.0/+esm';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(8, 10, 8);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);

const ambient = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
dirLight.position.set(10, 10, 0);
scene.add(dirLight);

// Construct the chess game before mounting any UI that depends on it
const game = new Chess();

createBoard(scene);
await createPieces(scene, THREE, { squareToPosition });
await placeInitialPosition();
document.querySelector('#status')?.textContent = 'Pieces ready';

await initEngine();
mountHud({ onModeChange });
// Mount the move list UI with the current game instance
mountMoveList(game);
let searchToken = 0;

function onModeChange() {
  cancel();
  searchToken++;
  maybeAIMove();
}

function gameOver() {
  return (game.game_over && game.game_over()) || (game.isGameOver && game.isGameOver());
}

async function maybeAIMove() {
  if (gameOver()) return;
  const mode = getMode();
  const aiColor = mode === 'ai-white' ? 'b' : mode === 'ai-black' ? 'w' : null;
  if (!aiColor || game.turn() !== aiColor) return;
  const token = ++searchToken;
  const fen = game.fen();
  const depth = getDifficulty();
  const { uci } = await requestBestMove(fen, { depth });
  if (token !== searchToken) return;
  const move = { from: uci.slice(0, 2), to: uci.slice(2, 4) };
  if (uci.length > 4) move.promotion = uci.slice(4);
  if (!game.move(move)) return;
  await movePieceByUci(uci);
  mountMoveList(game);
}

function humanMove(move) {
  const m =
    typeof move === 'string'
      ? { from: move.slice(0, 2), to: move.slice(2, 4), promotion: move.slice(4) || undefined }
      : move;
  const result = game.move(m);
  if (!result) return false;
  movePieceByUci(result.from + result.to + (result.promotion || ''));
  mountMoveList(game);
  searchToken++;
  maybeAIMove();
  return true;
}

window.makeMove = humanMove;

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

