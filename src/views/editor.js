// Editor: Spielzug zeichnen (Aufstellung, Laufwege, Dribbling, Block, Pass) in mehreren Schritten.
import { CATEGORIES, PLAYER_RADIUS as R } from '../core/constants.js';
import { clone, dist, clampPoint, round2, emptyStep, newPlay, stateAt } from '../core/model.js';
import { smoothD, polyD } from '../core/geometry.js';
import { el } from '../render/svg.js';
import { makeScene, renderScene } from '../render/court.js';
import { Animator } from '../render/animator.js';
import { upsertPlay } from '../storage/store.js';
import { $, esc, toast } from '../ui/dom.js';
import { go, currentView } from '../ui/router.js';

const HINTS = {
  setup: 'Ziehe die Spieler auf ihre Startpositionen (nur in Schritt 1).',
  ball: 'Tippe den Spieler an, der zu Beginn den Ball hat (nur in Schritt 1).',
  cut: 'Tippe einen Spieler an, dann die Punkte seines Laufwegs. Abschließen mit „Fertig“ oder den letzten Punkt nochmal antippen.',
  dribble: 'Tippe den Ballbesitzer an, dann die Punkte des Dribblings. Abschließen mit „Fertig“.',
  screen: 'Tippe den blockenden Spieler an, dann den Weg zur Blockposition. Abschließen mit „Fertig“.',
  pass: 'Tippe den Ballbesitzer an, dann den Empfänger. Der Pass kommt nach den Laufwegen dieses Schritts.',
  erase: 'Tippe einen Spieler an, um seine Aktion in diesem Schritt zu entfernen.',
};

/** Nächster Spieler im Umkreis eines Punkts, sonst null. */
function hitTest(players, pt) {
  let best = null, bestD = R + 2;
  for (const id in players) {
    const d = dist(players[id], pt);
    if (d < bestD) { bestD = d; best = id; }
  }
  return best;
}

export const editor = {
  tab: 'new',
  play: null,      // Arbeitskopie
  k: 0,            // aktueller Schritt
  tool: 'cut',
  smooth: true,
  pending: null,   // Aktion im Entstehen: { id, type, points }
  passFrom: null,
  hover: null,
  drag: null,
  dirty: false,
  isEdit: false,
  stepOnly: false, // läuft gerade „Nur dieser Schritt“?
  atEnd: false,    // zeigt die Endposition des Schritts statt der Bearbeitungsansicht

  init() {
    this.scene = makeScene($('#ed-svg'));
    this.anim = new Animator(this.scene, () => this.play, a => {
      $('#ed-preview').textContent = a.playing ? '⏸ Stopp' : '▶ Vorschau';
      $('#ed-play-step').textContent = a.playing ? '⏸ Stopp' : '▶ Nur dieser Schritt';
      if (a.playing) return;
      // Nach „Nur dieser Schritt“ bleibt die Endposition stehen, bis weiter bearbeitet wird
      if (this.stepOnly && a.k === this.k + 1) {
        this.stepOnly = false;
        this.atEnd = true;
        this.setHint(`Ende von Schritt ${this.k + 1}. Tippe aufs Spielfeld, um weiter zu bearbeiten.`);
        return;
      }
      this.stepOnly = false;
      this.render();
    });
    $('#ed-cat').innerHTML = CATEGORIES.map(c => `<option>${esc(c)}</option>`).join('');

    $('#tools').addEventListener('click', e => {
      const b = e.target.closest('[data-tool]');
      if (b) this.setTool(b.dataset.tool);
    });

    const svg = this.scene.svg;
    svg.addEventListener('pointerdown', e => this.onDown(e));
    svg.addEventListener('pointermove', e => this.onMove(e));
    svg.addEventListener('pointerup', () => { this.drag = null; });
    svg.addEventListener('pointercancel', () => { this.drag = null; });
    svg.addEventListener('pointerleave', () => {
      if (this.hover) { this.hover = null; this.drawDraft(); }
    });

    $('#ed-finish').onclick = () => this.finish();
    $('#ed-cancel').onclick = () => this.cancel();
    $('#ed-prev').onclick = () => this.gotoStep(this.k - 1);
    $('#ed-next').onclick = () => this.gotoStep(this.k + 1);
    $('#ed-add').onclick = () => {
      this.endPending();
      this.play.steps.splice(this.k + 1, 0, emptyStep());
      this.k++;
      this.touch();
    };
    $('#ed-del').onclick = () => {
      this.endPending();
      if (this.play.steps.length === 1) {
        if (!confirm('Alle Aktionen in diesem Schritt entfernen?')) return;
        this.play.steps[0] = emptyStep();
      } else {
        if (!confirm(`Schritt ${this.k + 1} löschen?`)) return;
        this.play.steps.splice(this.k, 1);
        this.k = Math.min(this.k, this.play.steps.length - 1);
      }
      this.touch();
    };
    $('#ed-preview').onclick = () => {
      if (this.anim.playing) return this.anim.stop();
      this.endPending();
      this.anim.k = 0;
      this.anim.play();
    };
    $('#ed-play-step').onclick = () => {
      if (this.anim.playing) return this.anim.stop();
      this.endPending();
      this.anim.k = this.k;
      this.stepOnly = true;
      this.anim.playStep({ holdLastFrame: true });
    };
    $('#ed-note').addEventListener('input', e => {
      this.play.steps[this.k].note = e.target.value;
      this.dirty = true;
    });
    $('#ed-smooth').addEventListener('change', e => {
      this.smooth = e.target.checked;
      this.drawDraft();
    });
    for (const sel of ['#ed-name', '#ed-cat', '#ed-desc']) {
      $(sel).addEventListener('input', () => { this.dirty = true; });
    }
    $('#ed-save').onclick = () => this.save();
    $('#ed-discard').onclick = () => this.discard();

    document.addEventListener('keydown', e => {
      if (currentView() !== 'editor' || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
      if (e.key === 'Enter') this.finish();
      if (e.key === 'Escape') this.cancel();
    });
  },

  /**
   * params.play gesetzt → diesen Spielzug laden (Bearbeiten).
   * Ohne params → angefangenen Entwurf fortsetzen oder neuen Spielzug beginnen.
   */
  enter(params = {}) {
    if (params.play) {
      if (this.play && this.dirty && !confirm('Der aktuelle Entwurf ist nicht gespeichert. Trotzdem verwerfen?')) {
        return this.render();
      }
      return this.load(params.play, !!params.isEdit);
    }
    if (this.play && this.dirty) return this.render();
    this.load(newPlay(), false);
  },

  leave() {
    this.anim.stop();
  },

  load(play, isEdit) {
    this.play = clone(play);
    this.isEdit = isEdit;
    this.k = 0;
    this.dirty = false;
    this.pending = null;
    this.passFrom = null;
    $('#ed-title').textContent = isEdit ? 'Spielzug bearbeiten' : 'Neuer Spielzug';
    $('#ed-name').value = this.play.name;
    $('#ed-cat').value = CATEGORIES.includes(this.play.category) ? this.play.category : 'Sonstiges';
    $('#ed-desc').value = this.play.description;
    this.setTool(isEdit ? 'cut' : 'setup');
    this.render();
  },

  discard() {
    if (this.dirty && !confirm('Änderungen verwerfen?')) return;
    const { id } = this.play, wasEdit = this.isEdit;
    this.dirty = false;
    this.play = null;
    if (wasEdit) go('viewer', { id });
    else this.load(newPlay(), false);
  },

  save() {
    this.endPending();
    const name = $('#ed-name').value.trim();
    if (!name) {
      this.flash('Bitte gib dem Spielzug einen Namen.');
      $('#ed-name').focus();
      return;
    }
    Object.assign(this.play, {
      name,
      category: $('#ed-cat').value,
      description: $('#ed-desc').value.trim(),
      updated: new Date().toISOString(),
    });
    if (!upsertPlay(clone(this.play))) return;
    const { id } = this.play;
    this.dirty = false;
    this.play = null;
    toast('Spielzug gespeichert');
    go('viewer', { id });
  },

  // ---------- Werkzeuge, Hinweise, Schritte ----------

  setTool(t) {
    this.endPending();
    this.tool = t;
    document.querySelectorAll('#tools [data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === t));
    this.setHint();
    if (this.play) this.render();
  },

  setHint(msg) {
    const h = $('#ed-hint');
    h.textContent = msg || HINTS[this.tool];
    h.classList.toggle('warn', !!msg);
  },

  flash(msg) {
    this.setHint(msg);
    clearTimeout(this._flashTimer);
    this._flashTimer = setTimeout(() => this.setHint(), 2600);
  },

  gotoStep(k) {
    this.endPending();
    this.k = Math.max(0, Math.min(k, this.play.steps.length - 1));
    this.render();
  },

  touch() {
    this.dirty = true;
    this.render();
  },

  // ---------- Zeichnen ----------

  selected() {
    if (this.pending) return [this.pending.id];
    if (this.passFrom) return [this.passFrom];
    return [];
  },

  render() {
    if (!this.play) return;
    if (this.atEnd) {
      this.atEnd = false;
      this.setHint();
    }
    renderScene(this.scene, this.play, this.k, this.selected());
    this.drawDraft();
    const n = this.play.steps.length;
    $('#ed-step').textContent = `Schritt ${this.k + 1} / ${n}`;
    $('#ed-prev').disabled = this.k === 0;
    $('#ed-next').disabled = this.k >= n - 1;
    if (document.activeElement !== $('#ed-note')) $('#ed-note').value = this.play.steps[this.k].note || '';
    $('#ed-pending').hidden = !this.pending;
  },

  drawDraft() {
    const g = this.scene.draft;
    g.innerHTML = '';
    if (!this.pending) return;
    const start = stateAt(this.play, this.k).players[this.pending.id];
    const pts = [start, ...this.pending.points];
    if (this.hover) pts.push(this.hover);
    if (pts.length >= 2) el('path', { d: this.smooth ? smoothD(pts) : polyD(pts), class: 'mv draftline' }, g);
    for (const q of this.pending.points) el('circle', { cx: round2(q.x), cy: round2(q.y), r: 0.9, class: 'wp' }, g);
  },

  // ---------- Eingabe ----------

  svgPoint(e) {
    const svg = this.scene.svg;
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const q = p.matrixTransform(svg.getScreenCTM().inverse());
    return { x: q.x, y: q.y };
  },

  onDown(e) {
    if (this.anim.playing) { this.anim.stop(); return; }
    e.preventDefault();
    if (this.atEnd) { this.render(); return; }
    const pt = this.svgPoint(e);
    const st = stateAt(this.play, this.k);
    const step = this.play.steps[this.k];
    const t = this.tool;
    const hit = hitTest(st.players, pt);

    if (t === 'setup') {
      if (this.k !== 0) return this.flash('Die Startaufstellung kann nur in Schritt 1 geändert werden.');
      if (hit) {
        this.drag = hit;
        this.scene.svg.setPointerCapture(e.pointerId);
      }
      return;
    }

    if (t === 'ball') {
      if (this.k !== 0) return this.flash('Den Ballbesitz zu Beginn legst du in Schritt 1 fest. Danach wechselt er per Pass.');
      if (hit) { this.play.initial.ball = hit; this.touch(); }
      return;
    }

    if (t === 'cut' || t === 'dribble' || t === 'screen') {
      if (this.pending) {
        const last = this.pending.points[this.pending.points.length - 1];
        if (last && dist(last, pt) < 2.5) return this.finish();
        if (hit === this.pending.id && !this.pending.points.length) return this.cancel();
        this.pending.points.push(clampPoint(pt));
        this.render();
        return;
      }
      if (!hit) return this.flash('Tippe zuerst auf einen Spieler.');
      if (t === 'dribble' && st.ball !== hit) return this.flash('Nur der Spieler mit Ball kann dribbeln.');
      this.pending = { id: hit, type: t, points: [] };
      this.render();
      return;
    }

    if (t === 'pass') {
      // Pass startet nach den Laufwegen: auch die Endpositionen dieses Schritts zählen als Treffer
      const endPos = { ...st.players };
      for (const id in step.moves) {
        const pts = step.moves[id].points;
        if (pts.length) endPos[id] = pts[pts.length - 1];
      }
      const passHit = hitTest(endPos, pt) || hit;
      if (!this.passFrom) {
        if (!passHit) return this.flash('Tippe zuerst den Ballbesitzer an.');
        if (passHit !== st.ball) return this.flash(`Nur der Spieler mit Ball (Nr. ${st.ball}) kann passen.`);
        this.passFrom = passHit;
        this.render();
        return;
      }
      if (passHit === this.passFrom) { this.passFrom = null; this.render(); return; }
      if (!passHit) return this.flash('Tippe jetzt den Empfänger an.');
      step.pass = { from: this.passFrom, to: passHit };
      this.passFrom = null;
      this.touch();
      return;
    }

    if (t === 'erase') {
      if (!hit) return;
      let changed = false;
      if (step.moves[hit]) { delete step.moves[hit]; changed = true; }
      if (step.pass && (step.pass.from === hit || step.pass.to === hit)) { step.pass = null; changed = true; }
      if (changed) this.touch();
      else this.flash('Dieser Spieler hat in diesem Schritt keine Aktion.');
    }
  },

  onMove(e) {
    if (this.drag) {
      this.play.initial.players[this.drag] = clampPoint(this.svgPoint(e));
      this.touch();
    } else if (this.pending && e.pointerType === 'mouse') {
      this.hover = this.svgPoint(e);
      this.drawDraft();
    }
  },

  finish() {
    if (!this.pending) return;
    if (!this.pending.points.length) return this.cancel();
    const { id, type, points } = this.pending;
    this.play.steps[this.k].moves[id] = { type, points, smooth: this.smooth };
    this.pending = null;
    this.hover = null;
    this.touch();
  },

  cancel() {
    this.pending = null;
    this.passFrom = null;
    this.hover = null;
    this.render();
  },

  /** Halbfertige Aktion übernehmen (falls Punkte da sind), sonst verwerfen. */
  endPending() {
    if (this.pending && this.pending.points.length) this.finish();
    this.pending = null;
    this.passFrom = null;
    this.hover = null;
  },
};
