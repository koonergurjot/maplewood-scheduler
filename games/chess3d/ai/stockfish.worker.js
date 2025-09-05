const engine = new Worker(new URL('./stockfish.js', import.meta.url));

engine.onmessage = (e) => {
  const text = e.data;
  if (typeof text === 'string' && text.startsWith('bestmove')) {
    const move = text.split(' ')[1];
    self.postMessage({ type: 'bestmove', uci: move });
  }
};

self.onmessage = (e) => {
  const msg = e.data || {};
  switch (msg.type) {
    case 'init':
      engine.postMessage('uci');
      self.postMessage({ type: 'ready' });
      break;
    case 'position':
      if (msg.fen) {
        engine.postMessage(`position fen ${msg.fen}`);
      }
      break;
    case 'go':
      if (typeof msg.depth === 'number') {
        engine.postMessage(`go depth ${msg.depth}`);
      } else if (typeof msg.skill === 'number') {
        engine.postMessage(`setoption name Skill Level value ${msg.skill}`);
        engine.postMessage('go');
      } else {
        engine.postMessage('go');
      }
      break;
    default:
      break;
  }
};
