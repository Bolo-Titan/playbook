// Feste Werte der App. Koordinaten: FIBA-Halbfeld in Dezimetern (150 breit × 140 tief),
// Ursprung oben links an der Grundlinie, Korbmitte bei (75 | 15,75).

export const STORAGE_KEY = 'playbook.spielzuege.v1';
export const FILE_FORMAT = 'playbook-spielzug';
export const FILE_VERSION = 2;

export const CATEGORIES = [
  'Angriff gegen Mann',
  'Angriff gegen Zone',
  'Einwurf Seite',
  'Einwurf Grundlinie',
  'Schnellangriff',
  'Sonstiges',
];

export const PLAYER_IDS = ['1', '2', '3', '4', '5'];

export const DEFAULT_POSITIONS = {
  '1': { x: 75, y: 84 },
  '2': { x: 126, y: 52 },
  '3': { x: 24, y: 52 },
  '4': { x: 101, y: 40 },
  '5': { x: 49, y: 22 },
};

export const PLAYER_RADIUS = 4.2;
// Spieler dürfen hinter der Grundlinie und neben den Seitenlinien stehen (Einwurf), nicht hinter der Mittellinie
export const COURT_LIMITS = { minX: -8, maxX: 158, minY: -7.5, maxY: 138 };

export const ACTION_TYPES = ['cut', 'dribble', 'screen'];
export const ACTION_LABEL = { cut: 'Laufweg', dribble: 'Dribbling', screen: 'Block' };

// Animationsdauer in ms bei Geschwindigkeit 1×
export const TIMING = { move: 1600, pass: 650, pause: 350 };
