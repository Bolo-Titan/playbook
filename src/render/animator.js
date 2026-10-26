// Spielt einen Spielzug Schritt für Schritt ab.
// Pro Schritt: Phase 1 alle Laufwege gleichzeitig, Phase 2 der Pass.
import { TIMING } from '../core/constants.js';
import { ease, stateAt } from '../core/model.js';
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

  animateStep(play, k, tok) {
    return new Promise(resolve => {
      const st = stateAt(play, k), step = play.steps[k], paths = {};
      for (const id in step.moves) {
        if (st.players[id]) paths[id] = measurer(moveD(st.players[id], step.moves[id]));
      }
      const D = TIMING.move / this.speed;
      const P = step.pass ? TIMING.pass / this.speed : 0;
      const t0 = performance.now();
      const done = ok => {
        for (const id in paths) paths[id].dispose();
        resolve(ok);
      };
      const frame = now => {
        if (tok !== this.token) return done(false);
        const e = now - t0, et = ease(Math.min(1, e / D)), pos = {};
        for (const id in st.players) pos[id] = paths[id] ? paths[id].at(et) : st.players[id];
        placePlayers(this.scene, pos);
        if (e < D || !step.pass) {
          if (pos[st.ball]) placeBall(this.scene, ballOffset(pos[st.ball]));
        } else {
          const u = ease(Math.min(1, (e - D) / P));
          const a = ballOffset(pos[step.pass.from]), b = ballOffset(pos[step.pass.to]);
          placeBall(this.scene, { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
        }
        if (e >= D + P) return done(true);
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  }
}
