import { describe, it, expect } from 'vitest';
import { readingTime, captionLines } from '../src/core/caption.js';

// Jedes Zeichen 10 Einheiten breit
const measure = s => s.length * 10;

describe('readingTime', () => {
  it('lässt auch ohne Notiz kurz stehen', () => {
    expect(readingTime('')).toBe(500);
    expect(readingTime(undefined)).toBe(500);
  });

  it('wächst mit der Anzahl der Wörter und ist nach oben begrenzt', () => {
    expect(readingTime('vier Wörter sind hier')).toBe(600 + 4 * 100);
    expect(readingTime('wort '.repeat(100))).toBe(3000);
  });
});

describe('captionLines', () => {
  it('bricht lange Zeilen an Wortgrenzen um', () => {
    const lines = captionLines('4 stellt Block für 1', measure, 100);
    expect(lines.map(l => l.text)).toEqual(['4 stellt', 'Block für', '1']);
    expect(lines.every(l => l.bullet === '' && l.indent === 0)).toBe(true);
  });

  it('gibt zu langen Wörtern eine eigene Zeile', () => {
    expect(captionLines('a Abrollbewegung b', measure, 50).map(l => l.text)).toEqual(['a', 'Abrollbewegung', 'b']);
  });

  it('setzt Aufzählungszeichen nur auf die erste Zeile eines Punkts', () => {
    const lines = captionLines('Optionen:\n- Zum Korb ziehen\n- Pass', measure, 120);
    expect(lines).toEqual([
      { text: 'Optionen:', bullet: '', indent: 0, gap: false },
      { text: 'Zum Korb', bullet: '•', indent: 20, gap: true },
      { text: 'ziehen', bullet: '', indent: 20, gap: false },
      { text: 'Pass', bullet: '•', indent: 20, gap: false },
    ]);
  });

  it('nummeriert Listen', () => {
    expect(captionLines('1. Korb\n2. Pass', measure, 200).map(l => l.bullet)).toEqual(['1.', '2.']);
  });

  it('liefert für leere Notizen keine Zeilen', () => {
    expect(captionLines('', measure, 100)).toEqual([]);
  });
});
