// Datenmodell eines Spielzugs. Reine Funktionen ohne DOM – deshalb direkt testbar.
import { CATEGORIES, DEFAULT_POSITIONS, COURT_LIMITS, ACTION_LABEL } from './constants.js';

export const round2 = n => Math.round(n * 100) / 100;
export const clone = o => JSON.parse(JSON.stringify(o));
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export function clampPoint(p) {
  const { minX, maxX, minY, maxY } = COURT_LIMITS;
  return {
    x: round2(Math.max(minX, Math.min(maxX, p.x))),
    y: round2(Math.max(minY, Math.min(maxY, p.y))),
  };
}

export const emptyStep = () => ({ moves: {}, pass: null, note: '' });

export function newPlay() {
  const now = new Date().toISOString();
  return {
    id: uid(),
    name: '',
    category: CATEGORIES[0],
    description: '',
    created: now,
    updated: now,
    initial: { players: clone(DEFAULT_POSITIONS), ball: '1' },
    steps: [emptyStep()],
  };
}

/**
 * Positionen und Ballbesitz zu BEGINN von Schritt k.
 * Gespeichert werden nur Startaufstellung + Aktionen; alles andere wird hier berechnet.
 * k = steps.length liefert die Endposition.
 */
export function stateAt(play, k) {
  const players = {};
  for (const id in play.initial.players) players[id] = { ...play.initial.players[id] };
  let ball = play.initial.ball;
  for (let i = 0; i < k && i < play.steps.length; i++) {
    const step = play.steps[i];
    for (const id in step.moves) {
      const pts = step.moves[id].points;
      if (pts.length) players[id] = { ...pts[pts.length - 1] };
    }
    if (step.pass) ball = step.pass.to;
  }
  return { players, ball };
}

export function describeStep(step) {
  const parts = Object.entries(step.moves).map(([id, m]) => `${id}: ${ACTION_LABEL[m.type] || m.type}`);
  if (step.pass) parts.push(`Pass ${step.pass.from} → ${step.pass.to}`);
  return parts.join(' · ') || 'Keine Aktion';
}
