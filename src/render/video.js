// Video-Export: Spielzug auf einem unsichtbaren Spielfeld abspielen und mit MediaRecorder aufnehmen.
// Pro Schritt: Startbild mit Notiz (Lesezeit), dann Animation, kurze Pause. Am Ende die Endposition.
//
// MediaRecorder nimmt nur <canvas> auf. Deshalb wird das SVG für jedes Bild als Grafik in den
// Canvas gezeichnet; dafür bekommt es die Spielfeld-Styles (immer helle Farben) und die Pfeilspitze eingebettet.
import courtCss from '../styles/court.css?raw';
import { readingTime, captionLines } from '../core/caption.js';
import { makeScene } from './court.js';
import { Animator } from './animator.js';
import { SVG_NS } from './svg.js';

const W = 1080, H = 1350, PAD = 56;
const COURT_Y = 190, COURT_H = Math.round((W - 2 * PAD) * 156 / 174);   // viewBox 174 × 156
const NOTE_Y = COURT_Y + COURT_H + 44;
const COLORS = { bg: '#ffffff', ink: '#1d1d1f', muted: '#6b6b70', accent: '#e2531f' };
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
// Im Video langsamer als im Viewer (1×), damit man den Ablauf in Ruhe verfolgen kann
const VIDEO_SPEED = 0.4;

// Helle Farben aus base.css, damit das Video bei allen Empfängern gleich aussieht
const SVG_VARS = `svg{--court:#e8c797;--court-key:#ddb784;--court-line:#ffffff;--hoop:#e2531f;--court-out:#c9a777;
  --mark:#1d1d1f;--off:#1f3a5f;--ball:#f07a2a;--accent:#e2531f}`;

const sleep = ms => new Promise(res => setTimeout(res, ms));

/** MP4-Format, das der Browser aufnehmen kann; null, wenn er kein MP4 kann. */
export function videoFormat() {
  if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream) return null;
  // Nur MP4 (läuft in WhatsApp, auf iPhones und Windows). Browser melden die Unterstützung
  // unterschiedlich – deshalb mehrere Schreibweisen probieren. Firefox und Chromium unter Linux können kein MP4.
  for (const mime of [
    'video/mp4;codecs=avc1', 'video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1.4D401F',
    'video/mp4;codecs=h264', 'video/mp4',
  ]) {
    if (MediaRecorder.isTypeSupported(mime)) return { mime, ext: 'mp4' };
  }
  return null;
}

/** SVG als eigenständige Grafik (mit Styles und Pfeilspitze) für drawImage. */
function svgImageUrl(svg) {
  const copy = svg.cloneNode(true);
  copy.setAttribute('xmlns', SVG_NS);
  copy.setAttribute('width', W - 2 * PAD);
  copy.setAttribute('height', COURT_H);
  const style = document.createElementNS(SVG_NS, 'style');
  style.textContent = SVG_VARS + courtCss;
  copy.prepend(style, document.querySelector('#measure defs').cloneNode(true));
  const xml = new XMLSerializer().serializeToString(copy);
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Schreibt die Notiz unter das Feld; wird sie zu lang, wird die Schrift kleiner, notfalls gekürzt. */
function drawNote(ctx, note) {
  const maxW = W - 2 * PAD, maxH = H - PAD - NOTE_Y;
  for (const size of [36, 32, 28, 24]) {
    ctx.font = `400 ${size}px ${FONT}`;
    const lh = Math.round(size * 1.3), gap = Math.round(size * 0.4);
    let lines = captionLines(note, s => ctx.measureText(s).width, maxW);
    const height = ls => ls.reduce((h, l) => h + lh + (l.gap ? gap : 0), 0);
    if (height(lines) > maxH && size > 24) continue;
    while (lines.length && height(lines) > maxH) lines = lines.slice(0, -1);
    if (lines.length < captionLines(note, s => ctx.measureText(s).width, maxW).length && lines.length) {
      lines[lines.length - 1] = { ...lines[lines.length - 1], text: lines[lines.length - 1].text + ' …' };
    }
    let y = NOTE_Y;
    ctx.fillStyle = COLORS.ink;
    ctx.textBaseline = 'top';
    for (const l of lines) {
      if (l.gap) y += gap;
      if (l.bullet) ctx.fillText(l.bullet, PAD, y);
      ctx.fillText(l.text, PAD + l.indent, y);
      y += lh;
    }
    return;
  }
}

/**
 * Nimmt den Spielzug als Video auf.
 * onProgress(k, n) meldet den aktuellen Schritt; signal (AbortSignal) bricht ab.
 * Liefert { blob, ext } oder wirft einen Fehler (AbortError bei Abbruch).
 */
export async function recordPlay(play, { onProgress = () => {}, signal } = {}) {
  const fmt = videoFormat();
  if (!fmt) throw new Error('Dieser Browser kann keine MP4-Videos aufnehmen.');

  const svg = document.createElementNS(SVG_NS, 'svg');
  const scene = makeScene(svg);
  const anim = new Animator(scene, () => play);
  anim.speed = VIDEO_SPEED;
  const canvas = Object.assign(document.createElement('canvas'), { width: W, height: H });
  const ctx = canvas.getContext('2d');
  const n = play.steps.length;
  let caption = { label: '', note: '' }, running = true;

  // Bild für Bild: aktuelles Spielfeld + Überschrift + Notiz in den Canvas
  const drawLoop = async () => {
    while (running) {
      const img = await loadImage(svgImageUrl(svg));
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, W, H);
      ctx.textBaseline = 'top';
      ctx.fillStyle = COLORS.ink;
      ctx.font = `700 54px ${FONT}`;
      ctx.fillText(play.name || 'Ohne Namen', PAD, PAD);
      ctx.fillStyle = COLORS.accent;
      ctx.font = `600 34px ${FONT}`;
      ctx.fillText(caption.label, PAD, PAD + 72);
      ctx.drawImage(img, PAD, COURT_Y, W - 2 * PAD, COURT_H);
      drawNote(ctx, caption.note);
      await new Promise(requestAnimationFrame);
    }
  };

  const chunks = [];
  const rec = new MediaRecorder(canvas.captureStream(30), { mimeType: fmt.mime });
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  const stopped = new Promise(res => { rec.onstop = res; });
  const check = () => { if (signal?.aborted) throw new DOMException('Abgebrochen', 'AbortError'); };

  anim.show(0);
  caption = { label: n > 1 ? `Schritt 1 von ${n}` : '', note: play.steps[0].note };
  const loop = drawLoop();
  await sleep(100);           // erstes Bild zeichnen lassen, bevor die Aufnahme startet
  rec.start(1000);
  try {
    for (let k = 0; k < n; k++) {
      onProgress(k, n);
      anim.show(k);
      caption = { label: n > 1 ? `Schritt ${k + 1} von ${n}` : '', note: play.steps[k].note };
      await sleep(readingTime(play.steps[k].note));
      check();
      await anim.playStep({ holdLastFrame: true });
      check();
      await sleep(500);
    }
    anim.show(n);
    caption = { label: 'Endposition', note: '' };
    await sleep(2000);
    check();
  } finally {
    anim.stop();
    rec.stop();
    await stopped;
    running = false;
    await loop;
  }
  return { blob: new Blob(chunks, { type: fmt.mime.split(';')[0] }), ext: fmt.ext };
}
