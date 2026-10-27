// Notizen zu Schritten: Freitext mit Zeilenumbrüchen und einfachen Aufzählungen.
// Zeilen mit „- “, „* “ oder „• “ → Punktliste, mit „1. “ oder „1) “ → nummerierte Liste.
// Eine Leerzeile beendet einen Absatz bzw. eine Liste.

const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBER = /^\s*\d+[.)]\s+(.*)$/;

/**
 * Zerlegt eine Notiz in Blöcke:
 * { type: 'text', lines: [...] } | { type: 'ul', items: [...] } | { type: 'ol', items: [...] }
 */
export function noteBlocks(note) {
  const blocks = [];
  let cur = null;
  for (const raw of String(note ?? '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) { cur = null; continue; }
    const b = line.match(BULLET), n = !b && line.match(NUMBER);
    const type = b ? 'ul' : n ? 'ol' : 'text';
    if (!cur || cur.type !== type) {
      cur = type === 'text' ? { type, lines: [] } : { type, items: [] };
      blocks.push(cur);
    }
    if (type === 'text') cur.lines.push(line);
    else cur.items.push((b || n)[1]);
  }
  return blocks;
}
