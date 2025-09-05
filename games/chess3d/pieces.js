import * as THREE from './lib/three.module.js';
import { squareToPosition } from './board.js';

const pieces = [];

export function createPieces(scene) {
  const whiteMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const blackMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
  const pawnGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.8, 32);
  const pieceGeo = new THREE.ConeGeometry(0.5, 1, 32);

  for (let i = 0; i < 8; i++) {
    const file = String.fromCharCode(97 + i);
    let square = file + '2';
    let mesh = new THREE.Mesh(pawnGeo, whiteMaterial);
    mesh.position.copy(squareToPosition(square));
    scene.add(mesh);
    pieces.push({ id: `wP${i}`, mesh, square });

    square = file + '7';
    mesh = new THREE.Mesh(pawnGeo, blackMaterial);
    mesh.position.copy(squareToPosition(square));
    scene.add(mesh);
    pieces.push({ id: `bP${i}`, mesh, square });
  }

  const order = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  for (let i = 0; i < 8; i++) {
    const file = String.fromCharCode(97 + i);
    let square = file + '1';
    let mesh = new THREE.Mesh(pieceGeo, whiteMaterial);
    mesh.position.copy(squareToPosition(square));
    scene.add(mesh);
    pieces.push({ id: `w${order[i]}${i}`, mesh, square });

    square = file + '8';
    mesh = new THREE.Mesh(pieceGeo, blackMaterial);
    mesh.position.copy(squareToPosition(square));
    scene.add(mesh);
    pieces.push({ id: `b${order[i]}${i}`, mesh, square });
  }
}

export function movePiece(id, to, animate = false) {
  const piece = pieces.find((p) => p.id === id);
  if (!piece) return;
  const target = squareToPosition(to);
  if (animate) {
    const start = piece.mesh.position.clone();
    const duration = 300;
    const startTime = performance.now();
    function step(time) {
      const t = Math.min((time - startTime) / duration, 1);
      piece.mesh.position.lerpVectors(start, target, t);
      if (t < 1) {
        requestAnimationFrame(step);
      }
    }
    requestAnimationFrame(step);
  } else {
    piece.mesh.position.copy(target);
  }
  piece.square = to;
}

export function findBySquare(square) {
  return pieces.find((p) => p.square === square);
}

export function listPieces() {
  return pieces.slice();
}

