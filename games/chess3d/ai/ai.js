let worker;
let readyPromise;
let readyResolver;
let searchResolver;
let busy = false;

function spawnWorker() {
  worker = new Worker(new URL('./stockfish.worker.js', import.meta.url));
  worker.addEventListener('message', (e) => {
    const msg = e.data || {};
    if (msg.type === 'ready') {
      if (readyResolver) {
        readyResolver();
        readyResolver = null;
      }
    } else if (msg.type === 'bestmove') {
      busy = false;
      if (searchResolver) {
        searchResolver({ uci: msg.uci, move: uciToMove(msg.uci) });
        searchResolver = null;
      }
    }
  });
}

function uciToMove(uci) {
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promo = uci.length > 4 ? uci.slice(4) : undefined;
  const move = { from, to };
  if (promo) move.promo = promo;
  return move;
}

export async function initEngine() {
  if (!worker) {
    spawnWorker();
  }
  if (!readyPromise) {
    readyPromise = new Promise((resolve) => {
      readyResolver = resolve;
    });
    worker.postMessage({ type: 'init' });
  }
  return readyPromise;
}

export async function requestBestMove(fen, { depth = 12, skill = 4 } = {}) {
  if (busy) {
    cancel();
  }
  await initEngine();
  busy = true;
  worker.postMessage({ type: 'position', fen });
  worker.postMessage({ type: 'go', depth, skill });
  return new Promise((resolve) => {
    searchResolver = resolve;
  });
}

export function cancel() {
  if (worker) {
    worker.terminate();
  }
  worker = null;
  readyPromise = null;
  readyResolver = null;
  searchResolver = null;
  busy = false;
  spawnWorker();
  readyPromise = new Promise((resolve) => {
    readyResolver = resolve;
  });
  worker.postMessage({ type: 'init' });
}
