// Einstiegspunkt: Styles laden, Ansichten registrieren, globale Ereignisse verdrahten.
import './styles/base.css';
import './styles/court.css';

import { register, go, currentView } from './ui/router.js';
import { $, toast } from './ui/dom.js';
import { importFiles } from './io/files.js';
import { dashboard } from './views/dashboard.js';
import { archive } from './views/archive.js';
import { viewer } from './views/viewer.js';
import { editor } from './views/editor.js';

const views = { dash: dashboard, archive, viewer, editor };
for (const [name, view] of Object.entries(views)) {
  view.init?.();
  register(name, view);
}

// Menü und Buttons mit data-go / data-act
document.addEventListener('click', e => {
  const b = e.target.closest('[data-go],[data-act]');
  if (!b) return;
  if (b.dataset.act === 'import') return $('#file-in').click();
  go(b.dataset.go === 'new' ? 'editor' : b.dataset.go);
});

// ---------- Import ----------
async function handleImport(files) {
  const res = await importFiles(files);
  const msg = [];
  if (res.added) msg.push(`${res.added} neu`);
  if (res.updated) msg.push(`${res.updated} aktualisiert`);
  if (res.failed) msg.push(`${res.failed} nicht lesbar`);
  toast(msg.length ? 'Import: ' + msg.join(', ') : 'Nichts importiert.');

  if (res.added + res.updated === 1 && res.lastId) go('viewer', { id: res.lastId });
  else if (['dash', 'archive'].includes(currentView())) go(currentView());
}

$('#file-in').addEventListener('change', e => {
  handleImport([...e.target.files]);
  e.target.value = '';
});

// Drag & Drop am Computer
let dragDepth = 0;
window.addEventListener('dragenter', e => {
  if (e.dataTransfer.types.includes('Files')) {
    dragDepth++;
    $('#dropzone').classList.add('show');
  }
});
window.addEventListener('dragleave', () => {
  if (--dragDepth <= 0) {
    dragDepth = 0;
    $('#dropzone').classList.remove('show');
  }
});
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => {
  e.preventDefault();
  dragDepth = 0;
  $('#dropzone').classList.remove('show');
  if (e.dataTransfer.files.length) handleImport([...e.dataTransfer.files]);
});

go('dash');
