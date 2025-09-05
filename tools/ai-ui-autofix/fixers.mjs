import fs from 'fs';
import path from 'path';

const log = (...args) => console.log('[autofix]', ...args);
const read = p => fs.existsSync(p) ? fs.readFileSync(p,'utf8') : '';
const write = (p,s) => { fs.mkdirSync(path.dirname(p), { recursive:true }); fs.writeFileSync(p,s,'utf8'); };

// 1) Ensure ui-sanity.css helpers
const uiCssPath = path.join('src','styles','ui-sanity.css');
if (!fs.existsSync(uiCssPath)) {
  write(uiCssPath, `/* auto helpers */ 
:root{ --stickyOffset: 56px; }
.container{ max-width:min(100%,1600px); margin-inline:auto; padding-inline:12px; }
.truncate{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.wrap-anywhere{ overflow-wrap:anywhere; word-break:break-word; }
img,svg,canvas,video{ max-width:100%; height:auto; }
.table-responsive{ width:100%; overflow:auto; }
.table-responsive > table{ width:max(640px,100%); border-collapse:collapse; }
.modal-overlay{ position:fixed; inset:0; background:rgba(0,0,0,.35); z-index: 900; display:flex; align-items:center; justify-content:center; }
.modal{ max-width:min(92vw, 720px); width:100%; max-height:90vh; overflow:auto; background:#fff; border-radius:12px; padding:16px; box-shadow:0 10px 30px rgba(0,0,0,.25); z-index: 1000; }
.menu{ position:absolute; z-index:1100; }`);
  log('created', uiCssPath);
}

// 2) Ensure global import + modal body-lock fallback
const mainCandidates = ['src/main.tsx','src/main.ts','src/index.tsx'];
const mainPath = mainCandidates.find(p => fs.existsSync(p));
if (mainPath) {
  let src = read(mainPath);
  if (!src.includes('ui-sanity.css')) {
    src = 'import "./styles/ui-sanity.css";\n' + src;
    log('added ui-sanity import to', mainPath);
  }
  if (!src.includes('/* auto: modal body-lock observer */')) {
    src = src.replace(/createRoot\([^)]*\)\.render\([^)]*\);?/, m => m + `
/* auto: modal body-lock observer */
(function(){
  const s = document.createElement('style'); s.textContent='body.__modal_lock{overflow:hidden !important;}'; document.head.appendChild(s);
  const observer = new MutationObserver(()=>{
    const openModal = document.querySelector('.modal');
    document.body.classList.toggle('__modal_lock', !!openModal);
  });
  observer.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['class'] });
})();`);
    log('injected modal body-lock observer in', mainPath);
  }
  write(mainPath, src);
}

// 3) Ensure role/aria on modal containers
function walk(dir, hit=[]) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir,name); const st=fs.statSync(p);
    if (st.isDirectory()) walk(p, hit);
    else if (/[.](tsx|jsx|ts|js)$/.test(p)) hit.push(p);
  } return hit;
}
for (const f of walk('src', [])) {
  let s = read(f);
  if (s.includes('className="modal"') && !s.includes('role="dialog"')) {
    s = s.replace('className="modal"', 'role="dialog" aria-modal="true" className="modal"');
    write(f, s); log('added role/aria to', f);
  }
}

// 4) Write short scan summary for PR body, if report exists
const reportPath = path.join('tools','ai-ui-autofix','report.json');
if (fs.existsSync(reportPath)) {
  const report = JSON.parse(read(reportPath));
  const counts = {};
  for (const i of report.issues) counts[i.type]=(counts[i.type]||0)+1;
  write(path.join('tools','ai-ui-autofix','report-summary.md'),
    '# Latest UI Scan\n' +
    'Base: ' + report.baseUrl + '\n' +
    'Issues: ' + report.issuesTotal + '\n' +
    'Counts: ' + JSON.stringify(counts, null, 2) + '\n');
  log('wrote scan summary');
}
