// Spielfeld, Spieler, Ball und Aktionslinien zeichnen.
import { PLAYER_IDS, PLAYER_RADIUS as R } from '../core/constants.js';
import { round2 as r, dist, stateAt, positionsAt, passBeat, stepBeats } from '../core/model.js';
import { moveD } from '../core/geometry.js';
import { el, measurer } from './svg.js';

const COURT = `
  <rect x="-12" y="-12" width="174" height="156" class="c-out"/>
  <rect x="0" y="0" width="150" height="140" class="c-bg"/>
  <rect x="50.5" y="0" width="49" height="58" class="c-key"/>
  <g class="c-line">
    <rect x="0" y="0" width="150" height="140"/>
    <path d="M57 58 A18 18 0 0 0 93 58"/>
    <path d="M57 58 A18 18 0 0 1 93 58" stroke-dasharray="2 2"/>
    <path d="M9 0 L9 29.9 A67.5 67.5 0 0 0 141 29.9 L141 0"/>
    <path d="M62.5 12 L62.5 15.75 A12.5 12.5 0 0 0 87.5 15.75 L87.5 12"/>
    <path d="M57 140 A18 18 0 0 1 93 140"/>
    <line x1="66" y1="12" x2="84" y2="12" class="c-board"/>
    <line x1="75" y1="12" x2="75" y2="13.5"/>
    <circle cx="75" cy="15.75" r="2.25" class="c-hoop"/>
  </g>`;

/**
 * Bereitet ein <svg> als Spielfeld vor. Ebenen von unten nach oben:
 * Feld → lines (Aktionen) → draft (Entwurf im Editor) → players.
 */
export function makeScene(svg) {
  // 1,2 m Rand hinter der Grundlinie und neben den Seitenlinien (Einwerfer), 0,4 m an der Mittellinie
  svg.setAttribute('viewBox', '-12 -12 174 156');
  svg.innerHTML = COURT + '<g class="lines"></g><g class="draft"></g><g class="players"></g>';
  return {
    svg,
    lines: svg.querySelector('.lines'),
    draft: svg.querySelector('.draft'),
    pl: svg.querySelector('.players'),
    els: {},
    ball: null,
  };
}

/** Zickzack entlang eines gemessenen Pfads (Dribbling). */
function zigzagD(m) {
  const L = m.len, tail = Math.min(5, L * 0.3), step = 1.6, amp = 1.3;
  const s0 = m.at(0);
  let d = `M ${r(s0.x)} ${r(s0.y)}`, side = 1;
  for (let s = step; s < L - tail; s += step) {
    const p = m.at(s / L), a = m.at((s + 0.5) / L), b = m.at((s - 0.5) / L);
    const n = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    const nx = -(a.y - b.y) / n, ny = (a.x - b.x) / n;
    d += ` L ${r(p.x + nx * amp * side)} ${r(p.y + ny * amp * side)}`;
    side *= -1;
  }
  const e = m.at(1);
  return d + ` L ${r(e.x)} ${r(e.y)}`;
}

export function drawMove(g, start, move) {
  const d = moveD(start, move);
  if (move.type === 'dribble') {
    const m = measurer(d);
    el('path', { d: zigzagD(m), class: 'mv', 'marker-end': 'url(#arrow)' }, g);
    m.dispose();
  } else if (move.type === 'screen') {
    // Linie + Querstrich am Ende
    el('path', { d, class: 'mv' }, g);
    const m = measurer(d);
    const a = m.at(1), b = m.at(Math.max(0, (m.len - 1) / m.len));
    m.dispose();
    const n = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    const nx = (-(a.y - b.y) / n) * 3, ny = ((a.x - b.x) / n) * 3;
    el('line', { x1: r(a.x + nx), y1: r(a.y + ny), x2: r(a.x - nx), y2: r(a.y - ny), class: 'mv', 'stroke-width': 1 }, g);
  } else {
    el('path', { d, class: 'mv', 'marker-end': 'url(#arrow)' }, g);
  }
}

export function drawPass(g, a, b) {
  const L = dist(a, b);
  if (L < 2 * R + 1) return;
  const ux = (b.x - a.x) / L, uy = (b.y - a.y) / L, s = R + 0.5;
  el('line', {
    x1: r(a.x + ux * s), y1: r(a.y + uy * s), x2: r(b.x - ux * s), y2: r(b.y - uy * s),
    class: 'mv pass', 'marker-end': 'url(#arrow)',
  }, g);
}

function ensurePlayers(scene) {
  if (scene.ball) return;
  for (const id of PLAYER_IDS) {
    const g = el('g', { class: 'pl' }, scene.pl);
    el('circle', { r: R }, g);
    el('text', {}, g).textContent = id;
    scene.els[id] = g;
  }
  scene.ball = el('circle', { r: 1.9, class: 'ball' }, scene.pl);
}

/** Ball sitzt leicht versetzt rechts oben am Spieler. */
export const ballOffset = p => ({ x: p.x + 3.1, y: p.y - 3.1 });

export function placePlayers(scene, pos, selected = []) {
  ensurePlayers(scene);
  for (const id of PLAYER_IDS) {
    const g = scene.els[id], p = pos[id];
    if (!p) { g.style.display = 'none'; continue; }
    g.style.display = '';
    g.setAttribute('transform', `translate(${r(p.x)} ${r(p.y)})`);
    g.classList.toggle('sel', selected.includes(id));
  }
}

export function placeBall(scene, p) {
  scene.ball.setAttribute('cx', r(p.x));
  scene.ball.setAttribute('cy', r(p.y));
}

/** Kleine Takt-Nummer in der Mitte eines Laufwegs. */
function drawBeat(g, start, move) {
  const m = measurer(moveD(start, move));
  const p = m.at(0.5);
  m.dispose();
  el('circle', { cx: r(p.x), cy: r(p.y), r: 2.1, class: 'beat' }, g);
  el('text', { x: r(p.x), y: r(p.y), class: 'beat-n' }, g).textContent = move.beat + 1;
}

/** Zeigt Schritt k: Spieler auf ihrer Startposition, Aktionen des Schritts als Linien. */
export function renderScene(scene, play, k, selected) {
  const st = stateAt(play, k);
  scene.lines.innerHTML = '';
  if (k < play.steps.length) {
    const step = play.steps[k], multi = stepBeats(step) > 1;
    for (const act of step.actions) {
      // Jede Aktion startet dort, wo der Spieler zu Beginn ihres Takts steht
      const start = positionsAt(play, k, act.beat).players[act.player];
      if (!start) continue;
      drawMove(scene.lines, start, act);
      if (multi) drawBeat(scene.lines, start, act);
    }
    if (step.pass) {
      const at = positionsAt(play, k, passBeat(step)).players;
      if (at[step.pass.from] && at[step.pass.to]) drawPass(scene.lines, at[step.pass.from], at[step.pass.to]);
    }
  }
  placePlayers(scene, st.players, selected);
  if (st.ball && st.players[st.ball]) placeBall(scene, ballOffset(st.players[st.ball]));
}
