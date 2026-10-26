import { describe, it, expect } from 'vitest';
import { serialize, parsePlays, validatePlay, mergePlays, slug } from '../src/io/exchange.js';
import { newPlay } from '../src/core/model.js';

describe('Export und Import', () => {
  it('liest eine exportierte Datei wieder ein', () => {
    const p = newPlay();
    p.name = 'Horns';
    const plays = parsePlays(serialize([p]));
    expect(plays).toHaveLength(1);
    expect(plays[0]).toEqual(p);
  });

  it('akzeptiert auch einen einzelnen Spielzug ohne Hülle', () => {
    const p = newPlay();
    expect(parsePlays(JSON.stringify(p))).toEqual([p]);
  });

  it('lehnt fremde Dateien ab', () => {
    expect(() => parsePlays('{"foo":1}')).toThrow();
    expect(() => parsePlays('kein json')).toThrow();
  });
});

describe('validatePlay', () => {
  it('erkennt gültige und kaputte Spielzüge', () => {
    expect(validatePlay(newPlay())).toBe(true);
    const bad = newPlay();
    bad.steps[0].moves['1'] = { type: 'cut', points: [{ x: 'a', y: 1 }] };
    expect(validatePlay(bad)).toBe(false);
    expect(validatePlay({ id: 'x', steps: [] })).toBe(false);
  });
});

describe('mergePlays', () => {
  it('fügt neue hinzu und ersetzt vorhandene mit gleicher id', () => {
    const a = { ...newPlay(), id: 'a', name: 'Alt' };
    const b = { ...newPlay(), id: 'b', name: 'B' };
    const aNeu = { ...a, name: 'Neu' };
    const res = mergePlays([a], [aNeu, b, { kaputt: true }]);
    expect(res.added).toBe(1);
    expect(res.updated).toBe(1);
    expect(res.failed).toBe(1);
    expect(res.list.find(p => p.id === 'a').name).toBe('Neu');
    expect(res.list).toHaveLength(2);
  });
});

describe('slug', () => {
  it('macht Dateinamen ohne Umlaute', () => {
    expect(slug('Horns Flare – Übung 2')).toBe('horns-flare-uebung-2');
    expect(slug('')).toBe('spielzug');
  });
});
