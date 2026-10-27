// Dateiformat für Export/Import. Reine Funktionen ohne DOM – direkt testbar.
//
// Eine exportierte Datei sieht so aus:
// { "format": "playbook-spielzug", "version": 2, "exported": "<ISO-Datum>", "plays": [ <Spielzug>, ... ] }
// Dateien der Version 1 werden beim Import mit migratePlay umgewandelt.
import { FILE_FORMAT, FILE_VERSION } from '../core/constants.js';
import { migratePlay } from '../core/migrate.js';

export const toPayload = plays => ({
  format: FILE_FORMAT,
  version: FILE_VERSION,
  exported: new Date().toISOString(),
  plays,
});

export const serialize = plays => JSON.stringify(toPayload(plays), null, 2);

/** Dateiname ohne Umlaute/Sonderzeichen, z. B. "Horns Flare" → "horns-flare". */
export function slug(s) {
  return (
    (s || 'spielzug')
      .toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'spielzug'
  );
}

export const fileNameFor = play => `spielzug-${slug(play.name)}.json`;

const okPoint = q => q && Number.isFinite(q.x) && Number.isFinite(q.y);
const okAction = a =>
  a && typeof a.player === 'string' && Number.isInteger(a.beat) && a.beat >= 0 && a.beat < 50 &&
  Array.isArray(a.points) && a.points.every(okPoint);

/** Prüft die Struktur (aktuelles Modell, vorher migratePlay anwenden), damit kaputte oder fremde Dateien die App nicht zum Absturz bringen. */
export function validatePlay(p) {
  return Boolean(
    p &&
      typeof p.id === 'string' &&
      p.initial &&
      p.initial.players &&
      typeof p.initial.players === 'object' &&
      Object.values(p.initial.players).every(okPoint) &&
      Array.isArray(p.steps) &&
      p.steps.length > 0 &&
      p.steps.every(
        s =>
          s &&
          Array.isArray(s.actions) &&
          s.actions.every(okAction)
      )
  );
}

function normalize(p) {
  return {
    ...p,
    name: String(p.name || 'Ohne Namen'),
    category: String(p.category || 'Sonstiges'),
    description: String(p.description || ''),
  };
}

/** Liest den Text einer Datei. Akzeptiert das Exportformat oder einen einzelnen Spielzug. */
export function parsePlays(text) {
  const data = JSON.parse(text);
  if (Array.isArray(data && data.plays)) return data.plays;
  if (data && data.steps) return [data];
  throw new Error('Kein Spielzug');
}

/**
 * Führt importierte Spielzüge in eine bestehende Liste ein.
 * Gleiche id → ersetzt die vorhandene Version (so kommen Updates vom Trainer an).
 */
export function mergePlays(list, incoming) {
  const result = { list: [...list], added: 0, updated: 0, failed: 0, lastId: null };
  for (const raw of incoming) {
    const migrated = migratePlay(raw);
    if (!validatePlay(migrated)) { result.failed++; continue; }
    const p = normalize(migrated);
    const i = result.list.findIndex(x => x.id === p.id);
    if (i >= 0) { result.list[i] = p; result.updated++; }
    else { result.list.unshift(p); result.added++; }
    result.lastId = p.id;
  }
  return result;
}
