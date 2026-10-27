// Notizen für den Video-Export: Lesezeit und Zeilenumbruch. Reine Funktionen ohne DOM.
import { noteBlocks } from './note.js';

/**
 * Wie lange das Startbild eines Schritts stehen bleibt, bevor die Animation startet (ms).
 * Die Notiz bleibt auch während der Animation sichtbar, deshalb reicht ein kurzer Vorlauf.
 */
export function readingTime(note) {
  const words = String(note ?? '').split(/\s+/).filter(Boolean).length;
  if (!words) return 500;
  return Math.min(3000, 600 + words * 100);
}

/** Bricht einen Text in Zeilen um, die höchstens maxWidth breit sind (zu lange Wörter bekommen eine eigene Zeile). */
function wrap(text, measure, maxWidth) {
  const lines = [];
  let cur = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && measure(next) > maxWidth) {
      lines.push(cur);
      cur = word;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/**
 * Zerlegt eine Notiz in fertige Zeilen für die Untertitel.
 * measure(text) liefert die Breite eines Texts (im Browser: ctx.measureText).
 * Ergebnis: [{ text, bullet, indent, gap }]
 *   bullet: „•“ oder „1.“ am Anfang eines Listenpunkts, sonst ''
 *   indent: Einrückung (Breite des Aufzählungszeichens) für Listen
 *   gap:    true auf der ersten Zeile eines neuen Absatzes bzw. einer neuen Liste
 */
export function captionLines(note, measure, maxWidth) {
  const out = [];
  noteBlocks(note).forEach((block, bi) => {
    let first = bi > 0;
    const push = (text, bullet, indent) => {
      out.push({ text, bullet, indent, gap: first });
      first = false;
    };
    if (block.type === 'text') {
      for (const line of block.lines) for (const t of wrap(line, measure, maxWidth)) push(t, '', 0);
      return;
    }
    const indent = measure(block.type === 'ol' ? `${block.items.length}. ` : '• ');
    block.items.forEach((item, i) => {
      const bullet = block.type === 'ol' ? `${i + 1}.` : '•';
      wrap(item, measure, maxWidth - indent).forEach((t, j) => push(t, j ? '' : bullet, indent));
    });
  });
  return out;
}
