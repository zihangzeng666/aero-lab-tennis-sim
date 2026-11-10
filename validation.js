/**
 * Validation page: runs physics.js live and renders convergence, analytic,
 * aerodynamic, bounce and impact checks. Every number shown is computed here.
 */
import {
  ITF_COURT,
  COURT_SURFACES,
  SIM_DT,
  simulateTrajectory,
  computeRacketBallImpact,
  aeroCoefficients,
  courtPaceIndex
} from './physics.js?v=16';
import { SHOT_PRESETS } from './presets.js?v=16';

const R = ITF_COURT.ballRadius;
const G = 9.80665;
const $ = (id) => document.getElementById(id);
const fmtE = (v) => (v === 0 ? '0' : v.toExponential(2));

function presetShot(p) {
  const imp = computeRacketBallImpact({ ...p, stringTensionKg: 23 });
  return { ...p, speedKmh: imp.launchSpeedKmh, launchAngleDeg: imp.launchAngleDeg, topspinRpm: imp.topspinRpm };
}

function table(headers, rows, numericCols = []) {
  const th = headers
    .map((h, i) => `<th class="${numericCols.includes(i) ? 'num' : ''}">${h}</th>`)
    .join('');
  const body = rows
    .map(
      (r) =>
        `<tr>${r.map((c, i) => `<td class="${numericCols.includes(i) ? 'num' : ''}">${c}</td>`).join('')}</tr>`
    )
    .join('');
  return `<table><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table>`;
}

function verdict(ok, okText = 'PASS', badText = 'CHECK') {
  return `<span class="verdict ${ok ? 'pass' : 'warn'}">${ok ? '✓ ' + okText : '△ ' + badText}</span>`;
}

/* -------------------------------------------------------------------------- */
/* Minimal SVG line chart with hover tooltips                                  */
/* -------------------------------------------------------------------------- */

function lineChart(container, { series, refLines = [], bands = [], xLog = false, yLog = false, xLabel, yLabel, xFmt, yFmt, yMin, yMax }) {
  const W = 760;
  const H = 340;
  const m = { l: 64, r: 96, t: 14, b: 46 };
  const tx = xLog ? Math.log10 : (v) => v;
  const ty = yLog ? Math.log10 : (v) => v;

  const allPts = series.flatMap((s) => s.points);
  const xs = allPts.map((p) => tx(p.x));
  const ys = allPts.map((p) => ty(p.y));
  let x0 = Math.min(...xs), x1 = Math.max(...xs);
  let y0 = yMin !== undefined ? ty(yMin) : Math.min(...ys);
  let y1 = yMax !== undefined ? ty(yMax) : Math.max(...ys);
  if (yLog) { y0 = Math.floor(y0); y1 = Math.ceil(y1); }
  if (xLog) { x0 = Math.floor(x0 * 2) / 2; x1 = Math.ceil(x1 * 2) / 2; }

  const sx = (v) => m.l + ((tx(v) - x0) / (x1 - x0)) * (W - m.l - m.r);
  const sy = (v) => H - m.b - ((ty(v) - y0) / (y1 - y0)) * (H - m.t - m.b);

  let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${yLabel} vs ${xLabel}">`;

  // grid + y ticks
  const yTicks = [];
  if (yLog) for (let e = y0; e <= y1; e++) yTicks.push(Math.pow(10, e));
  else {
    const step = niceStep((y1 - y0) / 5);
    for (let v = Math.ceil(y0 / step) * step; v <= y1 + 1e-9; v += step) yTicks.push(v);
  }
  for (const v of yTicks) {
    svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${sy(v)}" y2="${sy(v)}" stroke="var(--grid)" stroke-width="1"/>`;
    svg += `<text x="${m.l - 8}" y="${sy(v) + 4}" text-anchor="end">${yFmt ? yFmt(v) : v}</text>`;
  }
  // x ticks
  const xTicks = xLog
    ? series[0].points.map((p) => p.x)
    : (() => { const st = niceStep((x1 - x0) / 6); const out = []; for (let v = Math.ceil(x0 / st) * st; v <= x1 + 1e-9; v += st) out.push(v); return out; })();
  for (const v of xTicks) {
    svg += `<text x="${sx(v)}" y="${H - m.b + 18}" text-anchor="middle">${xFmt ? xFmt(v) : v}</text>`;
  }
  svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${H - m.b}" y2="${H - m.b}" stroke="var(--text-muted)" stroke-width="1"/>`;
  svg += `<text class="axis-title" x="${(m.l + W - m.r) / 2}" y="${H - 8}" text-anchor="middle">${xLabel}</text>`;
  svg += `<text class="axis-title" transform="translate(14 ${(m.t + H - m.b) / 2}) rotate(-90)" text-anchor="middle">${yLabel}</text>`;

  for (const b of bands) {
    svg += `<rect x="${sx(b.x0)}" width="${Math.max(6, sx(b.x1) - sx(b.x0))}" y="${sy(b.y1)}" height="${sy(b.y0) - sy(b.y1)}" fill="var(--text-muted)" opacity="0.18" rx="2"/>`;
  }
  for (const r of refLines) {
    svg += `<line x1="${sx(r.from.x)}" y1="${sy(r.from.y)}" x2="${sx(r.to.x)}" y2="${sy(r.to.y)}" stroke="var(--text-muted)" stroke-width="1.5" stroke-dasharray="5 4"/>`;
    if (r.label) svg += `<text class="dlabel" x="${sx(r.to.x) + 6}" y="${sy(r.to.y) + 4}">${r.label}</text>`;
  }
  series.forEach((s) => {
    const d = s.points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
    svg += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    if (s.markers) {
      for (const p of s.points) {
        svg += `<circle cx="${sx(p.x)}" cy="${sy(p.y)}" r="4" fill="${s.color}" stroke="var(--surface-1)" stroke-width="2"/>`;
      }
    }
    const last = s.points[s.points.length - 1];
    if (s.directLabel) svg += `<text class="dlabel" x="${sx(last.x) + 8}" y="${sy(last.y) + 4}">${s.name}</text>`;
  });
  // hover targets
  series.forEach((s, si) => {
    s.points.forEach((p, pi) => {
      if (!s.markers && pi % 4 !== 0) return;
      svg += `<circle class="hit" data-s="${si}" data-p="${pi}" cx="${sx(p.x)}" cy="${sy(p.y)}" r="11" fill="transparent"/>`;
    });
  });
  svg += '</svg>';

  container.innerHTML = svg + '<div class="tip"></div>';
  const tip = container.querySelector('.tip');
  const svgEl = container.querySelector('svg');
  container.querySelectorAll('.hit').forEach((c) => {
    c.addEventListener('pointerenter', () => {
      const s = series[+c.dataset.s];
      const p = s.points[+c.dataset.p];
      const rect = svgEl.getBoundingClientRect();
      const scale = rect.width / W;
      tip.textContent = `${s.name} · ${xLabel.split(' ')[0]} ${xFmt ? xFmt(p.x) : p.x} → ${yFmt ? yFmt(p.y) : p.y.toPrecision(3)}`;
      tip.style.left = `${+c.getAttribute('cx') * scale}px`;
      tip.style.top = `${+c.getAttribute('cy') * scale}px`;
      tip.style.opacity = '1';
    });
    c.addEventListener('pointerleave', () => { tip.style.opacity = '0'; });
  });
}

function niceStep(raw) {
  const e = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / e;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * e;
}

function legend(el, items) {
  el.innerHTML = items
    .map((it) => `<span><i class="${it.dash ? 'dash' : ''}" style="background:${it.color || 'transparent'}"></i>${it.name}</span>`)
    .join('');
}

/* -------------------------------------------------------------------------- */
/* 1. Convergence                                                              */
/* -------------------------------------------------------------------------- */

const DTS = [0.032, 0.016, 0.008, 0.004, 0.002, 0.001];
const CONV_SHOTS = [
  { key: 'alcaraz_fh', name: 'Topspin FH', color: 'var(--series-1)' },
  { key: 'shelton_serve', name: 'Flat serve', color: 'var(--series-2)' },
  { key: 'federer_slice', name: 'Slice', color: 'var(--series-3)' }
];

function landing(shot, dt) {
  const b = simulateTrajectory({ ...shot, dt }).firstBounce;
  return { x: b.localX, y: b.localY, t: b.t };
}

const convRows = [];
const convSeries = CONV_SHOTS.map((cs) => {
  const shot = presetShot(SHOT_PRESETS[cs.key]);
  const ref = landing(shot, 0.0001);
  const points = DTS.map((dt) => {
    const l = landing(shot, dt);
    const err = Math.max(1e-13, Math.hypot(l.x - ref.x, l.y - ref.y));
    return { x: dt * 1000, y: err };
  });
  points.forEach((p, i) => {
    const order = i ? Math.log2(points[i - 1].y / p.y) : null;
    convRows.push([cs.name, p.x.toFixed(0), fmtE(p.y), order === null ? '—' : order.toFixed(2)]);
  });
  return { name: cs.name, color: cs.color, points, markers: true };
});

// Slope-4 reference, drawn a factor 6 above the topspin forehand so it does not hide the data
const anchor = { x: convSeries[0].points[0].x, y: convSeries[0].points[0].y * 6 };
const refStart = { x: 2, y: anchor.y * Math.pow(2 / anchor.x, 4) };
legend($('convLegend'), [...convSeries, { name: 'slope 4', dash: true }]);
lineChart($('convChart'), {
  series: convSeries,
  refLines: [{ from: refStart, to: anchor, label: 'slope 4' }],
  xLog: true,
  yLog: true,
  xLabel: 'Δt (ms)',
  yLabel: 'landing error (m)',
  xFmt: (v) => `${v}`,
  yFmt: (v) => `1e${Math.round(Math.log10(v))}`
});
$('convTable').innerHTML = table(['shot', 'Δt (ms)', 'error (m)', 'observed order'], convRows, [1, 2, 3]);

const orders = convSeries.map((s) => Math.log2(s.points[1].y / s.points[2].y));
const minOrder = Math.min(...orders);
const errDefault = Math.max(...convSeries.map((s) => s.points[DTS.indexOf(SIM_DT)].y));
$('convNote').innerHTML =
  `在 Δt = 16 → 8 ms 区间观测到的收敛阶为 ${orders.map((o) => o.toFixed(2)).join(' / ')}。` +
  `默认步长 2 ms 下落点误差最大 ${fmtE(errDefault)} m，远小于 1 mm，所以步长不是误差来源，模型假设才是。` +
  `Δt ≤ 2 ms 时曲线变平，是浮点舍入误差（~1e-12 m）而不是截断误差。` +
  ` (Earlier versions interpolated the bounce linearly and froze spin within a step, which limited convergence to first order.)`;

/* -------------------------------------------------------------------------- */
/* 2. Vacuum check                                                             */
/* -------------------------------------------------------------------------- */

const vacCases = [
  { v: 15, ang: 20, z0: 1.0 },
  { v: 20, ang: 5, z0: 1.0 },
  { v: 10, ang: 45, z0: 2.6 }
];
const vacRows = vacCases.map(({ v, ang, z0 }) => {
  const a = (ang * Math.PI) / 180;
  const sim = simulateTrajectory({
    hitX: 0.5, hitY: 0, hitZ: z0, speedKmh: v * 3.6, launchAngleDeg: ang, aimAngleDeg: 0,
    topspinRpm: 0, sidespinRpm: 0, airDensity: 0
  });
  const vz = v * Math.sin(a);
  const tLand = (vz + Math.sqrt(vz * vz + 2 * G * (z0 - R))) / G;
  const xLand = 0.5 + v * Math.cos(a) * tLand;
  const ex = Math.abs(sim.firstBounce.localX - xLand);
  const et = Math.abs(sim.firstBounce.t - tLand);
  return [`${v} m/s, ${ang}°, z₀ = ${z0} m`, tLand.toFixed(6), sim.firstBounce.t.toFixed(6), fmtE(ex), fmtE(et), verdict(ex < 1e-9 && et < 1e-9)];
});
$('vacuumTable').innerHTML = table(
  ['case', 't analytic (s)', 't model (s)', '|Δx| (m)', '|Δt| (s)', ''],
  vacRows,
  [1, 2, 3, 4]
);

/* -------------------------------------------------------------------------- */
/* 3. Aero coefficients                                                        */
/* -------------------------------------------------------------------------- */

const S_VALUES = Array.from({ length: 61 }, (_, i) => i * 0.01);
const v = 30;
const cdPts = S_VALUES.map((S) => ({ x: S, y: aeroCoefficients(v, S * v).cd }));
const clPts = S_VALUES.map((S) => ({ x: S, y: aeroCoefficients(v, S * v).cl }));
const aeroSeries = [
  { name: 'C_D (model)', color: 'var(--series-1)', points: cdPts, directLabel: true },
  { name: 'C_L (model)', color: 'var(--series-2)', points: clPts, directLabel: true }
];
legend($('aeroLegend'), [...aeroSeries, { name: 'in-flight C_D 0.507 ± 0.024', color: 'var(--text-muted)' }]);
lineChart($('aeroChart'), {
  series: aeroSeries,
  bands: [{ x0: 0, x1: 0.012, y0: 0.483, y1: 0.531 }],
  xLabel: 'S = Rω/v',
  yLabel: 'coefficient',
  xFmt: (x) => x.toFixed(1),
  yFmt: (y) => y.toFixed(1),
  yMin: 0,
  yMax: 0.8
});
$('aeroTable').innerHTML = table(
  ['S', 'C_D', 'C_L'],
  [0, 0.05, 0.1, 0.2, 0.3, 0.4, 0.6].map((S) => {
    const c = aeroCoefficients(v, S * v);
    return [S.toFixed(2), c.cd.toFixed(3), c.cl.toFixed(3)];
  }),
  [0, 1, 2]
);

/* -------------------------------------------------------------------------- */
/* 4. Bounce                                                                   */
/* -------------------------------------------------------------------------- */

function dropTest(surfaceKey) {
  const sim = simulateTrajectory({
    hitX: -6, hitY: 0, hitZ: 2.54 + R, speedKmh: 0, launchAngleDeg: 0, aimAngleDeg: 0,
    topspinRpm: 0, sidespinRpm: 0, surfaceKey
  });
  const apex = Math.max(...sim.points.filter((p) => p.phase === 1).map((p) => p.z));
  return (apex - R) * 100;
}
const dropRows = Object.entries(COURT_SURFACES).map(([k, s]) => {
  const h = dropTest(k);
  const ok = h >= 135 && h <= 147;
  return [s.nameEn, s.cor.toFixed(3), h.toFixed(1), '135 – 147', verdict(ok, 'IN BAND', h > 147 ? 'ABOVE BAND' : 'BELOW BAND')];
});
$('dropTable').innerHTML = table(['surface', 'model COR', 'rebound (cm)', 'ITF band (cm)', ''], dropRows, [1, 2]);
const dropHeights = Object.fromEntries(Object.keys(COURT_SURFACES).map((k) => [k, dropTest(k)]));
const outOfBand = Object.entries(dropHeights).filter(([, h]) => h < 135 || h > 147).map(([k]) => COURT_SURFACES[k].nameZh);
$('dropNote').textContent =
  (outOfBand.length ? `超出范围：${outOfBand.join('、')}。` : '三种场地的竖直 COR 都已标定到 ITF 反弹带内（约 0.76–0.79），并保持红土 > 硬地 > 草地的反弹高度顺序。') +
  '注意：这是“循环检验”——COR 是按这个测试标定的，所以它只说明数值合理，不算独立验证。' +
  '场地快慢的区别主要来自摩擦系数 μ（见下表）。模型的 COR 是常数，不随冲击速度变化，这是已知局限。';

const cpiRows = Object.entries(COURT_SURFACES).map(([k, s]) => {
  const c = courtPaceIndex(s);
  const band = c < 30 ? 'slow' : c < 35 ? 'medium-slow' : c < 40 ? 'medium' : c < 45 ? 'medium-fast' : 'fast';
  return [s.nameEn, s.mu.toFixed(2), s.cor.toFixed(3), c.toFixed(1), band];
});
$('cpiTable').innerHTML = table(['surface', 'μ', 'e', 'CPI', 'band'], cpiRows, [1, 2, 3]);

/* -------------------------------------------------------------------------- */
/* 5. Racket e_A                                                               */
/* -------------------------------------------------------------------------- */

const eaRows = [19, 21, 23, 25, 27].map((kg) => {
  const imp = computeRacketBallImpact({ ...SHOT_PRESETS.alcaraz_fh, stringTensionKg: kg });
  return [`${kg} kg (${(kg * 2.20462).toFixed(0)} lbs)`, imp.eA.toFixed(3), imp.launchSpeedKmh.toFixed(1), imp.topspinRpm.toFixed(0)];
});
$('eaTable').innerHTML = table(['string tension', 'e_A', 'launch speed (km/h)', 'topspin (rpm)'], eaRows, [1, 2, 3]);

/* -------------------------------------------------------------------------- */
/* 6. Sample shots                                                             */
/* -------------------------------------------------------------------------- */

const shotRows = Object.values(SHOT_PRESETS).map((p) => {
  const s = presetShot(p);
  const sim = simulateTrajectory(s);
  const b = sim.firstBounce;
  return [
    p.labelEn,
    s.speedKmh.toFixed(0),
    s.topspinRpm.toFixed(0),
    (sim.netClearanceM * 100).toFixed(0),
    b ? b.speedBeforeKmh.toFixed(0) : '—',
    b ? b.speedAfterKmh.toFixed(0) : '—',
    b ? b.callTextEn : '—'
  ];
});
$('shotTable').innerHTML = table(
  ['preset', 'launch (km/h)', 'spin (rpm)', 'net clear (cm)', 'pre-bounce (km/h)', 'post-bounce (km/h)', 'call'],
  shotRows,
  [1, 2, 3, 4, 5]
);

/* -------------------------------------------------------------------------- */
/* Summary tiles                                                               */
/* -------------------------------------------------------------------------- */

const dropIn = dropRows.filter((r) => r[4].includes('pass')).length;
$('summaryTiles').innerHTML = [
  { k: '收敛阶 · convergence order', v: minOrder.toFixed(2), s: 'min over 3 shots (RK4 → 4)' },
  { k: '默认步长误差 · error @ 2 ms', v: `${(errDefault * 1000).toExponential(1)} mm`, s: 'landing point vs Δt = 0.1 ms' },
  { k: '真空解析解 · vacuum check', v: vacRows.every((r) => r[5].includes('pass')) ? 'PASS' : 'FAIL', s: '< 1e-9 m and s' },
  { k: 'ITF 落球带 · drop test', v: `${dropIn} / 3`, s: 'surfaces inside 135–147 cm' }
]
  .map((t) => `<div class="tile"><div class="k">${t.k}</div><div class="v">${t.v}</div><div class="s">${t.s}</div></div>`)
  .join('');
