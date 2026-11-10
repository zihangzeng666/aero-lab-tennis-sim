// Run with: npm test   (Node 18+; no dependencies)
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ITF_COURT,
  COURT_SURFACES,
  simulateTrajectory,
  computeRacketBallImpact,
  solveRacketFromTargetLaunch,
  evaluateBounceCall,
  airDensityFromConditions,
  aeroCoefficients,
  courtPaceIndex,
  samplePointAtTime,
  chainRallyTurns
} from '../physics.js';
import { SHOT_PRESETS, EXAMPLE_RALLIES, TACTICAL_LESSONS, evaluateTacticalAttempt } from '../presets.js';

const R = ITF_COURT.ballRadius;
const g = 9.80665;

function presetShot(p) {
  const imp = computeRacketBallImpact({ ...p, stringTensionKg: 23 });
  return { ...p, speedKmh: imp.launchSpeedKmh, launchAngleDeg: imp.launchAngleDeg, topspinRpm: imp.topspinRpm };
}

function normaliseTurns(turns) {
  return turns.map((t, idx) => ({
    side: t.side || (idx % 2 === 0 ? 'A' : 'B'),
    courtMode: t.courtMode || 'singles',
    hitX: t.hitX ?? -11.75,
    hitY: t.hitY ?? -1.5,
    hitZ: t.hitZ ?? 1.05,
    racketSpeedKmh: t.racketSpeedKmh ?? 90,
    swingPathDeg: t.swingPathDeg ?? 25,
    faceAngleDeg: t.faceAngleDeg ?? -1.8,
    aimAngleDeg: t.aimAngleDeg ?? 6.0,
    incomingSpeedKmh: t.incomingSpeedKmh ?? 55,
    incomingAngleDeg: t.incomingAngleDeg ?? -10,
    incomingSpinRpm: t.incomingSpinRpm ?? 1800,
    stringTensionKg: t.stringTensionKg ?? 23,
    sidespinRpm: t.sidespinRpm ?? 200,
    targetSpeedKmh: t.targetSpeedKmh,
    targetLaunchAngleDeg: t.targetLaunchAngleDeg,
    targetTopspinRpm: t.targetTopspinRpm
  }));
}

test('vacuum flight matches the analytic parabola to the ground', () => {
  const v0 = 15;
  const ang = (20 * Math.PI) / 180;
  const z0 = 1.0;
  const sim = simulateTrajectory({
    hitX: -11, hitY: 0, hitZ: z0, speedKmh: v0 * 3.6, launchAngleDeg: 20, aimAngleDeg: 0,
    topspinRpm: 0, sidespinRpm: 0, airDensity: 0
  });
  const vz = v0 * Math.sin(ang);
  const tLand = (vz + Math.sqrt(vz * vz + 2 * g * (z0 - R))) / g;
  const xLand = -11 + v0 * Math.cos(ang) * tLand;
  assert.ok(Math.abs(sim.firstBounce.t - tLand) < 1e-9, `t ${sim.firstBounce.t} vs ${tLand}`);
  assert.ok(Math.abs(sim.firstBounce.localX - xLand) < 1e-9, `x ${sim.firstBounce.localX} vs ${xLand}`);
});

test('landing point converges at roughly 4th order in dt', () => {
  const shot = presetShot(SHOT_PRESETS.alcaraz_fh);
  const land = (dt) => {
    const b = simulateTrajectory({ ...shot, dt }).firstBounce;
    return [b.localX, b.localY];
  };
  const ref = land(0.0001);
  const err = (dt) => {
    const [x, y] = land(dt);
    return Math.hypot(x - ref[0], y - ref[1]);
  };
  const e1 = err(0.016);
  const e2 = err(0.008);
  const order = Math.log2(e1 / e2);
  assert.ok(order > 3.5, `observed order ${order.toFixed(2)}`);
  assert.ok(err(0.002) < 1e-5, 'default step is accurate to 0.01 mm');
});

test('player A and player B are exact mirror images', () => {
  const shot = presetShot(SHOT_PRESETS.sinner_bh2);
  const a = simulateTrajectory({ ...shot, side: 'A' });
  const b = simulateTrajectory({ ...shot, side: 'B' });
  assert.ok(Math.abs(a.firstBounce.x + b.firstBounce.x) < 1e-12);
  assert.ok(Math.abs(a.firstBounce.y + b.firstBounce.y) < 1e-12);
});

test('topspin dips the ball shorter than a no-spin ball', () => {
  const base = { hitX: -11.8, hitY: 0, hitZ: 1, speedKmh: 120, launchAngleDeg: 8, aimAngleDeg: 0, sidespinRpm: 0 };
  const spin = simulateTrajectory({ ...base, topspinRpm: 3000 }).firstBounce.localX;
  const flat = simulateTrajectory({ ...base, topspinRpm: 0 }).firstBounce.localX;
  const slice = simulateTrajectory({ ...base, topspinRpm: -1500 }).firstBounce.localX;
  assert.ok(spin < flat && flat < slice, `${spin} < ${flat} < ${slice}`);
});

test('line calls respect the 10 cm baseline and 5 cm sidelines', () => {
  const L = ITF_COURT.halfLength;
  const W = ITF_COURT.halfSinglesWidth;
  // Ball mark centred 8 cm inside the baseline: on the (10 cm) baseline -> LINE.
  assert.equal(evaluateBounceCall(L - 0.08, 0, 0, 'singles', false).callCode, 'LINE');
  // 8 cm inside a sideline: clear of the 5 cm line -> plain IN.
  assert.equal(evaluateBounceCall(5, W - 0.08, 0, 'singles', false).callCode, 'IN');
  // Mark just touching the outer edge of the baseline -> IN (LINE); just past it -> OUT LONG.
  assert.equal(evaluateBounceCall(L + 0.02, 0, 0, 'singles', false).callCode, 'LINE');
  const long = evaluateBounceCall(L + 0.03, 0, 0, 'singles', false);
  assert.equal(long.callCode, 'OUT');
  assert.match(long.callTextEn, /LONG/);
  assert.match(evaluateBounceCall(5, W + 0.05, 0, 'singles', false).callTextEn, /WIDE/);
  // Same lateral spot is IN for doubles.
  assert.equal(evaluateBounceCall(5, W + 0.05, 0, 'doubles', false).isIn, true);
  // Service box: centre line belongs to both boxes, service line is 5 cm.
  assert.equal(evaluateBounceCall(4, -0.01, 0, 'serve_deuce', false).isIn, true);
  assert.equal(evaluateBounceCall(6.45, 1, 0, 'serve_deuce', false).isIn, false);
});

test('every style preset lands in', () => {
  for (const [key, p] of Object.entries(SHOT_PRESETS)) {
    const sim = simulateTrajectory(presetShot(p));
    assert.ok(sim.firstBounce && sim.firstBounce.isIn, `${key}: ${sim.firstBounce?.callTextEn}`);
    assert.equal(sim.hitNet, false, `${key} hits the net`);
  }
});

test('every example rally chains with all shots in', () => {
  for (const [key, rally] of Object.entries(EXAMPLE_RALLIES)) {
    const turns = chainRallyTurns(normaliseTurns(rally.turns), 0, { surfaceKey: rally.surfaceKey });
    turns.forEach((t, i) => assert.equal(t.callCode, 'IN', `${key} shot #${i + 1}`));
  }
});

test('every tactical lesson demo solution passes its own challenge', () => {
  for (const [key, lesson] of Object.entries(TACTICAL_LESSONS)) {
    const turns = normaliseTurns(lesson.turns);
    Object.assign(turns[lesson.challengeTurnIndex], lesson.proSolution);
    chainRallyTurns(turns, 0, { surfaceKey: lesson.surfaceKey });
    const t = turns[lesson.challengeTurnIndex];
    const sim = simulateTrajectory({ ...t, surfaceKey: lesson.surfaceKey });
    const res = evaluateTacticalAttempt(lesson, lesson.challengeTurnIndex, t, sim);
    assert.ok(res && res.passed, `${key}: ${res?.feedbackEn}`);
  }
});

test('inverse impact solver reproduces its targets', () => {
  const target = { targetSpeedKmh: 140, targetLaunchAngleDeg: 7, targetTopspinRpm: 3000 };
  const base = { incomingSpeedKmh: 55, incomingAngleDeg: -10, incomingSpinRpm: 1800, stringTensionKg: 23, hitZ: 1.05 };
  const solved = solveRacketFromTargetLaunch({ ...target, ...base });
  const out = computeRacketBallImpact({ ...base, ...solved });
  assert.ok(Math.abs(out.launchSpeedKmh - 140) < 0.5);
  assert.ok(Math.abs(out.launchAngleDeg - 7) < 0.2);
  assert.ok(Math.abs(out.topspinRpm - 3000) < 40);
});

test('impact exposes the apparent COR and stays in the assumed range', () => {
  const tight = computeRacketBallImpact({ stringTensionKg: 27 });
  const loose = computeRacketBallImpact({ stringTensionKg: 19 });
  assert.equal(tight.apparentCor, tight.eA);
  assert.ok(loose.eA > tight.eA);
  assert.ok(tight.eA >= 0.36 && loose.eA <= 0.48);
  assert.ok(tight.stringDeflectionMm <= 22.5 && loose.stringDeflectionMm <= 22.5);
});

test('air density from temperature and altitude', () => {
  assert.ok(Math.abs(airDensityFromConditions(20, 0) - 1.204) < 0.002);
  assert.ok(Math.abs(airDensityFromConditions(15, 0) - 1.225) < 0.002);
  const highAlt = airDensityFromConditions(20, 1600);
  assert.ok(highAlt > 0.98 && highAlt < 1.0, `${highAlt}`);
  // Thinner air -> the same shot flies longer.
  const shot = presetShot(SHOT_PRESETS.alcaraz_fh);
  const sea = simulateTrajectory({ ...shot }).firstBounce.localX;
  const mountain = simulateTrajectory({ ...shot, altitudeM: 1600 }).firstBounce.localX;
  assert.ok(mountain > sea);
});

test('cross wind pushes the ball sideways, in world coordinates for both players', () => {
  const shot = presetShot(SHOT_PRESETS.alcaraz_fh);
  for (const side of ['A', 'B']) {
    const calm = simulateTrajectory({ ...shot, side }).firstBounce.y;
    const windy = simulateTrajectory({ ...shot, side, crossWindKmh: 20 }).firstBounce.y;
    assert.ok(windy > calm, `side ${side}: ${windy} > ${calm}`);
  }
});

test('aero coefficients: no-spin drag and growth of lift with spin', () => {
  assert.equal(aeroCoefficients(30, 0).cd, 0.55);
  assert.equal(aeroCoefficients(30, 0).cl, 0);
  assert.ok(aeroCoefficients(30, 10).cl > aeroCoefficients(30, 5).cl);
});

test('surface parameters rank clay slowest and grass fastest', () => {
  const cpi = Object.fromEntries(Object.entries(COURT_SURFACES).map(([k, s]) => [k, courtPaceIndex(s)]));
  assert.ok(cpi.clay < cpi.hard && cpi.hard < cpi.grass, JSON.stringify(cpi));
});

test('samplePointAtTime interpolates uneven point spacing', () => {
  const pts = [{ t: 0, x: 0 }, { t: 0.001, x: 1 }, { t: 0.004, x: 4 }];
  assert.equal(samplePointAtTime(pts, 0.0025).x, 2.5);
  assert.equal(samplePointAtTime(pts, -1).x, 0);
  assert.equal(samplePointAtTime(pts, 9).x, 4);
});

test('every surface passes the ITF drop test (254 cm drop -> 135–147 cm rebound)', () => {
  const heights = {};
  for (const key of Object.keys(COURT_SURFACES)) {
    const sim = simulateTrajectory({
      hitX: -6, hitY: 0, hitZ: 2.54 + R, speedKmh: 0, launchAngleDeg: 0, aimAngleDeg: 0,
      topspinRpm: 0, sidespinRpm: 0, surfaceKey: key
    });
    const apex = Math.max(...sim.points.filter((p) => p.phase === 1).map((p) => p.z));
    heights[key] = (apex - R) * 100;
    assert.ok(heights[key] >= 135 && heights[key] <= 147, `${key}: ${heights[key].toFixed(1)} cm`);
  }
  assert.ok(heights.clay > heights.hard && heights.hard > heights.grass, JSON.stringify(heights));
});
