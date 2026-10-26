// Vorschaukarte eines Spielzugs (Übersicht und Archiv).
import { SVG_NS } from '../render/svg.js';
import { makeScene, renderScene } from '../render/court.js';
import { esc, fmtDate } from '../ui/dom.js';
import { go } from '../ui/router.js';

export function playCard(play) {
  const card = document.createElement('button');
  card.className = 'pcard';

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.classList.add('court-svg');
  renderScene(makeScene(svg), play, 0);
  card.appendChild(svg);

  const n = play.steps.length;
  const info = document.createElement('div');
  info.className = 'pinfo';
  info.innerHTML = `<span class="chip">${esc(play.category)}</span>
    <strong>${esc(play.name || 'Ohne Namen')}</strong>
    <small class="muted">${n} Schritt${n === 1 ? '' : 'e'} · ${fmtDate(play.updated)}</small>`;
  card.appendChild(info);

  card.addEventListener('click', () => go('viewer', { id: play.id }));
  return card;
}
