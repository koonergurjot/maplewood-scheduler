import { mountModeBar } from './modeBar.js';

export function mountHud({ onModeChange } = {}) {
  const hud = document.createElement('div');
  hud.className = 'hud';
  document.body.appendChild(hud);

  const top = document.createElement('div');
  top.className = 'hud-top';
  hud.appendChild(top);

  const modeContainer = document.createElement('div');
  hud.appendChild(modeContainer);
  mountModeBar(modeContainer, { onChange: onModeChange });

  return hud;
}
