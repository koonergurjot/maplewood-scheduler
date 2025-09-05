const MODE_KEY = 'chess3d.mode';
const DIFF_KEY = 'chess3d.diff';

const MODES = [
  { id: 'pvp', label: 'PvP' },
  { id: 'ai-white', label: 'Vs AI (Human White)' },
  { id: 'ai-black', label: 'Vs AI (Human Black)' }
];

export function getMode() {
  return localStorage.getItem(MODE_KEY) || 'pvp';
}

export function getDifficulty() {
  const value = parseInt(localStorage.getItem(DIFF_KEY), 10);
  return Number.isNaN(value) ? 1 : Math.min(Math.max(value, 1), 8);
}

export function mountModeBar(container, { onChange } = {}) {
  const bar = document.createElement('div');
  bar.className = 'mode-bar';

  const label = document.createElement('span');
  label.textContent = 'Mode: ';
  bar.appendChild(label);

  const buttons = [];
  MODES.forEach((m) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = m.label;
    btn.dataset.mode = m.id;
    btn.className = 'mode-option';
    if (m.id === getMode()) {
      btn.classList.add('active');
    }
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      localStorage.setItem(MODE_KEY, m.id);
      if (onChange) onChange(getMode(), getDifficulty());
    });
    bar.appendChild(btn);
    buttons.push(btn);
  });

  const diffLabel = document.createElement('label');
  diffLabel.className = 'difficulty-label';
  diffLabel.textContent = ' Difficulty: ';

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '1';
  slider.max = '8';
  slider.step = '1';
  slider.value = getDifficulty();

  const valueSpan = document.createElement('span');
  valueSpan.textContent = slider.value;

  slider.addEventListener('input', () => {
    localStorage.setItem(DIFF_KEY, slider.value);
    valueSpan.textContent = slider.value;
    if (onChange) onChange(getMode(), getDifficulty());
  });

  diffLabel.appendChild(slider);
  diffLabel.appendChild(valueSpan);
  bar.appendChild(diffLabel);

  container.appendChild(bar);

  if (onChange) {
    onChange(getMode(), getDifficulty());
  }
}
