// Kleine SVG-Helfer, die den Browser brauchen.
export const SVG_NS = 'http://www.w3.org/2000/svg';

export function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

/**
 * Misst einen Pfad mit den Browser-Funktionen getTotalLength/getPointAtLength.
 * at(t) liefert den Punkt nach Anteil t der STRECKE – dadurch laufen Spieler
 * auf Geraden und in Kurven gleich schnell.
 * Nach Gebrauch dispose() aufrufen.
 */
export function measurer(d) {
  const host = document.getElementById('measure');
  const p = el('path', { d }, host);
  const len = p.getTotalLength();
  return {
    len,
    at(t) {
      const q = p.getPointAtLength(Math.max(0, Math.min(1, t)) * len);
      return { x: q.x, y: q.y };
    },
    dispose: () => p.remove(),
  };
}
