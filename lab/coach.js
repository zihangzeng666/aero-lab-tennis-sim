/**
 * Coach view: the first thing on screen in Rackets Lab.
 *
 *   1. pick an incoming ball (chips; each thumbnail is that ball's simulated flight)
 *   2. tilt the racket face on the dial and set the swing path / speed
 *   3. read the result (verdict, net clearance, depth, spin, speed) and the coaching lines,
 *      compared with a ghost of the previous path or a pinned one
 *
 * The panel owns no physics: it reports changes through callbacks and redraws from what the
 * app passes to update(). Drags update the dial at once (1:1 with the finger) and ask for at
 * most one recompute per animation frame.
 */

const NS = 'http://www.w3.org/2000/svg';
const FACE_MIN = -18;
const FACE_MAX = 32;

const T = {
  en: {
    balls: 'Incoming ball',
    ballsHint: 'Tap the ball your student has to handle',
    racket: 'Racket face & swing',
    faceLabel: 'Racket face angle',
    dialHint: 'Drag the racket to tilt the face · tap for 3D',
    contact3d: '3D contact',
    contact3dAria: 'Adjust the racket face in 3D at contact',
    closed: 'Closed',
    open: 'Open',
    square: 'Square',
    path: 'Swing path',
    pathLow: 'High → low',
    pathHigh: 'Low → high',
    flat: 'level',
    speed: 'Swing speed',
    pin: 'Pin this path',
    pinned: 'Pinned',
    suggest: 'Suggest face',
    replay: 'Replay',
    legendPath: 'swing path',
    legendOut: 'ball leaves',
    legendIn: 'incoming',
    verdict: { IN: 'In', LONG: 'Long', WIDE: 'Wide', NET: 'Net' },
    net: 'Net, cm',
    depthIn: 'In by, m',
    depthLong: 'Long by, m',
    depth: 'Depth, m',
    spin: 'Spin, rpm',
    speed_: 'Speed',
    speedUnit: (u) => `Speed, ${u}`,
    inside: 'in',
    long: 'long',
    profile: 'Side view, to scale (height ×2.5)',
    ghostNote: (p) => (p ? 'Dashed: pinned path' : 'Dashed: previous path'),
    bounce: 'bounces',
    peak: 'up to',
    contact: 'you meet it at',
    rising: 'still rising',
    fromOpp: 'off their racket'
  },
  zh: {
    balls: '来球',
    ballsHint: '点选学生要处理的来球',
    racket: '拍面与挥拍',
    faceLabel: '拍面角度',
    dialHint: '拖动球拍改变拍面角度 · 轻点进入 3D',
    contact3d: '3D 触球',
    contact3dAria: '在 3D 触球瞬间调整拍面',
    closed: '关',
    open: '开',
    square: '垂直',
    path: '挥拍路径',
    pathLow: '由上往下',
    pathHigh: '由下往上',
    flat: '水平',
    speed: '挥拍速度',
    pin: '固定这条路径',
    pinned: '已固定',
    suggest: '推荐拍面',
    replay: '重播',
    legendPath: '挥拍路径',
    legendOut: '出球方向',
    legendIn: '来球',
    verdict: { IN: '界内', LONG: '出底线', WIDE: '出边线', NET: '下网' },
    net: '过网 cm',
    depthIn: '底线内 m',
    depthLong: '出界 m',
    depth: '深度 m',
    spin: '旋转 rpm',
    speed_: '球速',
    speedUnit: (u) => `球速 ${u}`,
    inside: '内',
    long: '外',
    profile: '侧视图（按比例，高度 ×2.5）',
    ghostNote: (p) => (p ? '虚线：已固定的路径' : '虚线：上一条路径'),
    bounce: '落地',
    peak: '最高弹到',
    contact: '击球高度',
    rising: '仍在上升',
    fromOpp: '出手'
  }
};

function svg(tag, attrs = {}, parent = null) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
}

function h(tag, cls, parent = null, text = null) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== null) n.textContent = text;
  if (parent) parent.appendChild(n);
  return n;
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const sgn = (v, d = 1) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(d)}`;

/** Polyline points for a side view: x along the court (m), z exaggerated. */
function profilePoints(pts, ex) {
  return pts.map((p) => `${p.x.toFixed(2)},${(-p.z * ex).toFixed(3)}`).join(' ');
}

export class CoachPanel {
  /**
   * @param {HTMLElement} panelEl  container for the controls (ball chips, dial, sliders, actions)
   * @param {HTMLElement} resultEl container for the verdict, readouts and feedback
   * @param {HTMLElement} profileEl container for the side profile
   * @param {object} presets INCOMING_PRESETS
   */
  constructor(panelEl, resultEl, profileEl, presets) {
    this.panel = panelEl;
    this.resultEl = resultEl;
    this.profileEl = profileEl;
    this.presets = presets;
    this.lang = 'en';
    this.resolved = {};
    this.ballKey = null;
    this.face = -4;
    this.dragging = false;
    this._raf = 0;
    this._pending = null;

    this.onChange = null; // (updates, { live }) => void
    this.onPickBall = null; // (key) => void
    this.onPin = null; // () => void
    this.onSuggest = null; // () => void
    this.onReplay = null; // () => void
    this.onInteractStart = null; // () => void   (snapshot the ghost before a change)
    this.onOpenContact = null; // () => void   (open the 3D contact close-up)

    this._build();
  }

  /* ------------------------------------------------------------------ */
  /* Build                                                               */
  /* ------------------------------------------------------------------ */

  _build() {
    const p = this.panel;
    p.replaceChildren();

    // 1. Incoming balls
    const ballSec = h('section', 'coach-sec coach-balls-sec', p);
    const bh = h('div', 'coach-sec-head', ballSec);
    this.ballsTitle = h('h2', 'coach-h', bh);
    this.ballsHint = h('span', 'coach-hint', bh);
    this.ballList = h('div', 'coach-balls', ballSec);
    this.ballList.setAttribute('role', 'radiogroup');
    this.chips = {};
    for (const [key, preset] of Object.entries(this.presets)) {
      if (preset.manual) continue;
      const b = h('button', 'ball-chip', this.ballList);
      b.type = 'button';
      b.dataset.ball = key;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', 'false');
      const thumb = svg('svg', { class: 'ball-thumb', viewBox: '-14.5 -3.4 28.5 3.9', preserveAspectRatio: 'none', 'aria-hidden': 'true' }, b);
      const name = h('span', 'ball-name', b);
      b.addEventListener('click', () => this._pickBall(key));
      this.chips[key] = { b, thumb, name };
    }
    this.ballDetail = h('p', 'ball-detail', ballSec);
    this.ballDetail.setAttribute('aria-live', 'polite');

    // 2. Racket face dial + swing sliders
    const rSec = h('section', 'coach-sec coach-racket-sec', p);
    const rh = h('div', 'coach-sec-head', rSec);
    this.racketTitle = h('h2', 'coach-h', rh);
    this.dialHint = h('span', 'coach-hint', rh);
    const row = h('div', 'coach-racket-row', rSec);
    this._buildDial(row);
    const sliders = h('div', 'coach-sliders', row);
    this.pathCtl = this._buildRange(sliders, 'swingPathDeg', -20, 40, 0.5);
    this.speedCtl = this._buildRange(sliders, 'racketSpeedKmh', 40, 150, 1);

    // 3. Actions
    const act = h('div', 'coach-actions', p);
    this.pinBtn = h('button', 'coach-btn coach-pin', act);
    this.pinBtn.type = 'button';
    this.pinBtn.setAttribute('aria-pressed', 'false');
    this.pinBtn.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 1.5h5l-.8 4.2 2.8 2.6v1.2H3.5V8.3l2.8-2.6zM8 9.5v5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg><span></span>';
    this.pinBtn.addEventListener('click', () => this.onPin?.());
    this.suggestBtn = h('button', 'coach-btn coach-suggest', act);
    this.suggestBtn.type = 'button';
    this.suggestBtn.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="8" r="2.2" fill="currentColor"/></svg><span></span>';
    this.suggestBtn.addEventListener('click', () => this.onSuggest?.());
    this.replayBtn = h('button', 'coach-btn coach-replay', act);
    this.replayBtn.type = 'button';
    this.replayBtn.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8a5 5 0 1 0 1.6-3.7M3 2.5v3h3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg><span></span>';
    this.replayBtn.addEventListener('click', () => this.onReplay?.());
    this.contactBtn = h('button', 'coach-btn coach-contact', act);
    this.contactBtn.type = 'button';
    this.contactBtn.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.6l5.6 3.2v6.4L8 14.4l-5.6-3.2V4.8z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M2.4 4.8L8 8l5.6-3.2M8 8v6.4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg><span></span>';
    this.contactBtn.addEventListener('click', () => this.onOpenContact?.());

    // Result strip
    const r = this.resultEl;
    r.replaceChildren();
    const top = h('div', 'cr-top', r);
    this.verdictEl = h('span', 'cr-verdict', top);
    this.verdictEl.setAttribute('aria-live', 'polite');
    const stats = h('dl', 'cr-stats', top);
    this.stat = {};
    for (const k of ['net', 'depth', 'spin', 'speed']) {
      const cell = h('div', 'cr-stat', stats);
      const dt = h('dt', '', cell);
      const dd = h('dd', '', cell);
      const delta = h('span', 'cr-delta', cell);
      this.stat[k] = { dt, dd, delta };
    }
    this.feedbackEl = h('ul', 'cr-feedback', r);

    // Profile
    const pf = this.profileEl;
    pf.replaceChildren();
    this.profileSvg = svg('svg', { class: 'cp-svg', role: 'img' }, pf);
    this.profileCap = h('p', 'cp-cap', pf);

    this.setLang(this.lang);
  }

  _buildDial(parent) {
    const wrap = h('div', 'face-dial', parent);
    wrap.tabIndex = 0;
    wrap.setAttribute('role', 'slider');
    wrap.setAttribute('aria-valuemin', String(FACE_MIN));
    wrap.setAttribute('aria-valuemax', String(FACE_MAX));
    this.dial = wrap;
    const s = svg('svg', { class: 'fd-svg', viewBox: '-104 -96 208 152', 'aria-hidden': 'true' }, wrap);
    this.dialSvg = s;

    // Tick arc where the racket tip travels (face -18° … +32°), labels at both ends
    const R = 80;
    const ticks = svg('g', { class: 'fd-ticks' }, s);
    for (let f = FACE_MIN; f <= FACE_MAX; f += 2) {
      const phi = ((90 + f) * Math.PI) / 180;
      const major = f % 10 === 0;
      const r0 = major ? R - 8 : R - 4;
      svg('line', { x1: r0 * Math.cos(phi), y1: -r0 * Math.sin(phi), x2: R * Math.cos(phi), y2: -R * Math.sin(phi), class: major ? 'fd-tick is-major' : 'fd-tick' }, ticks);
    }
    svg('line', { x1: 0, y1: -(R + 4), x2: 0, y2: -(R - 12), class: 'fd-zero' }, ticks);
    const lab = (f, cls) => {
      const phi = ((90 + f) * Math.PI) / 180;
      return svg('text', { x: (R + 12) * Math.cos(phi), y: -(R + 12) * Math.sin(phi) + 3, class: `fd-lab ${cls}`, 'text-anchor': f > 0 ? 'end' : 'start' }, s);
    };
    this.dialOpenLab = lab(FACE_MAX + 2, 'is-open');
    this.dialClosedLab = lab(FACE_MIN - 2, 'is-closed');

    // Arrows: swing path (into the ball), incoming ball, ball out
    const defs = svg('defs', {}, s);
    const mk = (id, cls) => {
      const m = svg('marker', { id, viewBox: '0 0 8 8', refX: 6, refY: 4, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, defs);
      svg('path', { d: 'M0 0L8 4L0 8z', class: cls }, m);
    };
    const uid = Math.random().toString(36).slice(2, 7);
    mk(`fdA${uid}`, 'fd-head-path');
    mk(`fdB${uid}`, 'fd-head-out');
    mk(`fdC${uid}`, 'fd-head-in');
    this.arrPath = svg('line', { class: 'fd-arr-path', 'marker-end': `url(#fdA${uid})` }, s);
    this.arrIn = svg('line', { class: 'fd-arr-in', 'marker-end': `url(#fdC${uid})` }, s);
    this.arrOut = svg('line', { class: 'fd-arr-out', 'marker-end': `url(#fdB${uid})` }, s);
    this.outLab = svg('text', { class: 'fd-out-lab' }, s);

    // The racket seen edge-on: frame, strings, throat, and the ball on the strings
    this.racketG = svg('g', { class: 'fd-racket' }, s);
    svg('rect', { x: -3, y: 24, width: 6, height: 30, rx: 2, class: 'fd-handle' }, this.racketG);
    svg('rect', { x: -5, y: -62, width: 10, height: 90, rx: 5, class: 'fd-frame' }, this.racketG);
    svg('line', { x1: 0, y1: -56, x2: 0, y2: 22, class: 'fd-strings' }, this.racketG);
    svg('circle', { cx: 0, cy: -62, r: 7, class: 'fd-knob' }, this.racketG);
    this.ballDot = svg('circle', { cx: 9.5, cy: 0, r: 8, class: 'fd-ball' }, s);

    this.dialVal = svg('text', { x: 102, y: 36, class: 'fd-val', 'text-anchor': 'end' }, s);
    this.dialWord = svg('text', { x: 102, y: 50, class: 'fd-word', 'text-anchor': 'end' }, s);

    this.legend = h('div', 'fd-legend', wrap);

    // Drag: turning the finger around the contact point turns the racket (relative, so no jump on press)
    const angleAt = (e) => {
      const r = s.getBoundingClientRect();
      // the pivot is at viewBox (0,0): 104/208 across, 96/150 down
      const cx = r.left + (r.width * 104) / 208;
      const cy = r.top + (r.height * 96) / 152;
      const dx = e.clientX - cx;
      const dy = cy - e.clientY;
      return { a: (Math.atan2(dy, dx) * 180) / Math.PI, d: Math.hypot(dx, dy) };
    };
    let drag = null;
    wrap.addEventListener('pointerdown', (e) => {
      if (drag || (e.pointerType === 'mouse' && e.button !== 0)) return; // one finger only
      const { a } = angleAt(e);
      // the ghost is snapshotted on the first real movement, so a tap (which opens the 3D
      // close-up) leaves the compare path alone
      drag = { id: e.pointerId, a0: a, f0: this.face, last: a, acc: 0, x0: e.clientX, y0: e.clientY, t0: performance.now(), moved: false };
      try {
        wrap.setPointerCapture(e.pointerId);
      } catch (err) {
        /* synthetic pointer: dragging still works while over the dial */
      }
      wrap.classList.add('is-dragging');
      this.dragging = true;
      e.preventDefault();
    });
    wrap.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const { a, d } = angleAt(e);
      if (!drag.moved) {
        if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 4) {
          drag.last = a;
          return;
        }
        drag.moved = true;
        this.onInteractStart?.();
      }
      if (d < 10) return; // too close to the pivot: the angle is noise
      let step = a - drag.last;
      if (step > 180) step -= 360;
      if (step < -180) step += 360;
      drag.last = a;
      drag.acc += step;
      // geared down: a full finger turn of 25° moves the face 10°, so a coach can land on a
      // single degree (one degree is ~1–2 m of depth); Shift is finer still
      const fine = e.shiftKey ? 0.1 : 0.4;
      const face = clamp(Math.round((drag.f0 + drag.acc * fine) * 5) / 5, FACE_MIN, FACE_MAX);
      if (face !== this.face) this._setFaceLive(face);
    });
    const end = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const tap = !drag.moved && e.type === 'pointerup' && performance.now() - drag.t0 < 600;
      const moved = drag.moved;
      drag = null;
      wrap.classList.remove('is-dragging');
      this.dragging = false;
      this._flush();
      if (moved) this.onChange?.({ faceAngleDeg: this.face }, { live: false });
      if (tap) this.onOpenContact?.();
    };
    wrap.addEventListener('pointerup', end);
    wrap.addEventListener('pointercancel', end);
    wrap.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.onOpenContact?.();
        return;
      }
      const big = e.shiftKey ? 2 : 0.5;
      let f = this.face;
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') f += big;
      else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') f -= big;
      else if (e.key === 'Home') f = FACE_MIN;
      else if (e.key === 'End') f = FACE_MAX;
      else return;
      e.preventDefault();
      if (!e.repeat) this.onInteractStart?.();
      this._setFaceLive(clamp(Math.round(f * 10) / 10, FACE_MIN, FACE_MAX));
      clearTimeout(this._keyT);
      this._keyT = setTimeout(() => this.onChange?.({ faceAngleDeg: this.face }, { live: false }), 220);
    });
  }

  _buildRange(parent, key, min, max, step) {
    const g = h('div', 'coach-range', parent);
    const head = h('div', 'coach-range-head', g);
    const label = h('label', 'coach-range-lab', head);
    const val = h('output', 'coach-range-val', head);
    const input = h('input', '', g);
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.id = `coach-${key}`;
    label.htmlFor = input.id;
    const ends = h('div', 'coach-range-ends', g);
    const lo = h('span', '', ends);
    const hi = h('span', '', ends);
    input.addEventListener('pointerdown', () => this.onInteractStart?.());
    input.addEventListener('keydown', (e) => {
      if (!e.repeat && e.key.startsWith('Arrow')) this.onInteractStart?.();
    });
    input.addEventListener('input', () => {
      this._queue({ [key]: Number(input.value) });
      this._paintRange(input);
    });
    input.addEventListener('change', () => {
      this._flush();
      this.onChange?.({ [key]: Number(input.value) }, { live: false });
    });
    return { g, label, val, input, lo, hi, key };
  }

  _paintRange(input) {
    const min = Number(input.min);
    const max = Number(input.max);
    input.style.setProperty('--pct', `${((Number(input.value) - min) / (max - min)) * 100}%`);
  }

  /* ------------------------------------------------------------------ */
  /* Live updates                                                        */
  /* ------------------------------------------------------------------ */

  _setFaceLive(face) {
    this.face = face;
    this._drawFace(face);
    this._queue({ faceAngleDeg: face });
  }

  /** At most one recompute per frame while dragging. */
  _queue(updates) {
    this._pending = { ...(this._pending || {}), ...updates };
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => {
      this._raf = 0;
      const u = this._pending;
      this._pending = null;
      if (u) this.onChange?.(u, { live: true });
    });
  }

  _flush() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
    const u = this._pending;
    this._pending = null;
    if (u) this.onChange?.(u, { live: true });
  }

  _pickBall(key) {
    if (key === this.ballKey) return;
    this.onInteractStart?.();
    this.onPickBall?.(key);
  }

  /* ------------------------------------------------------------------ */
  /* Language and data                                                   */
  /* ------------------------------------------------------------------ */

  setLang(lang) {
    this.lang = lang === 'zh' ? 'zh' : 'en';
    const L = T[this.lang];
    this.ballsTitle.textContent = L.balls;
    this.ballsHint.textContent = L.ballsHint;
    this.ballList.setAttribute('aria-label', L.balls);
    this.racketTitle.textContent = L.racket;
    this.dialHint.textContent = L.dialHint;
    this.dial.setAttribute('aria-label', L.faceLabel);
    this.dialOpenLab.textContent = L.open;
    this.dialClosedLab.textContent = L.closed;
    this.legend.innerHTML = `<span class="lg-path">${L.legendPath}</span><span class="lg-in">${L.legendIn}</span><span class="lg-out">${L.legendOut}</span>`;
    this.pathCtl.label.textContent = L.path;
    this.pathCtl.lo.textContent = L.pathLow;
    this.pathCtl.hi.textContent = L.pathHigh;
    this.speedCtl.label.textContent = L.speed;
    this.speedCtl.lo.textContent = '40';
    this.speedCtl.hi.textContent = '150 km/h';
    this.suggestBtn.querySelector('span').textContent = L.suggest;
    this.replayBtn.querySelector('span').textContent = L.replay;
    this.contactBtn.querySelector('span').textContent = L.contact3d;
    this.contactBtn.setAttribute('aria-label', L.contact3dAria);
    this.contactBtn.title = L.contact3dAria;
    this.stat.net.dt.textContent = L.net;
    this.stat.spin.dt.textContent = L.spin;
    this.stat.speed.dt.textContent = L.speed_;
    this.profileSvg.setAttribute('aria-label', L.profile);
    for (const [key, c] of Object.entries(this.chips)) {
      const p = this.presets[key];
      c.name.textContent = this.lang === 'zh' ? p.labelZh : p.labelEn;
    }
    this._renderPin(this._pinned);
    this._renderBallDetail();
  }

  /** Resolved incoming balls (key → resolveIncomingBall result) for thumbnails and the detail line. */
  setResolvedBalls(map) {
    this.resolved = map || {};
    for (const [key, c] of Object.entries(this.chips)) {
      const r = this.resolved[key];
      c.thumb.replaceChildren();
      svg('line', { x1: -14.5, y1: 0, x2: 14, y2: 0, class: 'bt-ground' }, c.thumb);
      svg('line', { x1: 0, y1: 0, x2: 0, y2: -0.914, class: 'bt-net' }, c.thumb);
      if (!r || !r.path) continue;
      // the thumbnail is the real flight; the hitter is on the left like in the side view
      svg('polyline', { points: r.path.map((p) => `${p.x.toFixed(2)},${(-p.z).toFixed(3)}`).join(' '), class: 'bt-path' }, c.thumb);
      const last = r.path[r.path.length - 1];
      svg('circle', { cx: last.x, cy: -last.z, r: 0.42, class: 'bt-ball' }, c.thumb);
      c.b.disabled = false;
    }
    this._renderBallDetail();
  }

  _renderBallDetail() {
    const key = this.ballKey;
    const p = key && this.presets[key];
    const r = key && this.resolved[key];
    if (!p) {
      this.ballDetail.textContent = '';
      return;
    }
    const L = T[this.lang];
    const blurb = this.lang === 'zh' ? p.blurbZh : p.blurbEn;
    this.ballDetail.replaceChildren();
    h('span', 'bd-blurb', this.ballDetail, blurb);
    if (r && !r.manual) {
      // the numbers a coach can quote, all from the simulated flight
      h('span', 'bd-nums', this.ballDetail, `${Math.round(r.opponentSpeedKmh)} km/h ${L.fromOpp} · ${L.bounce} ${Math.round(r.bounceSpeedKmh)} km/h`);
      h('span', 'bd-nums bd-heights', this.ballDetail, `${L.peak} ${r.bouncePeakM.toFixed(2)} m · ${L.contact} ${r.contactHeightM.toFixed(2)} m${r.rising ? ` (${L.rising})` : ''}`);
    }
  }

  _renderPin(pinned) {
    this._pinned = !!pinned;
    const L = T[this.lang];
    this.pinBtn.setAttribute('aria-pressed', this._pinned ? 'true' : 'false');
    this.pinBtn.querySelector('span').textContent = this._pinned ? L.pinned : L.pin;
  }

  /* ------------------------------------------------------------------ */
  /* Drawing                                                             */
  /* ------------------------------------------------------------------ */

  _drawFace(face) {
    const L = T[this.lang];
    this.racketG.setAttribute('transform', `rotate(${(-face).toFixed(2)})`);
    const fr = (face * Math.PI) / 180;
    this.ballDot.setAttribute('cx', (9.5 * Math.cos(fr)).toFixed(2));
    this.ballDot.setAttribute('cy', (-9.5 * Math.sin(fr)).toFixed(2));
    this.dialVal.textContent = `${face > 0 ? '+' : face < 0 ? '−' : ''}${Math.abs(face).toFixed(1)}°`;
    const word = Math.abs(face) < 1 ? L.square : face > 0 ? L.open : L.closed;
    this.dialWord.textContent = word;
    this.dial.dataset.lean = Math.abs(face) < 1 ? 'square' : face > 0 ? 'open' : 'closed';
    this.dial.setAttribute('aria-valuenow', face.toFixed(1));
    this.dial.setAttribute('aria-valuetext', `${Math.abs(face).toFixed(1)}° ${word}`);
  }

  _drawArrows(state, impact) {
    const dir = (deg) => [Math.cos((deg * Math.PI) / 180), -Math.sin((deg * Math.PI) / 180)];
    // swing path: the racket travels along swingPathDeg into the ball (drawn behind the racket)
    const [px, py] = dir(state.swingPathDeg);
    this.arrPath.setAttribute('x1', (-92 * px).toFixed(1));
    this.arrPath.setAttribute('y1', (-92 * py).toFixed(1));
    this.arrPath.setAttribute('x2', (-18 * px).toFixed(1));
    this.arrPath.setAttribute('y2', (-18 * py).toFixed(1));
    // incoming ball: comes from the net side, travelling towards the hitter
    const inDeg = state.incomingAngleDeg || 0;
    const vx = -Math.cos((inDeg * Math.PI) / 180);
    const vy = -Math.sin((inDeg * Math.PI) / 180);
    const show = (state.incomingSpeedKmh || 0) > 2;
    this.arrIn.style.display = show ? '' : 'none';
    this.arrIn.setAttribute('x1', (24 - 70 * vx).toFixed(1));
    this.arrIn.setAttribute('y1', (70 * vy).toFixed(1));
    this.arrIn.setAttribute('x2', (24 - 8 * vx).toFixed(1));
    this.arrIn.setAttribute('y2', (8 * vy).toFixed(1));
    // ball out: launch angle from the impact model
    const la = impact ? impact.launchAngleDeg : 0;
    const [ox, oy] = dir(la);
    this.arrOut.setAttribute('x1', (20 * ox).toFixed(1));
    this.arrOut.setAttribute('y1', (20 * oy).toFixed(1));
    this.arrOut.setAttribute('x2', (98 * ox).toFixed(1));
    this.arrOut.setAttribute('y2', (98 * oy).toFixed(1));
    this.outLab.setAttribute('x', (98 * ox).toFixed(1));
    this.outLab.setAttribute('y', (98 * oy - 7).toFixed(1));
    this.outLab.setAttribute('text-anchor', 'end');
    this.outLab.textContent = `${sgn(la)}°`;
  }

  _drawProfile({ sim, compareSim, incomingPath, pinned }) {
    const s = this.profileSvg;
    const L = T[this.lang];
    const ex = 2.5;
    const X0 = -14.5;
    // widen the view when a ball lands long, so the bounce stays on screen
    const farX = Math.max(sim?.firstBounce?.x ?? 0, compareSim?.firstBounce?.x ?? 0);
    const X1 = Math.min(22, Math.max(14.5, farX + 1.6));
    const ptsOf = (res) => (res?.points || []).filter((p) => p.x >= X0 && p.x <= X1);
    const cur = ptsOf(sim);
    const ghost = ptsOf(compareSim);
    const inc = (incomingPath || []).filter((p) => p.x >= X0 && p.x <= X1);
    // capped so one wild shot does not shrink the court to a line (the view clips above 5.5 m)
    const zMax = Math.min(5.5, Math.max(2.4, ...cur.map((p) => p.z), ...ghost.map((p) => p.z), ...inc.map((p) => p.z)) + 0.3);
    const top = -zMax * ex;
    s.setAttribute('viewBox', `${X0} ${top.toFixed(2)} ${X1 - X0} ${(-top + 1.6).toFixed(2)}`);
    s.replaceChildren();
    // court: ground, baselines, service lines, net
    svg('rect', { x: -11.885, y: 0, width: 23.77, height: 0.35, class: 'cp-court' }, s);
    for (const x of [-11.885, 11.885]) svg('line', { x1: x, y1: -0.45, x2: x, y2: 0.35, class: 'cp-baseline' }, s);
    for (const x of [-6.4, 6.4]) svg('line', { x1: x, y1: -0.25, x2: x, y2: 0.35, class: 'cp-svc' }, s);
    const netH = sim?.netPassPoint?.netHeightAtY ?? 0.914;
    svg('line', { x1: 0, y1: 0.35, x2: 0, y2: -netH * ex, class: 'cp-net' }, s);
    if (inc.length > 1) svg('polyline', { points: profilePoints(inc, ex), class: 'cp-incoming' }, s);
    if (ghost.length > 1) svg('polyline', { points: profilePoints(ghost, ex), class: 'cp-ghost' }, s);
    if (cur.length > 1) svg('polyline', { points: profilePoints(cur, ex), class: 'cp-path' }, s);
    const g = compareSim?.firstBounce;
    if (g && ghost.length) svg('circle', { cx: g.x, cy: 0, r: 0.3, class: 'cp-bounce is-ghost' }, s);
    const b = sim?.firstBounce;
    if (b) svg('circle', { cx: b.x, cy: 0, r: 0.38, class: `cp-bounce${b.isIn ? '' : ' is-out'}` }, s);
    if (cur.length) svg('circle', { cx: cur[0].x, cy: -cur[0].z * ex, r: 0.42, class: 'cp-contact' }, s);
    // labels
    const text = (x, y, str, cls = '', anchor = 'middle') => {
      const t = svg('text', { x, y, class: `cp-lab ${cls}`, 'text-anchor': anchor }, s);
      t.textContent = str;
    };
    if (sim && sim.netClearanceM !== null && sim.netClearanceM !== undefined) {
      text(0.5, -netH * ex - 0.5, `${sgn(sim.netClearanceM * 100, 0)} cm`, sim.hitNet ? 'is-bad' : '', 'start');
    }
    if (b && b.x > 0 && !(sim.hitNet && !b.isIn)) {
      const d = 11.885 - b.x;
      text(Math.min(X1 - 0.4, b.x), 1.45, `${Math.abs(d).toFixed(1)} m ${d >= 0 ? L.inside : L.long}`, b.isIn ? '' : 'is-bad', b.x > X1 - 3 ? 'end' : 'middle');
    }
    this.profileCap.textContent = `${L.profile}. ${compareSim ? L.ghostNote(pinned) : ''}`;
  }

  /* ------------------------------------------------------------------ */
  /* Update from the app                                                 */
  /* ------------------------------------------------------------------ */

  /**
   * @param {object} p
   * @param {object} p.state, p.impact, p.sim
   * @param {object} [p.compareSim]
   * @param {boolean} [p.pinned]
   * @param {string} [p.ballKey]
   * @param {Array} [p.incomingPath]
   * @param {object} p.feedback  buildCoachFeedback() result
   * @param {object} p.compareOutcome describeShotOutcome(compareSim) or null
   * @param {function} p.formatSpeed
   */
  update({ state, impact, sim, compareSim = null, pinned = false, ballKey = null, incomingPath = null, feedback, compareOutcome = null, formatSpeed }) {
    const L = T[this.lang];
    if (ballKey !== this.ballKey) {
      this.ballKey = ballKey;
      for (const [k, c] of Object.entries(this.chips)) {
        const on = k === ballKey;
        c.b.classList.toggle('is-active', on);
        c.b.setAttribute('aria-checked', on ? 'true' : 'false');
      }
      this._renderBallDetail();
      // keep the chosen chip in view in the horizontal phone strip
      const chip = this.chips[ballKey]?.b;
      if (chip && this.ballList.scrollWidth > this.ballList.clientWidth + 4) {
        const lr = this.ballList.getBoundingClientRect();
        const cr = chip.getBoundingClientRect();
        if (cr.left < lr.left || cr.right > lr.right) this.ballList.scrollBy({ left: cr.left - lr.left - 12, behavior: 'auto' });
      }
    }

    if (!this.dragging) {
      this.face = state.faceAngleDeg;
      this._drawFace(this.face);
    }
    this._drawArrows(state, impact);

    for (const ctl of [this.pathCtl, this.speedCtl]) {
      const v = state[ctl.key];
      if (document.activeElement !== ctl.input) ctl.input.value = String(v);
      this._paintRange(ctl.input);
    }
    const path = state.swingPathDeg;
    this.pathCtl.val.textContent = Math.abs(path) < 2 ? `${sgn(path)}° ${L.flat}` : `${sgn(path)}°`;
    this.speedCtl.val.textContent = `${Math.round(state.racketSpeedKmh)} km/h`;

    this._renderPin(pinned);

    // result strip
    const o = feedback.outcome;
    this.resultEl.dataset.tone = feedback.tone;
    this.verdictEl.textContent = L.verdict[o.verdict] || o.verdict;
    this.verdictEl.dataset.verdict = o.verdict;
    const setStat = (k, text, delta) => {
      this.stat[k].dd.textContent = text;
      this.stat[k].delta.textContent = delta || '';
    };
    const co = compareOutcome;
    setStat(
      'net',
      o.netClearanceM === null ? '—' : `${sgn(o.netClearanceM * 100, 0)}`,
      co && co.netClearanceM !== null && o.netClearanceM !== null ? `Δ ${sgn((o.netClearanceM - co.netClearanceM) * 100, 0)}` : ''
    );
    const d = o.verdict === 'NET' ? null : o.depthM;
    this.stat.depth.dt.textContent = o.verdict === 'NET' ? L.depth : d === null || d < 0 ? L.depthLong : L.depthIn;
    setStat('depth', o.verdict === 'NET' ? '—' : d === null ? '> 9' : Math.abs(d).toFixed(1), '');
    const rpm = Math.round(impact.topspinRpm);
    setStat('spin', `${rpm >= 0 ? '' : '−'}${Math.abs(rpm).toLocaleString('en-US')}`, '');
    const sp = (formatSpeed ? formatSpeed(impact.launchSpeedKmh, 0) : `${Math.round(impact.launchSpeedKmh)} km/h`).split(' ');
    this.stat.speed.dt.textContent = L.speedUnit(sp[1] || 'km/h');
    setStat('speed', sp[0], '');
    this.stat.spin.dd.dataset.kind = rpm > 300 ? 'top' : rpm < -300 ? 'back' : 'flat';

    this.feedbackEl.replaceChildren();
    for (const line of feedback.lines) {
      const li = h('li', `cr-line is-${line.kind}`, this.feedbackEl, line.text);
      li.dataset.kind = line.kind;
    }

    this._drawProfile({ sim, compareSim, incomingPath, pinned });
  }
}
