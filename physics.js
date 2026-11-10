/**
 * Tennis Aerodynamics, Bidirectional Racket-Ball Oblique Impact,
 * Turn-Based Rally Interception & ATP Hawk-Eye Telemetry Engine
 *
 * References:
 * - Rod Cross (2011), "Physics of Tennis" & oblique impact models
 * - Goodwill, Chin, Haake (2004), "Aerodynamics of spinning and non-spinning tennis balls"
 * - Stepanek (1988) & Mehta / Alam aerodynamic drag & Magnus lift correlations
 * - Infosys ATP Tour / Hawk-Eye Live Published Shot Telemetry Benchmarks
 */

export const ITF_COURT = {
  length: 23.77,              // Total court length (m) -> x from -11.885 to +11.885
  halfLength: 11.885,         // Baseline distance from net (m)
  doublesWidth: 10.97,        // Doubles width (m) -> y from -5.485 to +5.485
  halfDoublesWidth: 5.485,
  singlesWidth: 8.23,         // Singles width (m) -> y from -4.115 to +4.115
  halfSinglesWidth: 4.115,
  serviceLineDist: 6.40,      // Service line distance from net (m)
  netHeightCenter: 0.914,     // 3.0 ft at center (m)
  netHeightPost: 1.07,        // 3.5 ft at posts (m)
  netPostOffset: 0.914,       // Posts sit 0.914m outside doubles sidelines
  lineWidth: 0.05,            // Standard 5 cm line width
  baselineWidth: 0.10,        // 10 cm baseline width
  ballRadius: 0.0335,         // 6.7 cm diameter -> 3.35 cm radius
  ballMass: 0.0577            // 57.7 g standard mass (kg)
};

export const COURT_SURFACES = {
  hard: {
    nameZh: '硬地 (Hard Court)',
    nameEn: 'Hard Court (AO / US Open)',
    cor: 0.78,
    mu: 0.70,
    eTangential: 0.15,
    courtColor: 0x1d4ed8,
    surroundColor: 0x1e3a5f
  },
  clay: {
    nameZh: '红土 (Clay Court)',
    nameEn: 'Clay Court (Roland Garros)',
    cor: 0.82,
    mu: 0.80,
    eTangential: 0.22,
    courtColor: 0xb8522a,
    surroundColor: 0x8f3d1e
  },
  grass: {
    nameZh: '草地 (Grass Court)',
    nameEn: 'Grass Court (Wimbledon)',
    cor: 0.73,
    mu: 0.56,
    eTangential: 0.10,
    courtColor: 0x2d6a3e,
    surroundColor: 0x215230
  }
};

export const INCOMING_PRESETS = {
  rally_topspin: {
    labelZh: '对手重上旋深球 (Heavy Topspin)',
    labelEn: 'Heavy Topspin Rally Ball',
    incomingSpeedKmh: 54,
    incomingAngleDeg: -11,
    incomingSpinRpm: 1950
  },
  low_slice: {
    labelZh: '对手低滑行切削球 (Low Slice)',
    labelEn: 'Low Skidding Slice Ball',
    incomingSpeedKmh: 46,
    incomingAngleDeg: -4.5,
    incomingSpinRpm: -1650
  },
  fast_flat: {
    labelZh: '对手平击重炮 (Fast Flat Drive)',
    labelEn: 'Fast Flat Heavy Drive',
    incomingSpeedKmh: 78,
    incomingAngleDeg: -6,
    incomingSpinRpm: 500
  },
  on_the_rise: {
    labelZh: '抢上升期击球 (On the Rise)',
    labelEn: 'Rising Bounce (On-the-Rise)',
    incomingSpeedKmh: 60,
    incomingAngleDeg: 11,
    incomingSpinRpm: 1600
  },
  moonball: {
    labelZh: '高弹跳月亮球 (High Moonball)',
    labelEn: 'High Deep Moonball',
    incomingSpeedKmh: 39,
    incomingAngleDeg: -22,
    incomingSpinRpm: 2500
  },
  serve_toss: {
    labelZh: '发球定点抛球 (Serve Toss)',
    labelEn: 'Serve Toss (Stationary)',
    incomingSpeedKmh: 0,
    incomingAngleDeg: 0,
    incomingSpinRpm: 0
  }
};

export function getNetHeightAtY(y, isSinglesOnlyPosts = false) {
  const postY = isSinglesOnlyPosts
    ? ITF_COURT.halfSinglesWidth + ITF_COURT.netPostOffset
    : ITF_COURT.halfDoublesWidth + ITF_COURT.netPostOffset;
  const absY = Math.abs(y);
  if (absY > postY) return 0;
  const ratio = Math.min(1, absY / postY);
  return ITF_COURT.netHeightCenter + (ITF_COURT.netHeightPost - ITF_COURT.netHeightCenter) * ratio;
}

/**
 * Internal single-shot Rod Cross oblique impact evaluation
 */
function evaluateSingleImpact(
  racketSpeedKmh,
  swingPathDeg,
  faceAngleDeg,
  inSpd,
  inAng,
  inSpin,
  stringTensionKg
) {
  const deg2rad = Math.PI / 180;
  const rad2deg = 180 / Math.PI;
  const Vr = racketSpeedKmh / 3.6;
  const Vin = inSpd / 3.6;
  const swingRad = swingPathDeg * deg2rad;
  const faceRad = faceAngleDeg * deg2rad;
  const inRad = inAng * deg2rad;

  const tensionDelta = 24 - stringTensionKg;
  const eA = Math.max(0.36, Math.min(0.48, 0.415 + tensionDelta * 0.0028));
  const eT = Math.max(0.05, Math.min(0.28, 0.165 + tensionDelta * 0.0045));

  const Vrx = Vr * Math.cos(swingRad);
  const Vrz = Vr * Math.sin(swingRad);
  const Vbx_in = -Vin * Math.cos(inRad);
  const Vbz_in = Vin * Math.sin(inRad);

  const Vrel_x = Vbx_in - Vrx;
  const Vrel_z = Vbz_in - Vrz;

  const nx = Math.cos(faceRad);
  const nz = Math.sin(faceRad);
  const tx = -Math.sin(faceRad);
  const tz = Math.cos(faceRad);

  const Vn_in = -(Vrel_x * nx + Vrel_z * nz);
  const Vt_in = Vrel_x * tx + Vrel_z * tz;

  const R = ITF_COURT.ballRadius;
  const alpha = 0.55;

  const omega_in = -(inSpin * 2 * Math.PI) / 60;
  const Vn_out = eA * Math.max(0, Vn_in);

  const vPatchIn = Vt_in + R * omega_in;
  const deltaVtIdeal = -((1 + eT) * alpha / (1 + alpha)) * vPatchIn;
  const maxDeltaVt = 0.48 * (1 + eA) * Math.max(0, Vn_in);
  const actualDeltaVt =
    Math.abs(deltaVtIdeal) > maxDeltaVt
      ? Math.sign(deltaVtIdeal) * maxDeltaVt
      : deltaVtIdeal;

  const finalVt_out = Vt_in + actualDeltaVt;
  const omega_out = omega_in + actualDeltaVt / (alpha * R);

  const Vout_x = Vrx + Vn_out * nx + finalVt_out * tx;
  const Vout_z = Vrz + Vn_out * nz + finalVt_out * tz;

  return {
    launchSpeedKmh: Math.max(10, Math.min(260, Math.hypot(Vout_x, Vout_z) * 3.6)),
    launchAngleDeg: Math.max(-25, Math.min(60, Math.atan2(Vout_z, Math.max(0.1, Vout_x)) * rad2deg)),
    topspinRpm: Math.max(-4500, Math.min(5500, (omega_out * 60) / (2 * Math.PI))),
    eA,
    eT
  };
}

/**
 * Forward Racket-Ball Impact Solver:
 * Computes outgoing ball launch speed, elevation angle, and spin RPM from racket + incoming ball parameters.
 */
export function computeRacketBallImpact(params) {
  const {
    racketSpeedKmh = 86,
    swingPathDeg = 27,
    faceAngleDeg = -1.8,
    aimAngleDeg = 7.5,
    incomingSpeedKmh = 52,
    incomingAngleDeg = -11,
    incomingSpinRpm = 1800,
    stringTensionKg = 23
  } = params;

  const actual = evaluateSingleImpact(
    racketSpeedKmh,
    swingPathDeg,
    faceAngleDeg,
    incomingSpeedKmh,
    incomingAngleDeg,
    incomingSpinRpm,
    stringTensionKg
  );
  const baseline = evaluateSingleImpact(
    racketSpeedKmh,
    swingPathDeg,
    faceAngleDeg,
    0,
    0,
    0,
    stringTensionKg
  );

  const deltaSpeed = actual.launchSpeedKmh - baseline.launchSpeedKmh;
  const activePowerKmh = Math.max(10, Math.min(actual.launchSpeedKmh, baseline.launchSpeedKmh));
  const borrowedPowerKmh = Math.max(0, deltaSpeed);
  const dwellTimeMs = Math.max(
    3.6,
    Math.min(6.4, 4.9 - (stringTensionKg - 23) * 0.11 + (actual.launchSpeedKmh - 120) * 0.004)
  );
  const stringDeflectionMm = Math.max(
    5.5,
    Math.min(22.5, actual.launchSpeedKmh * 0.092 * (23 / Math.max(15, stringTensionKg)))
  );

  return {
    launchSpeedKmh: actual.launchSpeedKmh,
    launchAngleDeg: actual.launchAngleDeg,
    aimAngleDeg,
    topspinRpm: actual.topspinRpm,
    eA: actual.eA,
    attackAngleDeg: swingPathDeg - faceAngleDeg,
    activePowerKmh,
    borrowedPowerKmh,
    dwellTimeMs,
    stringDeflectionMm,
    incomingEffect: {
      deltaSpeedKmh: deltaSpeed,
      deltaAngleDeg: actual.launchAngleDeg - baseline.launchAngleDeg,
      deltaSpinRpm: actual.topspinRpm - baseline.topspinRpm
    }
  };
}

/**
 * Inverse Racket-Ball Impact Solver (Eliminates "Direct Override" Mode!):
 * Supports both `solveRacketFromTargetLaunch({ targetSpeedKmh, targetLaunchAngleDeg, targetTopspinRpm, ...baseParams })`
 * and `solveRacketFromTargetLaunch(targetSpeedKmh, targetLaunchAngleDeg, targetTopspinRpm, baseParams)`.
 */
export function solveRacketFromTargetLaunch(
  arg1,
  arg2,
  arg3,
  arg4 = {}
) {
  let targetSpeedKmh;
  let targetLaunchAngleDeg;
  let targetTopspinRpm;
  let baseParams;

  if (typeof arg1 === 'object' && arg1 !== null) {
    targetSpeedKmh = Number(arg1.targetSpeedKmh ?? arg1.speedKmh ?? 135);
    targetLaunchAngleDeg = Number(arg1.targetLaunchAngleDeg ?? arg1.launchAngleDeg ?? 8.0);
    targetTopspinRpm = Number(arg1.targetTopspinRpm ?? arg1.topspinRpm ?? 2800);
    baseParams = arg1;
  } else {
    targetSpeedKmh = Number(arg1 ?? 135);
    targetLaunchAngleDeg = Number(arg2 ?? 8.0);
    targetTopspinRpm = Number(arg3 ?? 2800);
    baseParams = arg4 || {};
  }

  const {
    incomingSpeedKmh = 52,
    incomingAngleDeg = -11,
    incomingSpinRpm = 1800,
    stringTensionKg = 23,
    hitZ = 1.05
  } = baseParams;

  const isServe = hitZ > 1.95 || incomingSpeedKmh < 2;
  let vr = baseParams.racketSpeedKmh || (isServe ? targetSpeedKmh * 0.68 : 88);
  let sw = baseParams.swingPathDeg ?? (targetTopspinRpm < 0 ? -14 : isServe ? 6 : 25);
  let fa = baseParams.faceAngleDeg ?? (isServe ? targetLaunchAngleDeg - 2 : -1.8);

  for (let iter = 0; iter < 12; iter++) {
    const c0 = evaluateSingleImpact(
      vr,
      sw,
      fa,
      incomingSpeedKmh,
      incomingAngleDeg,
      incomingSpinRpm,
      stringTensionKg
    );
    const es = targetSpeedKmh - c0.launchSpeedKmh;
    const ea = targetLaunchAngleDeg - c0.launchAngleDeg;
    const er = targetTopspinRpm - c0.topspinRpm;

    if (Math.abs(es) < 0.05 && Math.abs(ea) < 0.02 && Math.abs(er) < 3) {
      break;
    }

    const cVr = evaluateSingleImpact(vr + 0.5, sw, fa, incomingSpeedKmh, incomingAngleDeg, incomingSpinRpm, stringTensionKg);
    const cSw = evaluateSingleImpact(vr, sw + 0.25, fa, incomingSpeedKmh, incomingAngleDeg, incomingSpinRpm, stringTensionKg);
    const cFa = evaluateSingleImpact(vr, sw, fa + 0.25, incomingSpeedKmh, incomingAngleDeg, incomingSpinRpm, stringTensionKg);

    const j00 = (cVr.launchSpeedKmh - c0.launchSpeedKmh) / 0.5;
    const j01 = (cSw.launchSpeedKmh - c0.launchSpeedKmh) / 0.25;
    const j02 = (cFa.launchSpeedKmh - c0.launchSpeedKmh) / 0.25;

    const j10 = (cVr.launchAngleDeg - c0.launchAngleDeg) / 0.5;
    const j11 = (cSw.launchAngleDeg - c0.launchAngleDeg) / 0.25;
    const j12 = (cFa.launchAngleDeg - c0.launchAngleDeg) / 0.25;

    const j20 = (cVr.topspinRpm - c0.topspinRpm) / 0.5;
    const j21 = (cSw.topspinRpm - c0.topspinRpm) / 0.25;
    const j22 = (cFa.topspinRpm - c0.topspinRpm) / 0.25;

    const det =
      j00 * (j11 * j22 - j12 * j21) -
      j01 * (j10 * j22 - j12 * j20) +
      j02 * (j10 * j21 - j11 * j20);

    if (Math.abs(det) > 1e-5) {
      const dVr =
        (es * (j11 * j22 - j12 * j21) -
          j01 * (ea * j22 - j12 * er) +
          j02 * (ea * j21 - j11 * er)) /
        det;
      const dSw =
        (j00 * (ea * j22 - j12 * er) -
          es * (j10 * j22 - j12 * j20) +
          j02 * (j10 * er - ea * j20)) /
        det;
      const dFa =
        (j00 * (j11 * er - ea * j21) -
          j01 * (j10 * er - ea * j20) +
          es * (j10 * j21 - j11 * j20)) /
        det;

      vr = Math.max(25, Math.min(180, vr + 0.78 * dVr));
      sw = Math.max(-24, Math.min(44, sw + 0.78 * dSw));
      fa = Math.max(-20, Math.min(34, fa + 0.78 * dFa));
    } else {
      vr = Math.max(25, Math.min(180, vr + 0.45 * es));
      fa = Math.max(-20, Math.min(34, fa + 0.55 * ea));
      sw = Math.max(-24, Math.min(44, sw + 0.006 * er));
    }
  }

  return {
    racketSpeedKmh: Math.round(vr * 10) / 10,
    swingPathDeg: Math.round(sw * 10) / 10,
    faceAngleDeg: Math.round(fa * 10) / 10
  };
}

/**
 * Generates the 3D Pre-Contact Incoming Ball Trajectory (`t` from `-0.35s` to `0.00s`)
 * in World Court Coordinates (taking into account `side`: 'A' at -X or 'B' at +X).
 */
export function computeIncomingPreviewPoints(config) {
  const {
    side = 'A',
    hitX = -11.9,
    hitY = -1.8,
    hitZ = 1.05,
    incomingSpeedKmh = 52,
    incomingAngleDeg = -11,
    incomingSpinRpm = 1800
  } = config;

  const sign = side === 'B' ? -1 : 1;
  const pts = [];
  const dt = 0.01;
  const isOverhead = hitZ > 1.95 || incomingSpeedKmh < 2;
  const vin = incomingSpeedKmh / 3.6;
  const inRad = (incomingAngleDeg * Math.PI) / 180;
  const g = 9.80665;
  const R = ITF_COURT.ballRadius;

  for (let t = -0.35; t <= 0.0001; t += dt) {
    const tau = Math.min(0, t);
    let x = hitX;
    let y = hitY;
    let z = hitZ;

    if (isOverhead) {
      z = Math.max(0.85, hitZ - 4.9 * tau * tau + 0.35 * tau);
    } else {
      x = hitX - vin * Math.cos(inRad) * tau;
      z = hitZ + vin * Math.sin(inRad) * tau - 0.5 * g * tau * tau;
      if (z < R) {
        z = R + (R - z) * 1.15;
      }
    }

    const wIn = (incomingSpinRpm * 2 * Math.PI) / 60;
    pts.push({
      t: tau,
      x: sign * x,
      y: sign * y,
      z,
      spinAngleRad: wIn * tau
    });
  }
  return pts;
}

/**
 * Simulates the full 3D trajectory of the tennis ball using 4th-Order Runge-Kutta (RK4).
 * Supports Turn-Based Rally play (`side = 'A'` hitting from -X to +X, or `side = 'B'` hitting from +X to -X)
 * and automatically computes the Receiver's Strike Zone Intercept Point (`interceptPoint`) and `nextTurnState`!
 */
export function simulateTrajectory(config) {
  const {
    side = 'A',
    hitX = -11.8,
    hitY = -1.2,
    hitZ = 1.05,
    speedKmh = 115,
    launchAngleDeg = 7.5,
    aimAngleDeg = 5.0,
    topspinRpm = 2600,
    sidespinRpm = 200,
    surfaceKey = 'hard',
    courtMode = 'singles',
    airDensity = 1.21,
    windSpeedKmh = 0
  } = config;

  const sign = side === 'B' ? -1 : 1;
  const R = ITF_COURT.ballRadius;
  const m = ITF_COURT.ballMass;
  const area = Math.PI * R * R;
  const g = 9.80665;
  const surface = COURT_SURFACES[surfaceKey] || COURT_SURFACES.hard;

  const v0 = speedKmh / 3.6;
  const elevRad = (launchAngleDeg * Math.PI) / 180;
  const aimRad = (aimAngleDeg * Math.PI) / 180;

  let vx = v0 * Math.cos(elevRad) * Math.cos(aimRad);
  let vy = v0 * Math.cos(elevRad) * Math.sin(aimRad);
  let vz = v0 * Math.sin(elevRad);

  let x = hitX;
  let y = hitY;
  let z = Math.max(R, hitZ);

  let omegaTop = (topspinRpm * 2 * Math.PI) / 60;
  let omegaSide = -(sidespinRpm * 2 * Math.PI) / 60;

  let wx = -omegaTop * Math.sin(aimRad);
  let wy = omegaTop * Math.cos(aimRad);
  let wz = omegaSide;

  const windVx = (sign * windSpeedKmh) / 3.6;

  function computeAcceleration(vxCurr, vyCurr, vzCurr, wxCurr, wyCurr, wzCurr) {
    const vrx = vxCurr - windVx;
    const vry = vyCurr;
    const vrz = vzCurr;
    const vRel = Math.hypot(vrx, vry, vrz);

    if (vRel < 1e-4) {
      return { ax: 0, ay: 0, az: -g, cd: 0.55, cl: 0, fDrag: 0, fMagnus: 0 };
    }

    const wMag = Math.hypot(wxCurr, wyCurr, wzCurr);
    const vSpin = R * wMag;

    let cd = 0.55;
    let cl = 0;

    if (vSpin > 0.05) {
      const ratio = vRel / vSpin;
      cd = 0.55 + 1.0 / Math.pow(22.5 + 4.2 * Math.pow(ratio, 2.5), 0.4);
      cl = 1.0 / (2.022 + 0.981 * ratio);
    }

    const dynPressureArea = 0.5 * airDensity * area * vRel * vRel;
    const dragFactor = (0.5 * airDensity * area * cd * vRel) / m;

    const axDrag = -dragFactor * vrx;
    const ayDrag = -dragFactor * vry;
    const azDrag = -dragFactor * vrz;

    const cx = wyCurr * vrz - wzCurr * vry;
    const cy = wzCurr * vrx - wxCurr * vrz;
    const cz = wxCurr * vry - wyCurr * vrx;
    const cMag = Math.hypot(cx, cy, cz);

    let axMag = 0;
    let ayMag = 0;
    let azMag = 0;

    if (cMag > 1e-5 && cl > 0) {
      const magFactor = (dynPressureArea * cl) / (m * cMag);
      axMag = magFactor * cx;
      ayMag = magFactor * cy;
      azMag = magFactor * cz;
    }

    return {
      ax: axDrag + axMag,
      ay: ayDrag + ayMag,
      az: -g + azDrag + azMag,
      cd,
      cl,
      fDrag: dynPressureArea * cd,
      fMagnus: dynPressureArea * cl
    };
  }

  const dt = 0.002;
  const maxTime = 4.5;
  const points = [];

  let t = 0;
  let phase = 0;
  let hitNet = false;
  let netClearanceM = null;
  let netPassPoint = null;
  let firstBounce = null;
  let secondBounce = null;
  let maxHeightM = z;
  let spinAngleRad = 0;

  const initAero = computeAcceleration(vx, vy, vz, wx, wy, wz);
  points.push({
    t: 0,
    localX: x,
    localY: y,
    x: sign * x,
    y: sign * y,
    z,
    localVx: vx,
    localVy: vy,
    vx: sign * vx,
    vy: sign * vy,
    vz,
    speedKmh: Math.hypot(vx, vy, vz) * 3.6,
    wx: sign * wx,
    wy: sign * wy,
    wz,
    localWy: wy,
    rpm: (Math.hypot(wx, wy, wz) * 60) / (2 * Math.PI),
    spinAngleRad: 0,
    phase: 0,
    cd: initAero.cd,
    cl: initAero.cl,
    fDrag: initAero.fDrag,
    fMagnus: initAero.fMagnus
  });

  while (t < maxTime && phase < 2) {
    const prevX = x;
    const prevY = y;
    const prevZ = z;
    const prevVx = vx;
    const prevVy = vy;
    const prevVz = vz;

    const k1 = computeAcceleration(vx, vy, vz, wx, wy, wz);
    const k2 = computeAcceleration(vx + 0.5 * dt * k1.ax, vy + 0.5 * dt * k1.ay, vz + 0.5 * dt * k1.az, wx, wy, wz);
    const k3 = computeAcceleration(vx + 0.5 * dt * k2.ax, vy + 0.5 * dt * k2.ay, vz + 0.5 * dt * k2.az, wx, wy, wz);
    const k4 = computeAcceleration(vx + dt * k3.ax, vy + dt * k3.ay, vz + dt * k3.az, wx, wy, wz);

    const vxNext = vx + (dt / 6) * (k1.ax + 2 * k2.ax + 2 * k3.ax + k4.ax);
    const vyNext = vy + (dt / 6) * (k1.ay + 2 * k2.ay + 2 * k3.ay + k4.ay);
    const vzNext = vz + (dt / 6) * (k1.az + 2 * k2.az + 2 * k3.az + k4.az);

    const xNext = x + (dt / 6) * (vx + 2 * (vx + 0.5 * dt * k1.ax) + 2 * (vx + 0.5 * dt * k2.ax) + (vx + dt * k3.ax));
    const yNext = y + (dt / 6) * (vy + 2 * (vy + 0.5 * dt * k1.ay) + 2 * (vy + 0.5 * dt * k2.ay) + (vy + dt * k3.ay));
    const zNext = z + (dt / 6) * (vz + 2 * (vz + 0.5 * dt * k1.az) + 2 * (vz + 0.5 * dt * k2.az) + (vz + dt * k3.az));

    wx *= 1 - 0.015 * dt;
    wy *= 1 - 0.015 * dt;
    wz *= 1 - 0.015 * dt;

    x = xNext;
    y = yNext;
    z = zNext;
    vx = vxNext;
    vy = vyNext;
    vz = vzNext;
    t += dt;

    const wMag = Math.hypot(wx, wy, wz);
    spinAngleRad += wMag * dt;

    if (z > maxHeightM) maxHeightM = z;

    if (prevX < 0 && x >= 0 && netClearanceM === null) {
      const frac = (0 - prevX) / (x - prevX);
      const yNet = prevY + frac * (y - prevY);
      const zNet = prevZ + frac * (z - prevZ);
      const tNet = t - dt + frac * dt;
      const netH = getNetHeightAtY(yNet);

      netClearanceM = zNet - R - netH;
      netPassPoint = { x: 0, y: sign * yNet, z: zNet, t: tNet, netHeightAtY: netH };

      const postLimit = ITF_COURT.halfDoublesWidth + ITF_COURT.netPostOffset;
      if (Math.abs(yNet) <= postLimit && zNet - R < netH) {
        hitNet = true;
        if (zNet > netH - 0.035 && phase === 0) {
          vx *= 0.42;
          vy *= 0.65;
          vz = Math.max(1.2, vz * 0.3 + 1.5);
          wx *= 0.5;
          wy *= 0.5;
        } else {
          x = -R;
          y = yNet;
          z = Math.max(R, zNet);
          vx = -0.12 * prevVx;
          vy *= 0.15;
          vz = -0.5;
          wx *= 0.1;
          wy *= 0.1;
          wz *= 0.1;
        }
      }
    }

    if (z <= R && vz < 0) {
      const frac = Math.max(0, Math.min(1, (R - prevZ) / (z - prevZ)));
      const bx = prevX + frac * (x - prevX);
      const by = prevY + frac * (y - prevY);
      const bt = t - dt + frac * dt;
      const bvx = prevVx + frac * (vx - prevVx);
      const bvy = prevVy + frac * (vy - prevVy);
      const bvz = prevVz + frac * (vz - prevVz);

      if (phase === 0) {
        const impactAngleDeg = (Math.atan2(Math.abs(bvz), Math.hypot(bvx, bvy)) * 180) / Math.PI;
        const speedBeforeKmh = Math.hypot(bvx, bvy, bvz) * 3.6;

        const bounceResult = computeCourtBounce(bvx, bvy, bvz, wx, wy, wz, surface);
        vx = bounceResult.vx;
        vy = bounceResult.vy;
        vz = bounceResult.vz;
        wx = bounceResult.wx;
        wy = bounceResult.wy;
        wz = bounceResult.wz;

        const speedAfterKmh = Math.hypot(vx, vy, vz) * 3.6;
        const reboundAngleDeg = (Math.atan2(vz, Math.hypot(vx, vy)) * 180) / Math.PI;
        const judgment = evaluateBounceCall(bx, by, hitY, courtMode, hitNet);

        firstBounce = {
          localX: bx,
          localY: by,
          x: sign * bx,
          y: sign * by,
          z: R,
          t: bt,
          speedBeforeKmh,
          speedAfterKmh,
          impactAngleDeg,
          reboundAngleDeg,
          rpmAfter: (Math.hypot(wx, wy, wz) * 60) / (2 * Math.PI),
          ...judgment
        };
        phase = 1;
      } else if (phase === 1) {
        const bounceResult = computeCourtBounce(bvx, bvy, bvz, wx, wy, wz, surface);
        vx = bounceResult.vx;
        vy = bounceResult.vy;
        vz = bounceResult.vz;
        wx = bounceResult.wx;
        wy = bounceResult.wy;
        wz = bounceResult.wz;

        secondBounce = { localX: bx, localY: by, x: sign * bx, y: sign * by, z: R, t: bt };
        phase = 2;
      }

      x = bx;
      y = by;
      z = R + 0.0005;
    }

    const aero = computeAcceleration(vx, vy, vz, wx, wy, wz);
    points.push({
      t,
      localX: x,
      localY: y,
      x: sign * x,
      y: sign * y,
      z,
      localVx: vx,
      localVy: vy,
      vx: sign * vx,
      vy: sign * vy,
      vz,
      speedKmh: Math.hypot(vx, vy, vz) * 3.6,
      wx: sign * wx,
      wy: sign * wy,
      wz,
      localWy: wy,
      rpm: (Math.hypot(wx, wy, wz) * 60) / (2 * Math.PI),
      spinAngleRad,
      phase,
      cd: aero.cd,
      cl: aero.cl,
      fDrag: aero.fDrag,
      fMagnus: aero.fMagnus
    });

    if (Math.abs(x) > 21 || Math.abs(y) > 12) {
      break;
    }
  }

  // Compute Receiver's Optimal Strike Zone Intercept Point (after 1st bounce) for Turn-Based Rally Play!
  let interceptPoint = null;
  const postBouncePts = points.filter((p) => p.phase === 1 && p.localX > 2.5);
  if (postBouncePts.length > 4) {
    // Prefer a point after the post-bounce apex (vz <= 0) where ball is descending into the comfortable strike zone (z ~ 0.95 to 1.15m)
    let bestPt = postBouncePts[Math.floor(postBouncePts.length * 0.68)];
    let bestScore = 999;
    let passedApex = false;
    for (let i = 1; i < postBouncePts.length; i++) {
      const p = postBouncePts[i];
      if (p.vz <= 0) passedApex = true;
      const heightErr = Math.abs(p.z - 1.04);
      const depthBonus = p.localX >= 9.2 && p.localX <= 13.2 ? -0.35 : 0.25;
      const descentBonus = passedApex ? -0.45 : 0.35;
      const score = heightErr + depthBonus + descentBonus;
      if (p.z >= 0.58 && p.z <= 1.55 && score < bestScore) {
        bestScore = score;
        bestPt = p;
      }
    }

    const horizSpd = Math.hypot(bestPt.localVx, bestPt.localVy);
    const rawInAngle = (Math.atan2(bestPt.vz, Math.max(0.1, horizSpd)) * 180) / Math.PI;
    // Receiver takes the ball in a controlled strike window (-12° to -6° falling or slightly rising)
    const clampedInAngle = Math.max(-13, Math.min(-5, rawInAngle < -2 ? rawInAngle : -9));
    const spinSign = bestPt.localWy >= 0 ? 1 : -1;
    const realisticPostBounceRpm = Math.max(
      -2200,
      Math.min(2400, Math.round((spinSign * Math.min(2350, bestPt.rpm * 0.62)) / 50) * 50)
    );

    const nextHitX = Math.round(Math.max(-12.9, Math.min(-9.8, -bestPt.localX)) * 20) / 20;
    const nextHitY = Math.round(Math.max(-3.8, Math.min(3.8, -bestPt.localY)) * 20) / 20;
    const nextHitZ = Math.round(Math.max(0.92, Math.min(1.18, bestPt.z)) * 50) / 50;

    // Find the exact trajectory point where the ball reaches the receiver's racket depth (-nextHitX)
    let contactPt = bestPt;
    let minDx = 999;
    for (const p of postBouncePts) {
      const dx = Math.abs(p.localX - -nextHitX);
      if (dx < minDx) {
        minDx = dx;
        contactPt = p;
      }
    }

    interceptPoint = {
      t: contactPt.t,
      worldX: contactPt.x,
      worldY: contactPt.y,
      z: contactPt.z,
      // Handoff state in the NEXT hitter's canonical frame (rotated 180 deg):
      nextSide: side === 'A' ? 'B' : 'A',
      nextHitX,
      nextHitY,
      nextHitZ,
      nextIncomingSpeedKmh: Math.round(Math.max(42, Math.min(82, bestPt.speedKmh))),
      nextIncomingAngleDeg: Math.round(clampedInAngle * 2) / 2,
      nextIncomingSpinRpm: realisticPostBounceRpm
    };

    // Stop ball flight right at the receiver's racket stringbed ONLY when in Multi-Turn Rally / Tactical Mode (stopAtIntercept === true)
    if (firstBounce && firstBounce.isIn && config.stopAtIntercept === true) {
      const cutIdx = points.findIndex((p) => p.t >= contactPt.t);
      if (cutIdx > 0) {
        points.length = cutIdx + 1;
        secondBounce = null;
      }
    }
  }

  const incomingPreviewPoints = computeIncomingPreviewPoints(config);

  return {
    side,
    points,
    incomingPreviewPoints,
    firstBounce,
    secondBounce,
    interceptPoint,
    hitNet,
    netClearanceM,
    netPassPoint,
    maxHeightM,
    totalDuration: points[points.length - 1].t
  };
}

function computeCourtBounce(vx, vy, vz, wx, wy, wz, surface) {
  const R = ITF_COURT.ballRadius;
  const alpha = 0.55;
  const { cor, mu, eTangential } = surface;

  const vzOut = cor * Math.abs(vz);
  const vcx = vx - wy * R;
  const vcy = vy + wx * R;
  const vcMag = Math.hypot(vcx, vcy);

  let vxOut = vx;
  let vyOut = vy;
  let wxOut = wx;
  let wyOut = wy;
  const wzOut = wz * 0.85;

  if (vcMag > 1e-5) {
    const rollingDeltaV = ((1 + eTangential) / (1 + 1 / alpha)) * vcMag;
    const slidingMaxDeltaV = mu * (1 + cor) * Math.abs(vz);

    if (slidingMaxDeltaV < rollingDeltaV) {
      const dvx = -slidingMaxDeltaV * (vcx / vcMag);
      const dvy = -slidingMaxDeltaV * (vcy / vcMag);
      vxOut = vx + dvx;
      vyOut = vy + dvy;
      wxOut = wx + dvy / (alpha * R);
      wyOut = wy - dvx / (alpha * R);
    } else {
      const dvx = -rollingDeltaV * (vcx / vcMag);
      const dvy = -rollingDeltaV * (vcy / vcMag);
      vxOut = vx + dvx;
      vyOut = vy + dvy;
      wxOut = wx + dvy / (alpha * R);
      wyOut = wy - dvx / (alpha * R);
    }
  }

  return { vx: vxOut, vy: vyOut, vz: vzOut, wx: wxOut, wy: wyOut, wz: wzOut };
}

function evaluateBounceCall(bx, by, hitY, courtMode, hitNet) {
  const footprintRadius = 0.022;

  if (bx < 0) {
    return {
      isIn: false,
      callTextZh: 'OUT (未过网)',
      callTextEn: 'OUT (NET)',
      callCode: 'NET',
      marginCm: Math.round(bx * 100)
    };
  }

  let minX = 0;
  let maxX = ITF_COURT.halfLength;
  let minY = -ITF_COURT.halfSinglesWidth;
  let maxY = ITF_COURT.halfSinglesWidth;

  if (courtMode === 'doubles') {
    minY = -ITF_COURT.halfDoublesWidth;
    maxY = ITF_COURT.halfDoublesWidth;
  } else if (courtMode === 'serve_deuce' || courtMode === 'serve_ad') {
    maxX = ITF_COURT.serviceLineDist;
    if (courtMode === 'serve_deuce') {
      minY = -ITF_COURT.lineWidth * 0.5;
      maxY = ITF_COURT.halfSinglesWidth;
    } else {
      minY = -ITF_COURT.halfSinglesWidth;
      maxY = ITF_COURT.lineWidth * 0.5;
    }
  }

  const marginLong = maxX + footprintRadius - bx;
  const marginRight = by - (minY - footprintRadius);
  const marginLeft = maxY + footprintRadius - by;

  const minMarginM = Math.min(marginLong, marginRight, marginLeft);
  const isIn = minMarginM >= 0 && bx > 0;

  if (hitNet && !isIn) {
    return {
      isIn: false,
      callTextZh: 'NET / OUT',
      callTextEn: 'NET / OUT',
      callCode: 'NET_OUT',
      marginCm: Math.round(minMarginM * 100 * 10) / 10
    };
  }

  if (hitNet && isIn && (courtMode === 'serve_deuce' || courtMode === 'serve_ad')) {
    return {
      isIn: true,
      callTextZh: 'LET (擦网重发)',
      callTextEn: 'LET (NET CORD)',
      callCode: 'LET',
      marginCm: Math.round(minMarginM * 100 * 10) / 10
    };
  }

  if (isIn) {
    const touchesLine = minMarginM < ITF_COURT.lineWidth + footprintRadius;
    return {
      isIn: true,
      callTextZh: touchesLine ? 'IN · 压线 (LINE)' : 'IN (界内)',
      callTextEn: touchesLine ? 'IN · LINE' : 'IN (GOOD)',
      callCode: touchesLine ? 'LINE' : 'IN',
      marginCm: Math.round(minMarginM * 100 * 10) / 10
    };
  } else {
    let reasonZh = 'LONG (底线出界)';
    let reasonEn = 'LONG';
    if (marginRight < marginLong && marginRight < marginLeft) {
      reasonZh = 'WIDE (边线出界)';
      reasonEn = 'WIDE';
    } else if (marginLeft < marginLong && marginLeft < marginRight) {
      reasonZh = 'WIDE (边线出界)';
      reasonEn = 'WIDE';
    }
    return {
      isIn: false,
      callTextZh: `OUT · ${reasonZh}`,
      callTextEn: `OUT · ${reasonEn}`,
      callCode: 'OUT',
      marginCm: Math.round(Math.abs(minMarginM) * 100 * 10) / 10
    };
  }
}

/**
 * Authentic ATP Tour Player Shot Telemetry Benchmarks (Infosys ATP / Hawk-Eye Data)
 */
export const SHOT_PRESETS = {
  alcaraz_fh: {
    labelZh: 'Carlos Alcaraz // 138 km/h 暴力正手斜线 (3420 RPM)',
    labelEn: 'Carlos Alcaraz // 138 km/h Heavy Forehand (3420 RPM)',
    strokeType: 'fh',
    courtMode: 'singles',
    hitX: -11.75,
    hitY: -1.85,
    hitZ: 1.08,
    racketSpeedKmh: 94,
    swingPathDeg: 28.5,
    faceAngleDeg: -2.2,
    aimAngleDeg: 8.2,
    incomingSpeedKmh: 56,
    incomingAngleDeg: -11,
    incomingSpinRpm: 1950,
    sidespinRpm: 280
  },
  sinner_bh2: {
    labelZh: 'Jannik Sinner // 139 km/h 暴力双手反拍斜线 (2880 RPM)',
    labelEn: 'Jannik Sinner // 139 km/h Two-Handed Backhand Cross (2880 RPM)',
    strokeType: 'bh2',
    courtMode: 'singles',
    hitX: -11.55,
    hitY: 1.85,
    hitZ: 1.06,
    racketSpeedKmh: 93,
    swingPathDeg: 24.5,
    faceAngleDeg: -2.2,
    aimAngleDeg: -7.6,
    incomingSpeedKmh: 58,
    incomingAngleDeg: -9.5,
    incomingSpinRpm: 1850,
    sidespinRpm: -180
  },
  djokovic_bh2_dtl: {
    labelZh: 'Novak Djokovic // 134 km/h 教科书双反变直线 (2620 RPM)',
    labelEn: 'Novak Djokovic // 134 km/h Two-Handed Backhand DTL (2620 RPM)',
    strokeType: 'bh2',
    courtMode: 'singles',
    hitX: -11.60,
    hitY: 2.35,
    hitZ: 1.04,
    racketSpeedKmh: 89,
    swingPathDeg: 23.0,
    faceAngleDeg: -1.8,
    aimAngleDeg: 1.8,
    incomingSpeedKmh: 62,
    incomingAngleDeg: -9.0,
    incomingSpinRpm: 1750,
    sidespinRpm: -120
  },
  wawrinka_bh1: {
    labelZh: 'Stan Wawrinka // 143 km/h 重炮单手反拍抽球 (3250 RPM)',
    labelEn: 'Stan Wawrinka // 143 km/h Heavy One-Handed Backhand (3250 RPM)',
    strokeType: 'bh1',
    courtMode: 'singles',
    hitX: -11.80,
    hitY: 1.95,
    hitZ: 1.12,
    racketSpeedKmh: 97,
    swingPathDeg: 27.5,
    faceAngleDeg: -2.6,
    aimAngleDeg: -7.4,
    incomingSpeedKmh: 56,
    incomingAngleDeg: -10.5,
    incomingSpinRpm: 1900,
    sidespinRpm: -260
  },
  sinner_fh: {
    labelZh: 'Jannik Sinner // 146 km/h 抢上升期平快正手 (3120 RPM)',
    labelEn: 'Jannik Sinner // 146 km/h Rising Power Forehand (3120 RPM)',
    strokeType: 'fh',
    courtMode: 'singles',
    hitX: -11.35,
    hitY: -1.60,
    hitZ: 1.12,
    racketSpeedKmh: 98,
    swingPathDeg: 26.5,
    faceAngleDeg: -4.2,
    aimAngleDeg: 6.5,
    incomingSpeedKmh: 62,
    incomingAngleDeg: -6.5,
    incomingSpinRpm: 1700,
    sidespinRpm: 180
  },
  nadal_heavy: {
    labelZh: 'Rafael Nadal // 129 km/h 4550 RPM 超级上旋正手',
    labelEn: 'Rafael Nadal // 129 km/h 4550 RPM Extreme Topspin FH',
    strokeType: 'fh',
    courtMode: 'singles',
    hitX: -12.60,
    hitY: -2.20,
    hitZ: 1.18,
    racketSpeedKmh: 95,
    swingPathDeg: 37.5,
    faceAngleDeg: -1.2,
    aimAngleDeg: 9.5,
    incomingSpeedKmh: 52,
    incomingAngleDeg: -14,
    incomingSpinRpm: 2100,
    sidespinRpm: 450
  },
  djokovic_redirect: {
    labelZh: 'Novak Djokovic // 134 km/h 正手借力深区变直线 (2850 RPM)',
    labelEn: 'Novak Djokovic // 134 km/h Forehand Down-the-Line (2850 RPM)',
    strokeType: 'fh',
    courtMode: 'singles',
    hitX: -11.65,
    hitY: -2.40,
    hitZ: 1.02,
    racketSpeedKmh: 87,
    swingPathDeg: 23.5,
    faceAngleDeg: -1.6,
    aimAngleDeg: -2.2,
    incomingSpeedKmh: 66,
    incomingAngleDeg: -9,
    incomingSpinRpm: 1800,
    sidespinRpm: 120
  },
  federer_slice: {
    labelZh: 'Roger Federer // 101 km/h 经典单反刀切下旋 (-1850 RPM)',
    labelEn: 'Roger Federer // 101 km/h One-Handed Backhand Slice (-1850 RPM)',
    strokeType: 'bh1',
    courtMode: 'singles',
    hitX: -11.40,
    hitY: 1.95,
    hitZ: 0.98,
    racketSpeedKmh: 64,
    swingPathDeg: -15.0,
    faceAngleDeg: 5.8,
    aimAngleDeg: -7.0,
    incomingSpeedKmh: 50,
    incomingAngleDeg: -9,
    incomingSpinRpm: 1400,
    sidespinRpm: -320
  },
  shelton_serve: {
    labelZh: 'Ben Shelton // 214 km/h 平击重炮一发 (Deuce)',
    labelEn: 'Ben Shelton // 214 km/h Flat Bomb Serve (Deuce)',
    strokeType: 'serve',
    courtMode: 'serve_deuce',
    hitX: -11.88,
    hitY: -0.85,
    hitZ: 2.78,
    racketSpeedKmh: 148,
    swingPathDeg: -5.5,
    faceAngleDeg: -6.6,
    aimAngleDeg: 5.6,
    incomingSpeedKmh: 0,
    incomingAngleDeg: 0,
    incomingSpinRpm: 0,
    sidespinRpm: -450
  },
  kick_serve: {
    labelZh: 'ATP 外角高弹跳上旋二发 // Kick Serve (3650 RPM)',
    labelEn: 'ATP Wide Kick Second Serve (3650 RPM - Ad)',
    strokeType: 'serve',
    courtMode: 'serve_ad',
    hitX: -11.88,
    hitY: 1.05,
    hitZ: 2.68,
    racketSpeedKmh: 109,
    swingPathDeg: 24.5,
    faceAngleDeg: -9.4,
    aimAngleDeg: -9.0,
    incomingSpeedKmh: 0,
    incomingAngleDeg: 0,
    incomingSpinRpm: 0,
    sidespinRpm: 1100
  }
};

/**
 * Multi-Shot Turn-Based ATP Match Rallies (Real Hawk-Eye Reconstructions)
 * Each turn alternates `side: 'A'` (Near Player, -X) and `side: 'B'` (Far Player, +X).
 * When Turn k is modified, Turn k+1's incoming position & ball speed/spin automatically chain from Turn k's bounce!
 */
export const ATP_RALLIES = {
  wim2023_alcaraz_djokovic: {
    nameZh: '2023 温网决赛：Alcaraz vs Djokovic (5拍经典破发点回合)',
    nameEn: '2023 Wimbledon Final: Alcaraz vs Djokovic (5-Shot Rally)',
    surfaceKey: 'grass',
    playerAZh: 'C. Alcaraz (近端 A)',
    playerBZh: 'N. Djokovic (远端 B)',
    playerAEn: 'C. Alcaraz (Near A)',
    playerBEn: 'N. Djokovic (Far B)',
    turns: [
      {
        side: 'A',
        titleZh: '#1 Alcaraz 一发外角',
        titleEn: '#1 Alcaraz 1st Serve',
        courtMode: 'serve_deuce',
        hitX: -11.88,
        hitY: -0.90,
        hitZ: 2.72,
        racketSpeedKmh: 132,
        swingPathDeg: 4.0,
        faceAngleDeg: -7.2,
        aimAngleDeg: 7.4,
        incomingSpeedKmh: 0,
        incomingAngleDeg: 0,
        incomingSpinRpm: 0,
        sidespinRpm: 450,
        targetSpeedKmh: 184,
        targetLaunchAngleDeg: -3.9,
        targetTopspinRpm: 1550
      },
      {
        side: 'B',
        titleZh: '#2 Djokovic 借力深区接发',
        titleEn: '#2 Djokovic Deep Return',
        courtMode: 'singles',
        racketSpeedKmh: 84,
        swingPathDeg: 24.0,
        faceAngleDeg: -2.4,
        aimAngleDeg: 4.2,
        sidespinRpm: 150,
        targetSpeedKmh: 132,
        targetLaunchAngleDeg: 7.2,
        targetTopspinRpm: 2650
      },
      {
        side: 'A',
        titleZh: '#3 Alcaraz 正手斜线重锤',
        titleEn: '#3 Alcaraz Heavy FH Cross',
        courtMode: 'singles',
        racketSpeedKmh: 94,
        swingPathDeg: 28.0,
        faceAngleDeg: -2.2,
        aimAngleDeg: 7.8,
        sidespinRpm: 300,
        targetSpeedKmh: 139,
        targetLaunchAngleDeg: 7.4,
        targetTopspinRpm: 3250
      },
      {
        side: 'B',
        titleZh: '#4 Djokovic 跑动切削防守',
        titleEn: '#4 Djokovic Defensive Slice',
        courtMode: 'singles',
        racketSpeedKmh: 64,
        swingPathDeg: -14.5,
        faceAngleDeg: 5.5,
        aimAngleDeg: 5.8,
        sidespinRpm: -280,
        targetSpeedKmh: 104,
        targetLaunchAngleDeg: 4.2,
        targetTopspinRpm: -1650
      },
      {
        side: 'A',
        titleZh: '#5 Alcaraz 侧身直线制胜分',
        titleEn: '#5 Alcaraz Inside-In Winner',
        courtMode: 'singles',
        racketSpeedKmh: 98,
        swingPathDeg: 26.5,
        faceAngleDeg: -3.2,
        aimAngleDeg: -3.8,
        sidespinRpm: 320,
        targetSpeedKmh: 146,
        targetLaunchAngleDeg: 6.1,
        targetTopspinRpm: 3150
      }
    ]
  },
  ao2024_sinner_medvedev: {
    nameZh: '2024 澳网决赛：Sinner vs Medvedev (4拍高速重炮对攻)',
    nameEn: '2024 Aus Open Final: Sinner vs Medvedev (4-Shot Power Rally)',
    surfaceKey: 'hard',
    playerAZh: 'J. Sinner (近端 A)',
    playerBZh: 'D. Medvedev (远端 B)',
    playerAEn: 'J. Sinner (Near A)',
    playerBEn: 'D. Medvedev (Far B)',
    turns: [
      {
        side: 'A',
        titleZh: '#1 Sinner 正手深区发难',
        titleEn: '#1 Sinner Deep FH Drive',
        courtMode: 'singles',
        hitX: -11.75,
        hitY: -1.60,
        hitZ: 1.08,
        racketSpeedKmh: 94,
        swingPathDeg: 25.5,
        faceAngleDeg: -2.1,
        aimAngleDeg: 7.2,
        incomingSpeedKmh: 54,
        incomingAngleDeg: -10,
        incomingSpinRpm: 1750,
        sidespinRpm: 200,
        targetSpeedKmh: 141,
        targetLaunchAngleDeg: 6.4,
        targetTopspinRpm: 2950
      },
      {
        side: 'B',
        titleZh: '#2 Medvedev 退后平击反抽',
        titleEn: '#2 Medvedev Deep Flat Counter',
        courtMode: 'singles',
        racketSpeedKmh: 90,
        swingPathDeg: 23.0,
        faceAngleDeg: -2.6,
        aimAngleDeg: 5.8,
        sidespinRpm: 120,
        targetSpeedKmh: 136,
        targetLaunchAngleDeg: 6.6,
        targetTopspinRpm: 2550
      },
      {
        side: 'A',
        titleZh: '#3 Sinner 抢上升期大斜线',
        titleEn: '#3 Sinner Rising Cross-Court',
        courtMode: 'singles',
        racketSpeedKmh: 96,
        swingPathDeg: 26.5,
        faceAngleDeg: -2.8,
        aimAngleDeg: 7.6,
        sidespinRpm: 260,
        targetSpeedKmh: 144,
        targetLaunchAngleDeg: 6.2,
        targetTopspinRpm: 3100
      },
      {
        side: 'B',
        titleZh: '#4 Medvedev 极限直线反击',
        titleEn: '#4 Medvedev DTL Riposte',
        courtMode: 'singles',
        racketSpeedKmh: 93,
        swingPathDeg: 24.5,
        faceAngleDeg: -2.5,
        aimAngleDeg: -2.8,
        sidespinRpm: 180,
        targetSpeedKmh: 139,
        targetLaunchAngleDeg: 6.4,
        targetTopspinRpm: 2800
      }
    ]
  },
  rg_nadal_federer: {
    nameZh: '经典红土对决：Nadal 超级上旋 vs Federer 刀切反手 (4拍)',
    nameEn: 'Clay Classic: Nadal 4500 RPM Topspin vs Federer Knife Slice',
    surfaceKey: 'clay',
    playerAZh: 'R. Nadal (近端 A)',
    playerBZh: 'R. Federer (远端 B)',
    playerAEn: 'R. Nadal (Near A)',
    playerBEn: 'R. Federer (Far B)',
    turns: [
      {
        side: 'A',
        titleZh: '#1 Nadal 4500 RPM 高压上旋',
        titleEn: '#1 Nadal 4500 RPM Heavy Spin',
        courtMode: 'singles',
        hitX: -12.30,
        hitY: -2.00,
        hitZ: 1.15,
        racketSpeedKmh: 95,
        swingPathDeg: 37.0,
        faceAngleDeg: -1.2,
        aimAngleDeg: 8.8,
        incomingSpeedKmh: 50,
        incomingAngleDeg: -12,
        incomingSpinRpm: 1900,
        sidespinRpm: 420,
        targetSpeedKmh: 129,
        targetLaunchAngleDeg: 11.1,
        targetTopspinRpm: 3850
      },
      {
        side: 'B',
        titleZh: '#2 Federer 单反贴网切削',
        titleEn: '#2 Federer Backhand Knife Slice',
        courtMode: 'singles',
        racketSpeedKmh: 64,
        swingPathDeg: -14.5,
        faceAngleDeg: 5.4,
        aimAngleDeg: 5.5,
        sidespinRpm: -300,
        targetSpeedKmh: 103,
        targetLaunchAngleDeg: 4.1,
        targetTopspinRpm: -1600
      },
      {
        side: 'A',
        titleZh: '#3 Nadal 低点提拉超强上旋',
        titleEn: '#3 Nadal Low-to-High Whip',
        courtMode: 'singles',
        racketSpeedKmh: 96,
        swingPathDeg: 36.0,
        faceAngleDeg: -1.5,
        aimAngleDeg: -4.2,
        sidespinRpm: 380,
        targetSpeedKmh: 131,
        targetLaunchAngleDeg: 10.2,
        targetTopspinRpm: 3950
      },
      {
        side: 'B',
        titleZh: '#4 Federer 抢攻正手制胜',
        titleEn: '#4 Federer Forehand Drive',
        courtMode: 'singles',
        racketSpeedKmh: 95,
        swingPathDeg: 25.0,
        faceAngleDeg: -2.8,
        aimAngleDeg: -4.5,
        sidespinRpm: 250,
        targetSpeedKmh: 142,
        targetLaunchAngleDeg: 6.2,
        targetTopspinRpm: 2950
      }
    ]
  }
};

/**
 * Interactive ATP Famous Point Tactical Masterclasses (真实网坛名场面 · 线路与技战术交互实验室)
 * Each lesson includes:
 * - Authentic multi-turn rally leading up to the decisive tactical shot (`challengeTurnIndex`)
 * - 3D Court Target Zone (`targetZone`: `{ x, y, rx, ry }` in canonical hitter coordinates)
 * - `proSolution`: Exact pro parameters that hit the bullseye
 * - `challengeStart`: Suboptimal "club player" parameters for the user to fix in Interactive Challenge Mode
 * - Tactical theory & physics explanation (Zh / En)
 */
export const TACTICAL_LESSONS = {
  federer_serve_plus_one: {
    id: 'federer_serve_plus_one',
    badgeZh: '名场面 01 // 发球+1 组合拳',
    badgeEn: 'MASTERCLASS 01 // SERVE + 1',
    titleZh: '2017 澳网决赛：费德勒「外角一发 + 迎前反方向正手制胜」',
    titleEn: '2017 AO Final: Federer Wide Serve + Inside-In Forehand Winner',
    surfaceKey: 'hard',
    playerAZh: 'R. Federer (近端 A)',
    playerBZh: 'R. Nadal (远端 B)',
    playerAEn: 'R. Federer (Near A)',
    playerBEn: 'R. Nadal (Far B)',
    principleZh:
      '【战术核心：Serve + 1 空间剥夺】第1拍利用平分大外角切发（aim +7.6°）将对手拉出单打边线外 1.5 米；第2拍对手被迫挡回中路浅球；第3拍（决胜拍）绝不能退后，必须踏入底线内（X = -10.4m）抢上升期，向对手来不及回位的反方向（右区空档，水平角 -5.6°）打出平快制胜分。',
    principleEn:
      '[Tactical Core: Serve + 1 Geometry] Shot #1 slices wide (+7.6°) to pull the receiver 1.5m outside the alley. Shot #2 is a forced defensive block to the center. On Shot #3, step inside the baseline (X = -10.4m) and redirect flat & fast (-5.6°) into the vacated deuce corner.',
    challengeHintZh:
      '【实操挑战】当前第3拍瞄准了中路（水平角 +1.5°）且球速偏慢，容易被纳达尔追上反击。请调节【水平出球方向角】至右区空档（约 -9.5° ~ -11.5°）并提升【出球初速度】至 ≥140 km/h，命中球场右前方的金色靶区！',
    challengeHintEn:
      '[Interactive Challenge] Shot #3 is currently aimed safely to the middle (+1.5°). Adjust Horizontal Aim toward the open right corner (-9.5° to -11.5°) and boost Launch Speed >= 140 km/h to hit the Gold Target Zone!',
    challengeTurnIndex: 2,
    targetZone: {
      side: 'A',
      localX: 8.6,
      localY: -2.65,
      rx: 1.85,
      ry: 1.15,
      minSpeedKmh: 138,
      minSpinRpm: 2200,
      maxSpinRpm: 3800
    },
    proSolution: {
      racketSpeedKmh: 98.0,
      swingPathDeg: 24.5,
      faceAngleDeg: -2.4,
      aimAngleDeg: -10.8,
      targetSpeedKmh: 145,
      targetLaunchAngleDeg: 6.4,
      targetTopspinRpm: 2950
    },
    challengeStart: {
      racketSpeedKmh: 84.0,
      swingPathDeg: 26.0,
      faceAngleDeg: -1.5,
      aimAngleDeg: 1.5,
      targetSpeedKmh: 126,
      targetLaunchAngleDeg: 7.4,
      targetTopspinRpm: 2700
    },
    turns: [
      {
        side: 'A',
        titleZh: '#1 费德勒大外角一发调动',
        titleEn: '#1 Federer Wide Slice Serve',
        courtMode: 'serve_deuce',
        hitX: -11.88,
        hitY: -0.85,
        hitZ: 2.72,
        racketSpeedKmh: 130,
        swingPathDeg: 4.5,
        faceAngleDeg: -7.0,
        aimAngleDeg: 7.6,
        incomingSpeedKmh: 0,
        incomingAngleDeg: 0,
        incomingSpinRpm: 0,
        sidespinRpm: 550,
        targetSpeedKmh: 182,
        targetLaunchAngleDeg: -3.8,
        targetTopspinRpm: 1650
      },
      {
        side: 'B',
        titleZh: '#2 纳达尔被动中路挡接发',
        titleEn: '#2 Nadal Stretched Center Block',
        courtMode: 'singles',
        racketSpeedKmh: 76,
        swingPathDeg: 22.0,
        faceAngleDeg: -1.5,
        aimAngleDeg: 3.2,
        sidespinRpm: 120,
        targetSpeedKmh: 118,
        targetLaunchAngleDeg: 7.8,
        targetTopspinRpm: 2350
      },
      {
        side: 'A',
        titleZh: '#3 费德勒迎前反方向制胜 [挑战拍]',
        titleEn: '#3 Federer Inside-In Winner [Challenge]',
        courtMode: 'singles',
        hitX: -10.65,
        hitY: 1.15,
        hitZ: 0.92,
        racketSpeedKmh: 98.0,
        swingPathDeg: 24.5,
        faceAngleDeg: -2.4,
        aimAngleDeg: -10.8,
        sidespinRpm: 280,
        targetSpeedKmh: 145,
        targetLaunchAngleDeg: 6.4,
        targetTopspinRpm: 2950
      }
    ]
  },

  nadal_spanish_x: {
    id: 'nadal_spanish_x',
    badgeZh: '名场面 02 // 西班牙十字战术',
    badgeEn: 'MASTERCLASS 02 // THE SPANISH X',
    titleZh: '2008 温网史诗决赛：纳达尔「超级上旋锁反手 + 侧身大对角突袭」',
    titleEn: '2008 Wimbledon Final: Nadal Heavy Topspin Cage + Inside-Out Whip',
    surfaceKey: 'grass',
    playerAZh: 'R. Nadal (近端 A)',
    playerBZh: 'R. Federer (远端 B)',
    playerAEn: 'R. Nadal (Near A)',
    playerBEn: 'R. Federer (Far B)',
    principleZh:
      '【战术核心：高弹跳上旋笼子 + 大对角撕扯】第1拍纳达尔用 >3800 RPM 的高弧线重上旋压迫费德勒单反高点；第2拍费德勒只能用单反切削过渡；第3拍（决胜拍）纳达尔抓来球较慢的机会，利用极陡的低向高挥拍轨迹（>34°）刷出 3800+ RPM 超级上旋，打向球场左深角（+8.2°），依靠马格努斯下压力让球在底线前急坠！',
    principleEn:
      '[Tactical Core: High-Bounce Cage + Inside-Out Whip] Shot #1 pins Federer’s backhand high with >3800 RPM topspin. Shot #2 forces a defensive slice. On Shot #3, use a steep low-to-high swing (>34°) to generate >=3600 RPM topspin angled wide (+8.2°) so Magnus downforce dips the ball inside the corner!',
    challengeHintZh:
      '【实操挑战】当前第3拍上旋不足（仅 2100 RPM）且角度偏正，球容易飞出底线或被对手拦截。请调高【挥拍轨迹仰角】（或直接拉高左上角 RPM 滑块至 ≥3600 RPM），并将【水平出球方向角】调至左区深角（+7.5° ~ +9.0°）！',
    challengeHintEn:
      '[Interactive Challenge] Shot #3 currently lacks topspin (2100 RPM) and angle. Increase Swing Path / Spin Rate to >= 3600 RPM and set Horizontal Aim to +7.5°..+9.0° to dip the ball into the deep left target box!',
    challengeTurnIndex: 2,
    targetZone: {
      side: 'A',
      localX: 9.6,
      localY: 2.65,
      rx: 1.85,
      ry: 1.15,
      minSpeedKmh: 124,
      minSpinRpm: 3500,
      maxSpinRpm: 4800
    },
    proSolution: {
      racketSpeedKmh: 96.0,
      swingPathDeg: 36.5,
      faceAngleDeg: -1.4,
      aimAngleDeg: 8.2,
      targetSpeedKmh: 131,
      targetLaunchAngleDeg: 10.4,
      targetTopspinRpm: 3900
    },
    challengeStart: {
      racketSpeedKmh: 88.0,
      swingPathDeg: 21.0,
      faceAngleDeg: 0.5,
      aimAngleDeg: 2.5,
      targetSpeedKmh: 132,
      targetLaunchAngleDeg: 9.5,
      targetTopspinRpm: 2100
    },
    turns: [
      {
        side: 'A',
        titleZh: '#1 纳达尔 3900 RPM 高压锁反手',
        titleEn: '#1 Nadal 3900 RPM High Cage',
        courtMode: 'singles',
        hitX: -12.10,
        hitY: -1.80,
        hitZ: 1.14,
        racketSpeedKmh: 95,
        swingPathDeg: 36.5,
        faceAngleDeg: -1.2,
        aimAngleDeg: 8.4,
        incomingSpeedKmh: 52,
        incomingAngleDeg: -11,
        incomingSpinRpm: 1850,
        sidespinRpm: 400,
        targetSpeedKmh: 129,
        targetLaunchAngleDeg: 10.8,
        targetTopspinRpm: 3850
      },
      {
        side: 'B',
        titleZh: '#2 费德勒被动反手切削过渡',
        titleEn: '#2 Federer Defensive Slice',
        courtMode: 'singles',
        racketSpeedKmh: 63,
        swingPathDeg: -14.0,
        faceAngleDeg: 5.5,
        aimAngleDeg: 4.5,
        sidespinRpm: -260,
        targetSpeedKmh: 102,
        targetLaunchAngleDeg: 4.4,
        targetTopspinRpm: -1550
      },
      {
        side: 'A',
        titleZh: '#3 纳达尔重旋大对角突袭 [挑战拍]',
        titleEn: '#3 Nadal Heavy Whip Winner [Challenge]',
        courtMode: 'singles',
        racketSpeedKmh: 96.0,
        swingPathDeg: 36.5,
        faceAngleDeg: -1.4,
        aimAngleDeg: 8.2,
        sidespinRpm: 420,
        targetSpeedKmh: 131,
        targetLaunchAngleDeg: 10.4,
        targetTopspinRpm: 3900
      }
    ]
  },

  djokovic_wardlaw_dtl: {
    id: 'djokovic_wardlaw_dtl',
    badgeZh: '名场面 03 // 沃德洛变线法则',
    badgeEn: 'MASTERCLASS 03 // WARDLAW DTL REDIRECT',
    titleZh: '2019 温网决赛：德约科维奇「斜线相持耐心蓄力 + 借力变直线」',
    titleEn: '2019 Wimbledon Final: Djokovic Cross-Court Patience + DTL Redirect',
    surfaceKey: 'grass',
    playerAZh: 'R. Federer (近端 A)',
    playerBZh: 'N. Djokovic (远端 B)',
    playerAEn: 'R. Federer (Near A)',
    playerBEn: 'N. Djokovic (Far B)',
    principleZh:
      '【战术核心：保罗·沃德洛方向法则 (Wardlaw Directionals)】斜线对角线比直线长 1.4 米且球网中心最低（0.914m vs 边线 1.00m）。前两拍通过斜线相持把对手吸在单打边线外；第3拍（决胜拍，远端德约 B）迎着对手斜线来球，借力直线变线（水平角 -2.8°），同时压低出球仰角（约 5.8°~6.5°）以弥补直线距离较短的几何限制。',
    principleEn:
      '[Tactical Core: Wardlaw Directionals] Cross-court offers +1.4m extra court length and a lower net center (0.914m vs 1.00m). After pinning the opponent wide cross-court, redirect Shot #3 Down-the-Line (-2.8°) with a lower launch angle (5.8°..6.5°) so it stays inside the shorter baseline!',
    challengeHintZh:
      '【实操挑战】当前第3拍（远端德约 B）仍在回打斜线（+6.5°）且仰角偏高。请将【水平出球方向角】改为直线走廊（约 -2.2° ~ -3.6°），并压低【触球拍面倾角 / 过网仰角】让球精准落在直线深区靶框内！',
    challengeHintEn:
      '[Interactive Challenge] Shot #3 (Player B) is currently aimed back cross-court (+6.5°) and too high. Change Horizontal Aim to Down-the-Line (-2.2° to -3.6°) and lower Launch Angle (~6.2°) to hit the DTL corridor target!',
    challengeTurnIndex: 2,
    targetZone: {
      side: 'B',
      localX: 8.2,
      localY: -2.85,
      rx: 1.95,
      ry: 1.05,
      minSpeedKmh: 132,
      minSpinRpm: 2200,
      maxSpinRpm: 3600
    },
    proSolution: {
      racketSpeedKmh: 92.5,
      swingPathDeg: 24.5,
      faceAngleDeg: -1.4,
      aimAngleDeg: -2.2,
      targetSpeedKmh: 138,
      targetLaunchAngleDeg: 7.4,
      targetTopspinRpm: 2750
    },
    challengeStart: {
      racketSpeedKmh: 89.0,
      swingPathDeg: 26.5,
      faceAngleDeg: 0.4,
      aimAngleDeg: 6.5,
      targetSpeedKmh: 136,
      targetLaunchAngleDeg: 9.2,
      targetTopspinRpm: 2600
    },
    turns: [
      {
        side: 'A',
        titleZh: '#1 费德勒正手大斜线相持',
        titleEn: '#1 Federer Cross-Court Drive',
        courtMode: 'singles',
        hitX: -11.75,
        hitY: -1.65,
        hitZ: 1.06,
        racketSpeedKmh: 92,
        swingPathDeg: 25.5,
        faceAngleDeg: -2.0,
        aimAngleDeg: 7.4,
        incomingSpeedKmh: 54,
        incomingAngleDeg: -10,
        incomingSpinRpm: 1800,
        sidespinRpm: 220,
        targetSpeedKmh: 138,
        targetLaunchAngleDeg: 6.6,
        targetTopspinRpm: 2900
      },
      {
        side: 'B',
        titleZh: '#2 德约科维奇深区斜线压制',
        titleEn: '#2 Djokovic Deep Cross-Court',
        courtMode: 'singles',
        racketSpeedKmh: 90,
        swingPathDeg: 24.5,
        faceAngleDeg: -2.2,
        aimAngleDeg: 6.2,
        sidespinRpm: 180,
        targetSpeedKmh: 135,
        targetLaunchAngleDeg: 6.8,
        targetTopspinRpm: 2750
      },
      {
        side: 'A',
        titleZh: '#3 费德勒继续斜线拉扯',
        titleEn: '#3 Federer Cross-Court Rally',
        courtMode: 'singles',
        racketSpeedKmh: 93,
        swingPathDeg: 26.0,
        faceAngleDeg: -2.2,
        aimAngleDeg: 7.8,
        sidespinRpm: 240,
        targetSpeedKmh: 140,
        targetLaunchAngleDeg: 6.4,
        targetTopspinRpm: 2950
      },
      {
        side: 'B',
        titleZh: '#4 德约借力突袭变直线 [挑战拍]',
        titleEn: '#4 Djokovic DTL Redirect [Challenge]',
        courtMode: 'singles',
        racketSpeedKmh: 92.5,
        swingPathDeg: 24.5,
        faceAngleDeg: -1.4,
        aimAngleDeg: -2.2,
        sidespinRpm: 140,
        targetSpeedKmh: 138,
        targetLaunchAngleDeg: 7.4,
        targetTopspinRpm: 2750
      }
    ]
  },

  alcaraz_drop_shot: {
    id: 'alcaraz_drop_shot',
    badgeZh: '名场面 04 // 纵深撕扯放小球',
    badgeEn: 'MASTERCLASS 04 // DEPTH & DROP SHOT',
    titleZh: '2023 温网决赛：阿尔卡拉斯「重炮逼退底线 + 突然切削放小球」',
    titleEn: '2023 Wimbledon Final: Alcaraz Heavy Drive + Disguised Drop Shot',
    surfaceKey: 'grass',
    playerAZh: 'C. Alcaraz (近端 A)',
    playerBZh: 'N. Djokovic (远端 B)',
    playerAEn: 'C. Alcaraz (Near A)',
    playerBEn: 'N. Djokovic (Far B)',
    principleZh:
      '【战术核心：纵深空间撕扯 (Longitudinal Manipulation)】第1拍阿尔卡拉斯用 140 km/h 重炮将德约逼退至底线后方 2 米；第2拍对手回球偏短；第3拍（决胜拍）阿尔卡拉斯在相同引拍动作下突然减力打开拍面（挥速 ~42 km/h，下旋 -1650 RPM），让球柔和越过球网后迅速死跳在发球线前（X = 2.5m ~ 4.8m）！',
    principleEn:
      '[Tactical Core: Longitudinal Depth Tear] Shot #1 pushes Djokovic 2m behind the baseline with heavy pace. On Shot #3, disguise a soft underspin Drop Shot (speed ~62 km/h, backspin -1650 RPM) so the ball lands short inside the service box (X = 2.5m..4.8m) and dies on the grass!',
    challengeHintZh:
      '【实操挑战】当前第3拍仍是常规底线抽球（135 km/h 上旋），球会直接送到对手手里。请大幅降低【出球初速度】（至 56~72 km/h）并切换为【切削下旋】（RPM 调至 -1200 ~ -2000 RPM），让球落在网前浅区金色靶圈内！',
    challengeHintEn:
      '[Interactive Challenge] Shot #3 is currently a deep drive (135 km/h). Reduce Launch Speed to 56..72 km/h and dial in Backspin (-1200 to -2000 RPM) so the ball drops inside the short front-court target zone!',
    challengeTurnIndex: 2,
    targetZone: {
      side: 'A',
      localX: 4.1,
      localY: 1.55,
      rx: 1.75,
      ry: 1.25,
      minSpeedKmh: 52,
      maxSpeedKmh: 78,
      minSpinRpm: -2800,
      maxSpinRpm: -600
    },
    proSolution: {
      racketSpeedKmh: 38.0,
      swingPathDeg: -16.0,
      faceAngleDeg: 11.2,
      aimAngleDeg: 5.8,
      targetSpeedKmh: 62,
      targetLaunchAngleDeg: 10.6,
      targetTopspinRpm: -1650
    },
    challengeStart: {
      racketSpeedKmh: 91.0,
      swingPathDeg: 25.0,
      faceAngleDeg: -2.0,
      aimAngleDeg: 6.2,
      targetSpeedKmh: 135,
      targetLaunchAngleDeg: 6.8,
      targetTopspinRpm: 2800
    },
    turns: [
      {
        side: 'A',
        titleZh: '#1 阿尔卡拉斯重炮深区压迫',
        titleEn: '#1 Alcaraz Heavy Deep Drive',
        courtMode: 'singles',
        hitX: -11.70,
        hitY: -1.60,
        hitZ: 1.08,
        racketSpeedKmh: 95,
        swingPathDeg: 27.5,
        faceAngleDeg: -2.1,
        aimAngleDeg: 7.5,
        incomingSpeedKmh: 55,
        incomingAngleDeg: -10,
        incomingSpinRpm: 1850,
        sidespinRpm: 260,
        targetSpeedKmh: 141,
        targetLaunchAngleDeg: 6.8,
        targetTopspinRpm: 3200
      },
      {
        side: 'B',
        titleZh: '#2 德约底线退后中路过渡',
        titleEn: '#2 Djokovic Deep Baseline Neutralizer',
        courtMode: 'singles',
        racketSpeedKmh: 84,
        swingPathDeg: 23.0,
        faceAngleDeg: -1.6,
        aimAngleDeg: 3.8,
        sidespinRpm: 140,
        targetSpeedKmh: 126,
        targetLaunchAngleDeg: 7.4,
        targetTopspinRpm: 2550
      },
      {
        side: 'A',
        titleZh: '#3 阿尔卡拉斯突然切削放小球 [挑战拍]',
        titleEn: '#3 Alcaraz Disguised Drop Shot [Challenge]',
        courtMode: 'singles',
        racketSpeedKmh: 38.0,
        swingPathDeg: -16.0,
        faceAngleDeg: 11.2,
        aimAngleDeg: 5.8,
        sidespinRpm: -220,
        targetSpeedKmh: 62,
        targetLaunchAngleDeg: 10.6,
        targetTopspinRpm: -1650
      }
    ]
  }
};

TACTICAL_LESSONS.djokovic_wardlaw_dtl.challengeTurnIndex = 3;

/**
 * Evaluates the user's current shot against the active Tactical Lesson's target zone & physics criteria.
 * Returns `{ score, passed, distErrM, feedbackZh, feedbackEn }`.
 */
export function evaluateTacticalAttempt(lesson, turnIndex, state, simResult) {
  if (!lesson || turnIndex !== lesson.challengeTurnIndex || !simResult) {
    return null;
  }

  const tz = lesson.targetZone;
  const b = simResult.firstBounce;

  if (simResult.hitNet || !b || b.localX <= 0) {
    return {
      score: 15,
      passed: false,
      feedbackZh: '球挂网了！请适当调高【触球拍面倾角】或【过网仰角】，确保安全过网。',
      feedbackEn: 'Net error! Increase Face Tilt or Launch Angle to clear the net cord.'
    };
  }

  if (!b.isIn) {
    return {
      score: 28,
      passed: false,
      feedbackZh: `球出界了（${b.callTextZh}）！请稍微压低拍面倾角、增加上旋或微调水平方向角。`,
      feedbackEn: `Shot went ${b.callTextEn}! Close the racket face slightly, add topspin, or adjust horizontal aim.`
    };
  }

  const normDx = (b.localX - tz.localX) / tz.rx;
  const normDy = (b.localY - tz.localY) / tz.ry;
  const radialNorm = Math.hypot(normDx, normDy);
  const inZone = radialNorm <= 1.05;

  let speedOk = true;
  let spinOk = true;
  const tipsZh = [];
  const tipsEn = [];

  if (radialNorm > 1.05) {
    if (b.localY < tz.localY - tz.ry * 0.7) {
      tipsZh.push('落点偏右，请向【左(+)】调大水平方向角');
      tipsEn.push('Landing too far right — increase Horizontal Aim (L+)');
    } else if (b.localY > tz.localY + tz.ry * 0.7) {
      tipsZh.push('落点偏左，请向【右(-)】调小水平方向角');
      tipsEn.push('Landing too far left — adjust Horizontal Aim (R-)');
    }
    if (b.localX < tz.localX - tz.rx * 0.7) {
      tipsZh.push('落点偏浅，请提高出球速度或仰角');
      tipsEn.push('Landing too short — increase speed or launch angle');
    } else if (b.localX > tz.localX + tz.rx * 0.7) {
      tipsZh.push('落点过深偏离靶心，请降低球速或仰角');
      tipsEn.push('Landing too deep past target — reduce speed or angle');
    }
  }

  if (tz.minSpeedKmh !== undefined && state.speedKmh < tz.minSpeedKmh) {
    speedOk = false;
    tipsZh.push(`球速需 ≥${tz.minSpeedKmh} km/h（当前 ${state.speedKmh.toFixed(0)} km/h）`);
    tipsEn.push(`Need speed >= ${tz.minSpeedKmh} km/h (currently ${state.speedKmh.toFixed(0)})`);
  }
  if (tz.maxSpeedKmh !== undefined && state.speedKmh > tz.maxSpeedKmh) {
    speedOk = false;
    tipsZh.push(`放小球球速需 ≤${tz.maxSpeedKmh} km/h（当前 ${state.speedKmh.toFixed(0)} km/h）`);
    tipsEn.push(`Drop shot speed must be <= ${tz.maxSpeedKmh} km/h`);
  }
  if (tz.minSpinRpm !== undefined && state.topspinRpm < tz.minSpinRpm) {
    spinOk = false;
    tipsZh.push(`上旋需 ≥${tz.minSpinRpm} RPM（当前 ${Math.round(state.topspinRpm)} RPM）`);
    tipsEn.push(`Need spin >= ${tz.minSpinRpm} RPM`);
  }
  if (tz.maxSpinRpm !== undefined && state.topspinRpm > tz.maxSpinRpm) {
    spinOk = false;
    tipsZh.push(`切削下旋需 ≤${tz.maxSpinRpm} RPM（当前 ${Math.round(state.topspinRpm)} RPM）`);
    tipsEn.push(`Need backspin <= ${tz.maxSpinRpm} RPM`);
  }

  const posScore = Math.max(0, Math.round(70 * Math.exp(-0.55 * radialNorm * radialNorm)));
  const spdBonus = speedOk ? 15 : 4;
  const spnBonus = spinOk ? 15 : 4;
  const totalScore = Math.min(100, posScore + spdBonus + spnBonus);
  const passed = inZone && speedOk && spinOk;

  if (passed) {
    return {
      score: Math.max(88, totalScore),
      passed: true,
      feedbackZh: `战术完美达成（${Math.max(88, totalScore)}分）！落点精准命中金色制胜靶区，球速与旋转完全符合 ATP 实战标准！`,
      feedbackEn: `Tactical Masterclass Passed (${Math.max(88, totalScore)}/100)! Bullseye hit with tour-grade pace & spin!`
    };
  }

  return {
    score: totalScore,
    passed: false,
    feedbackZh: `当前评分 ${totalScore}分 · 教练建议：${tipsZh.join('；') || '微调角度与球速以更贴近金色靶心'}`,
    feedbackEn: `Score ${totalScore}/100 · Coach Tip: ${tipsEn.join('; ') || 'Fine-tune aim and speed toward the Gold Bullseye'}`
  };
}
