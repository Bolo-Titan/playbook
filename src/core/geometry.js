// Laufwege als SVG-Pfad-Strings. Reine Funktionen ohne DOM.
import { round2 as r } from './model.js';

/** Gerade Linien durch alle Punkte. */
export function polyD(pts) {
  return pts.map((p, i) => `${i ? 'L' : 'M'} ${r(p.x)} ${r(p.y)}`).join(' ');
}

/**
 * Glatte Kurve durch alle Punkte (Catmull-Rom-Spline),
 * umgerechnet in kubische Bézier-Segmente, die SVG direkt versteht.
 */
export function smoothD(pts) {
  if (pts.length < 3) return polyD(pts);
  let d = `M ${r(pts[0].x)} ${r(pts[0].y)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C ${r(c1.x)} ${r(c1.y)} ${r(c2.x)} ${r(c2.y)} ${r(p2.x)} ${r(p2.y)}`;
  }
  return d;
}

/** Pfad einer Aktion vom Startpunkt des Spielers aus. */
export function moveD(start, move) {
  const pts = [start, ...move.points];
  return move.smooth === false ? polyD(pts) : smoothD(pts);
}
