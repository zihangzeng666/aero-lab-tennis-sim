/**
 * Top-down court map for a tactics lesson: the hitter is on the left, the target half on
 * the right. Draws the lesson's target zone, the current ball path and landing spot, and the
 * last few attempts. Coordinates are the hitter's local frame from physics.js
 * (localX toward the far baseline, localY to the hitter's left, which is drawn upward).
 */
const NS = 'http://www.w3.org/2000/svg';
const HALF_LEN = 11.885;
const HALF_W_DOUBLES = 5.485;
const HALF_W_SINGLES = 4.115;
const SERVICE = 6.4;

function el(tag, attrs = {}, parent) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
}

export class LessonMap {
  constructor(container) {
    this.container = container;
    this.svg = el('svg', {
      viewBox: `${-HALF_LEN - 1.6} ${-HALF_W_DOUBLES - 0.9} ${2 * HALF_LEN + 3.2} ${2 * HALF_W_DOUBLES + 1.8}`,
      class: 'lm-svg',
      role: 'img'
    });
    container.appendChild(this.svg);

    const court = el('g', { class: 'lm-court' }, this.svg);
    el('rect', { x: -HALF_LEN, y: -HALF_W_DOUBLES, width: 2 * HALF_LEN, height: 2 * HALF_W_DOUBLES, class: 'lm-surface' }, court);
    const line = (x1, y1, x2, y2, cls = 'lm-line') => el('line', { x1, y1, x2, y2, class: cls }, court);
    line(-HALF_LEN, -HALF_W_DOUBLES, HALF_LEN, -HALF_W_DOUBLES);
    line(-HALF_LEN, HALF_W_DOUBLES, HALF_LEN, HALF_W_DOUBLES);
    line(-HALF_LEN, -HALF_W_SINGLES, HALF_LEN, -HALF_W_SINGLES);
    line(-HALF_LEN, HALF_W_SINGLES, HALF_LEN, HALF_W_SINGLES);
    line(-HALF_LEN, -HALF_W_DOUBLES, -HALF_LEN, HALF_W_DOUBLES);
    line(HALF_LEN, -HALF_W_DOUBLES, HALF_LEN, HALF_W_DOUBLES);
    line(-SERVICE, -HALF_W_SINGLES, -SERVICE, HALF_W_SINGLES);
    line(SERVICE, -HALF_W_SINGLES, SERVICE, HALF_W_SINGLES);
    line(-SERVICE, 0, SERVICE, 0);
    line(0, -HALF_W_DOUBLES - 0.45, 0, HALF_W_DOUBLES + 0.45, 'lm-net');

    this.zone = el('ellipse', { class: 'lm-zone' }, this.svg);
    this.history = el('g', { class: 'lm-history' }, this.svg);
    this.path = el('polyline', { class: 'lm-path', fill: 'none' }, this.svg);
    this.hitter = el('circle', { r: 0.42, class: 'lm-hitter' }, this.svg);
    this.landing = el('circle', { r: 0.36, class: 'lm-landing' }, this.svg);
  }

  /**
   * @param {object} p
   * @param {object|null} p.lesson     active lesson (target zone) or null
   * @param {object|null} p.sim        simulateTrajectory() result for the shown shot
   * @param {boolean} p.showZone       draw the target zone (decisive shot only)
   * @param {boolean|null} p.passed    colour state for the landing mark
   * @param {Array<{localX:number, localY:number}>} p.attempts  earlier landings
   */
  update({ lesson, sim, showZone, passed, attempts = [] }) {
    const tz = lesson?.targetZone;
    if (tz && showZone) {
      this.zone.setAttribute('cx', tz.localX);
      this.zone.setAttribute('cy', -tz.localY);
      this.zone.setAttribute('rx', tz.rx);
      this.zone.setAttribute('ry', tz.ry);
      this.zone.style.display = '';
      this.zone.classList.toggle('is-pass', !!passed);
    } else {
      this.zone.style.display = 'none';
    }

    const pts = sim?.points || [];
    if (pts.length) {
      const step = Math.max(1, Math.floor(pts.length / 90));
      const coords = [];
      for (let i = 0; i < pts.length; i += step) {
        const p = pts[i];
        if (Math.abs(p.localX) > HALF_LEN + 1.5 || Math.abs(p.localY) > HALF_W_DOUBLES + 0.8) break;
        coords.push(`${p.localX.toFixed(2)},${(-p.localY).toFixed(2)}`);
      }
      this.path.setAttribute('points', coords.join(' '));
      this.hitter.setAttribute('cx', pts[0].localX);
      this.hitter.setAttribute('cy', -pts[0].localY);
      this.hitter.style.display = '';
    } else {
      this.path.setAttribute('points', '');
      this.hitter.style.display = 'none';
    }

    const b = sim && !sim.hitNet ? sim.firstBounce : null;
    if (b && b.localX > 0) {
      this.landing.setAttribute('cx', b.localX);
      this.landing.setAttribute('cy', -b.localY);
      this.landing.style.display = '';
      this.landing.classList.toggle('is-pass', passed === true);
      this.landing.classList.toggle('is-out', !b.isIn);
    } else {
      this.landing.style.display = 'none';
    }

    this.history.replaceChildren();
    if (showZone) {
      attempts.forEach((a, i) => {
        el('circle', {
          cx: a.localX,
          cy: -a.localY,
          r: 0.26,
          class: 'lm-ghost',
          style: `opacity:${(0.25 + (0.5 * (i + 1)) / attempts.length).toFixed(2)}`
        }, this.history);
      });
    }
  }

  setLabel(text) {
    this.svg.setAttribute('aria-label', text);
  }
}
