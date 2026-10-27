// Allgemeine DOM-Helfer.
export const $ = sel => document.querySelector(sel);

export const esc = s =>
  String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString('de-DE'); } catch (e) { return ''; }
}

let toastTimer;
/** Kurze Meldung unten; ms = Anzeigedauer (längere Hinweise länger stehen lassen). */
export function toast(msg, ms = 2800) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}
