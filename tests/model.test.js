import { describe, it, expect } from 'vitest';
import { newPlay, stateAt, clampPoint, describeStep } from '../src/core/model.js';
import { DEFAULT_POSITIONS } from '../src/core/constants.js';

function samplePlay() {
  const p = newPlay();
  p.steps = [
    { moves: { '4': { type: 'screen', points: [{ x: 82, y: 74 }], smooth: true } }, pass: null, note: '' },
    {
      moves: { '1': { type: 'dribble', points: [{ x: 95, y: 80 }, { x: 110, y: 45 }], smooth: true } },
      pass: { from: '1', to: '2' },
      note: '',
    },
  ];
  return p;
}

describe('stateAt', () => {
  it('liefert in Schritt 0 die Startaufstellung', () => {
    const st = stateAt(samplePlay(), 0);
    expect(st.players).toEqual(DEFAULT_POSITIONS);
    expect(st.ball).toBe('1');
  });

  it('übernimmt den letzten Punkt eines Laufwegs als neue Position', () => {
    const st = stateAt(samplePlay(), 1);
    expect(st.players['4']).toEqual({ x: 82, y: 74 });
    expect(st.players['1']).toEqual(DEFAULT_POSITIONS['1']);
  });

  it('wechselt den Ballbesitz nach einem Pass', () => {
    const st = stateAt(samplePlay(), 2);
    expect(st.players['1']).toEqual({ x: 110, y: 45 });
    expect(st.ball).toBe('2');
  });

  it('verändert den Spielzug nicht', () => {
    const p = samplePlay();
    const before = JSON.stringify(p);
    stateAt(p, 2).players['1'].x = 0;
    expect(JSON.stringify(p)).toBe(before);
  });
});

describe('clampPoint', () => {
  it('hält Punkte im Spielfeld und rundet auf 2 Stellen', () => {
    expect(clampPoint({ x: -10, y: 500 })).toEqual({ x: 2, y: 138 });
    expect(clampPoint({ x: 10.12345, y: 20.5 })).toEqual({ x: 10.12, y: 20.5 });
  });
});

describe('describeStep', () => {
  it('fasst Aktionen in Textform zusammen', () => {
    expect(describeStep(samplePlay().steps[1])).toBe('1: Dribbling · Pass 1 → 2');
    expect(describeStep({ moves: {}, pass: null })).toBe('Keine Aktion');
  });
});
