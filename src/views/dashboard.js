// Übersicht: Kennzahlen + zuletzt bearbeitete Spielzüge.
import { loadAll } from '../storage/store.js';
import { $, fmtDate } from '../ui/dom.js';
import { playCard } from './playCard.js';

export const dashboard = {
  enter() {
    const list = loadAll();
    const categories = new Set(list.map(p => p.category));
    const latest = list.reduce((a, p) => (!a || p.updated > a ? p.updated : a), null);

    $('#db-stats').innerHTML = `
      <div class="card stat"><b>${list.length}</b><span>Spielzüge im Archiv</span></div>
      <div class="card stat"><b>${categories.size}</b><span>Kategorien</span></div>
      <div class="card stat"><b>${latest ? fmtDate(latest) : '–'}</b><span>Letzte Änderung</span></div>`;

    const box = $('#db-recent');
    box.innerHTML = '';
    const recent = [...list].sort((a, b) => (b.updated || '').localeCompare(a.updated || '')).slice(0, 4);
    if (!recent.length) {
      box.innerHTML = '<div class="empty">Noch keine Spielzüge. Erstelle deinen ersten oder importiere eine Datei vom Trainer.</div>';
    }
    recent.forEach(p => box.appendChild(playCard(p)));
  },
};
