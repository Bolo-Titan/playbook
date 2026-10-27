// Datei-Ein-/Ausgabe im Browser: Herunterladen, Teilen-Menü, Importieren.
import { serialize, fileNameFor, parsePlays, mergePlays } from './exchange.js';
import { loadAll, saveAll } from '../storage/store.js';
import { toast } from '../ui/dom.js';

export function downloadBlob(name, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

export function download(name, text) {
  downloadBlob(name, new Blob([text], { type: 'application/json' }));
}

/**
 * Video teilen (Handy) oder herunterladen (PC).
 * Muss direkt aus einem Tippen heraus aufgerufen werden, sonst verweigert der Browser das Teilen-Menü.
 */
export async function shareVideo(play, { blob, ext }) {
  const name = fileNameFor(play).replace(/\.json$/, `.${ext}`);
  let file = null;
  try { file = new File([blob], name, { type: blob.type }); } catch (e) { /* alter Browser */ }
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: play.name }); }
    catch (e) { if (e.name !== 'AbortError') downloadBlob(name, blob); }
  } else {
    downloadBlob(name, blob);
    toast('Video gespeichert – jetzt z. B. per WhatsApp verschicken.');
  }
}

export function exportPlay(play) {
  download(fileNameFor(play), serialize([play]));
}

export function exportAll(plays) {
  download(`playbook-backup-${new Date().toISOString().slice(0, 10)}.json`, serialize(plays));
}

/** Auf dem Handy: natives Teilen-Menü (WhatsApp, Mail …). Sonst: Download. */
export async function sharePlay(play) {
  const name = fileNameFor(play);
  const text = serialize([play]);
  let file = null;
  try { file = new File([text], name, { type: 'application/json' }); } catch (e) { /* alter Browser */ }
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: play.name }); }
    catch (e) { if (e.name !== 'AbortError') download(name, text); }
  } else {
    download(name, text);
    toast('Datei gespeichert – jetzt z. B. per WhatsApp oder E-Mail verschicken.');
  }
}

/** Importiert Dateien in den Speicher und liefert eine Zusammenfassung. */
export async function importFiles(files) {
  let incoming = [], unreadable = 0;
  for (const file of files) {
    try { incoming = incoming.concat(parsePlays(await file.text())); }
    catch (e) { unreadable++; }
  }
  const res = mergePlays(loadAll(), incoming);
  if (res.added + res.updated) saveAll(res.list);
  return { added: res.added, updated: res.updated, failed: res.failed + unreadable, lastId: res.lastId };
}
