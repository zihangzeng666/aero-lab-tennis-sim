/**
 * Impact studio: the racket–ball contact as the main control surface.
 *
 * Layout (desktop): the large side view of the contact is the focal element; a column on
 * the right shows the top view (direction), the flight profile (height over distance, to
 * scale) and the landing map; a row of exact number fields sits underneath. On a phone the
 * same pieces stack and scroll.
 *
 * Everything that changes the shot goes out through `onChange(updates, source)`, the same
 * contract as the small diagram: 'racket' for inputs, 'hud' for a launch target that the
 * app back-solves into a swing.
 */
import { RacketDiagram } from './racketDiagram.js?v=59';
import { LessonMap } from './lessonMap.js?v=59';

const NS = 'http://www.w3.org/2000/svg';

const FIELDS = [
  { group: 'swing', key: 'racketSpeedKmh', zh: '挥速', en: 'Racket speed', unit: 'km/h', min: 20, max: 175, step: 0.5, d: 1 },
  { group: 'swing', key: 'swingPathDeg', zh: '挥拍轨迹', en: 'Swing path', unit: '°', min: -30, max: 45, step: 0.5, d: 1 },
  { group: 'swing', key: 'faceAngleDeg', zh: '拍面', en: 'Face angle', unit: '°', min: -18, max: 32, step: 0.2, d: 1 },
  { group: 'swing', key: 'aimAngleDeg', zh: '方向', en: 'Aim', unit: '°', min: -28, max: 28, step: 0.2, d: 1 },
  { group: 'in', key: 'incomingSpeedKmh', zh: '来球速度', en: 'Incoming speed', unit: 'km/h', min: 0, max: 200, step: 1, d: 0 },
  { group: 'in', key: 'incomingAngleDeg', zh: '来球角度', en: 'Incoming angle', unit: '°', min: -40, max: 35, step: 0.5, d: 1 },
  { group: 'in', key: 'incomingSpinRpm', zh: '来球旋转', en: 'Incoming spin', unit: 'rpm', min: -4500, max: 5000, step: 50, d: 0 },
  { group: 'out', key: 'speedKmh', zh: '出球速度', en: 'Launch speed', unit: 'km/h', min: 40, max: 230, step: 0.5, d: 1, hud: true },
  { group: 'out', key: 'launchAngleDeg', zh: '出球角度', en: 'Launch angle', unit: '°', min: -10, max: 32, step: 0.2, d: 1, hud: true },
  { group: 'out', key: 'topspinRpm', zh: '旋转', en: 'Spin', unit: 'rpm', min: -3200, max: 4800, step: 25, d: 0, hud: true }
];

const T = {
  zh: {
    title: '击球台',
    hint: '拖动箭头：方向是角度，长度是速度。按住 Shift 或打开精调，拖动只走四分之一。',
    fine: '精调',
    swing: '挥拍', in: '来球', out: '出球（改这里会反解挥拍）',
    profile: '飞行剖面', map: '落点', top: '方向（俯视）',
    clear: '过网', apex: '最高', land: '落点', out_: '出界', net_: '下网', ghost: '无旋对比'
  },
  en: {
    title: 'Impact studio',
    hint: 'Drag an arrow: direction is the angle, length is the speed. Hold Shift or turn on Fine for quarter-speed drags.',
    fine: 'Fine',
    swing: 'Swing', in: 'Incoming ball', out: 'Launch (editing back-solves the swing)',
    profile: 'Flight profile', map: 'Landing', top: 'Direction (from above)',
    clear: 'Net', apex: 'Apex', land: 'Lands', out_: 'Out', net_: 'Net', ghost: 'No-spin ghost'
  }
};

function el(tag, attrs = {}, parent = null, text = null) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) n.setAttribute(k, v);
  if (text !== null) n.textContent = text;
  if (parent) parent.appendChild(n);
  return n;
}

/** Height over distance for the current shot, court features to scale. */
class FlightProfile {
  constructor(container) {
    this.svg = el('svg', { class: 'fp-svg', preserveAspectRatio: 'xMidYMid meet', role: 'img' }, container);
  }

  update(sim, ghost, L) {
    const X0 = -13.5;
    const X1 = 14.5;
    const pts = (sim?.points || []).filter((p) => p.localX >= X0 && p.localX <= X1);
    const zMax = Math.max(2.6, ...pts.map((p) => p.z)) + 0.4;
    const W = X1 - X0;
    // vertical exaggeration so a 3 m arc is readable across 28 m of court
    const ex = 3;
    const H = zMax * ex;
    this.svg.setAttribute('viewBox', `${X0} ${-H - 0.6} ${W} ${H + 1.6}`);
    this.svg.replaceChildren();
    const g = el('g', {}, this.svg);
    const Y = (z) => -z * ex;
    el('line', { x1: X0, y1: 0, x2: X1, y2: 0, class: 'fp-ground' }, g);
    for (const x of [-11.885, -6.4, 6.4, 11.885]) el('line', { x1: x, y1: 0, x2: x, y2: 0.45, class: 'fp-tick' }, g);
    const netH = sim?.netPassPoint?.netHeightAtY ?? 0.914;
    el('line', { x1: 0, y1: 0, x2: 0, y2: Y(netH), class: 'fp-net' }, g);
    const poly = (arr, cls) => {
      if (arr.length > 1) el('polyline', { points: arr.map((p) => `${p.localX.toFixed(2)},${Y(p.z).toFixed(2)}`).join(' '), class: cls }, g);
    };
    poly((ghost?.points || []).filter((p) => p.localX >= X0 && p.localX <= X1), 'fp-ghost');
    poly(pts, 'fp-path');
    if (!sim) return;
    const b = sim.firstBounce;
    if (b && !sim.hitNet) el('circle', { cx: b.localX, cy: 0, r: 0.28, class: `fp-bounce${b.isIn ? '' : ' is-out'}` }, g);
    // labels: apex, net clearance
    const apex = pts.reduce((a, p) => (p.z > (a?.z ?? -1) ? p : a), null);
    const label = (x, y, text, anchor = 'middle') => el('text', { x, y, class: 'fp-label', 'text-anchor': anchor }, g, text);
    if (apex) label(apex.localX, Y(apex.z) - 0.55, `${L.apex} ${apex.z.toFixed(2)} m`);
    if (sim.hitNet) label(0.5, Y(netH) - 0.5, L.net_, 'start');
    else if (sim.netClearanceM !== null && sim.netClearanceM !== undefined) label(0.5, Y(netH) - 0.5, `${L.clear} +${sim.netClearanceM.toFixed(2)} m`, 'start');
    this.svg.setAttribute('aria-label', L.profile);
  }
}

export class ImpactStudio {
  constructor(container) {
    this.el = container;
    this.onChange = null;
    this.lang = 'zh';
    this.el.innerHTML = `
      <header class="is-head">
        <h3 class="is-title"></h3>
        <p class="is-hint"></p>
        <button type="button" class="is-fine" aria-pressed="false"></button>
      </header>
      <div class="is-main"><div class="is-side racket-diagram is-big"></div></div>
      <aside class="is-aside">
        <figure class="is-panel"><figcaption class="is-cap" data-cap="top"></figcaption><div class="is-top racket-diagram"></div></figure>
        <figure class="is-panel"><figcaption class="is-cap" data-cap="profile"></figcaption><div class="is-profile"></div></figure>
        <figure class="is-panel"><figcaption class="is-cap" data-cap="map"></figcaption><div class="is-map lesson-map"></div></figure>
      </aside>
      <div class="is-fields"></div>`;

    this.side = new RacketDiagram(this.el.querySelector('.is-side'), { detail: true, mode: 'side' });
    this.top = new RacketDiagram(this.el.querySelector('.is-top'), { detail: true, mode: 'top' });
    const relay = (updates, source) => this.onChange?.(updates, source);
    this.side.onChange = relay;
    this.top.onChange = relay;
    this.profile = new FlightProfile(this.el.querySelector('.is-profile'));
    this.map = new LessonMap(this.el.querySelector('.is-map'));

    this.fineBtn = this.el.querySelector('.is-fine');
    this.fineBtn.addEventListener('click', () => {
      const on = this.fineBtn.getAttribute('aria-pressed') !== 'true';
      this.fineBtn.setAttribute('aria-pressed', String(on));
      this.side.setFine(on);
      this.top.setFine(on);
    });

    this._buildFields();
  }

  _buildFields() {
    const wrap = this.el.querySelector('.is-fields');
    wrap.replaceChildren();
    this.inputs = {};
    for (const group of ['swing', 'in', 'out']) {
      const fs = document.createElement('fieldset');
      fs.className = `is-group is-group-${group}`;
      const lg = document.createElement('legend');
      lg.dataset.group = group;
      fs.appendChild(lg);
      const row = document.createElement('div');
      row.className = 'is-row';
      fs.appendChild(row);
      for (const f of FIELDS.filter((x) => x.group === group)) {
        const label = document.createElement('label');
        label.className = 'is-field';
        label.innerHTML = `<span class="is-flabel" data-key="${f.key}"></span>` +
          `<span class="is-input"><input type="number" inputmode="decimal" min="${f.min}" max="${f.max}" step="${f.step}" data-key="${f.key}">` +
          `<span class="is-unit">${f.unit}</span></span>`;
        const input = label.querySelector('input');
        const commit = () => {
          const v = parseFloat(input.value);
          if (!Number.isFinite(v)) return;
          const clamped = Math.max(f.min, Math.min(f.max, v));
          this.onChange?.({ [f.key]: clamped }, f.hud ? 'hud' : 'racket');
        };
        input.addEventListener('change', commit);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            commit();
            input.select();
          }
        });
        this.inputs[f.key] = { input, f };
        row.appendChild(label);
      }
      wrap.appendChild(fs);
    }
    this._applyLang();
  }

  _applyLang() {
    const L = T[this.lang] || T.zh;
    this.el.querySelector('.is-title').textContent = L.title;
    this.el.querySelector('.is-hint').textContent = L.hint;
    this.fineBtn.textContent = L.fine;
    this.el.querySelectorAll('[data-cap]').forEach((n) => (n.textContent = L[n.getAttribute('data-cap')]));
    this.el.querySelectorAll('legend[data-group]').forEach((n) => (n.textContent = L[n.dataset.group]));
    for (const { f } of Object.values(this.inputs || {})) {
      const lab = this.el.querySelector(`.is-flabel[data-key="${f.key}"]`);
      if (lab) lab.textContent = this.lang === 'en' ? f.en : f.zh;
    }
  }

  /** Redraw with the current shot. */
  update({ state, sim, ghost, lang }) {
    if (lang && lang !== this.lang) {
      this.lang = lang;
      this._applyLang();
    }
    const L = T[this.lang] || T.zh;
    this.side.updateFromState({ ...state, lang: this.lang });
    this.top.updateFromState({ ...state, lang: this.lang });
    this.profile.update(sim, ghost, L);
    this.map.update({ lesson: null, sim, showZone: false, passed: null, attempts: [] });
    for (const { input, f } of Object.values(this.inputs)) {
      if (document.activeElement === input) continue;
      const v = state[f.key];
      if (typeof v === 'number') input.value = v.toFixed(f.d);
    }
  }

  /** Highlight a control a coach tip refers to. */
  flash(key) {
    const field = this.inputs[key];
    if (field) {
      const box = field.input.closest('.is-field');
      box.classList.remove('flash-target');
      void box.offsetWidth;
      box.classList.add('flash-target');
    }
    // each diagram keeps its own view: direction lives in the top view, everything else in the side view
    return key === 'aimAngleDeg' ? this.top.flashDial(key) : this.side.flashDial(key);
  }
}
