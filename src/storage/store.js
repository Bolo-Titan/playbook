// Speicher für Spielzüge. Aktuell localStorage (nur auf diesem Gerät, pro Domain getrennt).
// Wer auf IndexedDB umstellen will, muss nur diese Datei ändern.
import { STORAGE_KEY } from '../core/constants.js';
import { migratePlay } from '../core/migrate.js';

export function loadAll() {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    // Alte Spielzüge (Version 1) werden beim Laden umgewandelt
    return Array.isArray(v) ? v.map(migratePlay) : [];
  } catch (e) {
    return [];
  }
}

export function saveAll(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    alert('Speichern nicht möglich: ' + e.message);
    return false;
  }
}

export const getPlay = id => loadAll().find(p => p.id === id);

export function upsertPlay(play) {
  const list = loadAll();
  const i = list.findIndex(p => p.id === play.id);
  if (i >= 0) list[i] = play;
  else list.unshift(play);
  return saveAll(list);
}

export function removePlay(id) {
  saveAll(loadAll().filter(p => p.id !== id));
}
