// Kategorien und Oberkategorien (Spielzüge / Einwurfsysteme) für Filter und Übersicht.
import { CATEGORIES, CATEGORY_GROUPS, CATEGORY_ALSO } from './constants.js';

// Kategorien einer Oberkategorie; ohne Gruppe alle
export function categoriesOf(group) {
  return CATEGORY_GROUPS[group] ?? CATEGORIES;
}

// Passt ein Spielzug zum Filter? Leere Werte = kein Filter.
export function matchesFilter(play, group = '', category = '') {
  const cat = play.category;
  if (group && !categoriesOf(group).includes(cat)) return false;
  if (category && cat !== category && !(CATEGORY_ALSO[cat] ?? []).includes(category)) return false;
  return true;
}

// Anzahl Spielzüge je Oberkategorie, z. B. { 'Spielzüge': 12, 'Einwurfsysteme': 4 }
export function countByGroup(plays) {
  return Object.fromEntries(Object.keys(CATEGORY_GROUPS).map(g => [g, plays.filter(p => matchesFilter(p, g)).length]));
}
