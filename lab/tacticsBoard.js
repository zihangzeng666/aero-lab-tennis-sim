/**
 * Tactics board: the rally drawn from above, like a coach's whiteboard.
 *
 * The court is drawn portrait (A at the bottom, B at the top) when the board is tall, and
 * landscape (A on the left, B on the right) when it is wide. Either way A looks "up the
 * page" towards B with A's left on the left of its travel direction. Every path is the
 * simulated flight, so what the board shows is what the 3D view plays.
 *
 * For the selected shot it also draws the geometry a coach would sketch:
 *  - the two widest replies the opponent can hit (to the corners of your baseline)
 *  - their bisector, and the recovery spot on it (Cochet's angle rule)
 *  - how far the opponent has to run, and in how much time
 *  - the lesson's target and, on the key shot, the common mistake as a ghost path
 */
const NS = 'http://www.w3.org/2000/svg';
const HL = 11.885;
const HWS = 4.115;
const HWD = 5.485;
const SL = 6.4;
// Assumed recovery speed of a player moving back into position (m/s); a fit player
// covers roughly 4–5 m/s over a few metres.
export const RECOVERY_SPEED = 4.0;

const VB_PORTRAIT = { x: -7.4, y: -15.6, w: 14.8, h: 31.2 };
const VB_LANDSCAPE = { x: -15.6, y: -7.4, w: 31.2, h: 14.8 };

// world -> drawing; switched by TacticsBoard._layout()
let P = (x, y) => [-y, -x];
const f2 = (v) => v.toFixed(2);

function el(tag, attrs = {}, parent = null, text = null) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) n.setAttribute(k, v);
  if (text !== null) n.textContent = text;
  if (parent) parent.appendChild(n);
  return n;
}

const L = {
  zh: { shot: (i, n) => `第 ${i}/${n} 拍`, recover: '回位', run: '对手跑动', time: '对手可用时间', need: '需要速度',
    speed: '出球', spin: '旋转', clear: '过网', land: '落点余量', bounceT: '落地', volley: '截击（落地前）', mistake: '常见错误',
    widest: '对手回球的最大角度', bisector: '平分线', target: '目标区', prev: '上一拍', next: '下一拍', noNext: '这是最后一拍' },
  en: { shot: (i, n) => `Shot ${i}/${n}`, recover: 'Recover', run: 'Opponent runs', time: 'Time they have', need: 'Needs',
    speed: 'Launch', spin: 'Spin', clear: 'Net clearance', land: 'Margin to line', bounceT: 'Bounce at', volley: 'Volleyed before bounce', mistake: 'Common mistake',
    widest: 'Widest replies', bisector: 'Bisector', target: 'Target', prev: 'Previous shot', next: 'Next shot', noNext: 'Last shot' }
};

/** Point on the flight where the next player makes contact (or the end of the flight). */
function cutFlight(sim) {
  const pts = sim?.points || [];
  if (!pts.length) return [];
  const tEnd = sim.interceptPoint ? sim.interceptPoint.t : sim.secondBounce ? sim.secondBounce.t : pts[pts.length - 1].t;
  return pts.filter((p) => p.t <= tEnd + 1e-6 && Math.abs(p.x) < HL + 3.5 && Math.abs(p.y) < HWD + 2);
}

/**
 * Recovery spot for a hitter at `hit` (world) whose opponent will play from `opp` (world):
 * on the bisector of the lines from `opp` to the two corners of the hitter's baseline.
 */
export function recoverySpot(hit, opp, side) {
  const sign = side === 'B' ? -1 : 1;
  const bx = -sign * HL; // hitter's baseline
  const c1 = [bx, HWS];
  const c2 = [bx, -HWS];
  const u = (a) => {
    const dx = a[0] - opp[0];
    const dy = a[1] - opp[1];
    const m = Math.hypot(dx, dy) || 1;
    return [dx / m, dy / m];
  };
  const u1 = u(c1);
  const u2 = u(c2);
  const bis = [u1[0] + u2[0], u1[1] + u2[1]];
  // baseliners recover ~0.6 m behind the baseline; a net player holds their depth
  const atNet = Math.abs(hit[0]) < 8.5;
  const rx = atNet ? hit[0] : -sign * (HL + 0.6);
  const t = Math.abs(bis[0]) > 1e-6 ? (rx - opp[0]) / bis[0] : 0;
  const ry = Math.max(-HWD, Math.min(HWD, opp[1] + bis[1] * t));
  return { spot: [rx, ry], corners: [c1, c2], opp };
}

export class TacticsBoard {
  constructor(container) {
    this.el = container;
    this.svg = el('svg', { class: 'tb-svg', preserveAspectRatio: 'xMidYMid meet', role: 'img' }, container);
    this.notes = document.createElement('aside');
    this.notes.className = 'tb-notes';
    container.appendChild(this.notes);
    this.onStep = null;
    this.courtLayer = el('g', { class: 'tb-court' }, this.svg);
    this.layer = el('g', {}, this.svg);
    this.orientation = null;
    this._layout();
  }

  /** Picks portrait or landscape from the space the court gets; redraws the lines if it changed. */
  _layout() {
    const r = this.svg.getBoundingClientRect();
    const landscape = r.width > 0 && r.height > 0 ? r.width > r.height * 1.15 : false;
    const o = landscape ? 'landscape' : 'portrait';
    if (o === this.orientation) return;
    this.orientation = o;
    P = landscape ? (x, y) => [x, -y] : (x, y) => [-y, -x];
    const vb = landscape ? VB_LANDSCAPE : VB_PORTRAIT;
    this.svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    this.el.dataset.orientation = o;
    this.courtLayer.replaceChildren();
    this._drawCourt();
  }

  _drawCourt() {
    const g = this.courtLayer;
    const line = (x1, y1, x2, y2, cls = 'tb-line') => {
      const [a, b] = P(x1, y1);
      const [c, d] = P(x2, y2);
      el('line', { x1: a, y1: b, x2: c, y2: d, class: cls }, g);
    };
    const [ax, ay] = P(HL, HWD);
    const [bx, by] = P(-HL, -HWD);
    el('rect', { x: Math.min(ax, bx), y: Math.min(ay, by), width: Math.abs(ax - bx), height: Math.abs(ay - by), class: 'tb-surface' }, g);
    for (const s of [-1, 1]) {
      line(-HL, s * HWD, HL, s * HWD);
      line(-HL, s * HWS, HL, s * HWS);
      line(s * HL, -HWD, s * HL, HWD);
      line(s * SL, -HWS, s * SL, HWS);
      line(s * HL, 0, s * (HL - 0.2), 0);
    }
    line(-SL, 0, SL, 0);
    line(0, -HWD - 0.914, 0, HWD + 0.914, 'tb-net');
  }

  /**
   * @param {object} d
   * @param {Array} d.turns       rally turns (side, hitX/Y, flight, titleZh/En, whyZh/En)
   * @param {number} d.current    selected turn index
   * @param {object} d.liveSim    simulation of the selected turn (reflects live edits)
   * @param {object|null} d.lesson active lesson (target zone, key shot, mistake label)
   * @param {object|null} d.mistakeSim ghost flight for the common mistake (key shot only)
   * @param {string} d.lang
   */
  render(d) {
    const T = L[d.lang === 'en' ? 'en' : 'zh'];
    const zh = d.lang !== 'en';
    const turns = d.turns || [];
    const cur = Math.max(0, Math.min(turns.length - 1, d.current || 0));
    this._layout();
    const g = this.layer;
    g.replaceChildren();
    if (!turns.length) return;

    const sideSign = (s) => (s === 'B' ? -1 : 1);
    const hitWorld = (t) => [sideSign(t.side) * t.hitX, sideSign(t.side) * t.hitY];
    const simOf = (i) => (i === cur && d.liveSim ? d.liveSim : turns[i].flight);
    const contactOf = (i) => {
      // where the receiver of shot i hits it: the next turn's position, else the simulated intercept
      if (turns[i + 1]) return hitWorld(turns[i + 1]);
      const ip = simOf(i)?.interceptPoint;
      return ip ? [ip.worldX, ip.worldY] : null;
    };
    const cls = (t) => (t.side === 'B' ? 'is-b' : 'is-a');

    // Recovery spot after each shot (needed for "how far did the opponent run")
    const rec = turns.map((t, i) => {
      const opp = contactOf(i);
      return opp ? recoverySpot(hitWorld(t), opp, t.side) : null;
    });

    // Target zone
    const tz = d.lesson?.targetZone;
    if (tz) {
      const s = sideSign(tz.side);
      const [cx, cy] = P(s * tz.localX, s * tz.localY);
      const land = this.orientation === 'landscape';
      el('ellipse', { cx, cy, rx: land ? tz.rx : tz.ry, ry: land ? tz.ry : tz.rx, class: 'tb-zone' }, g);
      el('text', { x: cx, y: cy + (land ? tz.ry : tz.rx) + 0.75, class: 'tb-label tb-label-zone', 'text-anchor': 'middle' }, g, T.target);
    }

    // Recovery geometry for the selected shot
    const r = rec[cur];
    if (r) {
      const [ox, oy] = P(...r.opp);
      for (const c of r.corners) {
        const [cx, cy] = P(...c);
        el('line', { x1: ox, y1: oy, x2: cx, y2: cy, class: 'tb-angle' }, g);
      }
      const [sx, sy] = P(...r.spot);
      el('line', { x1: ox, y1: oy, x2: sx, y2: sy, class: 'tb-bisector' }, g);
      const [hx, hy] = P(...hitWorld(turns[cur]));
      el('line', { x1: hx, y1: hy, x2: sx, y2: sy, class: `tb-move ${cls(turns[cur])}` }, g);
      el('circle', { cx: sx, cy: sy, r: 0.42, class: `tb-recover ${cls(turns[cur])}` }, g);
      el('text', { x: sx + 0.7, y: sy + 0.3, class: 'tb-label' }, g, T.recover);
    }

    // Opponent's run for the selected shot. They start from where they actually are when this
    // shot is struck: moving from their last contact towards their recovery spot at
    // RECOVERY_SPEED for as long as their previous ball was in the air.
    let runFrom = null;
    if (cur >= 1 && rec[cur - 1]) {
      const from = hitWorld(turns[cur - 1]);
      const to = rec[cur - 1].spot;
      const tAir = simOf(cur - 1)?.interceptPoint?.t ?? 0;
      const dist = Math.hypot(to[0] - from[0], to[1] - from[1]);
      const k = dist > 1e-6 ? Math.min(1, (RECOVERY_SPEED * tAir) / dist) : 1;
      runFrom = [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k];
    }
    const runTo = contactOf(cur);
    if (runFrom && runTo) {
      const [ax, ay] = P(...runFrom);
      const [bx, by] = P(...runTo);
      el('line', { x1: ax, y1: ay, x2: bx, y2: by, class: `tb-run ${turns[cur].side === 'A' ? 'is-b' : 'is-a'}` }, g);
      el('circle', { cx: ax, cy: ay, r: 0.3, class: `tb-ghostpos ${turns[cur].side === 'A' ? 'is-b' : 'is-a'}` }, g);
    }

    // Common-mistake ghost (key shot only)
    if (d.mistakeSim) {
      const pts = cutFlight(d.mistakeSim);
      if (pts.length > 1) {
        el('polyline', { points: pts.map((p) => P(p.x, p.y).map(f2).join(',')).join(' '), class: 'tb-mistake' }, g);
        const b = d.mistakeSim.firstBounce;
        if (b) {
          const [mx, my] = P(b.x, b.y);
          el('path', { d: `M${mx - 0.35},${my - 0.35} L${mx + 0.35},${my + 0.35} M${mx + 0.35},${my - 0.35} L${mx - 0.35},${my + 0.35}`, class: 'tb-mistake-x' }, g);
          el('text', { x: mx + 0.6, y: my + 0.3, class: 'tb-label tb-label-mistake' }, g, T.mistake);
        }
      }
    }

    // Ball paths: earlier shots faded, later shots hidden, the selected one bold
    turns.forEach((t, i) => {
      if (i > cur) return;
      const sim = simOf(i);
      const pts = cutFlight(sim);
      if (pts.length < 2) return;
      const state = i === cur ? 'is-current' : 'is-past';
      const pre = pts.filter((p) => p.phase === 0);
      const post = pts.filter((p) => p.phase >= 1);
      const toPts = (arr) => arr.map((p) => P(p.x, p.y).map(f2).join(',')).join(' ');
      if (pre.length > 1) el('polyline', { points: toPts(pre), class: `tb-path ${cls(t)} ${state}` }, g);
      if (post.length > 1) el('polyline', { points: toPts([pre[pre.length - 1] || post[0], ...post]), class: `tb-path tb-post ${cls(t)} ${state}` }, g);
      const b = sim.firstBounce;
      const volleyed = sim.interceptPoint?.volley;
      if (b && !volleyed && (!sim.interceptPoint || b.t <= sim.interceptPoint.t)) {
        const [bx, by] = P(b.x, b.y);
        el('circle', { cx: bx, cy: by, r: i === cur ? 0.26 : 0.18, class: `tb-bounce ${cls(t)} ${state}${b.isIn ? '' : ' is-out'}` }, g);
      }
    });

    // Players: every contact point up to the selected shot, numbered
    turns.forEach((t, i) => {
      if (i > cur + 1) return;
      const [x, y] = P(...hitWorld(t));
      const state = i === cur ? 'is-current' : i === cur + 1 ? 'is-next' : 'is-past';
      el('circle', { cx: x, cy: y, r: i === cur ? 0.62 : 0.5, class: `tb-player ${cls(t)} ${state}` }, g);
      el('text', { x, y: y + 0.24, class: `tb-num ${cls(t)} ${state}`, 'text-anchor': 'middle' }, g, i === cur + 1 ? t.side : String(i + 1));
    });

    this.svg.setAttribute('aria-label', zh ? '战术平面图' : 'Tactics board');
    this._renderNotes(d, cur, T, zh, simOf(cur), runFrom, runTo);
  }

  _renderNotes(d, cur, T, zh, sim, runFrom, runTo) {
    const t = d.turns[cur];
    const n = d.turns.length;
    const rows = [];
    const ip = sim?.interceptPoint;
    const b = sim?.firstBounce;
    const st = d.metrics || {};
    if (st.speedKmh !== undefined) rows.push([T.speed, `${Math.round(st.speedKmh)} km/h · ${st.launchAngleDeg >= 0 ? '+' : ''}${st.launchAngleDeg.toFixed(1)}°`]);
    if (st.topspinRpm !== undefined) rows.push([T.spin, `${Math.round(st.topspinRpm)} rpm`]);
    if (sim && !sim.hitNet && sim.netClearanceM !== null && sim.netClearanceM !== undefined) rows.push([T.clear, `${sim.netClearanceM.toFixed(2)} m`]);
    if (ip?.volley) rows.push([T.bounceT, T.volley]);
    else if (b) rows.push([T.bounceT, `${b.t.toFixed(2)} s`]);
    if (b && b.isIn && !ip?.volley) {
      const margin = Math.min(HL - b.localX, HWS - Math.abs(b.localY));
      rows.push([T.land, `${margin.toFixed(2)} m`]);
    }
    if (ip) rows.push([T.time, `${ip.t.toFixed(2)} s`]);
    if (ip && runFrom && runTo) {
      const dist = Math.hypot(runTo[0] - runFrom[0], runTo[1] - runFrom[1]);
      rows.push([T.run, `${dist.toFixed(1)} m`]);
      rows.push([T.need, `${(dist / Math.max(0.2, ip.t)).toFixed(1)} m/s`]);
    }
    const title = zh ? t.titleZh : t.titleEn;
    const why = zh ? t.whyZh : t.whyEn;
    const isKey = d.lesson && cur === d.lesson.challengeTurnIndex;
    this.notes.innerHTML =
      `<div class="tb-head"><span class="tb-step">${T.shot(cur + 1, n)} · ${t.side}</span>` +
      `<span class="tb-nav"><button type="button" class="tb-btn" data-step="-1" aria-label="${T.prev}"${cur === 0 ? ' disabled' : ''}>‹</button>` +
      `<button type="button" class="tb-btn" data-step="1" aria-label="${T.next}"${cur >= n - 1 ? ' disabled' : ''}>›</button></span></div>` +
      `<h4 class="tb-title${isKey ? ' is-key' : ''}">${(title || '').replace(/^#\d+\s*/, '')}</h4>` +
      (why ? `<p class="tb-why">${why}</p>` : '') +
      `<dl class="tb-metrics">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>` +
      `<p class="tb-legend"><span class="tb-key tb-key-angle"></span>${T.widest} <span class="tb-key tb-key-bis"></span>${T.bisector}</p>`;
    this.notes.querySelectorAll('[data-step]').forEach((btn) =>
      btn.addEventListener('click', () => this.onStep?.(Number(btn.getAttribute('data-step'))))
    );
  }
}
