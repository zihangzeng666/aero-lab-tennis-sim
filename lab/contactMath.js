/**
 * Contact close-up: the math behind the 3D racket-face adjust mode (no three.js, so the
 * tests can run it in Node).
 *
 *  - easing curves and the arc-length table that keep the camera move at an even pace
 *  - where the racket points at contact for each stroke (hitter's frame: x towards the net,
 *    y to the hitter's left, z up), with the face normal set exactly by faceAngleDeg/aimAngleDeg
 *  - spin as a control: the impact model makes topspin rise with the swing path, so a spin
 *    target is met by bisection on swingPathDeg with the forward model (physics.js unchanged)
 */
import { computeRacketBallImpact } from './physics.js?v=61';

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const lerp = (a, b, t) => a + (b - a) * t;

/** Progress of t inside [a, b], clamped to 0..1 (staggers several animations on one clock). */
export const band = (t, a, b) => clamp((t - a) / (b - a), 0, 1);

export const ease = {
  linear: (t) => t,
  smooth: (t) => t * t * (3 - 2 * t),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutQuint: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  /** Slow start, long glide in: the camera "settles" onto the close-up. */
  cinematic: (t) => {
    // ease-in-out with a softer landing than quintic: blend of cubic in and quartic out
    const a = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
    return a;
  }
};

/** Point on a cubic Bezier through [x, y, z] arrays. */
export function bezier3(p0, p1, p2, p3, u) {
  const v = 1 - u;
  const a = v * v * v;
  const b = 3 * v * v * u;
  const c = 3 * v * u * u;
  const d = u * u * u;
  return [0, 1, 2].map((i) => a * p0[i] + b * p1[i] + c * p2[i] + d * p3[i]);
}

/**
 * Arc-length table for a cubic Bezier: map(s) returns the curve parameter at fraction s of the
 * length, so an eased s gives an eased speed along the path (a raw Bezier parameter bunches up
 * where the control points are close together).
 */
export function arcLengthMap(p0, p1, p2, p3, samples = 96) {
  const us = [0];
  const ls = [0];
  let prev = p0;
  let total = 0;
  for (let i = 1; i <= samples; i++) {
    const u = i / samples;
    const p = bezier3(p0, p1, p2, p3, u);
    total += Math.hypot(p[0] - prev[0], p[1] - prev[1], p[2] - prev[2]);
    us.push(u);
    ls.push(total);
    prev = p;
  }
  const map = (s) => {
    if (total < 1e-9) return clamp(s, 0, 1);
    const L = clamp(s, 0, 1) * total;
    let lo = 0;
    let hi = ls.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (ls[mid] < L) lo = mid;
      else hi = mid;
    }
    const span = ls[hi] - ls[lo];
    const f = span > 1e-12 ? (L - ls[lo]) / span : 0;
    return us[lo] + (us[hi] - us[lo]) * f;
  };
  map.length_ = total;
  return map;
}

const rad = (d) => (d * Math.PI) / 180;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** 'fh' | 'bh1' | 'bh2' | 'serve' for the close-up pose (same rule as the 3D player). */
export function closeupStroke(state) {
  const s = state.strokeType;
  if (s === 'serve' || (state.hitZ ?? 1) > 1.95) return 'serve';
  if (s === 'bh1' || s === 'bh2') return s;
  return 'fh';
}

/**
 * Racket orientation at contact, hitter's frame.
 *   n: face normal. Forward, turned by the aim and tilted up by the face angle (open = up),
 *      so the drawn face is exactly the face the physics uses.
 *   a: from the throat to the head tip, perpendicular to n. A forehand points the head to the
 *      hitter's right, a backhand to the left, a serve up; on groundstrokes the head drops for
 *      low balls and rises for high ones.
 *   b: a x n, the face's width direction.
 */
export function contactRacketFrame(state) {
  const kind = closeupStroke(state);
  const face = rad(state.faceAngleDeg ?? 0);
  const aim = rad(state.aimAngleDeg ?? 0);
  const n = [Math.cos(face) * Math.cos(aim), Math.cos(face) * Math.sin(aim), Math.sin(face)];
  const hitZ = state.hitZ ?? 1;
  const droop = clamp((0.95 - hitZ) * 0.55, -0.35, 0.5);
  let a0;
  if (kind === 'serve') a0 = [0.1, 0.05, 1];
  else if (kind === 'fh') a0 = [-0.16, -1, -droop];
  else a0 = [-0.12, 1, -droop];
  // the head turns with the aim like the rest of the racket
  const ca = Math.cos(aim);
  const sa = Math.sin(aim);
  a0 = [a0[0] * ca - a0[1] * sa, a0[0] * sa + a0[1] * ca, a0[2]];
  const k = dot(a0, n);
  const a = norm([a0[0] - k * n[0], a0[1] - k * n[1], a0[2] - k * n[2]]);
  const b = cross(a, n);
  return { kind, n, a, b };
}

/** Topspin (rpm) the impact model gives for this swing with the swing path replaced. */
export function spinForPath(state, swingPathDeg) {
  return computeRacketBallImpact({ ...state, swingPathDeg }).topspinRpm;
}

/** Spin reachable by changing only the swing path within [min, max] (face and speed kept). */
export function spinRangeForSwing(state, { min = -30, max = 45 } = {}) {
  const a = spinForPath(state, min);
  const b = spinForPath(state, max);
  return { min: Math.min(a, b), max: Math.max(a, b) };
}

/**
 * Swing path that produces `targetRpm` with the face, racket speed and incoming ball kept.
 * Bisection on the forward impact model; outside the reachable range the nearest end is
 * returned with `clamped: true`.
 */
export function solveSwingPathForSpin(state, targetRpm, { min = -30, max = 45 } = {}) {
  let lo = min;
  let hi = max;
  const sLo = spinForPath(state, lo);
  const sHi = spinForPath(state, hi);
  const rising = sHi >= sLo;
  const below = rising ? targetRpm <= sLo : targetRpm >= sLo;
  const above = rising ? targetRpm >= sHi : targetRpm <= sHi;
  if (below) return { swingPathDeg: lo, topspinRpm: sLo, clamped: true };
  if (above) return { swingPathDeg: hi, topspinRpm: sHi, clamped: true };
  for (let i = 0; i < 40 && hi - lo > 0.005; i++) {
    const mid = 0.5 * (lo + hi);
    const s = spinForPath(state, mid);
    if (rising ? s < targetRpm : s > targetRpm) lo = mid;
    else hi = mid;
  }
  const path = Math.round(0.5 * (lo + hi) * 100) / 100;
  return { swingPathDeg: path, topspinRpm: spinForPath(state, path), clamped: false };
}
