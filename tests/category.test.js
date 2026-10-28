import { describe, it, expect } from 'vitest';
import { categoriesOf, matchesFilter, countByGroup } from '../src/core/category.js';
import { CATEGORIES } from '../src/core/constants.js';

const play = category => ({ category });

describe('Kategorie-Filter', () => {
  it('ohne Filter passt alles', () => {
    expect(matchesFilter(play('Sonstiges'))).toBe(true);
  });

  it('filtert nach Oberkategorie', () => {
    expect(matchesFilter(play('Schnellangriff'), 'Spielzüge')).toBe(true);
    expect(matchesFilter(play('Einwurf Seite'), 'Spielzüge')).toBe(false);
    expect(matchesFilter(play('Einwurf Grundlinie'), 'Einwurfsysteme')).toBe(true);
  });

  it('Sonstiges gehört zu keiner Oberkategorie', () => {
    expect(matchesFilter(play('Sonstiges'), 'Spielzüge')).toBe(false);
    expect(matchesFilter(play('Sonstiges'), 'Einwurfsysteme')).toBe(false);
  });

  it('„gegen Mann/Zone“ erscheint auch unter „gegen Mann“ und „gegen Zone“', () => {
    const p = play('Angriff gegen Mann/Zone');
    expect(matchesFilter(p, '', 'Angriff gegen Mann')).toBe(true);
    expect(matchesFilter(p, '', 'Angriff gegen Zone')).toBe(true);
    expect(matchesFilter(p, '', 'Angriff gegen Mann/Zone')).toBe(true);
    expect(matchesFilter(play('Angriff gegen Mann'), '', 'Angriff gegen Zone')).toBe(false);
  });

  it('jede Kategorie außer Sonstiges hat eine Oberkategorie', () => {
    const grouped = [...categoriesOf('Spielzüge'), ...categoriesOf('Einwurfsysteme')];
    expect(CATEGORIES.filter(c => !grouped.includes(c))).toEqual(['Sonstiges']);
    expect(categoriesOf('')).toEqual(CATEGORIES);
  });

  it('zählt je Oberkategorie', () => {
    const plays = ['Angriff gegen Mann', 'Schnellangriff', 'Einwurf Seite', 'Sonstiges'].map(play);
    expect(countByGroup(plays)).toEqual({ 'Spielzüge': 2, 'Einwurfsysteme': 1 });
  });
});
