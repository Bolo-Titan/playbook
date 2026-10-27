// Spielt einen Spielzug Schritt für Schritt ab.
// Pro Schritt Takt für Takt: alle Laufwege eines Takts und ggf. der Pass gleichzeitig.
import { TIMING } from '../core/constants.js';
import { ease, positionsAt, passBeat, stepBeats } from '../core/model.js';
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

  /** Spielt Schritt k Takt für Takt ab: Laufwege und Pass eines Takts gleichzeitig. Liefert false bei Abbruch. */
  async animateStep(play, k, tok) {
    const step = play.steps[k], pb = passBeat(step);
    // Leerer Schritt: einen Takt stehen bleiben, damit man ihn sieht
    for (let b = 0; b < Math.max(1, stepBeats(step)); b++) {
      const { players, ball } = positionsAt(play, k, b);
      const paths = {};
      for (const act of step.actions) {
        if (act.beat === b && players[act.player]) paths[act.player] = measurer(moveD(players[act.player], act));
      }
      const moving = Object.keys(paths).length > 0, pass = pb === b ? step.pass : null;
      const D = (moving || !pass ? TIMING.move : TIMING.pass) / this.speed;
      // Läuft der Empfänger in diesem Takt, fliegt der Ball den ganzen Takt mit ihm mit
      const P = pass && !paths[pass.to] ? Math.min(D, TIMING.pass / this.speed) : D;
      const from = pass && players[pass.from] ? ballOffset(players[pass.from]) : null;
      const ok = await this.tween(D, tok, t => {
        const u = ease(t), pos = {};
        for (const id in players) pos[id] = paths[id] ? paths[id].at(u) : players[id];
        placePlayers(this.scene, pos);
        if (from && pos[pass.to]) {
          const v = ease(Math.min(1, (t * D) / P)), to = ballOffset(pos[pass.to]);
          placeBall(this.scene, { x: from.x + (to.x - from.x) * v, y: from.y + (to.y - from.y) * v });
        } else if (pos[ball]) {
          placeBall(this.scene, ballOffset(pos[ball]));
        }
      });
      for (const id in paths) paths[id].dispose();
      if (!ok) return false;
    }
    return true;
  }

  /** Ruft draw(t) mit t = 0…1 (linear) über dur ms auf. Liefert false bei Abbruch. */
  tween(dur, tok, draw) {
    return new Promise(resolve => {
      const t0 = performance.now();
      const frame = now => {
        if (tok !== this.token) return resolve(false);
        const t = Math.min(1, (now - t0) / dur);
        draw(t);
        if (t >= 1) return resolve(true);
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  }
}
