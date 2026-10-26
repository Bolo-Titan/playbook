import { describe, it, expect } from 'vitest';
import { polyD, smoothD, moveD } from '../src/core/geometry.js';

const A = { x: 0, y: 0 }, B = { x: 10, y: 0 }, C = { x: 10, y: 10 };

describe('polyD', () => {
  it('verbindet Punkte mit geraden Linien', () => {
    expect(polyD([A, B, C])).toBe('M 0 0 L 10 0 L 10 10');
  });
});

describe('smoothD', () => {
  it('nutzt bei zwei Punkten eine Gerade', () => {
    expect(smoothD([A, B])).toBe('M 0 0 L 10 0');
  });

  it('erzeugt ab drei Punkten Bézier-Segmente, die durch alle Punkte laufen', () => {
    const d = smoothD([A, B, C]);
    expect(d.startsWith('M 0 0 C')).toBe(true);
    expect((d.match(/C/g) || []).length).toBe(2);
    expect(d.endsWith('10 10')).toBe(true);
  });
});

describe('moveD', () => {
  it('beachtet smooth: false', () => {
    expect(moveD(A, { points: [B, C], smooth: false })).toBe('M 0 0 L 10 0 L 10 10');
    expect(moveD(A, { points: [B, C], smooth: true })).toContain('C');
  });
});
