/**
 * Racket–ball impact diagram (2D, SVG).
 *
 * Side view = the vertical plane in which physics.js solves the impact:
 *   x to the right is towards the net, y up. The racket face is drawn edge-on and
 *   tilted by the face angle from vertical (positive = open, top tilted back);
 *   the swing arrives from behind along the swing-path angle; the incoming ball
 *   arrives from the net side; the ball leaves towards the net at the launch angle.
 *   Topspin (top of the ball moving towards the net) turns clockwise on screen.
 * Top view = horizontal aim: up is the hitter's left, matching the "左+ / L+" readout.
 *
 * Colours come from the CSS tokens, so the drawing follows the light/dark theme.
 * Public interface matches what app.js expects: updateFromState, setViewMode,
 * renderStep, setTheme, _onResize.
 *
 * Direct manipulation. Arrows are vectors: their direction is an angle and their length
 * is a speed, so dragging a knob anywhere around the contact point sets both at once.
 *   side view  face top        -> face angle
 *              swing tail      -> swing path (direction) + racket speed (length)
 *              incoming tail   -> incoming angle + incoming speed
 *              launch head     -> launch angle + launch speed (racket back-solved)
 *   top view   launch head     -> aim
 * Changes go out through `onChange(updates, source)`, where `updates` maps state keys to
 * values and `source` is 'racket' (inputs) or 'hud' (a launch target to back-solve).
 */

// Ranges and steps mirror the sliders in index.html
const DIALS = {
  faceAngleDeg: { min: -18, max: 32, step: 0.2 },
  swingPathDeg: { min: -30, max: 45, step: 0.5 },
  aimAngleDeg: { min: -28, max: 28, step: 0.2 },
  racketSpeedKmh: { min: 20, max: 175, step: 0.5 },
  incomingSpeedKmh: { min: 0, max: 200, step: 1 },
  incomingAngleDeg: { min: -40, max: 35, step: 0.5 },
  speedKmh: { min: 40, max: 230, step: 0.5 },
  launchAngleDeg: { min: -10, max: 32, step: 0.2 }
};
// Vector length (SVG units) <-> speed (km/h) for each arrow
const LEN = {
  swing: { r0: 26, k: 0.5 },     // 30..175 km/h -> 41..114
  incoming: { r0: 22, k: 0.45 }, // 0..200 km/h  -> 22..112
  launch: { r0: 36, k: 0.52 }    // 40..230 km/h -> 57..156
};
const lenOf = (kind, v) => LEN[kind].r0 + LEN[kind].k * v;
const speedOf = (kind, r) => (r - LEN[kind].r0) / LEN[kind].k;
const clampStep = (key, v) => {
  const d = DIALS[key];
  return Math.round(Math.max(d.min, Math.min(d.max, Math.round(v / d.step) * d.step)) * 10) / 10;
};
// Which knob owns a control (used by flashDial and coach tips)
const KNOB_OF = {
  faceAngleDeg: 'face', swingPathDeg: 'swing', racketSpeedKmh: 'swing',
  incomingAngleDeg: 'incoming', incomingSpeedKmh: 'incoming',
  speedKmh: 'launch', launchAngleDeg: 'launch', aimAngleDeg: 'aim'
};
const normDeg = (d) => ((((d + 180) % 360) + 360) % 360) - 180;

const SVG_NS = 'http://www.w3.org/2000/svg';
// Compact (sidebar) and detailed (studio) canvases; the studio adds an inset on the right
const GEOM = {
  compact: { W: 360, H: 196, C: { x: 168, y: 100 } },
  detail: { W: 540, H: 250, C: { x: 196, y: 125 } }
};
const DEG = Math.PI / 180;

const T = {
  zh: {
    face: '拍面', swing: '挥拍轨迹', incoming: '来球', toss: '抛球', out: '出球', aim: '出球方向',
    net: '网', hitter: '击球者', left: '左', right: '右', top: '上旋', back: '下旋',
    curveR: '侧旋 · 右曲', curveL: '侧旋 · 左曲',
    rel: '相对来球', normal: '法向', tangential: '切向', attack: '攻角'
  },
  en: {
    face: 'Face', swing: 'Swing path', incoming: 'Incoming', toss: 'Toss', out: 'Launch', aim: 'Launch direction',
    net: 'Net', hitter: 'Hitter', left: 'Left', right: 'Right', top: 'Topspin', back: 'Backspin',
    curveR: 'Sidespin · curves right', curveL: 'Sidespin · curves left',
    rel: 'Ball vs racket', normal: 'Normal', tangential: 'Along strings', attack: 'Attack'
  }
};

const signed = (v, d = 1) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(d)}`;
// math angle (deg, y up) + length -> screen offset
const vec = (len, angDeg) => [len * Math.cos(angDeg * DEG), -len * Math.sin(angDeg * DEG)];

export class RacketDiagram {
  /**
   * @param {HTMLElement} containerEl
   * @param {object} [opts]
   * @param {boolean} [opts.detail] draw the full instrument: relative velocity split into
   *   normal / tangential parts, attack angle, angle values and vector speeds
   * @param {'side'|'top'} [opts.mode] initial view
   */
  constructor(containerEl, { detail = false, mode = 'side' } = {}) {
    this.el = containerEl;
    this.detail = detail;
    this.fine = false; // touch-friendly fine mode (Shift does the same with a mouse)
    this.mode = mode;
    this.geom = detail && mode === 'side' ? GEOM.detail : GEOM.compact;
    this.state = null;
    this.svg = document.createElementNS(SVG_NS, 'svg');
    this.svg.setAttribute('viewBox', `0 0 ${this.geom.W} ${this.geom.H}`);
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.svg.setAttribute('class', 'racket-diagram-svg');
    this.svg.setAttribute('role', 'img');
    this.el.appendChild(this.svg);
    this.onChange = null;
    this._drag = null;
    this._bindDials();
  }

  // Pointer position -> polar (math angle in deg, radius in SVG units) around the contact point
  _polarAt(e) {
    const pt = this.svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(this.svg.getScreenCTM().inverse());
    const { C } = this.geom;
    return { theta: Math.atan2(-(p.y - C.y), p.x - C.x) / DEG, r: Math.hypot(p.x - C.x, p.y - C.y) };
  }

  /** Values a knob sets for a pointer at polar (theta, r). */
  _valuesFromPolar(kind, theta, r) {
    if (kind === 'face') return { updates: { faceAngleDeg: normDeg(theta - 90) }, source: 'racket' };
    if (kind === 'aim') return { updates: { aimAngleDeg: normDeg(theta) }, source: 'racket' };
    if (kind === 'swing') {
      // the tail sits behind the contact point, opposite the travel direction
      return { updates: { swingPathDeg: normDeg(theta - 180), racketSpeedKmh: speedOf('swing', r) }, source: 'racket' };
    }
    if (kind === 'incoming') {
      return { updates: { incomingAngleDeg: -normDeg(theta), incomingSpeedKmh: speedOf('incoming', r) }, source: 'racket' };
    }
    if (kind === 'launch') {
      return { updates: { launchAngleDeg: normDeg(theta), speedKmh: speedOf('launch', r) }, source: 'hud' };
    }
    return null;
  }

  _emit(updates, source) {
    const clean = {};
    for (const [k, v] of Object.entries(updates)) clean[k] = clampStep(k, v);
    const changed = Object.entries(clean).some(([k, v]) => Math.abs((this.state[k] ?? 0) - v) > 1e-9);
    if (changed && typeof this.onChange === 'function') this.onChange(clean, source);
  }

  _bindDials() {
    this.svg.addEventListener('pointerdown', (e) => {
      const knob = e.target.closest('[data-dial]');
      if (!knob || !this.state) return;
      e.preventDefault();
      const kind = knob.getAttribute('data-dial');
      const { theta, r } = this._polarAt(e);
      const base = this._valuesFromPolar(kind, theta, r);
      const startVals = {};
      for (const k of Object.keys(base.updates)) startVals[k] = this.state[k] ?? 0;
      this._drag = { key: kind, base: base.updates, startVals };
      try {
        this.svg.setPointerCapture(e.pointerId);
      } catch (err) {
        /* capture unavailable: dragging still works while over the diagram */
      }
      this.el.classList.add('dialing');
      this._render();
    });
    this.svg.addEventListener('pointermove', (e) => {
      if (!this._drag) return;
      const { theta, r } = this._polarAt(e);
      const res = this._valuesFromPolar(this._drag.key, theta, r);
      if (!res) return;
      // Fine mode: a quarter of the pointer's movement, relative to where the drag started
      if (e.shiftKey || this.fine) {
        for (const k of Object.keys(res.updates)) {
          let delta = res.updates[k] - this._drag.base[k];
          if (k.endsWith('Deg')) delta = normDeg(delta);
          res.updates[k] = this._drag.startVals[k] + delta * 0.25;
        }
      }
      this._emit(res.updates, res.source);
    });
    const end = () => {
      if (!this._drag) return;
      this._drag = null;
      this.el.classList.remove('dialing');
      this._render();
    };
    this.svg.addEventListener('pointerup', end);
    this.svg.addEventListener('pointercancel', end);
    this.svg.addEventListener('lostpointercapture', end);

    // Keyboard: Tab to a knob; Left/Right turn it, Up/Down change its speed (or the angle for
    // face and aim); Shift moves 10 steps at a time.
    this.svg.addEventListener('focusin', (e) => {
      const knob = e.target.closest('[data-dial]');
      this._focusKey = knob ? knob.getAttribute('data-dial') : null;
    });
    this.svg.addEventListener('focusout', () => {
      if (!this._rendering) this._focusKey = null;
    });
    this.svg.addEventListener('keydown', (e) => {
      const knob = e.target.closest('[data-dial]');
      if (!knob || !this.state) return;
      const kind = knob.getAttribute('data-dial');
      const n = e.shiftKey ? 10 : 1;
      const keyMap = {
        face: { ArrowUp: ['faceAngleDeg', 1], ArrowDown: ['faceAngleDeg', -1], ArrowRight: ['faceAngleDeg', 1], ArrowLeft: ['faceAngleDeg', -1] },
        aim: { ArrowUp: ['aimAngleDeg', 1], ArrowDown: ['aimAngleDeg', -1], ArrowLeft: ['aimAngleDeg', 1], ArrowRight: ['aimAngleDeg', -1] },
        swing: { ArrowUp: ['racketSpeedKmh', 1], ArrowDown: ['racketSpeedKmh', -1], ArrowRight: ['swingPathDeg', 1], ArrowLeft: ['swingPathDeg', -1] },
        incoming: { ArrowUp: ['incomingSpeedKmh', 1], ArrowDown: ['incomingSpeedKmh', -1], ArrowRight: ['incomingAngleDeg', 1], ArrowLeft: ['incomingAngleDeg', -1] },
        launch: { ArrowUp: ['speedKmh', 1], ArrowDown: ['speedKmh', -1], ArrowRight: ['launchAngleDeg', 1], ArrowLeft: ['launchAngleDeg', -1] }
      };
      const hit = keyMap[kind] && keyMap[kind][e.key];
      if (!hit) return;
      e.preventDefault();
      const [k, dir] = hit;
      this._emit({ [k]: (this.state[k] ?? 0) + dir * n * DIALS[k].step }, kind === 'launch' ? 'hud' : 'racket');
    });
  }

  setFine(on) {
    this.fine = !!on;
  }

  setViewMode(mode) {
    this.mode = mode === 'top' ? 'top' : 'side';
    this._render();
  }

  updateFromState(state) {
    this.state = state;
    this._render();
  }

  renderStep() {}

  /** Briefly highlights one dial (switching view if that dial lives in the other one). */
  flashDial(key) {
    const knob = KNOB_OF[key];
    if (!knob) return null;
    const want = knob === 'aim' ? 'top' : 'side';
    if (this.mode !== want) this.setViewMode(want);
    this._flashKey = knob;
    this._render();
    clearTimeout(this._flashTimer);
    this._flashTimer = setTimeout(() => {
      this._flashKey = null;
      this._render();
    }, 1600);
    return want;
  }
  setTheme() {}
  _onResize() {}

  _render() {
    if (!this.state) return;
    const { W, H, C } = this.geom;
    const s = this.state;
    const L = T[s.lang === 'en' ? 'en' : 'zh'];
    const parts = [];
    const line = (x1, y1, x2, y2, stroke, w = 1, dash = '') =>
      parts.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${stroke}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''} stroke-linecap="butt"/>`);
    const text = (x, y, str, fill = 'var(--ink-2)', anchor = 'start', size = 10.5) =>
      parts.push(`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" fill="${fill}" font-size="${size}" text-anchor="${anchor}" class="rd-text">${str}</text>`);
    const head = (x, y, angDeg, color, size = 7) => {
      // arrowhead at (x, y) pointing along math angle angDeg
      const [ax, ay] = vec(size, angDeg + 155);
      const [bx, by] = vec(size, angDeg - 155);
      parts.push(`<path d="M${x.toFixed(1)},${y.toFixed(1)} L${(x + ax).toFixed(1)},${(y + ay).toFixed(1)} L${(x + bx).toFixed(1)},${(y + by).toFixed(1)} Z" fill="${color}"/>`);
    };
    const arrow = (x1, y1, x2, y2, color, w = 2, dash = '') => {
      const ang = Math.atan2(-(y2 - y1), x2 - x1) / DEG;
      const [bx, by] = vec(6, ang);
      line(x1, y1, x2 - bx, y2 - by, color, w, dash);
      head(x2, y2, ang, color);
    };
    const arc = (r, a0, a1, color, w = 1) => {
      // math angles a0 -> a1 (degrees, counter-clockwise positive)
      const [x0, y0] = vec(r, a0);
      const [x1, y1] = vec(r, a1);
      const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
      const sweep = a1 > a0 ? 0 : 1;
      parts.push(`<path d="M${(C.x + x0).toFixed(1)},${(C.y + y0).toFixed(1)} A${r},${r} 0 ${large} ${sweep} ${(C.x + x1).toFixed(1)},${(C.y + y1).toFixed(1)}" fill="none" stroke="${color}" stroke-width="${w}"/>`);
    };
    // Faint dial arc with 5-degree ticks over a parameter's range; knob is a small square
    const dial = (r, a0, a1, active) => {
      arc(r, a0, a1, active ? 'var(--ink-3)' : 'var(--rule)', 1);
      const lo = Math.min(a0, a1);
      const hi = Math.max(a0, a1);
      for (let a = Math.ceil(lo / 5) * 5; a <= hi; a += 5) {
        const major = a % 15 === 0;
        const [x0, y0] = vec(r, a);
        const [x1, y1] = vec(r + (major ? 6 : 3), a);
        line(C.x + x0, C.y + y0, C.x + x1, C.y + y1, active ? 'var(--ink-3)' : 'var(--rule)', 1);
      }
    };
    const knob = (x, y, key, label, readout = '') => {
      const active = this._drag && this._drag.key === key;
      const flash = this._flashKey === key;
      if ((active || (this.detail && this._focusKey === key)) && readout) {
        const right = x < W / 2;
        parts.push(`<text x="${(x + (right ? 12 : -12)).toFixed(1)}" y="${(y - 10).toFixed(1)}" text-anchor="${right ? 'start' : 'end'}" class="rd-text rd-readout" font-size="11">${readout}</text>`);
      }
      parts.push(`<g class="rd-knob${active ? ' active' : ''}${flash ? ' flash' : ''}" data-dial="${key}" role="slider" tabindex="0" aria-label="${label}"${readout ? ` aria-valuetext="${readout}"` : ''}>`
        + `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="18" fill="transparent"/>`
        + `<rect x="${(x - 5).toFixed(1)}" y="${(y - 5).toFixed(1)}" width="10" height="10" rx="1" fill="${active ? 'var(--accent)' : 'var(--panel)'}" stroke="var(--ink)" stroke-width="1.25"/>`
        + `</g>`);
    };
    const spinArc = (rpm, label) => {
      // clockwise on screen for positive rpm (topspin in side view, right-curving sidespin in top view)
      if (Math.abs(rpm) < 20) return;
      const cw = rpm > 0;
      const r = 16;
      const a0 = cw ? 150 : 30;
      const a1 = cw ? -60 : 240;
      arc(r, a0, a1, 'var(--ink-2)', 1.25);
      const [ex, ey] = vec(r, a1);
      head(C.x + ex, C.y + ey, a1 + (cw ? -90 : 90), 'var(--ink-2)', 5);
      text(C.x + 22, C.y + 30, label, 'var(--ink-2)', 'start');
    };

    // Grid frame
    for (let gx = 24; gx < W; gx += 24) line(gx, 8, gx, H - 8, 'var(--rule-soft)', 1);
    for (let gy = 8; gy < H; gy += 24) line(8, gy, W - 8, gy, 'var(--rule-soft)', 1);

    if (this.mode === 'side') {
      const f = s.faceAngleDeg ?? 0;
      const sw = s.swingPathDeg ?? 0;
      const la = s.launchAngleDeg ?? 0;
      const vIn = s.incomingSpeedKmh ?? 0;
      const aIn = s.incomingAngleDeg ?? 0;
      const vOut = s.speedKmh ?? 0;
      const isToss = (s.hitZ ?? 1) > 1.95 || vIn < 2;

      // Reference axes through the contact point
      line(16, C.y, W - 16, C.y, 'var(--edge)', 1, '3 3');
      line(C.x, 12, C.x, H - 12, 'var(--edge)', 1, '3 3');

      // Direction labels
      text(W - (this.detail ? 160 : 14), H - 12, `${L.net} →`, 'var(--ink-3)', 'end');
      text(14, H - 12, `← ${L.hitter}`, 'var(--ink-3)', 'start');

      // Dial ranges (drawn first, under everything)
      const drag = this._drag?.key;
      const vR = s.racketSpeedKmh ?? 90;
      const swingLen = lenOf('swing', vR);
      dial(46, 90 + DIALS.faceAngleDeg.min, 90 + DIALS.faceAngleDeg.max, drag === 'face');
      dial(swingLen, 180 + DIALS.swingPathDeg.min, 180 + DIALS.swingPathDeg.max, drag === 'swing');

      // Swing: arrives from behind along the swing angle; arrow length = racket speed
      const [sx, sy] = vec(1, sw);
      const tailX = C.x - sx * swingLen;
      const tailY = C.y - sy * swingLen;
      if (drag === 'swing') {
        // length scale along the swing direction: min and max racket speed
        line(C.x - sx * lenOf('swing', DIALS.racketSpeedKmh.min), C.y - sy * lenOf('swing', DIALS.racketSpeedKmh.min),
          C.x - sx * lenOf('swing', DIALS.racketSpeedKmh.max), C.y - sy * lenOf('swing', DIALS.racketSpeedKmh.max), 'var(--ink-3)', 1, '2 3');
      }
      arrow(tailX, tailY, C.x - sx * 26, C.y - sy * 26, 'var(--ink-2)', 2);
      text(tailX, tailY + (sw >= 0 ? 16 : -8), L.swing, 'var(--ink-2)', 'start');

      // Incoming ball: arrives from the net side. Travel direction is (-cos a, sin a), so a
      // descending ball (a < 0) comes from above-right.
      let inTail = null;
      if (!isToss) {
        const lenIn = lenOf('incoming', vIn);
        const [ix, iy] = vec(1, -aIn); // where the ball came from, relative to contact
        const tx = C.x + ix * lenIn;
        const ty = C.y + iy * lenIn;
        if (drag === 'incoming') dial(lenIn, -DIALS.incomingAngleDeg.max, -DIALS.incomingAngleDeg.min, true);
        arrow(tx, ty, C.x + ix * 16, C.y + iy * 16, 'var(--traj-in)', 1.5, '4 3');
        text(tx, ty + (iy <= 0 ? -8 : 16), L.incoming, 'var(--ink-3)', 'middle');
        inTail = [tx, ty];
      } else {
        text(C.x, C.y - 30, L.toss, 'var(--ink-3)', 'middle');
      }

      // Outgoing ball: towards the net at the launch angle, in the flight-path colour
      const lenOut = lenOf('launch', vOut);
      const [ox, oy] = vec(1, la);
      const hx = C.x + ox * lenOut;
      const hy = C.y + oy * lenOut;
      if (drag === 'launch') dial(lenOut, DIALS.launchAngleDeg.min, DIALS.launchAngleDeg.max, true);
      arrow(C.x + ox * 14, C.y + oy * 14, hx, hy, 'var(--traj-pre)', 2.5);
      text(hx, hy + (la >= aIn ? 16 : -9), L.out, 'var(--ink)', 'end');

      // Racket face, edge-on: tilted from vertical by the face angle (open = top tilted back)
      const [fx, fy] = vec(46, 90 + f);
      line(C.x - fx, C.y - fy, C.x + fx, C.y + fy, 'var(--ink)', 6);
      line(C.x - fx, C.y - fy, C.x + fx, C.y + fy, 'var(--panel)', 2);
      arc(34, 90, 90 + f, 'var(--ink-2)', 1);
      text(C.x + fx + 8, C.y + fy + 4, L.face, 'var(--ink)', 'start');

      // Ball and spin
      parts.push(`<circle cx="${C.x}" cy="${C.y}" r="9" fill="var(--ball)" stroke="var(--ink)" stroke-width="1"/>`);
      const spin = s.topspinRpm ?? 0;
      spinArc(spin, spin >= 0 ? L.top : L.back);

      const kmh = (v) => `${Math.round(v)} km/h`;
      const deg = (v) => `${signed(v)}°`;

      if (this.detail) {
        // String bed: crosses along the face
        for (let k = -3; k <= 3; k++) {
          const [px, py] = vec(k * 12, 90 + f);
          const [nx, ny] = vec(4, f);
          line(C.x + px - nx, C.y + py - ny, C.x + px + nx, C.y + py + ny, 'var(--ink-3)', 1);
        }
        // Inset: the ball's velocity relative to the racket, split along the face normal
        // (becomes pace) and along the strings (becomes spin). r = -Vn·n + Vt·t.
        if (!isToss) {
          const Vr = vR / 3.6;
          const Vb = vIn / 3.6;
          const rx = -Vb * Math.cos(aIn * DEG) - Vr * Math.cos(sw * DEG);
          const rz = Vb * Math.sin(aIn * DEG) - Vr * Math.sin(sw * DEG);
          const n = [Math.cos(f * DEG), Math.sin(f * DEG)];
          const t = [-Math.sin(f * DEG), Math.cos(f * DEG)];
          const vn = -(rx * n[0] + rz * n[1]);
          const vt = rx * t[0] + rz * t[1];
          const attack = (Math.atan2(Math.abs(vt), Math.max(0.01, vn)) * 180) / Math.PI;

          const ix = W - 150;
          const iw = 140;
          parts.push(`<rect x="${ix}" y="12" width="${iw}" height="${H - 24}" fill="var(--panel)" stroke="var(--rule)" stroke-width="1"/>`);
          text(ix + 10, 30, L.rel, 'var(--ink-2)', 'start', 10.5);
          // mini contact: face through (ox, oy), relative velocity arriving from the net side
          const ox = ix + 46;
          const oy = 92;
          const k = 1.25;
          const [fx2, fy2] = vec(30, 90 + f);
          line(ox - fx2, oy - fy2, ox + fx2, oy + fy2, 'var(--ink)', 4);
          const sxi = ox - rx * k;
          const syi = oy + rz * k;
          const mxi = sxi - vn * n[0] * k;
          const myi = syi + vn * n[1] * k;
          arrow(sxi, syi, ox, oy, 'var(--ink-3)', 1.25, '2 2');
          line(sxi, syi, mxi, myi, 'var(--accent)', 2);
          line(mxi, myi, ox, oy, 'var(--accent)', 2, '2 2');
          parts.push(`<circle cx="${ox}" cy="${oy}" r="5" fill="var(--ball)" stroke="var(--ink)" stroke-width="1"/>`);
          const rows = [
            [L.normal, `${vn.toFixed(1)} m/s`],
            [L.tangential, `${Math.abs(vt).toFixed(1)} m/s`],
            [L.attack, `${attack.toFixed(1)}°`]
          ];
          rows.forEach(([kName, v], i) => {
            const y = H - 70 + i * 18;
            text(ix + 10, y, kName, 'var(--ink-3)', 'start', 10);
            text(ix + iw - 10, y, v, i < 2 ? 'var(--accent)' : 'var(--ink)', 'end', 10.5);
          });
        }
      }

      // Knobs (on top). Each arrow's knob sets its direction and its length (speed).
      knob(C.x + fx, C.y + fy, 'face', L.face, deg(f));
      knob(tailX, tailY, 'swing', L.swing, `${kmh(vR)} · ${deg(sw)}`);
      if (inTail) knob(inTail[0], inTail[1], 'incoming', L.incoming, `${kmh(vIn)} · ${deg(aIn)}`);
      knob(hx, hy, 'launch', L.out, `${kmh(vOut)} · ${deg(la)}`);
    } else {
      const a = s.aimAngleDeg ?? 0;

      // Straight-ahead reference and the net
      line(16, C.y, W - 16, C.y, 'var(--edge)', 1, '3 3');
      line(W - 26, 14, W - 26, H - 14, 'var(--ink-3)', 1, '2 3');
      text(W - 30, 22, L.net, 'var(--ink-3)', 'end');
      text(18, 22, `↑ ${L.left}`, 'var(--ink-3)', 'start');
      text(18, H - 12, `↓ ${L.right}`, 'var(--ink-3)', 'start');

      // Incoming from the net side (no lateral angle in the model)
      arrow(C.x + 92, C.y, C.x + 16, C.y, 'var(--traj-in)', 1.5, '4 3');

      // Outgoing at the aim angle (up = hitter's left); the head is the aim dial's knob
      const len = 120;
      dial(len, DIALS.aimAngleDeg.min, DIALS.aimAngleDeg.max, this._drag?.key === 'aim');
      const [ox, oy] = vec(1, a);
      arrow(C.x + ox * 14, C.y + oy * 14, C.x + ox * len, C.y + oy * len, 'var(--traj-pre)', 2.5);
      arc(44, 0, a, 'var(--ink-2)', 1);
      text(C.x + ox * len, C.y + oy * len + (a >= 0 ? -9 : 16), L.aim, 'var(--ink)', 'end');

      // Racket face, edge-on, square to the aim
      const [fx, fy] = vec(42, 90 + a);
      line(C.x - fx, C.y - fy, C.x + fx, C.y + fy, 'var(--ink)', 6);
      line(C.x - fx, C.y - fy, C.x + fx, C.y + fy, 'var(--panel)', 2);

      parts.push(`<circle cx="${C.x}" cy="${C.y}" r="9" fill="var(--ball)" stroke="var(--ink)" stroke-width="1"/>`);
      // physics.js: positive sidespin -> Magnus force towards the hitter's right
      const side = s.sidespinRpm ?? 0;
      spinArc(side, side >= 0 ? L.curveR : L.curveL);
      knob(C.x + ox * len, C.y + oy * len, 'aim', L.aim, `${signed(a)}°`);
    }

    this.svg.setAttribute(
      'aria-label',
      this.mode === 'side'
        ? `Side view: face ${s.faceAngleDeg}°, swing ${s.swingPathDeg}°, launch ${s.launchAngleDeg?.toFixed?.(1)}°`
        : `Top view: aim ${s.aimAngleDeg}°`
    );
    const hadFocus = this._focusKey && this.svg.contains(document.activeElement);
    this._rendering = true;
    this.svg.innerHTML = parts.join('');
    if (hadFocus) this.svg.querySelector(`[data-dial="${this._focusKey}"]`)?.focus({ preventScroll: true });
    this._rendering = false;
  }
}
