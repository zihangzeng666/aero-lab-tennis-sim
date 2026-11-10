/**
 * AERO-LAB physics core: ball flight, court bounce and racket-ball impact.
 *
 * This is a teaching simulator. The aerodynamic force model uses published
 * curve fits; the impact and bounce models follow Rod Cross's rigid-body
 * treatment; several remaining constants are plain assumptions and are listed
 * in MODEL_ASSUMPTIONS below (and in README.md) so they are easy to audit.
 *
 * Coordinates (canonical hitter frame, metres):
 *   x: along the court, from the hitter's baseline (-11.885) towards the net (0)
 *      and the far baseline (+11.885)
 *   y: across the court, positive to the hitter's left
 *   z: up, ground at z = 0
 * Player B hits in the mirrored frame: world (x, y) = (-x_local, -y_local).
 *
 * References (see README.md for full citations):
 *   - A. Štěpánek (1988), Am. J. Phys. 56, 138 — C_D / C_L curve fits vs spin ratio
 *   - S. Goodwill, S. Chin, S. Haake (2004), J. Wind Eng. Ind. Aerodyn. 92, 935 — wind-tunnel C_D
 *   - R. Cross & C. Lindsey (2014), Sports Engineering — in-flight C_D ≈ 0.51
 *   - H. Brody, R. Cross, C. Lindsey, The Physics and Technology of Tennis (2002) — impact, e_A, bounce
 *   - ITF Rules of Tennis, Appendix I — court dimensions and ball rebound specification
 */

export const ITF_COURT = {
  length: 23.77,              // Total court length (m) -> x from -11.885 to +11.885
  halfLength: 11.885,         // Baseline distance from net (m), to the outer edge of the baseline
  doublesWidth: 10.97,        // Doubles width (m) -> y from -5.485 to +5.485
  halfDoublesWidth: 5.485,
  singlesWidth: 8.23,         // Singles width (m) -> y from -4.115 to +4.115
  halfSinglesWidth: 4.115,
  serviceLineDist: 6.40,      // Service line distance from net (m)
  netHeightCenter: 0.914,     // 3.0 ft at centre (m)
  netHeightPost: 1.07,        // 3.5 ft at posts / singles sticks (m)
  netPostOffset: 0.914,       // Posts (or singles sticks) sit 0.914 m outside the sideline
  lineWidth: 0.05,            // Side, service and centre-service lines: 5 cm
  baselineWidth: 0.10,        // Baseline: up to 10 cm
  ballRadius: 0.0335,         // 6.7 cm diameter -> 3.35 cm radius
  ballMass: 0.0577            // 57.7 g (kg)
};

/**
 * Court surfaces. `cor` = vertical coefficient of restitution of the bounce,
 * `mu` = sliding friction coefficient, `eTangential` = tangential restitution
 * once the ball grips. These are ASSUMED values, not measurements of a
 * particular court:
 *   - `cor` is calibrated so the ITF drop test (254 cm drop, 135–147 cm
 *     rebound, i.e. COR ≈ 0.76–0.79 including drag) lands inside the band for
 *     every surface, with clay > hard > grass in bounce height.
 *   - `mu` and `eTangential` set the slow / medium / fast character, checked
 *     with courtPaceIndex() on the validation page.
 */
export const COURT_SURFACES = {
  hard: {
    nameZh: '硬地 (Hard Court)',
    nameEn: 'Hard Court',
    cor: 0.78,
    mu: 0.70,
    eTangential: 0.15,
    courtColor: 0x1d4ed8,
    surroundColor: 0x1e3a5f
  },
  clay: {
    nameZh: '红土 (Clay Court)',
    nameEn: 'Clay Court',
    cor: 0.785,
    mu: 0.80,
    eTangential: 0.22,
    courtColor: 0xb8522a,
    surroundColor: 0x8f3d1e
  },
  grass: {
    nameZh: '草地 (Grass Court)',
    nameEn: 'Grass Court',
    cor: 0.765,
    mu: 0.56,
    eTangential: 0.10,
    courtColor: 0x2d6a3e,
    surroundColor: 0x215230
  }
};

/**
 * Every tunable constant in the model, in one place.
 * `source` says where a value comes from; "assumption" means it was chosen by
 * hand and has not been fitted to data.
 */
export const MODEL_ASSUMPTIONS = {
  integrator: {
    dt: 0.002, // s — fixed RK4 step (500 Hz); net and bounce events are located exactly inside a step
    maxTime: 4.5,
    source: 'numerical choice; see validation.html for the convergence study'
  },
  aero: {
    // C_D = cdBase + 1 / (22.5 + 4.2 * (v / v_spin)^2.5)^0.4
    // C_L = 1 / (2.022 + 0.981 * v / v_spin),   v_spin = R * |omega|
    cdBase: 0.55,
    source:
      'functional form and constants from Štěpánek (1988); base C_D raised from 0.508 to 0.55 (assumption, inside the ~0.5–0.6 range reported for new balls)'
  },
  spinDecayPerSecond: { value: 0.015, source: 'assumption: exponential spin decay, rate 0.015 /s (about 1.5 % per second of flight)' },
  ballInertiaFactor: { value: 0.55, source: 'I = 0.55 m R^2 for a thin-walled pressurised ball (Cross)' },
  racket: {
    // Apparent COR e_A and tangential restitution e_T vary linearly with string tension.
    eA: { at24kg: 0.415, perKgLooser: 0.0028, min: 0.36, max: 0.48 },
    eT: { at24kg: 0.165, perKgLooser: 0.0045, min: 0.05, max: 0.28 },
    stringFriction: 0.48,
    source:
      'e_A ≈ 0.4 near the centre of the strings is typical (Brody / Cross / Lindsey); the tension slope, e_T and string friction are assumptions. e_A does NOT depend on impact location, swing weight or ball speed in this model.'
  },
  stringbedEstimates: {
    // Shown in the UI as rough estimates only — not solved from a string-bed model.
    dwellMs: { base: 4.9, perKgTension: -0.11, perKmhLaunch: 0.004, min: 3.6, max: 6.4 },
    deflectionMm: { perKmhLaunch: 0.092, min: 5.5, max: 22.5 },
    source: 'empirical linear formulas (assumption); dwell ≈ 4–6 ms is the commonly quoted range'
  },
  bounce: {
    sidespinRetention: { value: 0.85, source: 'assumption' },
    source:
      'Cross rigid-body bounce: slide-or-grip with friction mu and tangential restitution; vertical COR is constant (it does not fall with impact speed here)'
  },
  netCord: {
    // Ball clipping the tape and dribbling over
    vxFactor: 0.42,
    vyFactor: 0.65,
    spinFactor: 0.5,
    source: 'assumption — a cosmetic net-cord model, not a contact simulation'
  }
};

/** Integrator step used by simulateTrajectory (s). */
export const SIM_DT = MODEL_ASSUMPTIONS.integrator.dt;

/**
 * Air density from temperature and altitude (dry air, ideal gas, ISA pressure lapse).
 * 20 °C at sea level -> 1.204 kg/m^3.
 */
export function airDensityFromConditions(temperatureC = 20, altitudeM = 0) {
  const p = 101325 * Math.pow(1 - 2.25577e-5 * altitudeM, 5.25588);
  return p / (287.058 * (temperatureC + 273.15));
}

/** Štěpánek-form drag and lift coefficients for speed v (m/s) and spin speed vSpin = R*|omega|. */
export function aeroCoefficients(v, vSpin) {
  const cdBase = MODEL_ASSUMPTIONS.aero.cdBase;
  if (vSpin <= 0.05 || v <= 1e-6) return { cd: cdBase, cl: 0 };
  const ratio = v / vSpin;
  return {
    cd: cdBase + 1.0 / Math.pow(22.5 + 4.2 * Math.pow(ratio, 2.5), 0.4),
    cl: 1.0 / (2.022 + 0.981 * ratio)
  };
}

/**
 * Court Pace Index in the form often quoted for Hawk-Eye's CPI:
 *   CPI = 100 (1 - mu) + 150 (0.81 - e)
 * Used only as a sanity check that the assumed surface parameters rank
 * clay < hard < grass. It is not the ITF's official Court Pace Rating test.
 */
export function courtPaceIndex(surface) {
  return 100 * (1 - surface.mu) + 150 * (0.81 - surface.cor);
}

/**
 * Net height at lateral position y. With singles sticks the 1.07 m post height
 * is reached 0.914 m outside the singles sideline; otherwise at the doubles posts.
 */
export function getNetHeightAtY(y, isSinglesOnlyPosts = false) {
  const postY = isSinglesOnlyPosts
    ? ITF_COURT.halfSinglesWidth + ITF_COURT.netPostOffset
    : ITF_COURT.halfDoublesWidth + ITF_COURT.netPostOffset;
  const absY = Math.abs(y);
  if (absY > postY) return 0;
  const ratio = Math.min(1, absY / postY);
  return ITF_COURT.netHeightCenter + (ITF_COURT.netHeightPost - ITF_COURT.netHeightCenter) * ratio;
}

function racketRestitution(stringTensionKg) {
  const { eA: a, eT: b } = MODEL_ASSUMPTIONS.racket;
  const looser = 24 - stringTensionKg;
  return {
    eA: Math.max(a.min, Math.min(a.max, a.at24kg + looser * a.perKgLooser)),
    eT: Math.max(b.min, Math.min(b.max, b.at24kg + looser * b.perKgLooser))
  };
}

/**
 * Racket-ball oblique impact in the vertical (x-z) plane.
 * The racket is a moving rigid surface whose effective mass is folded into the
 * apparent COR e_A, so v_out,n = (1 + e_A) v_racket,n + e_A v_in,n.
 * Tangential: the contact patch either grips (tangential restitution e_T) or
 * slides (friction-limited), following Cross's rigid-body impact model.
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

  const { eA, eT } = racketRestitution(stringTensionKg);

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
  const alpha = MODEL_ASSUMPTIONS.ballInertiaFactor.value;

  const omega_in = -(inSpin * 2 * Math.PI) / 60;
  const Vn_out = eA * Math.max(0, Vn_in);

  const vPatchIn = Vt_in + R * omega_in;
  const deltaVtIdeal = -((1 + eT) * alpha / (1 + alpha)) * vPatchIn;
  const maxDeltaVt = MODEL_ASSUMPTIONS.racket.stringFriction * (1 + eA) * Math.max(0, Vn_in);
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
 * Forward racket-ball impact: launch speed, elevation and topspin from racket +
 * incoming-ball parameters. Horizontal aim and sidespin are passed through
 * unchanged (the impact is solved in the vertical plane only).
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

  const est = MODEL_ASSUMPTIONS.stringbedEstimates;
  const dwellTimeMs = Math.max(
    est.dwellMs.min,
    Math.min(
      est.dwellMs.max,
      est.dwellMs.base +
        (stringTensionKg - 23) * est.dwellMs.perKgTension +
        (actual.launchSpeedKmh - 120) * est.dwellMs.perKmhLaunch
    )
  );
  const stringDeflectionMm = Math.max(
    est.deflectionMm.min,
    Math.min(
      est.deflectionMm.max,
      actual.launchSpeedKmh * est.deflectionMm.perKmhLaunch * (23 / Math.max(15, stringTensionKg))
    )
  );

  return {
    launchSpeedKmh: actual.launchSpeedKmh,
    launchAngleDeg: actual.launchAngleDeg,
    aimAngleDeg,
    topspinRpm: actual.topspinRpm,
    eA: actual.eA,
    apparentCor: actual.eA,
    eT: actual.eT,
    attackAngleDeg: swingPathDeg - faceAngleDeg,
    activePowerKmh,
    borrowedPowerKmh,
    // Rough empirical estimates (MODEL_ASSUMPTIONS.stringbedEstimates) — not solved quantities.
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
 * Inverse racket-ball impact: finds racket speed, swing path and face angle that
 * produce a target launch speed / angle / topspin (damped Newton iteration on a
 * 3x3 finite-difference Jacobian).
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

  const evalAt = (a, b, c) =>
    evaluateSingleImpact(a, b, c, incomingSpeedKmh, incomingAngleDeg, incomingSpinRpm, stringTensionKg);

  for (let iter = 0; iter < 12; iter++) {
    const c0 = evalAt(vr, sw, fa);
    const es = targetSpeedKmh - c0.launchSpeedKmh;
    const ea = targetLaunchAngleDeg - c0.launchAngleDeg;
    const er = targetTopspinRpm - c0.topspinRpm;

    if (Math.abs(es) < 0.05 && Math.abs(ea) < 0.02 && Math.abs(er) < 3) {
      break;
    }

    const cVr = evalAt(vr + 0.5, sw, fa);
    const cSw = evalAt(vr, sw + 0.25, fa);
    const cFa = evalAt(vr, sw, fa + 0.25);

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
 * Visual-only preview of the incoming ball for t in [-0.35 s, 0] (simple
 * ballistic arc, no drag). Used to draw the approach; not part of the physics.
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

/* ------------------------------------------------------------------------- */
/* Flight integrator                                                          */
/* ------------------------------------------------------------------------- */

/**
 * Builds the acceleration function for the given environment.
 * Drag:   a_D = -(1/2m) rho A C_D |v_rel| v_rel
 * Magnus: a_L =  (1/2m) rho A C_L |v_rel|^2 (omega x v_rel)/|omega x v_rel|
 */
function makeAccelerationFn({ airDensity, windLocalX, windLocalY }) {
  const R = ITF_COURT.ballRadius;
  const m = ITF_COURT.ballMass;
  const area = Math.PI * R * R;
  const g = 9.80665;

  return function accel(vx, vy, vz, wx, wy, wz) {
    const vrx = vx - windLocalX;
    const vry = vy - windLocalY;
    const vrz = vz;
    const vRel = Math.hypot(vrx, vry, vrz);

    if (vRel < 1e-4 || airDensity <= 0) {
      return { ax: 0, ay: 0, az: -g, cd: MODEL_ASSUMPTIONS.aero.cdBase, cl: 0, fDrag: 0, fMagnus: 0 };
    }

    const { cd, cl } = aeroCoefficients(vRel, R * Math.hypot(wx, wy, wz));
    const dynPressureArea = 0.5 * airDensity * area * vRel * vRel;
    const dragFactor = (0.5 * airDensity * area * cd * vRel) / m;

    const cx = wy * vrz - wz * vry;
    const cy = wz * vrx - wx * vrz;
    const cz = wx * vry - wy * vrx;
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
      ax: -dragFactor * vrx + axMag,
      ay: -dragFactor * vry + ayMag,
      az: -g - dragFactor * vrz + azMag,
      cd,
      cl,
      fDrag: dynPressureArea * cd,
      fMagnus: dynPressureArea * cl
    };
  };
}

/**
 * One classical RK4 step of size h. Spin follows d(omega)/dt = -k omega exactly
 * (omega(t) = omega_0 e^{-k t}) and each RK4 stage sees the spin at its own stage
 * time, so the whole update stays 4th-order accurate.
 */
function rk4Step(s, h, accel, spinDecay) {
  const { vx, vy, vz, wx, wy, wz } = s;
  const fHalf = Math.exp(-spinDecay * 0.5 * h);
  const fEnd = fHalf * fHalf;
  const hwx = wx * fHalf, hwy = wy * fHalf, hwz = wz * fHalf;
  const k1 = accel(vx, vy, vz, wx, wy, wz);
  const v2x = vx + 0.5 * h * k1.ax, v2y = vy + 0.5 * h * k1.ay, v2z = vz + 0.5 * h * k1.az;
  const k2 = accel(v2x, v2y, v2z, hwx, hwy, hwz);
  const v3x = vx + 0.5 * h * k2.ax, v3y = vy + 0.5 * h * k2.ay, v3z = vz + 0.5 * h * k2.az;
  const k3 = accel(v3x, v3y, v3z, hwx, hwy, hwz);
  const v4x = vx + h * k3.ax, v4y = vy + h * k3.ay, v4z = vz + h * k3.az;
  const k4 = accel(v4x, v4y, v4z, wx * fEnd, wy * fEnd, wz * fEnd);
  return {
    x: s.x + (h / 6) * (vx + 2 * v2x + 2 * v3x + v4x),
    y: s.y + (h / 6) * (vy + 2 * v2y + 2 * v3y + v4y),
    z: s.z + (h / 6) * (vz + 2 * v2z + 2 * v3z + v4z),
    vx: vx + (h / 6) * (k1.ax + 2 * k2.ax + 2 * k3.ax + k4.ax),
    vy: vy + (h / 6) * (k1.ay + 2 * k2.ay + 2 * k3.ay + k4.ay),
    vz: vz + (h / 6) * (k1.az + 2 * k2.az + 2 * k3.az + k4.az),
    wx: wx * fEnd,
    wy: wy * fEnd,
    wz: wz * fEnd
  };
}

/**
 * Finds the sub-step h* in (0, h] where fn(state) crosses zero by re-integrating
 * from `s` with the Illinois (modified regula falsi) method. Each trial is a
 * full RK4 step, so the event state keeps RK4 accuracy instead of the O(dt^2)
 * error of linearly interpolating between grid points.
 */
function locateEvent(s, h, accel, spinDecay, fn, fEnd) {
  let lo = 0;
  let flo = fn(s);
  let hi = h;
  let fhi = fEnd;
  if (flo === 0) return { h: 0, state: { ...s } };
  let side = 0;
  let best = { h: hi, state: rk4Step(s, hi, accel, spinDecay) };
  for (let i = 0; i < 60; i++) {
    const c = (lo * fhi - hi * flo) / (fhi - flo);
    const sc = rk4Step(s, c, accel, spinDecay);
    const fc = fn(sc);
    best = { h: c, state: sc };
    if (Math.abs(fc) < 1e-12 || hi - lo < 1e-13) break;
    if (fc * fhi > 0) {
      hi = c;
      fhi = fc;
      if (side === -1) flo /= 2;
      side = -1;
    } else {
      lo = c;
      flo = fc;
      if (side === 1) fhi /= 2;
      side = 1;
    }
  }
  return best;
}

/**
 * Linear interpolation of a trajectory at time t (points need not be evenly spaced).
 */
export function samplePointAtTime(points, t) {
  if (!points || !points.length) return null;
  if (t <= points[0].t) return points[0];
  const last = points[points.length - 1];
  if (t >= last.t) return last;
  let lo = 0;
  let hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const a = points[lo];
  const b = points[hi];
  const span = b.t - a.t;
  if (span <= 0) return a;
  const f = (t - a.t) / span;
  const out = { ...a, t };
  for (const k of ['x', 'y', 'z', 'localX', 'localY', 'vx', 'vy', 'vz', 'speedKmh', 'rpm', 'spinAngleRad', 'cd', 'cl', 'fDrag', 'fMagnus']) {
    if (typeof a[k] === 'number' && typeof b[k] === 'number') out[k] = a[k] + (b[k] - a[k]) * f;
  }
  return out;
}

/**
 * Simulates the 3D flight of the ball with classical RK4 (dt = 2 ms by default),
 * including drag, Magnus lift, the net, two court bounces and the line call.
 * `side = 'A'` hits from -X to +X, `side = 'B'` from +X to -X.
 * Also computes the receiver's interception point for chained rallies.
 *
 * Environment: `temperatureC` (default 20) and `altitudeM` (default 0) set the air
 * density unless `airDensity` is given explicitly. `windSpeedKmh` blows along
 * world +X (towards the far baseline), `crossWindKmh` along world +Y.
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
    temperatureC = 20,
    altitudeM = 0,
    windSpeedKmh = 0,
    crossWindKmh = 0
  } = config;

  const dt = config.dt ?? SIM_DT;
  const maxTime = config.maxTime ?? MODEL_ASSUMPTIONS.integrator.maxTime;
  const airDensity = Number.isFinite(config.airDensity)
    ? config.airDensity
    : airDensityFromConditions(temperatureC, altitudeM);

  const sign = side === 'B' ? -1 : 1;
  const R = ITF_COURT.ballRadius;
  const surface = COURT_SURFACES[surfaceKey] || COURT_SURFACES.hard;
  const singlesSticks = courtMode !== 'doubles';
  const spinDecay = MODEL_ASSUMPTIONS.spinDecayPerSecond.value;

  const accel = makeAccelerationFn({
    airDensity,
    windLocalX: (sign * windSpeedKmh) / 3.6,
    windLocalY: (sign * crossWindKmh) / 3.6
  });

  const v0 = speedKmh / 3.6;
  const elevRad = (launchAngleDeg * Math.PI) / 180;
  const aimRad = (aimAngleDeg * Math.PI) / 180;
  const omegaTop = (topspinRpm * 2 * Math.PI) / 60;
  const omegaSide = -(sidespinRpm * 2 * Math.PI) / 60;

  // Topspin axis is horizontal and perpendicular to the initial aim direction.
  let S = {
    x: hitX,
    y: hitY,
    z: Math.max(R, hitZ),
    vx: v0 * Math.cos(elevRad) * Math.cos(aimRad),
    vy: v0 * Math.cos(elevRad) * Math.sin(aimRad),
    vz: v0 * Math.sin(elevRad),
    wx: -omegaTop * Math.sin(aimRad),
    wy: omegaTop * Math.cos(aimRad),
    wz: omegaSide
  };

  let t = 0;
  let phase = 0;
  let hitNet = false;
  let netClearanceM = null;
  let netPassPoint = null;
  let firstBounce = null;
  let secondBounce = null;
  let maxHeightM = S.z;
  let spinAngleRad = 0;
  const points = [];

  const pushPoint = () => {
    const a = accel(S.vx, S.vy, S.vz, S.wx, S.wy, S.wz);
    points.push({
      t,
      localX: S.x,
      localY: S.y,
      x: sign * S.x,
      y: sign * S.y,
      z: S.z,
      localVx: S.vx,
      localVy: S.vy,
      vx: sign * S.vx,
      vy: sign * S.vy,
      vz: S.vz,
      speedKmh: Math.hypot(S.vx, S.vy, S.vz) * 3.6,
      wx: sign * S.wx,
      wy: sign * S.wy,
      wz: S.wz,
      localWy: S.wy,
      rpm: (Math.hypot(S.wx, S.wy, S.wz) * 60) / (2 * Math.PI),
      spinAngleRad,
      phase,
      cd: a.cd,
      cl: a.cl,
      fDrag: a.fDrag,
      fMagnus: a.fMagnus
    });
  };

  pushPoint();

  const zAboveGround = (s) => s.z - R;
  const xPastNet = (s) => s.x;

  while (t < maxTime && phase < 2) {
    let next = rk4Step(S, dt, accel, spinDecay);
    let h = dt;
    let event = null;

    if (netClearanceM === null && S.x < 0 && next.x >= 0) {
      event = { type: 'net', ...locateEvent(S, dt, accel, spinDecay, xPastNet, next.x) };
    }
    if (S.z - R > -1e-12 && next.z <= R) {
      const loc = locateEvent(S, dt, accel, spinDecay, zAboveGround, next.z - R);
      if (!event || loc.h < event.h) event = { type: 'bounce', ...loc };
    }
    if (event) {
      next = event.state;
      h = event.h;
    }

    const prevVx = S.vx;
    S = next;
    t += h;
    spinAngleRad += Math.hypot(S.wx, S.wy, S.wz) * h;
    if (S.z > maxHeightM) maxHeightM = S.z;

    if (event && event.type === 'net') {
      const netH = getNetHeightAtY(S.y, singlesSticks);
      netClearanceM = S.z - R - netH;
      netPassPoint = { x: 0, y: sign * S.y, z: S.z, t, netHeightAtY: netH };

      const postLimit =
        (singlesSticks ? ITF_COURT.halfSinglesWidth : ITF_COURT.halfDoublesWidth) + ITF_COURT.netPostOffset;
      if (Math.abs(S.y) <= postLimit && S.z - R < netH) {
        hitNet = true;
        const nc = MODEL_ASSUMPTIONS.netCord;
        if (S.z > netH - 0.035 && phase === 0) {
          // Clips the tape and dribbles over.
          S.vx *= nc.vxFactor;
          S.vy *= nc.vyFactor;
          S.vz = Math.max(1.2, S.vz * 0.3 + 1.5);
          S.wx *= nc.spinFactor;
          S.wy *= nc.spinFactor;
        } else {
          // Stopped by the net; drops on the hitter's side.
          S.x = -R;
          S.z = Math.max(R, S.z);
          S.vx = -0.12 * prevVx;
          S.vy *= 0.15;
          S.vz = -0.5;
          S.wx *= 0.1;
          S.wy *= 0.1;
          S.wz *= 0.1;
        }
      }
    }

    if (event && event.type === 'bounce') {
      const bx = S.x;
      const by = S.y;
      const bvx = S.vx;
      const bvy = S.vy;
      const bvz = S.vz;
      const b = computeCourtBounce(bvx, bvy, bvz, S.wx, S.wy, S.wz, surface);
      S.vx = b.vx;
      S.vy = b.vy;
      S.vz = b.vz;
      S.wx = b.wx;
      S.wy = b.wy;
      S.wz = b.wz;
      S.z = R;

      if (phase === 0) {
        const judgment = evaluateBounceCall(bx, by, hitY, courtMode, hitNet);
        firstBounce = {
          localX: bx,
          localY: by,
          x: sign * bx,
          y: sign * by,
          z: R,
          t,
          speedBeforeKmh: Math.hypot(bvx, bvy, bvz) * 3.6,
          speedAfterKmh: Math.hypot(S.vx, S.vy, S.vz) * 3.6,
          impactAngleDeg: (Math.atan2(Math.abs(bvz), Math.hypot(bvx, bvy)) * 180) / Math.PI,
          reboundAngleDeg: (Math.atan2(S.vz, Math.hypot(S.vx, S.vy)) * 180) / Math.PI,
          rpmAfter: (Math.hypot(S.wx, S.wy, S.wz) * 60) / (2 * Math.PI),
          ...judgment
        };
        phase = 1;
      } else {
        secondBounce = { localX: bx, localY: by, x: sign * bx, y: sign * by, z: R, t };
        phase = 2;
      }
    }

    pushPoint();

    if (Math.abs(S.x) > 21 || Math.abs(S.y) > 12) {
      break;
    }
  }

  // Receiver's interception point (after the first bounce) for chained rallies.
  let interceptPoint = null;
  const postBouncePts = points.filter((p) => p.phase === 1 && p.localX > 2.5);
  if (postBouncePts.length > 4) {
    // Prefer a point after the post-bounce apex where the ball descends into a comfortable strike zone (~1.04 m).
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
    // Gameplay clamp: the receiver takes the ball in a controlled strike window.
    const clampedInAngle = Math.max(-13, Math.min(-5, rawInAngle < -2 ? rawInAngle : -9));
    const spinSign = bestPt.localWy >= 0 ? 1 : -1;
    const realisticPostBounceRpm = Math.max(
      -2200,
      Math.min(2400, Math.round((spinSign * Math.min(2350, bestPt.rpm * 0.62)) / 50) * 50)
    );

    const nextHitX = Math.round(Math.max(-12.9, Math.min(-9.8, -bestPt.localX)) * 20) / 20;
    const nextHitY = Math.round(Math.max(-3.8, Math.min(3.8, -bestPt.localY)) * 20) / 20;
    const nextHitZ = Math.round(Math.max(0.92, Math.min(1.18, bestPt.z)) * 50) / 50;

    // Trajectory point where the ball reaches the receiver's racket depth (-nextHitX)
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
      // Hand-off state in the NEXT hitter's canonical frame (rotated 180°):
      nextSide: side === 'A' ? 'B' : 'A',
      nextHitX,
      nextHitY,
      nextHitZ,
      nextIncomingSpeedKmh: Math.round(Math.max(42, Math.min(82, bestPt.speedKmh))),
      nextIncomingAngleDeg: Math.round(clampedInAngle * 2) / 2,
      nextIncomingSpinRpm: realisticPostBounceRpm
    };

    // In rally / tactics mode, stop the flight at the receiver's strings.
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
    airDensity,
    dt,
    totalDuration: points[points.length - 1].t
  };
}

/**
 * Rigid-body bounce (Cross): vertical COR, then the contact point either slides
 * for the whole impact (friction-limited impulse mu (1 + e) |v_z|) or grips and
 * rebounds tangentially with restitution eTangential — whichever impulse is smaller.
 */
export function computeCourtBounce(vx, vy, vz, wx, wy, wz, surface) {
  const R = ITF_COURT.ballRadius;
  const alpha = MODEL_ASSUMPTIONS.ballInertiaFactor.value;
  const { cor, mu, eTangential } = surface;

  const vzOut = cor * Math.abs(vz);
  // Contact-point velocity: v + omega x (0, 0, -R)
  const vcx = vx - wy * R;
  const vcy = vy + wx * R;
  const vcMag = Math.hypot(vcx, vcy);

  let vxOut = vx;
  let vyOut = vy;
  let wxOut = wx;
  let wyOut = wy;
  const wzOut = wz * MODEL_ASSUMPTIONS.bounce.sidespinRetention.value;

  if (vcMag > 1e-5) {
    const gripDeltaV = ((1 + eTangential) / (1 + 1 / alpha)) * vcMag;
    const slidingMaxDeltaV = mu * (1 + cor) * Math.abs(vz);
    const deltaV = Math.min(gripDeltaV, slidingMaxDeltaV);
    const dvx = -deltaV * (vcx / vcMag);
    const dvy = -deltaV * (vcy / vcMag);
    vxOut = vx + dvx;
    vyOut = vy + dvy;
    wxOut = wx + dvy / (alpha * R);
    wyOut = wy - dvx / (alpha * R);
  }

  return { vx: vxOut, vy: vyOut, vz: vzOut, wx: wxOut, wy: wyOut, wz: wzOut };
}

/**
 * Line call. Court dimensions are measured to the OUTER edge of the lines and
 * lines are part of the court, so a ball is IN when its mark touches any part
 * of a boundary line. Each boundary uses its own line width (10 cm baseline,
 * 5 cm elsewhere), so "LINE" calls are correct on the baseline too.
 */
export function evaluateBounceCall(bx, by, hitY, courtMode, hitNet) {
  const footprintRadius = 0.022; // half-width of the ball's mark on the court (assumption)

  if (bx < 0) {
    return {
      isIn: false,
      callTextZh: 'OUT (未过网)',
      callTextEn: 'OUT (NET)',
      callCode: 'NET',
      marginCm: Math.round(bx * 100)
    };
  }

  const isServe = courtMode === 'serve_deuce' || courtMode === 'serve_ad';
  const halfW = courtMode === 'doubles' ? ITF_COURT.halfDoublesWidth : ITF_COURT.halfSinglesWidth;
  const halfCentre = ITF_COURT.lineWidth * 0.5;

  let minY = -halfW;
  let maxY = halfW;
  if (courtMode === 'serve_deuce') {
    minY = -halfCentre; // the whole centre service line belongs to each box
  } else if (courtMode === 'serve_ad') {
    maxY = halfCentre;
  }

  // margin = how far the outer end of the mark is inside the outer edge of that boundary line
  const edges = [
    {
      margin: (isServe ? ITF_COURT.serviceLineDist : ITF_COURT.halfLength) + footprintRadius - bx,
      width: isServe ? ITF_COURT.lineWidth : ITF_COURT.baselineWidth
    },
    { margin: by - (minY - footprintRadius), width: ITF_COURT.lineWidth },
    { margin: maxY + footprintRadius - by, width: ITF_COURT.lineWidth }
  ];
  const [marginLong, marginRight, marginLeft] = edges.map((e) => e.margin);
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

  if (hitNet && isIn && isServe) {
    return {
      isIn: true,
      callTextZh: 'LET (擦网重发)',
      callTextEn: 'LET (NET CORD)',
      callCode: 'LET',
      marginCm: Math.round(minMarginM * 100 * 10) / 10
    };
  }

  if (isIn) {
    // The mark spans [margin - 2r, margin] measured inwards from the outer edge;
    // it touches the line while its inner end is still within the line width.
    const touchesLine = edges.some((e) => e.margin - 2 * footprintRadius < e.width);
    return {
      isIn: true,
      callTextZh: touchesLine ? 'IN · 压线 (LINE)' : 'IN (界内)',
      callTextEn: touchesLine ? 'IN · LINE' : 'IN (GOOD)',
      callCode: touchesLine ? 'LINE' : 'IN',
      marginCm: Math.round(minMarginM * 100 * 10) / 10
    };
  }

  const isWide = marginRight < marginLong || marginLeft < marginLong;
  const reasonZh = isWide ? 'WIDE (边线出界)' : 'LONG (底线出界)';
  const reasonEn = isWide ? 'WIDE' : 'LONG';
  return {
    isIn: false,
    callTextZh: `OUT · ${reasonZh}`,
    callTextEn: `OUT · ${reasonEn}`,
    callCode: 'OUT',
    marginCm: Math.round(Math.abs(minMarginM) * 100 * 10) / 10
  };
}

/**
 * Chains a turn-based rally in place: for each turn from `startIdx`, back-solves
 * the racket from the turn's target launch (if it has one), runs the impact and
 * flight, records the call, and hands the receiver's interception state to the
 * next turn. `env` carries surfaceKey / temperatureC / altitudeM / wind.
 */
export function chainRallyTurns(turns, startIdx = 0, env = {}) {
  for (let i = startIdx; i < turns.length; i++) {
    const turn = turns[i];
    const shouldSolve = turn.targetSpeedKmh !== undefined && (i > startIdx || (i === 0 && startIdx === 0));
    if (shouldSolve) {
      const solved = solveRacketFromTargetLaunch({
        targetSpeedKmh: turn.targetSpeedKmh,
        targetLaunchAngleDeg: turn.targetLaunchAngleDeg,
        targetTopspinRpm: turn.targetTopspinRpm,
        incomingSpeedKmh: turn.incomingSpeedKmh,
        incomingAngleDeg: turn.incomingAngleDeg,
        incomingSpinRpm: turn.incomingSpinRpm,
        stringTensionKg: turn.stringTensionKg ?? 23,
        hitZ: turn.hitZ
      });
      turn.racketSpeedKmh = solved.racketSpeedKmh;
      turn.swingPathDeg = solved.swingPathDeg;
      turn.faceAngleDeg = solved.faceAngleDeg;
    }

    const impact = computeRacketBallImpact(turn);
    turn.speedKmh = impact.launchSpeedKmh;
    turn.launchAngleDeg = impact.launchAngleDeg;
    turn.topspinRpm = impact.topspinRpm;

    const sim = simulateTrajectory({ ...turn, ...env });
    turn.callCode = sim.firstBounce ? (sim.firstBounce.isIn ? 'IN' : 'OUT') : 'OUT';
    turn.interceptPoint = sim.interceptPoint;

    if (i + 1 < turns.length && sim.interceptPoint) {
      const nextTurn = turns[i + 1];
      const ip = sim.interceptPoint;
      nextTurn.side = ip.nextSide;
      nextTurn.hitX = ip.nextHitX;
      nextTurn.hitY = ip.nextHitY;
      nextTurn.hitZ = ip.nextHitZ;
      nextTurn.incomingSpeedKmh = ip.nextIncomingSpeedKmh;
      nextTurn.incomingAngleDeg = ip.nextIncomingAngleDeg;
      nextTurn.incomingSpinRpm = ip.nextIncomingSpinRpm;
    }
  }
  return turns;
}
