// Spielt einen Spielzug Schritt für Schritt ab.
// Pro Schritt Takt für Takt: alle Laufwege eines Takts gleichzeitig, der Pass in seinem Takt.
import { TIMING } from '../core/constants.js';
import { ease, positionsAt, timeline } from '../core/model.js';
import { moveD } from '../core/geometry.js';
import { measurer } from './svg.js';
import { renderScene, placePlayers, placeBall, ballOffset } from './court.js';

const sleep = ms => new Promise(res => setTimeout(res, ms));

export class Animator {
  /**
   * @param scene    Ergebnis von makeScene()
   * @param getPlay  Funktion, die den aktuellen Spielzug liefert
   * @param onUpdate wird bei jeder Zustandsänderung (k, playing) aufgerufen
   */
  constructor(scene, getPlay, onUpdate) {
    this.scene = scene;
    this.getPlay = getPlay;
    this.onUpdate = onUpdate || (() => {});
    this.k = 0;          // aktueller Schritt (steps.length = Endposition)
    this.speed = 1;
    this.playing = false;
    this.token = 0;      // jede neue Aktion erhöht das Token → laufende Animation bricht ab
  }

  stop() {
    this.token++;
    if (this.playing) {
      this.playing = false;
      this.onUpdate(this);
    }
  }

  show(k) {
    this.token++;
    this.playing = false;
    const play = this.getPlay();
    this.k = Math.max(0, Math.min(k, play.steps.length));
    renderScene(this.scene, play, this.k);
    this.onUpdate(this);
  }

  async play() {
    const play = this.getPlay();
    if (this.k >= play.steps.length) this.k = 0;
    const tok = ++this.token;
    this.playing = true;
    this.onUpdate(this);
    while (this.k < play.steps.length) {
      renderScene(this.scene, play, this.k);
      this.onUpdate(this);
      if (!(await this.animateStep(play, this.k, tok))) return;
      this.k++;
      renderScene(this.scene, play, this.k);
      this.onUpdate(this);
      await sleep(TIMING.pause / this.speed);
      if (tok !== this.token) return;
    }
    this.playing = false;
    this.onUpdate(this);
  }

  /**
   * Spielt nur den aktuellen Schritt animiert ab und hält danach an.
   * holdLastFrame: letztes Bild des Schritts stehen lassen statt den Beginn des nächsten zu zeigen.
   */
  async playStep({ holdLastFrame = false } = {}) {
    const play = this.getPlay();
    if (this.k >= play.steps.length) return;
    const tok = ++this.token;
    this.playing = true;
    renderScene(this.scene, play, this.k);
    this.onUpdate(this);
    if (!(await this.animateStep(play, this.k, tok))) return;
    this.k++;
    this.playing = false;
    if (!holdLastFrame) renderScene(this.scene, play, this.k);
    this.onUpdate(this);
  }

  /** Spielt Schritt k Takt für Takt ab (siehe timeline). Liefert false bei Abbruch. */
  async animateStep(play, k, tok) {
    const step = play.steps[k];
    for (const seg of timeline(step)) {
      const { players, ball } = positionsAt(play, k, seg.beat);
      let ok;
      if (seg.kind === 'pass') {
        const a = ballOffset(players[step.pass.from]), b = ballOffset(players[step.pass.to]);
        ok = await this.tween(TIMING.pass / this.speed, tok, u => {
          placeBall(this.scene, { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
        });
      } else {
        const paths = {};
        for (const act of step.actions) {
          if (act.beat === seg.beat && players[act.player]) paths[act.player] = measurer(moveD(players[act.player], act));
        }
        ok = await this.tween(TIMING.move / this.speed, tok, u => {
          const pos = {};
          for (const id in players) pos[id] = paths[id] ? paths[id].at(u) : players[id];
          placePlayers(this.scene, pos);
          if (pos[ball]) placeBall(this.scene, ballOffset(pos[ball]));
        });
        for (const id in paths) paths[id].dispose();
      }
      if (!ok) return false;
    }
    return true;
  }

  /** Ruft draw(u) mit u = 0…1 (geglättet) über dur ms auf. Liefert false bei Abbruch. */
  tween(dur, tok, draw) {
    return new Promise(resolve => {
      const t0 = performance.now();
      const frame = now => {
        if (tok !== this.token) return resolve(false);
        const t = Math.min(1, (now - t0) / dur);
        draw(ease(t));
        if (t >= 1) return resolve(true);
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  }
}
