// Archiv: alle Spielzüge mit Suche, Oberkategorie und Kategorie-Filter.
import { CATEGORY_GROUPS } from '../core/constants.js';
import { categoriesOf, matchesFilter } from '../core/category.js';
import { loadAll } from '../storage/store.js';
import { exportAll } from '../io/files.js';
import { $, esc, toast } from '../ui/dom.js';
import { playCard } from './playCard.js';

let group = '';

function render() {
  const q = $('#ar-search').value.trim().toLowerCase();
  const cat = $('#ar-cat').value;
  const list = loadAll()
    .filter(p => matchesFilter(p, group, cat))
    .filter(p => !q || `${p.name} ${p.description}`.toLowerCase().includes(q))
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de'));

  const box = $('#ar-list');
  box.innerHTML = '';
  if (!list.length) box.innerHTML = '<div class="empty">Keine Spielzüge gefunden.</div>';
  list.forEach(p => box.appendChild(playCard(p)));
}

// Oberkategorie wählen: Knopf markieren, Dropdown auf deren Kategorien einschränken
function setGroup(g) {
  group = g;
  document.querySelectorAll('#ar-groups [data-group]').forEach(b => b.classList.toggle('active', b.dataset.group === g));
  const sel = $('#ar-cat');
  const keep = sel.value;
  const cats = categoriesOf(g);
  sel.innerHTML = '<option value="">Alle Kategorien</option>' + cats.map(c => `<option>${esc(c)}</option>`).join('');
  sel.value = cats.includes(keep) ? keep : '';
}

export const archive = {
  init() {
    $('#ar-groups').innerHTML = ['', ...Object.keys(CATEGORY_GROUPS)]
      .map(g => `<button type="button" data-group="${esc(g)}">${esc(g || 'Alle')}</button>`).join('');
    $('#ar-groups').addEventListener('click', e => {
      const b = e.target.closest('[data-group]');
      if (!b) return;
      setGroup(b.dataset.group);
      render();
    });
    setGroup('');
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
