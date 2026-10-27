// Migration alter Spielzüge (Dateien und localStorage) auf das aktuelle Modell. Reine Funktionen.
//
// Version 1: step.moves = { "4": { type, points, smooth } } – eine Aktion pro Spieler, alle gleichzeitig.
// Version 2: step.actions = [{ player, type, points, smooth, beat }] – mehrere Aktionen, Takte.

function migrateStep(s) {
  if (!s || Array.isArray(s.actions) || !s.moves || typeof s.moves !== 'object') return s;
  const { moves, ...rest } = s;
  return { ...rest, actions: Object.entries(moves).map(([player, m]) => ({ player, ...m, beat: 0 })) };
}

/** Bringt einen Spielzug auf das aktuelle Modell. Bereits aktuelle bleiben unverändert. */
export function migratePlay(p) {
  if (!p || !Array.isArray(p.steps)) return p;
  return { ...p, steps: p.steps.map(migrateStep) };
}
