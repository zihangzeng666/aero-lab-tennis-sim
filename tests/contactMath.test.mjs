// Run with: npm test   (Node 18+; no dependencies)
// The 3D contact close-up's math: easing, the camera path's arc-length table, the racket frame
// at contact and the spin -> swing-path solve. No three.js needed.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  clamp,
  lerp,
  band,
  ease,
  bezier3,
  arcLengthMap,
  closeupStroke,
  contactRacketFrame,
  spinForPath,
  spinRangeForSwing,
  solveSwingPathForSpin
} from '../lab/contactMath.js';
import { computeRacketBallImpact } from '../lab/physics.js';

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.hypot(a[0], a[1], a[2]);

// A forehand drive against a mid-pace ball (the coach view's defaults)
const SHOT = {
  strokeType: 'fh',
  hitX: -11.75,
  hitY: -1.6,
  hitZ: 0.95,
  racketSpeedKmh: 100,
  swingPathDeg: 25,
  faceAngleDeg: -4,
  aimAngleDeg: 3,
  incomingSpeedKmh: 60,
  incomingAngleDeg: -8,
  incomingSpinRpm: 1500,
  stringTensionKg: 23
};

test('clamp, lerp and band', () => {
  assert.equal(clamp(5, 0, 1), 1);
  assert.equal(clamp(-5, 0, 1), 0);
  assert.equal(lerp(2, 4, 0.25), 2.5);
  assert.equal(band(0.1, 0.2, 0.6), 0);
  assert.ok(Math.abs(band(0.4, 0.2, 0.6) - 0.5) < 1e-12);
  assert.equal(band(0.9, 0.2, 0.6), 1);
});

test('easing curves start at 0, end at 1 and never run backwards', () => {
  for (const [name, f] of Object.entries(ease)) {
    assert.ok(Math.abs(f(0)) < 1e-12, `${name}(0)`);
    assert.ok(Math.abs(f(1) - 1) < 1e-12, `${name}(1)`);
    let prev = f(0);
    for (let i = 1; i <= 200; i++) {
      const v = f(i / 200);
      assert.ok(v >= prev - 1e-12, `${name} is monotonic at ${i / 200}`);
      prev = v;
    }
  }
  // in-out curves are symmetric about the midpoint
  for (const name of ['inOutCubic', 'inOutQuint', 'inOutSine', 'smooth']) {
    assert.ok(Math.abs(ease[name](0.5) - 0.5) < 1e-12, `${name}(0.5)`);
    assert.ok(Math.abs(ease[name](0.3) + ease[name](0.7) - 1) < 1e-12, `${name} symmetric`);
  }
});

test('bezier3 passes through its end points', () => {
  const P = [[0, 0, 0], [1, 2, 0], [3, 2, 1], [4, 0, 1]];
  assert.deepEqual(bezier3(...P, 0), P[0]);
  assert.deepEqual(bezier3(...P, 1), P[3]);
});

test('arcLengthMap: equal steps of s are equal steps of distance along the curve', () => {
  // control points bunched at the start: the raw parameter would crawl, then rush
  const P = [[0, 0, 0], [0.1, 0, 0], [0.2, 0.1, 0], [10, 3, 2]];
  const map = arcLengthMap(...P, 256);
  assert.equal(map(0), 0);
  assert.ok(Math.abs(map(1) - 1) < 1e-9);
  const N = 20;
  const pts = Array.from({ length: N + 1 }, (_, i) => bezier3(...P, map(i / N)));
  const steps = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1], p[2] - pts[i][2]));
  const mean = steps.reduce((a, b) => a + b, 0) / N;
  for (const s of steps) assert.ok(Math.abs(s - mean) / mean < 0.03, `step ${s.toFixed(3)} vs mean ${mean.toFixed(3)}`);
  assert.ok(Math.abs(map.length_ - mean * N) / map.length_ < 0.01, 'total length');
  // monotonic, and a degenerate (zero-length) curve falls back to the identity
  for (let i = 1; i <= 100; i++) assert.ok(map(i / 100) >= map((i - 1) / 100));
  const still = arcLengthMap([1, 1, 1], [1, 1, 1], [1, 1, 1], [1, 1, 1]);
  assert.equal(still(0.4), 0.4);
});

test('closeupStroke picks the pose from the stroke and the contact height', () => {
  assert.equal(closeupStroke({ strokeType: 'fh', hitZ: 1 }), 'fh');
  assert.equal(closeupStroke({ strokeType: 'bh1', hitZ: 1 }), 'bh1');
  assert.equal(closeupStroke({ strokeType: 'bh2', hitZ: 1 }), 'bh2');
  assert.equal(closeupStroke({ strokeType: 'serve', hitZ: 2.7 }), 'serve');
  assert.equal(closeupStroke({ strokeType: 'fh', hitZ: 2.2 }), 'serve', 'an overhead contact is drawn as a serve');
});

test('contactRacketFrame: orthonormal, and the normal is exactly the physics face', () => {
  for (const strokeType of ['fh', 'bh1', 'bh2', 'serve']) {
    for (const face of [-18, -4, 0, 12, 32]) {
      for (const aim of [-28, 0, 15]) {
        const st = { strokeType, hitZ: strokeType === 'serve' ? 2.7 : 0.95, faceAngleDeg: face, aimAngleDeg: aim };
        const { n, a, b } = contactRacketFrame(st);
        for (const v of [n, a, b]) assert.ok(Math.abs(len(v) - 1) < 1e-9);
        assert.ok(Math.abs(dot(n, a)) < 1e-9 && Math.abs(dot(n, b)) < 1e-9 && Math.abs(dot(a, b)) < 1e-9);
        // face angle = elevation of the normal (open = up), aim = its heading (left = +)
        const r = Math.PI / 180;
        assert.ok(Math.abs(Math.asin(n[2]) / r - face) < 1e-9, `${strokeType} face ${face}`);
        if (Math.abs(face) < 89) assert.ok(Math.abs(Math.atan2(n[1], n[0]) / r - aim) < 1e-9, `${strokeType} aim ${aim}`);
      }
    }
  }
  // a forehand points the head to the hitter's right, a backhand to the left, a serve up
  assert.ok(contactRacketFrame({ ...SHOT, strokeType: 'fh' }).a[1] < -0.8);
  assert.ok(contactRacketFrame({ ...SHOT, strokeType: 'bh2' }).a[1] > 0.8);
  assert.ok(contactRacketFrame({ ...SHOT, strokeType: 'serve', hitZ: 2.7 }).a[2] > 0.9);
  // the head drops for a low ball and rises for a high one
  const low = contactRacketFrame({ ...SHOT, hitZ: 0.4 }).a[2];
  const high = contactRacketFrame({ ...SHOT, hitZ: 1.5 }).a[2];
  assert.ok(low < 0 && high > 0, `head height low ${low.toFixed(2)} high ${high.toFixed(2)}`);
});

test('spinForPath is the impact model with only the swing path changed', () => {
  const direct = computeRacketBallImpact({ ...SHOT, swingPathDeg: 31 }).topspinRpm;
  assert.equal(spinForPath(SHOT, 31), direct);
  const r = spinRangeForSwing(SHOT, { min: -30, max: 45 });
  assert.ok(r.min < 0 && r.max > 2000, `reachable spin ${Math.round(r.min)}..${Math.round(r.max)} rpm`);
});

test('solveSwingPathForSpin meets a spin target with the forward model', () => {
  const range = { min: -30, max: 45 };
  const { min, max } = spinRangeForSwing(SHOT, range);
  for (const target of [min + 50, -500, 0, 1200, 2600, max - 50]) {
    const sol = solveSwingPathForSpin(SHOT, target, range);
    assert.equal(sol.clamped, false);
    assert.ok(sol.swingPathDeg >= range.min && sol.swingPathDeg <= range.max);
    // the answer is checked against physics.js itself, not against the solver's own bookkeeping
    const got = computeRacketBallImpact({ ...SHOT, swingPathDeg: sol.swingPathDeg }).topspinRpm;
    assert.ok(Math.abs(got - target) < 25, `target ${target} rpm -> path ${sol.swingPathDeg}° gives ${Math.round(got)} rpm`);
  }
  // face and speed are untouched: only the path is returned
  assert.deepEqual(Object.keys(solveSwingPathForSpin(SHOT, 1500, range)).sort(), ['clamped', 'swingPathDeg', 'topspinRpm']);
});

test('solveSwingPathForSpin clamps out-of-range targets to the nearest end', () => {
  const range = { min: -20, max: 40 };
  const hi = solveSwingPathForSpin(SHOT, 1e6, range);
  const lo = solveSwingPathForSpin(SHOT, -1e6, range);
  assert.equal(hi.clamped, true);
  assert.equal(lo.clamped, true);
  assert.equal(hi.swingPathDeg, 40);
  assert.equal(lo.swingPathDeg, -20);
});
