import fs from 'fs';
import path from 'path';
const repoRoot = process.cwd();
const log = (...args) => console.log('[autofix]', ...args);

const uiSanityPath = path.join('src','styles','ui-sanity.css');
if (!fs.existsSync(uiSanityPath)) {
  fs.mkdirSync(path.dirname(uiSanityPath), { recursive: true });
  fs.writeFileSync(uiSanityPath, `/* auto helpers */\n.wrap-anywhere{overflow-wrap:anywhere;word-break:break-word;}\n`, 'utf8');
  log('created', uiSanityPath);
}
const mainPath = ['src/main.tsx','src/main.ts','src/index.tsx'].find(p=>fs.existsSync(p));
if (mainPath) {
  let src = fs.readFileSync(mainPath,'utf8');
  if (!src.includes('ui-sanity.css')) {
    src = 'import "./styles/ui-sanity.css";\n' + src;
    fs.writeFileSync(mainPath, src,'utf8');
    log('added import to', mainPath);
  }
}
log('done.');