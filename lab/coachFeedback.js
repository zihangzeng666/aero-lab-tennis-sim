/**
 * Coaching feedback for the Coach view. Pure functions, no DOM, so the tests can run them.
 *
 * Every sentence is built from the simulation of the shot on screen: the verdict and depth from
 * the flight, the face change from solveFaceAngleForDepth, the incoming-ball effect from the
 * racket impact model run with and without the incoming spin. Nothing here is a canned guess:
 * when the numbers do not support a sentence, the sentence is not shown.
 */
import { computeRacketBallImpact, describeShotOutcome } from './physics.js?v=61';

const fmt1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
const abs1 = (v) => fmt1(Math.abs(v));
const cm = (m) => Math.round(m * 100);

const TEXT = {
  en: {
    net: (miss) => `Too closed → into the net. The ball is ${miss} cm under the tape.`,
    netDribble: 'Clips the tape and drops back: too closed for this swing.',
    long: (d) => `Face too open → the ball sails long, ${d} m past the baseline.`,
    longFar: 'Face too open → the ball sails far past the baseline.',
    wide: 'Wide of the sideline: the face is fine for depth, the aim is off (aim is in Lab mode).',
    short: (d, c) => `In, but short: lands ${d} m inside the baseline (${c} cm over the net). An easy ball to attack.`,
    tight: (c, d) => `In, but only ${c} cm over the net. Lands ${d} m inside the baseline; little room for error.`,
    good: (c, d) => `Good: ${c} cm over the net, lands ${d} m inside the baseline.`,
    open: (dd, f) => `Open the face about ${dd}° (to ${f}°) to land it deep.`,
    close: (dd, f) => `Close the face about ${dd}° (to ${f}°) to land it deep.`,
    keep: 'This face angle already lands it deep.',
    cantLong: 'Even fully closed this swing goes long: slow the swing down or swing more low-to-high.',
    cantShort: 'Even fully open this swing does not reach the baseline: swing faster.',
    topspinClimbs: (x) =>
      `Their topspin sends your ball off ${x}° higher than a ball with no spin would. Open face vs topspin = the ball climbs, so close the face a touch.`,
    topspinNote: (x) => `Their topspin sends your ball off ${x}° higher than a ball with no spin would: that is why this face is closed.`,
    sliceDrops: (x) =>
      `Their backspin pulls your launch ${x}° lower than a ball with no spin. Against slice, open the face a little or lift more.`,
    sliceNote: (x) => `Their backspin pulls your launch ${x}° lower than a ball with no spin would.`,
    borrow: (v) => `You borrow ${v} km/h of pace from this ball.`,
    flatSpin: (r) => `Only ${r} rpm of spin: the ball flies flat. More low-to-high swing path gives more topspin.`,
    backspin: (r) => `${r} rpm of backspin: the swing goes high-to-low, a slice.`,
    vsDeeper: (d) => `${d} m deeper than the compare path`,
    vsShorter: (d) => `${d} m shorter than the compare path`,
    vsHigher: (c) => `${c} cm higher over the net`,
    vsLower: (c) => `${c} cm lower over the net`
  },
  zh: {
    net: (miss) => `拍面太关 → 下网。过网时球比网带低 ${miss} cm。`,
    netDribble: '擦网带后落回本方：对这个挥拍来说拍面太关。',
    long: (d) => `拍面太开 → 出底线，超出 ${d} m。`,
    longFar: '拍面太开 → 球远远飞出底线。',
    wide: '出边线：深度对了，是方向偏了（方向在实验室模式里调）。',
    short: (d, c) => `界内，但偏浅：落在底线内 ${d} m（过网 ${c} cm），对手容易进攻。`,
    tight: (c, d) => `界内，但过网只高 ${c} cm，落在底线内 ${d} m，容错很小。`,
    good: (c, d) => `很好：过网 ${c} cm，落在底线内 ${d} m。`,
    open: (dd, f) => `把拍面打开约 ${dd}°（到 ${f}°）可以打深。`,
    close: (dd, f) => `把拍面关约 ${dd}°（到 ${f}°）可以打深。`,
    keep: '这个拍面角度已经能打深。',
    cantLong: '拍面关到底还是出界：放慢挥速，或者更多由下往上挥。',
    cantShort: '拍面开到底也打不到底线：挥快一点。',
    topspinClimbs: (x) => `来球的上旋让你的出球比无旋来球高 ${x}°。开拍面迎上旋 = 球往上飘，拍面稍微关一点。`,
    topspinNote: (x) => `来球的上旋让你的出球比无旋来球高 ${x}°：所以这里拍面要关。`,
    sliceDrops: (x) => `来球的下旋让出球角度比无旋来球低 ${x}°。打切削球时拍面稍开或多往上提。`,
    sliceNote: (x) => `来球的下旋让出球角度比无旋来球低 ${x}°。`,
    borrow: (v) => `从这颗来球借力 ${v} km/h。`,
    flatSpin: (r) => `只有 ${r} rpm 旋转，球很平。挥拍路径更多由下往上会带来更多上旋。`,
    backspin: (r) => `${r} rpm 下旋：挥拍由上往下，是切削。`,
    vsDeeper: (d) => `比对比路径深 ${d} m`,
    vsShorter: (d) => `比对比路径浅 ${d} m`,
    vsHigher: (c) => `过网高 ${c} cm`,
    vsLower: (c) => `过网低 ${c} cm`
  }
};

/**
 * How much the incoming ball's spin alone changes the launch angle for this swing:
 * the impact model run with the real incoming spin minus the same impact with zero spin.
 */
export function incomingSpinLaunchEffect(state) {
  const withSpin = computeRacketBallImpact(state);
  const noSpin = computeRacketBallImpact({ ...state, incomingSpinRpm: 0 });
  return withSpin.launchAngleDeg - noSpin.launchAngleDeg;
}

/**
 * Builds the coaching lines for the current shot.
 * @param {object} p
 * @param {object} p.state       app state (swing, incoming ball, contact point)
 * @param {object} p.impact      computeRacketBallImpact(state)
 * @param {object} p.sim         simulateTrajectory for the shot
 * @param {object} [p.suggestion] solveFaceAngleForDepth(state) result (optional; adds the fix)
 * @param {object} [p.compareSim] the ghost / pinned path (optional; adds a comparison line)
 * @param {string} [p.lang]      'en' | 'zh'
 * @returns {{ tone: 'good'|'warn'|'bad', lines: Array<{kind: string, text: string}>, outcome: object }}
 */
export function buildCoachFeedback({ state, impact, sim, suggestion = null, compareSim = null, lang = 'en' }) {
  const T = TEXT[lang] || TEXT.en;
  const o = describeShotOutcome(sim);
  const lines = [];
  let tone = 'good';

  // 1. What happened
  if (o.verdict === 'NET') {
    tone = 'bad';
    const miss = o.netClearanceM !== null ? cm(-o.netClearanceM) : null;
    lines.push({ kind: 'result', text: miss !== null && miss > 0 ? T.net(miss) : T.netDribble });
  } else if (o.verdict === 'LONG') {
    tone = 'bad';
    lines.push({ kind: 'result', text: o.depthM !== null ? T.long(abs1(o.depthM)) : T.longFar });
  } else if (o.verdict === 'WIDE') {
    tone = 'bad';
    lines.push({ kind: 'result', text: T.wide });
  } else {
    const c = cm(o.netClearanceM ?? 0);
    const d = fmt1(o.depthM);
    if (o.depthM > 4.0) {
      tone = 'warn';
      lines.push({ kind: 'result', text: T.short(d, c) });
    } else if ((o.netClearanceM ?? 1) < 0.25) {
      tone = 'warn';
      lines.push({ kind: 'result', text: T.tight(c, d) });
    } else {
      lines.push({ kind: 'result', text: T.good(c, d) });
    }
  }

  // 2. The fix, from the face-angle search (only when the shot is not already deep and safe)
  if (suggestion && (tone !== 'good' || o.verdict !== 'IN')) {
    const delta = suggestion.faceAngleDeg - state.faceAngleDeg;
    if (!suggestion.reachable) {
      lines.push({ kind: 'fix', text: suggestion.faceAngleDeg <= -17.9 ? T.cantLong : T.cantShort });
    } else if (Math.abs(delta) >= 0.5 && o.verdict !== 'WIDE') {
      lines.push({ kind: 'fix', text: delta > 0 ? T.open(abs1(delta), fmt1(suggestion.faceAngleDeg)) : T.close(abs1(delta), fmt1(suggestion.faceAngleDeg)) });
    } else if (o.verdict === 'IN' && Math.abs(delta) < 0.5) {
      lines.push({ kind: 'fix', text: T.keep });
    }
  }

  // 3. What the incoming ball does to this swing (impact model, with vs without the incoming spin)
  const spinFx = incomingSpinLaunchEffect(state);
  // advice only when it points the right way: "close a touch" when the ball flies long/high
  const tooHigh = o.verdict === 'LONG' || (o.verdict === 'IN' && (o.netClearanceM ?? 0) > 1.5 && o.depthM < 1);
  const tooLow = o.verdict === 'NET' || (o.verdict === 'IN' && o.depthM > 4.0);
  if (state.incomingSpinRpm > 400 && spinFx >= 1.0) {
    lines.push({ kind: 'incoming', text: tooHigh ? T.topspinClimbs(fmt1(spinFx)) : T.topspinNote(fmt1(spinFx)) });
  } else if (state.incomingSpinRpm < -300 && spinFx <= -1.0) {
    lines.push({ kind: 'incoming', text: tooLow ? T.sliceDrops(abs1(spinFx)) : T.sliceNote(abs1(spinFx)) });
  } else if ((impact.incomingEffect?.deltaSpeedKmh ?? 0) >= 12) {
    lines.push({ kind: 'incoming', text: T.borrow(Math.round(impact.incomingEffect.deltaSpeedKmh)) });
  }

  // 4. Spin the swing produced
  if (impact.topspinRpm < -300) lines.push({ kind: 'spin', text: T.backspin(Math.round(Math.abs(impact.topspinRpm))) });
  else if (Math.abs(impact.topspinRpm) < 600) lines.push({ kind: 'spin', text: T.flatSpin(Math.round(impact.topspinRpm)) });

  // 5. Compared with the ghost path
  if (compareSim) {
    const g = describeShotOutcome(compareSim);
    const parts = [];
    if (o.depthM !== null && g.depthM !== null && o.verdict !== 'NET' && g.verdict !== 'NET') {
      const dd = g.depthM - o.depthM; // positive: lands deeper now
      if (Math.abs(dd) >= 0.1) parts.push(dd > 0 ? T.vsDeeper(abs1(dd)) : T.vsShorter(abs1(dd)));
    }
    if (o.netClearanceM !== null && g.netClearanceM !== null) {
      const dc = cm(o.netClearanceM - g.netClearanceM);
      if (Math.abs(dc) >= 3) parts.push(dc > 0 ? T.vsHigher(Math.abs(dc)) : T.vsLower(Math.abs(dc)));
    }
    if (parts.length) lines.push({ kind: 'compare', text: parts.join(lang === 'zh' ? '，' : ', ') + (lang === 'zh' ? '。' : '.') });
  }

  return { tone, lines, outcome: o };
}
