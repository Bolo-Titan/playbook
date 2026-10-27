import { describe, it, expect } from 'vitest';
import { migratePlay } from '../src/core/migrate.js';
import { newPlay, stateAt } from '../src/core/model.js';

function v1Play() {
  const p = newPlay();
  p.steps = [{
    moves: {
      '4': { type: 'screen', points: [{ x: 82, y: 74 }], smooth: true },
      '1': { type: 'dribble', points: [{ x: 95, y: 80 }], smooth: false },
    },
    pass: { from: '1', to: '2' },
    note: 'Block',
  }];
  return p;
}

describe('migratePlay', () => {
  it('wandelt moves (Version 1) in actions im Takt 0 um', () => {
    const m = migratePlay(v1Play());
    expect(m.steps[0]).toEqual({
      // Zahlen-Schlüssel ordnet JavaScript aufsteigend → 1 vor 4
      actions: [
        { player: '1', type: 'dribble', points: [{ x: 95, y: 80 }], smooth: false, beat: 0 },
        { player: '4', type: 'screen', points: [{ x: 82, y: 74 }], smooth: true, beat: 0 },
      ],
      pass: { from: '1', to: '2' },
      note: 'Block',
    });
  });

  it('ergibt dieselben Endpositionen wie vorher', () => {
    const st = stateAt(migratePlay(v1Play()), 1);
    expect(st.players['4']).toEqual({ x: 82, y: 74 });
    expect(st.players['1']).toEqual({ x: 95, y: 80 });
    expect(st.ball).toBe('2');
  });

  it('lässt aktuelle Spielzüge unverändert', () => {
    const p = newPlay();
    expect(migratePlay(p)).toEqual(p);
    const once = migratePlay(v1Play());
    expect(migratePlay(once)).toEqual(once);
  });

  it('übersteht kaputte Eingaben', () => {
    expect(migratePlay(null)).toBe(null);
    expect(migratePlay({ foo: 1 })).toEqual({ foo: 1 });
  });
});
