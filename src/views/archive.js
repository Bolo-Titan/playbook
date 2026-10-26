// Archiv: alle Spielzüge mit Suche und Kategorie-Filter.
import { CATEGORIES } from '../core/constants.js';
import { loadAll } from '../storage/store.js';
import { exportAll } from '../io/files.js';
import { $, esc, toast } from '../ui/dom.js';
import { playCard } from './playCard.js';

function render() {
  const q = $('#ar-search').value.trim().toLowerCase();
  const cat = $('#ar-cat').value;
  const list = loadAll()
    .filter(p => !cat || p.category === cat)
    .filter(p => !q || `${p.name} ${p.description}`.toLowerCase().includes(q))
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de'));

  const box = $('#ar-list');
  box.innerHTML = '';
  if (!list.length) box.innerHTML = '<div class="empty">Keine Spielzüge gefunden.</div>';
  list.forEach(p => box.appendChild(playCard(p)));
}

export const archive = {
  init() {
    $('#ar-cat').innerHTML =
      '<option value="">Alle Kategorien</option>' + CATEGORIES.map(c => `<option>${esc(c)}</option>`).join('');
    $('#ar-search').addEventListener('input', render);
    $('#ar-cat').addEventListener('change', render);
    $('#ar-backup').addEventListener('click', () => {
      const list = loadAll();
      if (!list.length) return toast('Das Archiv ist leer.');
      exportAll(list);
    });
  },
  enter: render,
};
