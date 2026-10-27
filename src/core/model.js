// Datenmodell eines Spielzugs. Reine Funktionen ohne DOM – deshalb direkt testbar.
//
// Ein Schritt ist in Takte (beat 0, 1, 2 …) unterteilt. Jede Aktion startet in ihrem Takt;
// Aktionen eines Spielers laufen nacheinander (z. B. Block in Takt 0, Abrollen in Takt 1).
// Der Pass liegt ebenfalls in einem Takt, gleichzeitig mit dessen Laufwegen („Pass und schneiden“);
// ohne beat bekommt er einen eigenen Takt nach allen Laufwegen.
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

export const emptyStep = () => ({ actions: [], pass: null, note: '' });

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

/** Aktionen nach Takt sortiert (stabil, Reihenfolge innerhalb eines Takts bleibt). */
const byBeat = actions => [...actions].sort((a, b) => a.beat - b.beat);

/** Anzahl der Takte mit Laufwegen (0 bei einem Schritt ohne Aktionen). */
export const actionBeats = step => step.actions.reduce((n, a) => Math.max(n, a.beat + 1), 0);

/** Takt des Passes; null ohne Pass. Ohne beat: eigener Takt nach allen Laufwegen. */
export function passBeat(step) {
  if (!step.pass) return null;
  return Number.isInteger(step.pass.beat) ? step.pass.beat : actionBeats(step);
}

/** Anzahl der Takte eines Schritts, Pass eingeschlossen (0 bei einem leeren Schritt). */
export function stepBeats(step) {
  const pb = passBeat(step);
  return Math.max(actionBeats(step), pb === null ? 0 : pb + 1);
}

/**
 * Takt-Nummern lohnen sich nur, wenn der Ablauf vom klassischen Fall abweicht
 * (alle Laufwege gleichzeitig, danach höchstens ein Pass).
 */
export function showBeats(step) {
  const B = actionBeats(step), pb = passBeat(step);
  return !(B <= 1 && (pb === null || pb === B));
}

/** Letzter Takt, in dem der Spieler eine Aktion hat; -1 ohne Aktion. */
export const lastBeatOf = (step, id) =>
  step.actions.reduce((n, a) => (a.player === id ? Math.max(n, a.beat) : n), -1);

function applyActions(players, actions, beforeBeat = Infinity) {
  for (const a of byBeat(actions)) {
    if (a.beat < beforeBeat && a.points.length && players[a.player]) players[a.player] = { ...a.points[a.points.length - 1] };
  }
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
    applyActions(players, step.actions);
    if (step.pass) ball = step.pass.to;
  }
  return { players, ball };
}

/** Innerhalb von Schritt k: Positionen und Ballbesitz zu Beginn von Takt `beat`. */
export function positionsAt(play, k, beat) {
  const st = stateAt(play, k), step = play.steps[k];
  if (!step) return st;
  applyActions(st.players, step.actions, beat);
  const pb = passBeat(step);
  return { players: st.players, ball: pb !== null && pb < beat ? step.pass.to : st.ball };
}

/**
 * Räumt einen Schritt auf (liefert eine Kopie): Takte ohne Aktion und ohne Pass
 * werden entfernt, spätere Aktionen und der Pass rücken nach.
 */
export function tidyStep(step) {
  const beats = step.actions.map(a => a.beat);
  if (step.pass && Number.isInteger(step.pass.beat)) beats.push(step.pass.beat);
  const used = [...new Set(beats)].sort((a, b) => a - b);
  const rank = b => used.filter(u => u < b).length;
  const actions = byBeat(step.actions).map(a => ({ ...a, beat: rank(a.beat) }));
  const pass = step.pass && Number.isInteger(step.pass.beat) ? { ...step.pass, beat: rank(step.pass.beat) } : step.pass;
  return { ...step, actions, pass };
}

export function describeStep(step) {
  const multi = showBeats(step), per = new Map();
  for (const a of byBeat(step.actions)) {
    if (!per.has(a.player)) per.set(a.player, { first: a.beat, labels: [] });
    per.get(a.player).labels.push(ACTION_LABEL[a.type] || a.type);
  }
  const parts = [...per].map(([id, p]) =>
    `${id}: ${p.labels.join(' → ')}${multi && p.first > 0 ? ` (ab Takt ${p.first + 1})` : ''}`);
  if (step.pass) parts.push(`Pass ${step.pass.from} → ${step.pass.to}${multi ? ` (Takt ${passBeat(step) + 1})` : ''}`);
  return parts.join(' · ') || 'Keine Aktion';
}
