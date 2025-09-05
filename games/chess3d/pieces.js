let sceneRef;
let helpersRef;
let THREERef;

const pieces = new Map();
let materials;

function buildPieceMesh(type, color) {
  const material = materials[color];
  const group = new THREERef.Group();

  const base = new THREERef.Mesh(
    new THREERef.CylinderGeometry(0.4, 0.4, 0.8, 8),
    material,
  );
  group.add(base);

  function add(obj, x = 0, y = 0, z = 0) {
    obj.position.set(x, y, z);
    group.add(obj);
  }

  switch (type) {
    case 'p': {
      const head = new THREERef.Mesh(
        new THREERef.SphereGeometry(0.3, 8, 8),
        material,
      );
      add(head, 0, 0.65, 0);
      break;
    }
    case 'r': {
      const top = new THREERef.Mesh(
        new THREERef.CylinderGeometry(0.4, 0.4, 0.2, 8),
        material,
      );
      add(top, 0, 0.5, 0);
      break;
    }
    case 'n': {
      const head = new THREERef.Mesh(
        new THREERef.SphereGeometry(0.35, 8, 8),
        material,
      );
      add(head, 0.2, 0.45, 0);
      break;
    }
    case 'b': {
      const head = new THREERef.Mesh(
        new THREERef.SphereGeometry(0.3, 8, 8),
        material,
      );
      add(head, 0, 0.6, 0);
      break;
    }
    case 'q': {
      const top = new THREERef.Mesh(
        new THREERef.CylinderGeometry(0.35, 0.35, 0.2, 8),
        material,
      );
      add(top, 0, 0.5, 0);
      const crown = new THREERef.Mesh(
        new THREERef.SphereGeometry(0.35, 8, 8),
        material,
      );
      add(crown, 0, 0.8, 0);
      break;
    }
    case 'k': {
      const crown = new THREERef.Mesh(
        new THREERef.SphereGeometry(0.35, 8, 8),
        material,
      );
      add(crown, 0, 0.8, 0);
      const crossV = new THREERef.Mesh(
        new THREERef.CylinderGeometry(0.05, 0.05, 0.4, 8),
        material,
      );
      add(crossV, 0, 1.1, 0);
      const crossH = new THREERef.Mesh(
        new THREERef.CylinderGeometry(0.05, 0.05, 0.3, 8),
        material,
      );
      crossH.rotation.z = Math.PI / 2;
      add(crossH, 0, 1.1, 0);
      break;
    }
  }

  return group;
}

export async function createPieces(scene, THREE, helpers) {
  sceneRef = scene;
  THREERef = THREE;
  helpersRef = helpers;
  materials = {
    w: new THREERef.MeshStandardMaterial({ color: 0xffffff }),
    b: new THREERef.MeshStandardMaterial({ color: 0x000000 }),
  };
}

function addPiece(square, type, color) {
  const mesh = buildPieceMesh(type, color);
  mesh.position.copy(helpersRef.squareToPosition(square));
  sceneRef.add(mesh);
  pieces.set(square, { square, type, color, mesh });
}

export async function placeInitialPosition() {
  for (const { mesh } of pieces.values()) {
    sceneRef.remove(mesh);
  }
  pieces.clear();

  const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
  const ranks = startFen.split('/');
  for (let r = 0; r < 8; r++) {
    let file = 0;
    for (const ch of ranks[r]) {
      if (/\d/.test(ch)) {
        file += parseInt(ch, 10);
      } else {
        const color = ch === ch.toUpperCase() ? 'w' : 'b';
        const type = ch.toLowerCase();
        const square = String.fromCharCode('a'.charCodeAt(0) + file) + (8 - r);
        addPiece(square, type, color);
        file++;
      }
    }
  }
}

export function getPieceBySquare(square) {
  return pieces.get(square);
}

export async function movePieceByUci(uci) {
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotion = uci.length > 4 ? uci[4] : undefined;
  const piece = pieces.get(from);
  if (!piece) return;

  const captured = pieces.get(to);
  if (captured) {
    sceneRef.remove(captured.mesh);
    pieces.delete(to);
  }

  const target = helpersRef.squareToPosition(to);
  const start = piece.mesh.position.clone();

  await new Promise((resolve) => {
    const startTime = performance.now();
    function step(now) {
      const t = Math.min((now - startTime) / 250, 1);
      piece.mesh.position.lerpVectors(start, target, t);
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(step);
  });

  piece.mesh.position.copy(target);
  pieces.delete(from);
  pieces.set(to, piece);
  piece.square = to;

  if (promotion === 'q' && piece.type === 'p') {
    sceneRef.remove(piece.mesh);
    const newMesh = buildPieceMesh('q', piece.color);
    newMesh.position.copy(target);
    sceneRef.add(newMesh);
    piece.mesh = newMesh;
    piece.type = 'q';
  }
}

