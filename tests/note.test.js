import { describe, it, expect } from 'vitest';
import { noteBlocks } from '../src/core/note.js';

describe('noteBlocks', () => {
  it('liefert für leere Notizen keine Blöcke', () => {
    expect(noteBlocks('')).toEqual([]);
    expect(noteBlocks(undefined)).toEqual([]);
    expect(noteBlocks('\n  \n')).toEqual([]);
  });

  it('behält Zeilenumbrüche im Text', () => {
    expect(noteBlocks('4 stellt Block\n1 zieht zum Korb')).toEqual([
      { type: 'text', lines: ['4 stellt Block', '1 zieht zum Korb'] },
    ]);
  });

  it('erkennt Punktlisten nach einem Text', () => {
    expect(noteBlocks('Optionen für 1:\n- Zum Korb\n* Pass auf 4\n• Wurf')).toEqual([
      { type: 'text', lines: ['Optionen für 1:'] },
      { type: 'ul', items: ['Zum Korb', 'Pass auf 4', 'Wurf'] },
    ]);
  });

  it('erkennt nummerierte Listen', () => {
    expect(noteBlocks('1. Zum Korb\n2) Pass auf 4')).toEqual([
      { type: 'ol', items: ['Zum Korb', 'Pass auf 4'] },
    ]);
  });

  it('trennt Blöcke an Leerzeilen', () => {
    expect(noteBlocks('Erster Absatz\n\nZweiter Absatz\n- a\n\n- b')).toEqual([
      { type: 'text', lines: ['Erster Absatz'] },
      { type: 'text', lines: ['Zweiter Absatz'] },
      { type: 'ul', items: ['a'] },
      { type: 'ul', items: ['b'] },
    ]);
  });

  it('wertet Bindestriche ohne Leerzeichen nicht als Liste', () => {
    expect(noteBlocks('-5 Sekunden')).toEqual([{ type: 'text', lines: ['-5 Sekunden'] }]);
  });
});
