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
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const W = 360;
const H = 196;
const C = { x: 168, y: 100 };
const DEG = Math.PI / 180;

const T = {
  zh: {
    face: '拍面', swing: '挥拍轨迹', incoming: '来球', toss: '抛球', out: '出球', aim: '出球方向',
    net: '网', hitter: '击球者', left: '左', right: '右', top: '上旋', back: '下旋',
    curveR: '侧旋 · 右曲', curveL: '侧旋 · 左曲'
  },
  en: {
    face: 'Face', swing: 'Swing path', incoming: 'Incoming', toss: 'Toss', out: 'Launch', aim: 'Launch direction',
    net: 'Net', hitter: 'Hitter', left: 'Left', right: 'Right', top: 'Topspin', back: 'Backspin',
    curveR: 'Sidespin · curves right', curveL: 'Sidespin · curves left'
  }
};

const signed = (v, d = 1) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(d)}`;
// math angle (deg, y up) + length -> screen offset
const vec = (len, angDeg) => [len * Math.cos(angDeg * DEG), -len * Math.sin(angDeg * DEG)];

export class RacketDiagram {
  constructor(containerEl) {
    this.el = containerEl;
    this.mode = 'side';
    this.state = null;
    this.svg = document.createElementNS(SVG_NS, 'svg');
    this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.svg.setAttribute('class', 'racket-diagram-svg');
    this.svg.setAttribute('role', 'img');
    this.el.appendChild(this.svg);
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
  setTheme() {}
  _onResize() {}

  _render() {
    if (!this.state) return;
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
      text(W - 14, H - 12, `${L.net} →`, 'var(--ink-3)', 'end');
      text(14, H - 12, `← ${L.hitter}`, 'var(--ink-3)', 'start');

      // Swing path: arrives from behind along the swing angle (neutral ink; the ball path owns the colour)
      const [sx, sy] = vec(1, sw);
      const tailX = C.x - sx * 104;
      const tailY = C.y - sy * 104;
      arrow(tailX, tailY, C.x - sx * 26, C.y - sy * 26, 'var(--ink-2)', 2);
      text(tailX, tailY + (sw >= 0 ? 16 : -8), L.swing, 'var(--ink-2)', 'start');

      // Incoming ball: arrives from the net side. Travel direction is (-cos a, sin a), so a
      // descending ball (a < 0) comes from above-right.
      if (!isToss) {
        const lenIn = Math.max(44, Math.min(84, vIn * 1.1));
        const [ix, iy] = vec(1, -aIn); // where the ball came from, relative to contact
        const tx = C.x + ix * lenIn;
        const ty = C.y + iy * lenIn;
        arrow(tx, ty, C.x + ix * 16, C.y + iy * 16, 'var(--traj-in)', 1.5, '4 3');
        text(tx, ty + (iy <= 0 ? -8 : 16), L.incoming, 'var(--ink-3)', 'middle');
      } else {
        text(C.x, C.y - 30, L.toss, 'var(--ink-3)', 'middle');
      }

      // Outgoing ball: towards the net at the launch angle, in the flight-path colour
      const lenOut = Math.max(96, Math.min(160, vOut * 0.85));
      const [ox, oy] = vec(1, la);
      const hx = Math.min(C.x + ox * lenOut, W - 14);
      const hy = C.y + oy * (hx - C.x) / Math.max(0.2, ox);
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
    } else {
      const a = s.aimAngleDeg ?? 0;
      const vOut = s.speedKmh ?? 0;

      // Straight-ahead reference and the net
      line(16, C.y, W - 16, C.y, 'var(--edge)', 1, '3 3');
      line(W - 26, 14, W - 26, H - 14, 'var(--ink-3)', 1, '2 3');
      text(W - 30, 22, L.net, 'var(--ink-3)', 'end');
      text(18, 22, `↑ ${L.left}`, 'var(--ink-3)', 'start');
      text(18, H - 12, `↓ ${L.right}`, 'var(--ink-3)', 'start');

      // Incoming from the net side (no lateral angle in the model)
      arrow(C.x + 92, C.y, C.x + 16, C.y, 'var(--traj-in)', 1.5, '4 3');

      // Outgoing at the aim angle (up = hitter's left)
      const len = Math.max(80, Math.min(140, vOut * 0.75));
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
    }

    this.svg.setAttribute(
      'aria-label',
      this.mode === 'side'
        ? `Side view: face ${s.faceAngleDeg}°, swing ${s.swingPathDeg}°, launch ${s.launchAngleDeg?.toFixed?.(1)}°`
        : `Top view: aim ${s.aimAngleDeg}°`
    );
    this.svg.innerHTML = parts.join('');
  }
}
