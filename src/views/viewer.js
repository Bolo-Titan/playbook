// Ansicht eines Spielzugs: abspielen, Schritte durchgehen, teilen, bearbeiten, löschen.
import { describeStep } from '../core/model.js';
import { noteBlocks } from '../core/note.js';
import { makeScene } from '../render/court.js';
import { Animator } from '../render/animator.js';
import { getPlay, removePlay } from '../storage/store.js';
import { sharePlay, exportPlay, shareVideo } from '../io/files.js';
import { recordPlay, videoFormat } from '../render/video.js';
import { $, esc, toast } from '../ui/dom.js';
import { go } from '../ui/router.js';

/** Notiz als HTML: Absätze mit Zeilenumbrüchen, Punkt- und nummerierte Listen. */
const noteHtml = note => noteBlocks(note).map(b => b.type === 'text'
  ? `<p>${b.lines.map(esc).join('<br>')}</p>`
  : `<${b.type}>${b.items.map(i => `<li>${esc(i)}</li>`).join('')}</${b.type}>`).join('');

export const viewer = {
  tab: 'archive',
  play: null,

  init() {
    this.scene = makeScene($('#vw-svg'));
    this.anim = new Animator(this.scene, () => this.play, a => this.update(a));

    $('#vw-play').onclick = () => (this.anim.playing ? this.anim.show(this.anim.k) : this.anim.play());
    $('#vw-first').onclick = () => this.anim.show(0);
    $('#vw-prev').onclick = () => this.anim.show(this.anim.k - 1);
    $('#vw-next').onclick = () => this.anim.playStep();
    $('#vw-speed').onchange = e => { this.anim.speed = Number(e.target.value); };
    $('#vw-share').onclick = () => sharePlay(this.play);
    // Erst aufnehmen, dann mit einem zweiten Tippen teilen (Teilen-Menü braucht ein frisches Tippen)
    $('#vw-video').onclick = () => (this.video ? shareVideo(this.play, this.video) : this.recordVideo());
    $('#vw-export').onclick = () => exportPlay(this.play);
    $('#vw-edit').onclick = () => go('editor', { play: this.play, isEdit: true });
    $('#vw-delete').onclick = () => {
      if (!confirm(`„${this.play.name}“ wirklich löschen?`)) return;
      removePlay(this.play.id);
      toast('Spielzug gelöscht');
      go('archive');
    };
  },

  enter({ id, video }) {
    const play = getPlay(id);
    if (!play) {
      toast('Spielzug nicht gefunden');
      return go('archive');
    }
    this.play = play;
    $('#vw-title').textContent = play.name || 'Ohne Namen';
    $('#vw-cat').textContent = play.category;
    $('#vw-desc').textContent = play.description || '';

    const ol = $('#vw-steps');
    ol.innerHTML = '';
    play.steps.forEach((s, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<b>Schritt ${i + 1}</b><div class="note">${noteHtml(s.note)}</div>
        <div class="muted" style="font-size:.85rem">${esc(describeStep(s))}</div>`;
      li.onclick = () => this.anim.show(i);
      ol.appendChild(li);
    });
    this.anim.show(0);
    this.video = null;
    this.updateVideoButton();
    if (video) this.recordVideo();
  },

  leave() {
    this.anim.stop();
    if (this.recording) this.recording.abort();
    this.recording = null;
  },

  async recordVideo() {
    if (this.recording) return;
    if (!videoFormat()) {
      return toast('Dieser Browser kann keine MP4-Videos erstellen (z. B. Firefox). Bitte Chrome, Edge oder Safari verwenden – oder am Handy.', 7000);
    }
    const ctrl = new AbortController();
    this.recording = ctrl;
    this.updateVideoButton();
    try {
      const video = await recordPlay(this.play, {
        signal: ctrl.signal,
        onProgress: (k, n) => { $('#vw-video').textContent = `Video wird erstellt … ${k + 1}/${n}`; },
      });
      if (this.recording !== ctrl) return;
      this.video = video;
      toast('Video fertig – tippe auf „Video teilen“.');
    } catch (e) {
      if (e.name !== 'AbortError') toast('Video konnte nicht erstellt werden: ' + e.message);
    } finally {
      if (this.recording === ctrl) this.recording = null;
      this.updateVideoButton();
    }
  },

  updateVideoButton() {
    const b = $('#vw-video');
    b.disabled = !!this.recording;
    if (!this.recording) b.textContent = this.video ? '🎬 Video teilen' : 'Als Video teilen';
    else b.textContent = 'Video wird erstellt …';
  },

  update(a) {
    const n = this.play.steps.length;
    $('#vw-step').textContent = a.k < n ? `Schritt ${a.k + 1} von ${n}` : 'Endposition';
    $('#vw-play').textContent = a.playing ? '⏸ Pause' : a.k >= n ? '↻ Nochmal' : '▶ Abspielen';
    $('#vw-prev').disabled = a.k === 0;
    $('#vw-next').disabled = a.k >= n;
    [...$('#vw-steps').children].forEach((li, i) => li.classList.toggle('active', i === a.k));
  },
};
