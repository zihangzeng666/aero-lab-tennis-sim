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
  chainRallyTurns,
  computeCourtBounce,
  handoffFromPoint
} from '../lab/physics.js';
import { SHOT_PRESETS, EXAMPLE_RALLIES, TACTICAL_LESSONS, evaluateTacticalAttempt } from '../lab/presets.js';

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
    targetTopspinRpm: t.targetTopspinRpm,
    receive: t.receive
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
    // The answer must be reachable with the swing controls (slider ranges in index.html)
    const ranges = { racketSpeedKmh: [20, 175], swingPathDeg: [-30, 45], faceAngleDeg: [-18, 32], aimAngleDeg: [-28, 28] };
    for (const [k, [lo, hi]] of Object.entries(ranges)) {
      assert.ok(t[k] >= lo && t[k] <= hi, `${key}: ${k} = ${t[k].toFixed(1)} is outside ${lo}..${hi}`);
    }
  }
});

test('every tactical lesson starts as a failing shot with a concrete tip', () => {
  for (const [key, lesson] of Object.entries(TACTICAL_LESSONS)) {
    const turns = normaliseTurns(lesson.turns);
    Object.assign(turns[lesson.challengeTurnIndex], lesson.challengeStart);
    chainRallyTurns(turns, 0, { surfaceKey: lesson.surfaceKey });
    const t = turns[lesson.challengeTurnIndex];
    const sim = simulateTrajectory({ ...t, surfaceKey: lesson.surfaceKey });
    const res = evaluateTacticalAttempt(lesson, lesson.challengeTurnIndex, t, sim);
    assert.ok(res && !res.passed, `${key}: the starting shot should not pass`);
    assert.ok(res.tips.length > 0 && res.tips.every((tip) => tip.control && tip.zh && tip.en), `${key}: needs tips`);
    assert.ok(res.score < 88, `${key}: score ${res.score}`);
  }
});

test('court bounce matches two bounces filmed at 500 fps (Cross)', () => {
  // Grass (used to fit the normal-force offset) and clay (not used in the fit).
  const cases = [
    { name: 'grass', in: [29.1, 8.92], cor: 0.80, mu: 0.53, out: { vx: 20.5, vz: 7.14, w: 314 }, tolW: 0.03 },
    { name: 'clay', in: [25.1, 7.54], cor: 0.91, mu: 0.70, out: { vx: 14.9, vz: 6.89, w: 443 }, tolW: 0.05 }
  ];
  for (const c of cases) {
    const r = computeCourtBounce(c.in[0], 0, -c.in[1], 0, 0, 0, { cor: c.cor, mu: c.mu, eTangential: 0 });
    assert.ok(Math.abs(r.vx - c.out.vx) / c.out.vx < 0.03, `${c.name} vx ${r.vx.toFixed(2)}`);
    assert.ok(Math.abs(r.vz - c.out.vz) / c.out.vz < 0.03, `${c.name} vz ${r.vz.toFixed(2)}`);
    assert.ok(Math.abs(r.wy - c.out.w) / c.out.w < c.tolW, `${c.name} spin ${r.wy.toFixed(0)} rad/s`);
  }
});

test('handoff turns a ball in flight into the next incoming ball', () => {
  const sim = simulateTrajectory({ speedKmh: 120, launchAngleDeg: 8, topspinRpm: 2500, aimAngleDeg: 0, hitX: -11.8, hitY: 0, hitZ: 1 });
  const p = sim.points.find((q) => q.phase === 1 && q.vz < -1 && q.z < 1.1);
  const h = handoffFromPoint(p, 'A');
  assert.equal(h.nextSide, 'B');
  assert.ok(Math.abs(h.nextHitX + p.localX) < 0.01 && Math.abs(h.nextHitZ - p.z) < 0.01);
  assert.ok(Math.abs(h.nextIncomingSpeedKmh - p.speedKmh) < 0.1);
  assert.ok(h.nextIncomingAngleDeg < 0, 'descending ball');
  assert.ok(h.nextIncomingSpinRpm > 0, 'topspin stays topspin');
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

test('motion-capture clips are well formed', async () => {
  const { readFile } = await import('node:fs/promises');
  const read = async (f) => JSON.parse(await readFile(new URL(f, import.meta.url), 'utf8'));
  const c3d = await read('../lab/mocap/strokes.json');
  const bvh = await read('../lab/mocap/strokes_bvh.json');
  assert.ok(c3d.source.includes('tennisdb.cs.pollub.pl'));
  assert.ok(bvh.license.includes('CC BY-SA 3.0') && bvh.citation.includes('10.1007/978-3-319-52277-7_38'));
  const data = { clips: [...c3d.clips, ...bvh.clips] };
  for (const stroke of ['serve', 'bh1']) assert.ok(data.clips.some((c) => c.stroke === stroke), stroke);
  const keys = ['lhip', 'rhip', 'lkne', 'rkne', 'lank', 'rank', 'ltoe', 'rtoe', 'lsho', 'rsho', 'lelb', 'relb', 'lwri', 'rwri', 'head', 'headF', 'racketPos', 'racketQuat'];
  for (const stroke of ['fh', 'bh2']) assert.ok(data.clips.some((c) => c.stroke === stroke), stroke);
  for (const c of data.clips) {
    const n = c.frames.racketPos.length;
    for (const k of keys) assert.equal(c.frames[k].length, n, `${c.id} ${k}`);
    const i0 = Math.round(-c.t0 * c.rate); // frame at impact
    const p = c.frames.racketPos[i0];
    assert.ok(Math.hypot(...p) < 0.03, `${c.id}: racket head at the origin at impact`);
    const q = c.frames.racketQuat[i0];
    assert.ok(Math.abs(Math.hypot(...q) - 1) < 1e-3, `${c.id}: unit quaternion`);
    assert.ok(c.headSpeed > 15 && c.headSpeed < 35, `${c.id}: racket head speed ${c.headSpeed}`);
  }
});

/* ------------------------------------------------------------------------- */
/* Coaching presets: incoming balls flown with the physics                    */
/* ------------------------------------------------------------------------- */
import { resolveIncomingBall, solveFaceAngleForDepth, describeShotOutcome } from '../lab/physics.js';
import { INCOMING_PRESETS } from '../lab/presets.js';
import { buildCoachFeedback, incomingSpinLaunchEffect } from '../lab/coachFeedback.js';

const COACH_BALLS = Object.keys(INCOMING_PRESETS).filter((k) => !INCOMING_PRESETS[k].manual);
const ball = (k, surfaceKey = 'hard') => resolveIncomingBall(INCOMING_PRESETS[k], { surfaceKey });
const stockSwing = (k, r) => ({
  racketSpeedKmh: 100, swingPathDeg: 25, faceAngleDeg: -4, stringTensionKg: 23, sidespinRpm: 0,
  courtMode: 'singles', aimAngleDeg: INCOMING_PRESETS[k].hitterAimDeg,
  hitX: r.hitX, hitY: r.hitY, hitZ: r.hitZ,
  incomingSpeedKmh: r.incomingSpeedKmh, incomingAngleDeg: r.incomingAngleDeg, incomingSpinRpm: r.incomingSpinRpm
});

test('the eight coaching balls exist and every one bounces in on every surface at a playable contact', () => {
  for (const k of ['fast_flat', 'heavy_topspin', 'low_slice', 'moonball', 'short_ball', 'kick_serve', 'flat_serve', 'deep_backhand']) {
    assert.ok(COACH_BALLS.includes(k), k);
  }
  for (const surf of ['hard', 'clay', 'grass']) {
    for (const k of COACH_BALLS) {
      const r = ball(k, surf);
      assert.ok(r, `${k} on ${surf} does not bounce in`);
      assert.ok(r.contactHeightM > 0.3 && r.contactHeightM < 2.2, `${k} contact ${r.contactHeightM}`);
      assert.ok(r.hitX > -15 && r.hitX < -5, `${k} hitX ${r.hitX}`);
      assert.ok(Math.abs(r.hitY) < 5.2, `${k} hitY ${r.hitY}`);
      // the incoming path ends exactly where the hitter meets the ball
      const last = r.path[r.path.length - 1];
      assert.ok(Math.abs(last.t) < 1e-9 && Math.abs(last.z - r.hitZ) < 0.01, k);
    }
  }
});

test('heavy topspin bounces higher than slice; slice stays low; the moonball is highest', () => {
  const top = ball('heavy_topspin');
  const slice = ball('low_slice');
  const flat = ball('fast_flat');
  const moon = ball('moonball');
  assert.ok(top.bouncePeakM > slice.bouncePeakM + 0.5, `${top.bouncePeakM} vs ${slice.bouncePeakM}`);
  assert.ok(top.contactHeightM > 1.1, `topspin met at ${top.contactHeightM}`);
  assert.ok(slice.bouncePeakM < 0.6 && slice.contactHeightM < 0.6, `slice ${slice.bouncePeakM}`);
  for (const k of COACH_BALLS) if (k !== 'low_slice') assert.ok(slice.bouncePeakM < ball(k).bouncePeakM, k);
  assert.ok(flat.bouncePeakM < top.bouncePeakM, 'flat drive stays lower than topspin');
  assert.ok(moon.bouncePeakM > 1.8 && COACH_BALLS.every((k) => ball(k).bouncePeakM <= moon.bouncePeakM));
  // slice: the opponent's ball has backspin and the least topspin when it reaches the hitter
  assert.ok(INCOMING_PRESETS.low_slice.opponent.topspinRpm < 0);
  assert.ok(COACH_BALLS.every((k) => k === 'low_slice' || ball(k).incomingSpinRpm > slice.incomingSpinRpm));
});

test('serves are fast and land in the service box; the flat serve is the fastest ball to meet', () => {
  for (const k of ['kick_serve', 'flat_serve']) {
    const p = INCOMING_PRESETS[k];
    const sim = simulateTrajectory({ side: 'A', sidespinRpm: 0, ...p.opponent });
    assert.ok(sim.firstBounce.isIn && sim.firstBounce.localX < ITF_COURT.serviceLineDist, `${k} lands ${sim.firstBounce.localX}`);
    const r = ball(k);
    assert.ok(r.opponentSpeedKmh >= 150 && r.bounceSpeedKmh > 90, `${k} ${r.bounceSpeedKmh}`);
  }
  const flatServe = ball('flat_serve');
  for (const k of COACH_BALLS) if (k !== 'flat_serve') assert.ok(flatServe.contactSpeedKmh > ball(k).contactSpeedKmh, k);
  assert.ok(ball('kick_serve').bouncePeakM > flatServe.bouncePeakM, 'kick jumps higher than the flat serve');
  assert.ok(flatServe.flightTime < ball('fast_flat').flightTime, 'less time to react on the serve');
});

test('short ball is met inside the court; the deep backhand ball is deep and on the backhand side', () => {
  const short = ball('short_ball');
  assert.ok(short.bounceInsideM > ITF_COURT.halfLength - ITF_COURT.serviceLineDist - 1.5, `short lands ${short.bounceInsideM} m inside`);
  assert.ok(short.hitX > -8, `short met at ${short.hitX}`);
  const bh = ball('deep_backhand');
  assert.ok(bh.hitY > 0.8, 'right-hander backhand side is +y');
  assert.ok(bh.bounceInsideM < 2.0, `lands ${bh.bounceInsideM} m from the baseline`);
  assert.equal(INCOMING_PRESETS.deep_backhand.strokeType, 'bh2');
  const flat = ball('fast_flat');
  assert.ok(flat.netClearanceM < 0.5 && flat.bounceSpeedKmh > ball('heavy_topspin').bounceSpeedKmh);
});

test('suggested face angle lands every ball 1.5 m inside the baseline, and slice needs a more open face than topspin', () => {
  const faces = {};
  for (const k of COACH_BALLS) {
    const st = stockSwing(k, ball(k));
    const sug = solveFaceAngleForDepth(st);
    assert.ok(sug.reachable, k);
    const o = describeShotOutcome(sug.sim);
    assert.equal(o.verdict, 'IN', k);
    assert.ok(Math.abs(o.depthM - 1.5) < 0.2, `${k} depth ${o.depthM}`);
    faces[k] = sug.faceAngleDeg;
  }
  assert.ok(faces.low_slice > faces.heavy_topspin + 5, JSON.stringify(faces));
});

test('face angle drives the verdict: too closed goes in the net, too open goes long', () => {
  const st = stockSwing('fast_flat', ball('fast_flat'));
  const shoot = (face) => {
    const imp = computeRacketBallImpact({ ...st, faceAngleDeg: face });
    return simulateTrajectory({ ...st, speedKmh: imp.launchSpeedKmh, launchAngleDeg: imp.launchAngleDeg, topspinRpm: imp.topspinRpm });
  };
  assert.equal(describeShotOutcome(shoot(-18)).verdict, 'NET');
  assert.equal(describeShotOutcome(shoot(12)).verdict, 'LONG');
});

test('coach feedback is tied to the simulated result', () => {
  const r = ball('heavy_topspin');
  const st = stockSwing('heavy_topspin', r);
  const run = (face) => {
    const s2 = { ...st, faceAngleDeg: face };
    const impact = computeRacketBallImpact(s2);
    const sim = simulateTrajectory({ ...s2, speedKmh: impact.launchSpeedKmh, launchAngleDeg: impact.launchAngleDeg, topspinRpm: impact.topspinRpm });
    return buildCoachFeedback({ state: s2, impact, sim, suggestion: solveFaceAngleForDepth(s2), lang: 'en' });
  };
  // the claim behind "open face vs topspin = the ball climbs": incoming topspin raises the launch angle
  assert.ok(incomingSpinLaunchEffect(st) > 1);
  const long = run(6);
  assert.equal(long.outcome.verdict, 'LONG');
  assert.match(long.lines[0].text, /too open/);
  assert.match(long.lines.find((l) => l.kind === 'fix').text, /^Close the face/);
  assert.match(long.lines.find((l) => l.kind === 'incoming').text, /Open face vs topspin/);
  const net = run(-18);
  assert.equal(net.outcome.verdict, 'NET');
  assert.match(net.lines[0].text, /Too closed/);
  assert.match(net.lines.find((l) => l.kind === 'fix').text, /^Open the face/);
  const zh = buildCoachFeedback({ ...{ state: st }, impact: computeRacketBallImpact(st), sim: simulateTrajectory({ ...st }), lang: 'zh' });
  assert.ok(zh.lines.length > 0);
});

test('heavy topspin and kick serve use realistic inputs and reach the heights their captions state', () => {
  const top = INCOMING_PRESETS.heavy_topspin.opponent;
  assert.ok(top.speedKmh >= 110 && top.speedKmh <= 130 && top.topspinRpm >= 3000 && top.topspinRpm <= 3800);
  const t = ball('heavy_topspin');
  assert.ok(t.netClearanceM >= 1.0 && t.netClearanceM <= 1.8, `net ${t.netClearanceM}`);
  assert.ok(t.bouncePeakM >= 1.3, `topspin peak ${t.bouncePeakM}`); // "about chest height"
  const k = ball('kick_serve');
  assert.ok(k.bouncePeakM >= 1.4, `kick peak ${k.bouncePeakM}`); // "about shoulder height"
});
