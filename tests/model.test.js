import { describe, it, expect } from 'vitest';
import {
  newPlay, stateAt, clampPoint, describeStep,
  stepBeats, passBeat, lastBeatOf, positionsAt, timeline, tidyStep,
} from '../src/core/model.js';
import { DEFAULT_POSITIONS } from '../src/core/constants.js';

const act = (player, type, points, beat = 0) => ({ player, type, points, smooth: true, beat });

function samplePlay() {
  const p = newPlay();
  p.steps = [
    { actions: [act('4', 'screen', [{ x: 82, y: 74 }])], pass: null, note: '' },
    {
      actions: [act('1', 'dribble', [{ x: 95, y: 80 }, { x: 110, y: 45 }])],
      pass: { from: '1', to: '2' },
      note: '',
    },
  ];
  return p;
}

/** Ein Schritt mit Takten: 4 blockt (0) und rollt ab (1), 2 startet verzögert (1). */
function beatPlay() {
  const p = newPlay();
  p.steps = [{
    actions: [
      act('4', 'cut', [{ x: 60, y: 30 }], 1),
      act('4', 'screen', [{ x: 80, y: 75 }], 0),
      act('2', 'cut', [{ x: 130, y: 20 }], 1),
    ],
    pass: { from: '1', to: '4' },
    note: '',
  }];
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
  it('hält Punkte im erlaubten Bereich und rundet auf 2 Stellen', () => {
    expect(clampPoint({ x: -50, y: 500 })).toEqual({ x: -8, y: 138 });
    expect(clampPoint({ x: 200, y: -50 })).toEqual({ x: 158, y: -7.5 });
    expect(clampPoint({ x: 10.12345, y: 20.5 })).toEqual({ x: 10.12, y: 20.5 });
  });

  it('erlaubt Einwerfer hinter der Grundlinie und neben den Seitenlinien', () => {
    expect(clampPoint({ x: 75, y: -6 })).toEqual({ x: 75, y: -6 });
    expect(clampPoint({ x: -6, y: 60 })).toEqual({ x: -6, y: 60 });
    expect(clampPoint({ x: 156, y: 60 })).toEqual({ x: 156, y: 60 });
  });
});

describe('describeStep', () => {
  it('fasst Aktionen in Textform zusammen', () => {
    expect(describeStep(samplePlay().steps[1])).toBe('1: Dribbling · Pass 1 → 2');
    expect(describeStep({ actions: [], pass: null })).toBe('Keine Aktion');
  });

  it('zeigt mehrere Aktionen eines Spielers und verzögerte Starts', () => {
    expect(describeStep(beatPlay().steps[0])).toBe('4: Block → Laufweg · 2: Laufweg (ab Takt 2) · Pass 1 → 4');
  });

  it('nennt einen Pass mitten im Schritt', () => {
    const step = beatPlay().steps[0];
    step.pass.beat = 0;
    expect(describeStep(step)).toMatch(/Pass 1 → 4 \(zuerst\)$/);
    step.pass.beat = 1;
    expect(describeStep(step)).toMatch(/Pass 1 → 4 \(nach Takt 1\)$/);
  });
});

describe('Takte', () => {
  it('zählt Takte, Pass-Takt und letzten Takt eines Spielers', () => {
    const step = beatPlay().steps[0];
    expect(stepBeats(step)).toBe(2);
    expect(passBeat(step)).toBe(2);
    expect(lastBeatOf(step, '4')).toBe(1);
    expect(lastBeatOf(step, '3')).toBe(-1);
    expect(stepBeats({ actions: [], pass: null })).toBe(0);
    expect(passBeat({ actions: [], pass: null })).toBe(null);
  });

  it('stateAt nimmt den Endpunkt der letzten Aktion, egal in welcher Reihenfolge gespeichert', () => {
    const st = stateAt(beatPlay(), 1);
    expect(st.players['4']).toEqual({ x: 60, y: 30 });
    expect(st.players['2']).toEqual({ x: 130, y: 20 });
    expect(st.ball).toBe('4');
  });

  it('positionsAt liefert Positionen zu Beginn eines Takts', () => {
    const p = beatPlay();
    expect(positionsAt(p, 0, 0).players['4']).toEqual(DEFAULT_POSITIONS['4']);
    expect(positionsAt(p, 0, 1).players['4']).toEqual({ x: 80, y: 75 });
    expect(positionsAt(p, 0, 1).players['2']).toEqual(DEFAULT_POSITIONS['2']);
    expect(positionsAt(p, 0, 2).players['4']).toEqual({ x: 60, y: 30 });
  });

  it('positionsAt kennt den Ballbesitz während eines Takts', () => {
    const p = beatPlay();
    expect(positionsAt(p, 0, 1).ball).toBe('1');
    p.steps[0].pass.beat = 1;
    expect(positionsAt(p, 0, 0).ball).toBe('1');
    expect(positionsAt(p, 0, 1).ball).toBe('4');
  });

  it('timeline spielt den Pass vor den Laufwegen seines Takts', () => {
    const step = beatPlay().steps[0];
    expect(timeline(step)).toEqual([
      { kind: 'move', beat: 0 }, { kind: 'move', beat: 1 }, { kind: 'pass', beat: 2 },
    ]);
    step.pass.beat = 1;
    expect(timeline(step)).toEqual([
      { kind: 'move', beat: 0 }, { kind: 'pass', beat: 1 }, { kind: 'move', beat: 1 },
    ]);
    expect(timeline({ actions: [], pass: null })).toEqual([{ kind: 'move', beat: 0 }]);
  });

  it('tidyStep entfernt leere Takte und lässt den Pass mitrutschen', () => {
    const step = {
      actions: [act('4', 'cut', [{ x: 1, y: 1 }], 3), act('2', 'cut', [{ x: 2, y: 2 }], 1)],
      pass: { from: '1', to: '2', beat: 2 },
      note: '',
    };
    const t = tidyStep(step);
    expect(t.actions.map(a => [a.player, a.beat])).toEqual([['2', 0], ['4', 1]]);
    expect(t.pass).toEqual({ from: '1', to: '2', beat: 1 });
    expect(step.actions[0].beat).toBe(3); // Original unverändert
  });

  it('tidyStep macht aus einem Pass-Takt am Ende „nach allen Laufwegen“', () => {
    const t = tidyStep({ actions: [act('2', 'cut', [{ x: 2, y: 2 }], 0)], pass: { from: '1', to: '2', beat: 1 }, note: '' });
    expect(t.pass).toEqual({ from: '1', to: '2' });
  });
});
