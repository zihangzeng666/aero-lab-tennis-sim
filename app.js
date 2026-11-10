/**
 * Main Application Controller for AERO-LAB // ATP Tour Rally & Ballistics Simulator
 * Features:
 * 1. Bidirectional Physics Coupling (Racket <-> Launch HUD via 3x3 Jacobian Inverse Solver)
 * 2. Turn-Based Two-Player Rally System (Player A vs Player B with automatic post-bounce handoff)
 * 3. Authentic ATP Match Rallies & Custom Hawk-Eye CSV/JSON Telemetry Importer
 * 4. Horizontal 16x19 Racket Blueprint & Zero-Clipping 3D Biomechanics Integration
 */

import {
  ITF_COURT,
  computeRacketBallImpact,
  solveRacketFromTargetLaunch,
  simulateTrajectory,
  SHOT_PRESETS,
  INCOMING_PRESETS,
  ATP_RALLIES
} from './physics.js?v=6';
import { TennisScene3D, RacketImpact3DStudio } from './scene3d.js?v=6';

const WINDUP_START_TIME = -0.35;
const KG_TO_LBS = 2.20462262;

const I18N = {
  zh: {
    unitSpeedLabel: '速度单位',
    unitTensionLabel: '穿线张力',
    rallySectionTitle: 'ATP 赛事回合与球员技术档案',
    btnReset: '一键重置',
    btnImportAtp: '导入实测数据',
    lblRallyPreset: 'ATP 经典多拍回合回放',
    shotPresetLabel: '职业球员单拍技术基准 (覆盖当前拍)',
    btnNextTurn: '+ 续写下一拍回击',
    racketVizTitle: '3D 拍面咬球与甜区穿线形变',
    rViewIso: '3D 斜视',
    rViewFront: '拍面甜区',
    rViewSide: '侧面攻角',
    racket3DHint: '支持鼠标拖拽 360° 旋转观察',
    rmFace: '拍面倾角',
    rmSwing: '挥拍仰角',
    rmAttack: '刷球攻角',
    rmAim: '水平瞄准',
    tabRacket: '挥拍与拍面',
    tabIncoming: '来球与借力',
    tabPosition: '站位与场地',
    bidirectionalHint:
      '双向物理耦合：调节下方挥拍滑块或直接拖动左上角【初速度 / 旋转 RPM / 过网仰角】，系统均会实时双向逆向解算同步。',
    lblRacketSpeed: '拍头挥拍速度',
    lblSwingPath: '挥拍轨迹仰角 (低向高提拉+)',
    lblFaceAngle: '触球拍面倾角 (仰开+ / 闭合压拍-)',
    lblAimAngle: '水平出球方向角 (斜线 / 直线)',
    lblStringTension: '球拍穿线磅数 / 张力',
    lblIncomingPreset: '对手来球性质预设 (或由上一拍自动传递)',
    lblIncomingSpeed: '对手来球速度',
    lblIncomingAngle: '来球垂直入射角 (下落- / 上升期+)',
    lblIncomingSpin: '对手来球旋转 (上旋+ / 切削下旋-)',
    incomingEffectTitle: '来球借力与旋转耦合效应 (对比定点抛球)',
    effBorrowSpeed: '借力球速增量',
    effLaunchAngle: '出球仰角偏移',
    effSpinChange: '转速耦合变化',
    lblCourtMode: '有效判罚界线',
    optSingles: '单打界线 (Singles)',
    optDoubles: '双打界线 (Doubles)',
    optServeDeuce: '平分发球区 (Deuce)',
    optServeAd: '占先发球区 (Ad)',
    lblSurface: '球场表面材质',
    optHard: '硬地 (Hard)',
    optClay: '红土 (Clay)',
    optGrass: '草地 (Grass)',
    lblHitX: '前后击球站位 X (底线 -11.89m)',
    lblHitY: '左右击球站位 Y (单打边线 ±4.12m)',
    lblHitZ: '击球点高度 Z (发球 > 2.0m)',
    lblSidespin: '侧旋转速 (弧线侧拐)',
    lblWind: '赛场环境风速 (顺风+ / 逆风-)',
    hudTitleCall: '鹰眼判罚 // 第一落点',
    hudTitleSpeed: '出球初速度 // VELOCITY',
    hudTitleSpin: '旋转转速 // SPIN RPM',
    hudTitleNet: '过网净空高度 // NET CLEARANCE',
    btnJumpBounce: '聚焦落点',
    btnJumpNet: '过网瞬间',
    camCloseup: '挥拍特写',
    camBroadcast: '转播全景',
    camSide: '侧面剖面',
    camPov: '球员主视角',
    camHawkeye: '鹰眼落点',
    camTop: '俯视平面',
    chkVectors: '显示速度与马格努斯力矢量',
    chkGhost: '显示无旋转基准轨迹',
    chkTrueScale: '1:1 真实网球尺寸',
    legIncoming: '来球 / 下一拍接球点',
    legPreBounce: '出球飞行轨迹',
    legPostBounce: '落地反弹与球速矢量',
    legMagnus: '马格努斯气动力',
    legNoSpin: '无旋转对照基准',
    btnPlayFullRally: '连播整回合',
    btnRestart: '重播本拍',
    btnSnapImpact: '定格触球 t=0',
    spd015: '0.15x 极慢动作',
    spd025: '0.25x 慢动作',
    spd040: '0.40x 慢动作',
    spd100: '1.00x 真实原速',
    telTurn: '当前击球方',
    telSpeed: '实时球速',
    telHeight: '实时高度 Z',
    telPos: '空间坐标',
    telSpin: '实时转速',
    telAero: '气动系数',
    modalImportTitle: '导入 ATP Hawk-Eye / TrackMan 实测数据 (CSV / JSON)',
    modalImportDesc:
      '每行输入一拍实测数据（格式：出球速度km/h, 转速RPM, 出球仰角°, 水平角°, 击球X, 击球Y, 击球Z），系统将自动逆向反推每一拍所需的拍头挥速与拍面倾角并生成回合：',
    btnCancel: '取消',
    btnApplyImport: '解析并生成回合'
  },
  en: {
    unitSpeedLabel: 'SPEED',
    unitTensionLabel: 'TENSION',
    rallySectionTitle: 'ATP TOUR RALLIES & PLAYER BENCHMARKS',
    btnReset: 'RESET',
    btnImportAtp: 'IMPORT ATP CSV',
    lblRallyPreset: 'ATP Multi-Shot Rally Replay',
    shotPresetLabel: 'Pro Player Single-Shot Profile (Overwrites Turn)',
    btnNextTurn: '+ Append Return Shot',
    racketVizTitle: '3D STRINGBED POCKETING & IMPACT GEOMETRY',
    rViewIso: '3D Oblique',
    rViewFront: 'Stringbed',
    rViewSide: 'Side Profile',
    racket3DHint: 'Drag to orbit 3D impact in 360°',
    rmFace: 'Face Tilt',
    rmSwing: 'Swing Path',
    rmAttack: 'Attack Angle',
    rmAim: 'Horiz Aim',
    tabRacket: 'Racket & Swing',
    tabIncoming: 'Incoming Ball',
    tabPosition: 'Stance & Court',
    bidirectionalHint:
      'Bidirectional Physics: Adjusting Racket sliders OR Top-Left HUD (Speed / Spin / Angle) automatically back-solves & syncs both.',
    lblRacketSpeed: 'Racket Head Speed',
    lblSwingPath: 'Swing Path Angle (Low-to-High +)',
    lblFaceAngle: 'Racket Face Tilt (Open + / Closed -)',
    lblAimAngle: 'Horizontal Aim Angle (Cross / DTL)',
    lblStringTension: 'String Bed Tension',
    lblIncomingPreset: 'Incoming Ball Preset (or Chained from Prev Shot)',
    lblIncomingSpeed: 'Incoming Ball Speed',
    lblIncomingAngle: 'Incoming Angle (Falling - / Rising +)',
    lblIncomingSpin: 'Incoming Spin (Topspin + / Slice -)',
    incomingEffectTitle: 'Incoming Ball Impact Delta (vs Stationary Toss)',
    effBorrowSpeed: 'Borrowed Pace',
    effLaunchAngle: 'Angle Shift',
    effSpinChange: 'Spin Delta',
    lblCourtMode: 'Target Court Lines',
    optSingles: 'Singles Court',
    optDoubles: 'Doubles Court',
    optServeDeuce: 'Serve: Deuce Box',
    optServeAd: 'Serve: Ad Box',
    lblSurface: 'Court Surface',
    optHard: 'Hard Court',
    optClay: 'Clay Court',
    optGrass: 'Grass Court',
    lblHitX: 'Contact Depth X (Baseline -11.89m)',
    lblHitY: 'Lateral Position Y (Sideline ±4.12m)',
    lblHitZ: 'Contact Height Z (Serve > 2.0m)',
    lblSidespin: 'Sidespin RPM (Lateral Curve)',
    lblWind: 'Court Wind (Headwind - / Tailwind +)',
    hudTitleCall: 'LINE CALL // 1ST BOUNCE',
    hudTitleSpeed: 'LAUNCH VELOCITY',
    hudTitleSpin: 'SPIN RATE (RPM)',
    hudTitleNet: 'NET CLEARANCE',
    btnJumpBounce: 'FOCUS',
    btnJumpNet: 'FOCUS',
    camCloseup: 'Swing Close-Up',
    camBroadcast: 'Broadcast',
    camSide: 'Side Profile',
    camPov: 'Player POV',
    camHawkeye: 'Hawk-Eye',
    camTop: 'Top Ortho',
    chkVectors: 'Force & Velocity Vectors',
    chkGhost: 'No-Spin Baseline',
    chkTrueScale: '1:1 True Ball Scale',
    legIncoming: 'Incoming / Next Hit',
    legPreBounce: 'Outgoing Flight',
    legPostBounce: 'Post-Bounce / Vel',
    legMagnus: 'Magnus Force',
    legNoSpin: 'No-Spin Baseline',
    btnPlayFullRally: 'Play Full Rally',
    btnRestart: 'Replay Turn',
    btnSnapImpact: 'Impact t=0',
    spd015: '0.15x Ultra-Slow',
    spd025: '0.25x Slow',
    spd040: '0.40x Slow',
    spd100: '1.00x Real-Time',
    telTurn: 'Active Hitter',
    telSpeed: 'Velocity',
    telHeight: 'Height Z',
    telPos: 'Coords',
    telSpin: 'Spin Rate',
    telAero: 'Aero Coeff',
    modalImportTitle: 'Import ATP Hawk-Eye / TrackMan Telemetry (CSV / JSON)',
    modalImportDesc:
      'Enter one shot per line (speedKmh, topspinRpm, launchAngleDeg, aimAngleDeg, hitX, hitY, hitZ). The inverse solver automatically reconstructs the required racket swing & builds a turn-based rally:',
    btnCancel: 'Cancel',
    btnApplyImport: 'Parse & Build Rally'
  }
};

class TennisSimApp {
  constructor() {
    this.lang = 'zh';
    this.speedUnit = 'kmh';
    this.tensionUnit = 'lbs';

    this.currentRallyKey = 'ao2024_sinner_medvedev';
    this.rallyMeta = {
      playerAZh: 'J. Sinner (近端 A)',
      playerBZh: 'D. Medvedev (远端 B)',
      playerAEn: 'J. Sinner (Near A)',
      playerBEn: 'D. Medvedev (Far B)'
    };
    this.rallyTurns = [];
    this.currentTurnIndex = 0;
    this.isPlayingFullRally = false;

    this.state = {
      side: 'A',
      courtMode: 'singles',
      surfaceKey: 'hard',

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
      stringTensionKg: 23,

      speedKmh: 138.0,
      launchAngleDeg: 8.2,
      topspinRpm: 3250,
      sidespinRpm: 200,

      airDensity: 1.21,
      windSpeedKmh: 0
    };

    this.lastImpactInfo = null;
    this.isPlaying = false;
    this.playbackSpeed = 0.4;
    this.currentTime = WINDUP_START_TIME;
    this.simResult = null;
    this.ghostSimResult = null;
    this.lastFrameTs = performance.now();
    this.hudBallPhase = 0;

    this._init3D();
    this._populatePresetSelects();
    this._bindControls();
    this._applyLanguageUI();
    this.loadRally(this.currentRallyKey);
    this._startPlaybackLoop();
  }

  _init3D() {
    const viewportEl = document.getElementById('viewport3d');
    this.scene3d = new TennisScene3D(viewportEl);

    const racketCanvasEl = document.getElementById('racketImpactCanvas');
    if (racketCanvasEl) {
      this.racket3d = new RacketImpact3DStudio(racketCanvasEl);
    }
  }

  formatSpeed(kmhVal, decimals = 1) {
    if (this.speedUnit === 'mph') {
      return `${(kmhVal * 0.621371).toFixed(decimals)} mph`;
    } else if (this.speedUnit === 'ms') {
      return `${(kmhVal / 3.6).toFixed(decimals)} m/s`;
    }
    return `${kmhVal.toFixed(decimals)} km/h`;
  }

  formatTension(kgVal) {
    if (this.tensionUnit === 'lbs') {
      return `${(kgVal * KG_TO_LBS).toFixed(1)} lbs`;
    }
    return `${kgVal.toFixed(1)} kg`;
  }

  _populatePresetSelects() {
    const rallySelect = document.getElementById('rallyPresetSelect');
    if (rallySelect) {
      const curRally = rallySelect.value || this.currentRallyKey;
      rallySelect.innerHTML = '';
      for (const [k, r] of Object.entries(ATP_RALLIES)) {
        const opt = document.createElement('option');
        opt.value = k;
        opt.textContent = this.lang === 'zh' ? r.nameZh : r.nameEn;
        rallySelect.appendChild(opt);
      }
      if (ATP_RALLIES[curRally]) {
        rallySelect.value = curRally;
      }
    }

    const presetSelect = document.getElementById('presetSelect');
    if (presetSelect) {
      const currentShot = presetSelect.value || 'alcaraz_fh';
      presetSelect.innerHTML = '';
      for (const [k, p] of Object.entries(SHOT_PRESETS)) {
        const opt = document.createElement('option');
        opt.value = k;
        opt.textContent = this.lang === 'zh' ? p.labelZh : p.labelEn;
        presetSelect.appendChild(opt);
      }
      if (SHOT_PRESETS[currentShot]) {
        presetSelect.value = currentShot;
      }
    }

    const incSelect = document.getElementById('incomingPresetSelect');
    if (incSelect) {
      const currentInc = incSelect.value || 'rally_topspin';
      incSelect.innerHTML = '';
      for (const [k, p] of Object.entries(INCOMING_PRESETS)) {
        const opt = document.createElement('option');
        opt.value = k;
        opt.textContent = this.lang === 'zh' ? p.labelZh : p.labelEn;
        incSelect.appendChild(opt);
      }
      if (INCOMING_PRESETS[currentInc]) {
        incSelect.value = currentInc;
      }
    }
  }

  _applyLanguageUI() {
    const dict = I18N[this.lang] || I18N.zh;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });
    this._populatePresetSelects();
    this._updatePlayButtonUI();
    this._renderTurnChainUI();
    this.recomputeSimulation({ source: 'racket', skipChain: true });
  }

  /**
   * Loads a multi-shot turn-based ATP rally and chains each turn's incoming ball from the previous turn's bounce.
   */
  loadRally(rallyKey) {
    const rally = ATP_RALLIES[rallyKey];
    if (!rally) return;

    this.currentRallyKey = rallyKey;
    this.rallyMeta = {
      playerAZh: rally.playerAZh,
      playerBZh: rally.playerBZh,
      playerAEn: rally.playerAEn,
      playerBEn: rally.playerBEn
    };

    if (rally.surfaceKey) {
      this.state.surfaceKey = rally.surfaceKey;
      const surfEl = document.getElementById('surfaceSelect');
      if (surfEl) surfEl.value = rally.surfaceKey;
      this.scene3d.setCourtSurface(rally.surfaceKey);
    }

    this.rallyTurns = rally.turns.map((t, idx) => ({
      side: t.side || (idx % 2 === 0 ? 'A' : 'B'),
      titleZh: t.titleZh || `#${idx + 1} 击球`,
      titleEn: t.titleEn || `#${idx + 1} Shot`,
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

    this._rechainRallyFromTurn(0);
    this.selectTurn(0, false);
  }

  /**
   * One-Click Reset: restores current rally, sliders, camera, and playback to clean benchmark state.
   */
  resetAll() {
    this.isPlayingFullRally = false;
    this.windSpeedKmh = 0;
    this.state.windSpeedKmh = 0;
    this.state.stringTensionKg = 23;
    this.loadRally(this.currentRallyKey || 'ao2024_sinner_medvedev');
    this.scene3d.setCameraPreset('broadcast', this.simResult, this.state);
    if (this.racket3d) {
      this.racket3d.setViewMode('iso');
      document.querySelectorAll('#racket3DViewGroup .seg-btn').forEach((b) =>
        b.classList.toggle('active', b.getAttribute('data-racket-view') === 'iso')
      );
    }
  }

  /**
   * Propagates post-bounce intercept coordinates and incoming ball state from Turn k to Turn k+1.
   */
  _rechainRallyFromTurn(startIdx = 0) {
    for (let i = startIdx; i < this.rallyTurns.length; i++) {
      const turn = this.rallyTurns[i];
      if (i > startIdx && turn.targetSpeedKmh !== undefined) {
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
      } else if (i === 0 && turn.targetSpeedKmh !== undefined && startIdx === 0) {
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

      const sim = simulateTrajectory({
        ...turn,
        surfaceKey: this.state.surfaceKey,
        airDensity: this.state.airDensity,
        windSpeedKmh: this.state.windSpeedKmh
      });
      turn.callCode = sim.firstBounce ? (sim.firstBounce.isIn ? 'IN' : 'OUT') : 'OUT';
      turn.interceptPoint = sim.interceptPoint;

      if (i + 1 < this.rallyTurns.length && sim.interceptPoint) {
        const nextTurn = this.rallyTurns[i + 1];
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
  }

  /**
   * Selects a specific turn in the rally chain and loads its parameters into the simulator.
   */
  selectTurn(idx, fromFullRallyAutoAdvance = false) {
    if (idx < 0 || idx >= this.rallyTurns.length) return;
    if (!fromFullRallyAutoAdvance) {
      this.isPlayingFullRally = false;
    }

    this.currentTurnIndex = idx;
    const t = this.rallyTurns[idx];

    Object.assign(this.state, {
      side: t.side,
      courtMode: t.courtMode,
      hitX: t.hitX,
      hitY: t.hitY,
      hitZ: t.hitZ,
      racketSpeedKmh: t.racketSpeedKmh,
      swingPathDeg: t.swingPathDeg,
      faceAngleDeg: t.faceAngleDeg,
      aimAngleDeg: t.aimAngleDeg,
      incomingSpeedKmh: t.incomingSpeedKmh,
      incomingAngleDeg: t.incomingAngleDeg,
      incomingSpinRpm: t.incomingSpinRpm,
      stringTensionKg: t.stringTensionKg ?? 23,
      sidespinRpm: t.sidespinRpm ?? 200
    });

    const courtSelect = document.getElementById('courtModeSelect');
    if (courtSelect) courtSelect.value = this.state.courtMode;

    this.scene3d.setTargetZone(this.state.courtMode, this.state.side);
    this.recomputeSimulation({ source: 'racket', skipChain: true });
    this._renderTurnChainUI();

    this.currentTime = fromFullRallyAutoAdvance ? -0.22 : WINDUP_START_TIME;
    this.isPlaying = true;
    this._updatePlayButtonUI();
    this.updateScrubberFrame();
  }

  /**
   * Advances to the next turn in the rally, or dynamically generates a new opponent return turn from the current shot's intercept point.
   */
  appendOrAdvanceNextTurn() {
    if (this.currentTurnIndex + 1 < this.rallyTurns.length) {
      this.selectTurn(this.currentTurnIndex + 1, false);
      return;
    }

    const ip = this.simResult?.interceptPoint;
    const nextSide = this.state.side === 'A' ? 'B' : 'A';
    const nextNum = this.rallyTurns.length + 1;

    const hitX = ip ? ip.nextHitX : -11.75;
    const hitY = ip ? ip.nextHitY : -this.state.hitY * 0.7;
    const hitZ = ip ? ip.nextHitZ : 1.05;
    const incSpd = ip ? ip.nextIncomingSpeedKmh : 56;
    const incAng = ip ? ip.nextIncomingAngleDeg : -10;
    const incSpn = ip ? ip.nextIncomingSpinRpm : 1850;

    // Aim back cross-court toward the open court so the return lands IN
    const smartAimDeg = Math.round(Math.max(-6.8, Math.min(6.8, -hitY * 2.4)) * 10) / 10;
    const solved = solveRacketFromTargetLaunch({
      targetSpeedKmh: 136,
      targetLaunchAngleDeg: 6.6,
      targetTopspinRpm: 2950,
      incomingSpeedKmh: incSpd,
      incomingAngleDeg: incAng,
      incomingSpinRpm: incSpn,
      stringTensionKg: this.state.stringTensionKg,
      hitZ
    });

    const newTurn = {
      side: nextSide,
      titleZh: `#${nextNum} ${nextSide === 'A' ? '近端 A' : '远端 B'} 回击`,
      titleEn: `#${nextNum} Player ${nextSide} Return`,
      courtMode: 'singles',
      hitX,
      hitY,
      hitZ,
      racketSpeedKmh: solved.racketSpeedKmh,
      swingPathDeg: solved.swingPathDeg,
      faceAngleDeg: solved.faceAngleDeg,
      aimAngleDeg: smartAimDeg,
      incomingSpeedKmh: incSpd,
      incomingAngleDeg: incAng,
      incomingSpinRpm: incSpn,
      stringTensionKg: this.state.stringTensionKg,
      sidespinRpm: hitY < 0 ? 220 : -220,
      targetSpeedKmh: 136,
      targetLaunchAngleDeg: 6.6,
      targetTopspinRpm: 2950
    };

    this.rallyTurns.push(newTurn);
    this._rechainRallyFromTurn(this.rallyTurns.length - 1);
    this.selectTurn(this.rallyTurns.length - 1, false);
  }

  _renderTurnChainUI() {
    const matchupEl = document.getElementById('rallyMatchupLabel');
    if (matchupEl) {
      matchupEl.textContent =
        this.lang === 'zh'
          ? `${this.rallyMeta.playerAZh} vs ${this.rallyMeta.playerBZh}`
          : `${this.rallyMeta.playerAEn} vs ${this.rallyMeta.playerBEn}`;
    }

    const container = document.getElementById('turnChainContainer');
    if (!container) return;
    container.innerHTML = '';

    this.rallyTurns.forEach((turn, idx) => {
      const btn = document.createElement('button');
      btn.className = `turn-pill ${idx === this.currentTurnIndex ? 'active' : ''}`;

      const badge = document.createElement('span');
      badge.className = `turn-side-badge ${turn.side === 'B' ? 'side-b' : ''}`;
      badge.textContent = turn.side;

      const label = document.createElement('span');
      label.textContent = this.lang === 'zh' ? turn.titleZh : turn.titleEn;

      const spd = document.createElement('span');
      spd.style.opacity = '0.75';
      spd.textContent = turn.speedKmh ? `${Math.round(turn.speedKmh)}km/h` : '';

      btn.appendChild(badge);
      btn.appendChild(label);
      btn.appendChild(spd);

      btn.addEventListener('click', () => {
        this.selectTurn(idx, false);
      });
      container.appendChild(btn);
    });

    const fullRallyBtn = document.getElementById('btnPlayFullRally');
    if (fullRallyBtn) {
      fullRallyBtn.classList.toggle('playing', this.isPlayingFullRally);
    }
  }

  _bindControls() {
    // 1. Language Switcher
    document.querySelectorAll('#langSwitchGroup [data-lang]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.lang = btn.getAttribute('data-lang');
        document.querySelectorAll('#langSwitchGroup .seg-btn').forEach((b) =>
          b.classList.toggle('active', b === btn)
        );
        this._applyLanguageUI();
      });
    });

    // 2. Speed Unit Switcher
    const setSpeedUnit = (unit) => {
      this.speedUnit = unit;
      document.querySelectorAll('#speedUnitGroup .seg-btn').forEach((b) =>
        b.classList.toggle('active', b.getAttribute('data-speed-unit') === unit)
      );
      this.recomputeSimulation({ source: 'racket', skipChain: true });
    };

    document.querySelectorAll('#speedUnitGroup [data-speed-unit]').forEach((btn) => {
      btn.addEventListener('click', () => setSpeedUnit(btn.getAttribute('data-speed-unit')));
    });

    document.getElementById('btnCycleSpeedUnit')?.addEventListener('click', () => {
      const order = ['kmh', 'mph', 'ms'];
      const next = order[(order.indexOf(this.speedUnit) + 1) % order.length];
      setSpeedUnit(next);
    });

    // 3. String Tension Unit Switcher
    document.querySelectorAll('#tensionUnitGroup [data-tension-unit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.tensionUnit = btn.getAttribute('data-tension-unit');
        document.querySelectorAll('#tensionUnitGroup .seg-btn').forEach((b) =>
          b.classList.toggle('active', b === btn)
        );
        this.recomputeSimulation({ source: 'racket', skipChain: true });
      });
    });

    // 3b. 3D Racket Impact Studio View Switcher ('iso' | 'front' | 'side')
    document.querySelectorAll('#racket3DViewGroup [data-racket-view]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-racket-view');
        document.querySelectorAll('#racket3DViewGroup .seg-btn').forEach((b) =>
          b.classList.toggle('active', b === btn)
        );
        if (this.racket3d) {
          this.racket3d.setViewMode(mode);
        }
      });
    });

    // 4. Sidebar 3-Tab Navigation
    document.querySelectorAll('#sidebarNavTabs .nav-tab').forEach((tabBtn) => {
      tabBtn.addEventListener('click', () => {
        const targetId = tabBtn.getAttribute('data-tab');
        document.querySelectorAll('#sidebarNavTabs .nav-tab').forEach((b) =>
          b.classList.toggle('active', b === tabBtn)
        );
        document.querySelectorAll('.tab-panel').forEach((panel) =>
          panel.classList.toggle('active', panel.id === targetId)
        );
      });
    });

    // 5. Rally & Shot Preset Selectors
    document.getElementById('rallyPresetSelect')?.addEventListener('change', (e) => {
      if (e.target.value) this.loadRally(e.target.value);
    });

    document.getElementById('presetSelect')?.addEventListener('change', (e) => {
      if (e.target.value) this.applyPreset(e.target.value);
    });

    document.getElementById('btnNextTurn')?.addEventListener('click', () => {
      this.appendOrAdvanceNextTurn();
    });

    document.getElementById('btnResetRally')?.addEventListener('click', () => {
      this.resetAll();
    });

    document.getElementById('btnResetAll')?.addEventListener('click', () => {
      this.resetAll();
    });

    document.getElementById('incomingPresetSelect')?.addEventListener('change', (e) => {
      const inc = INCOMING_PRESETS[e.target.value];
      if (!inc) return;
      this.state.incomingSpeedKmh = inc.incomingSpeedKmh;
      this.state.incomingAngleDeg = inc.incomingAngleDeg;
      this.state.incomingSpinRpm = inc.incomingSpinRpm;
      this.recomputeSimulation({ source: 'racket' });
    });

    // 6. Court Mode & Surface
    document.getElementById('courtModeSelect')?.addEventListener('change', (e) => {
      this.state.courtMode = e.target.value;
      this.scene3d.setTargetZone(this.state.courtMode, this.state.side);
      this.recomputeSimulation({ source: 'racket' });
    });

    document.getElementById('surfaceSelect')?.addEventListener('change', (e) => {
      this.state.surfaceKey = e.target.value;
      this.scene3d.setCourtSurface(this.state.surfaceKey);
      this.recomputeSimulation({ source: 'racket' });
    });

    // 7. Sidebar Sliders (Forward Racket & Position Physics)
    this.sliderBindings = [
      { id: 'hitX', key: 'hitX', fmt: (v) => `${v.toFixed(2)} m` },
      { id: 'hitY', key: 'hitY', fmt: (v) => `${v.toFixed(2)} m` },
      { id: 'hitZ', key: 'hitZ', fmt: (v) => `${v.toFixed(2)} m` },
      { id: 'racketSpeedKmh', key: 'racketSpeedKmh', fmt: (v) => this.formatSpeed(v, 0) },
      { id: 'swingPathDeg', key: 'swingPathDeg', fmt: (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}°` },
      { id: 'faceAngleDeg', key: 'faceAngleDeg', fmt: (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}°` },
      {
        id: 'aimAngleDeg',
        key: 'aimAngleDeg',
        fmt: (v) => {
          const prefix =
            this.lang === 'zh'
              ? v > 0
                ? '左 +'
                : v < 0
                ? '右 '
                : ''
              : v > 0
              ? 'L +'
              : v < 0
              ? 'R '
              : '';
          return `${prefix}${v.toFixed(1)}°`;
        }
      },
      { id: 'incomingSpeedKmh', key: 'incomingSpeedKmh', fmt: (v) => this.formatSpeed(v, 0) },
      { id: 'incomingAngleDeg', key: 'incomingAngleDeg', fmt: (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}°` },
      {
        id: 'incomingSpinRpm',
        key: 'incomingSpinRpm',
        fmt: (v) => `${v >= 0 ? '+' : ''}${Math.round(v)} RPM`
      },
      { id: 'stringTensionKg', key: 'stringTensionKg', fmt: (v) => this.formatTension(v) },
      { id: 'sidespinRpm', key: 'sidespinRpm', fmt: (v) => `${v >= 0 ? '+' : ''}${Math.round(v)} RPM` },
      { id: 'windSpeedKmh', key: 'windSpeedKmh', fmt: (v) => this.formatSpeed(v, 0) }
    ];

    this.sliderBindings.forEach((b) => {
      const el = document.getElementById(b.id);
      if (!el) return;
      el.addEventListener('input', (e) => {
        this.state[b.key] = parseFloat(e.target.value);
        if (!this.isPlaying && this.currentTime > 0.35) {
          this.currentTime = 0;
        }
        this.recomputeSimulation({ source: 'racket' });
      });
    });

    // 8. Top-Left Interactive Telemetry Module Sliders (Inverse Physics Back-Solving!)
    document.getElementById('hudSpeedSlider')?.addEventListener('input', (e) => {
      this.state.speedKmh = parseFloat(e.target.value);
      this.recomputeSimulation({ source: 'hud' });
    });

    document.getElementById('hudSpinSlider')?.addEventListener('input', (e) => {
      this.state.topspinRpm = parseFloat(e.target.value);
      this.recomputeSimulation({ source: 'hud' });
    });

    document.getElementById('hudAngleSlider')?.addEventListener('input', (e) => {
      this.state.launchAngleDeg = parseFloat(e.target.value);
      this.recomputeSimulation({ source: 'hud' });
    });

    const jumpToBounce = () => {
      if (!this.simResult || !this.simResult.firstBounce) return;
      this.isPlaying = false;
      this.isPlayingFullRally = false;
      this._updatePlayButtonUI();
      this.currentTime = this.simResult.firstBounce.t;
      this.updateScrubberFrame();
      this.scene3d.setCameraPreset('hawkeye', this.simResult, this.state);
    };
    document.getElementById('btnJumpBounce')?.addEventListener('click', (e) => {
      e.stopPropagation();
      jumpToBounce();
    });
    document.getElementById('hudCardBounce')?.addEventListener('click', jumpToBounce);

    document.getElementById('btnJumpNet')?.addEventListener('click', () => {
      if (!this.simResult || !this.simResult.netPassPoint) return;
      this.isPlaying = false;
      this.isPlayingFullRally = false;
      this._updatePlayButtonUI();
      this.currentTime = this.simResult.netPassPoint.t;
      this.updateScrubberFrame();
      this.scene3d.setCameraPreset('net_closeup', this.simResult, this.state);
    });

    // 9. Camera Presets & Layer Toggles
    document.querySelectorAll('[data-cam]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cam = btn.getAttribute('data-cam');
        this.scene3d.setCameraPreset(cam, this.simResult, this.state);
      });
    });

    document.getElementById('toggleVectors')?.addEventListener('change', (e) => {
      this.scene3d.showVectors = e.target.checked;
      this.updateScrubberFrame();
    });

    document.getElementById('toggleGhost')?.addEventListener('change', (e) => {
      this.scene3d.showGhostNoSpin = e.target.checked;
      this.scene3d.updateTrajectory(this.simResult, this.ghostSimResult);
    });

    document.getElementById('toggleTrueScale')?.addEventListener('change', (e) => {
      this.scene3d.setBallVisualScale(e.target.checked ? 1.0 : 2.0);
      this.updateScrubberFrame();
    });

    // 10. Scrubber & Rally Playback Controls
    this.timelineSlider = document.getElementById('timelineSlider');
    this.timelineSlider?.addEventListener('input', (e) => {
      this.isPlaying = false;
      this.isPlayingFullRally = false;
      this._updatePlayButtonUI();
      this.currentTime = parseFloat(e.target.value);
      this.updateScrubberFrame();
    });

    document.getElementById('btnPlayPause')?.addEventListener('click', () => {
      if (!this.simResult) return;
      if (this.currentTime >= this.simResult.totalDuration - 0.01) {
        this.currentTime = WINDUP_START_TIME;
      }
      this.isPlaying = !this.isPlaying;
      if (!this.isPlaying) this.isPlayingFullRally = false;
      this._updatePlayButtonUI();
      this._renderTurnChainUI();
    });

    document.getElementById('btnPlayFullRally')?.addEventListener('click', () => {
      this.isPlayingFullRally = true;
      this.selectTurn(0, true);
      this.currentTime = WINDUP_START_TIME;
      this.isPlaying = true;
      this._updatePlayButtonUI();
      this._renderTurnChainUI();
    });

    document.getElementById('btnRestart')?.addEventListener('click', () => {
      this.isPlayingFullRally = false;
      this.currentTime = WINDUP_START_TIME;
      this.isPlaying = true;
      this._updatePlayButtonUI();
      this._renderTurnChainUI();
      this.updateScrubberFrame();
    });

    document.getElementById('btnSnapImpact')?.addEventListener('click', () => {
      this.isPlaying = false;
      this.isPlayingFullRally = false;
      this.currentTime = 0.0;
      this._updatePlayButtonUI();
      this._renderTurnChainUI();
      this.updateScrubberFrame();
    });

    document.getElementById('speedSelect')?.addEventListener('change', (e) => {
      this.playbackSpeed = parseFloat(e.target.value);
    });

    // 11. Custom ATP CSV / JSON Import Modal
    const modal = document.getElementById('importModalBackdrop');
    const closeModal = () => {
      if (modal) modal.style.display = 'none';
    };
    document.getElementById('btnOpenImportModal')?.addEventListener('click', () => {
      if (modal) modal.style.display = 'flex';
    });
    document.getElementById('btnCloseImportModal')?.addEventListener('click', closeModal);
    document.getElementById('btnCancelImport')?.addEventListener('click', closeModal);
    document.getElementById('btnConfirmImport')?.addEventListener('click', () => {
      const raw = document.getElementById('atpImportTextarea')?.value || '';
      if (this._parseAndImportAtpTelemetry(raw)) {
        closeModal();
      }
    });
  }

  /**
   * Parses custom ATP Hawk-Eye / TrackMan CSV or JSON telemetry and reconstructs a full turn-based rally.
   */
  _parseAndImportAtpTelemetry(rawText) {
    const trimmed = rawText.trim();
    if (!trimmed) return false;

    const parsedTurns = [];
    try {
      if (trimmed.startsWith('[')) {
        const arr = JSON.parse(trimmed);
        arr.forEach((item, idx) => {
          const side = item.side || (idx % 2 === 0 ? 'A' : 'B');
          const hitZ = Number(item.hitZ ?? 1.05);
          const solved = solveRacketFromTargetLaunch({
            targetSpeedKmh: Number(item.speedKmh ?? 135),
            targetLaunchAngleDeg: Number(item.launchAngleDeg ?? 8.0),
            targetTopspinRpm: Number(item.topspinRpm ?? 3000),
            incomingSpeedKmh: idx === 0 && hitZ > 1.95 ? 0 : 58,
            incomingAngleDeg: idx === 0 && hitZ > 1.95 ? 0 : -10,
            incomingSpinRpm: idx === 0 && hitZ > 1.95 ? 0 : 1800,
            stringTensionKg: 23,
            hitZ
          });
          parsedTurns.push({
            side,
            titleZh: `#${idx + 1} 实测拍 (${Math.round(item.speedKmh || 135)}km/h)`,
            titleEn: `#${idx + 1} Telemetry (${Math.round(item.speedKmh || 135)}km/h)`,
            courtMode: hitZ > 1.95 ? 'serve_deuce' : 'singles',
            hitX: Number(item.hitX ?? -11.75),
            hitY: Number(item.hitY ?? -1.5),
            hitZ,
            racketSpeedKmh: solved.racketSpeedKmh,
            swingPathDeg: solved.swingPathDeg,
            faceAngleDeg: solved.faceAngleDeg,
            aimAngleDeg: Number(item.aimAngleDeg ?? 6.5),
            incomingSpeedKmh: idx === 0 && hitZ > 1.95 ? 0 : 58,
            incomingAngleDeg: idx === 0 && hitZ > 1.95 ? 0 : -10,
            incomingSpinRpm: idx === 0 && hitZ > 1.95 ? 0 : 1800,
            sidespinRpm: Number(item.sidespinRpm ?? 220),
            targetSpeedKmh: Number(item.speedKmh ?? 135),
            targetLaunchAngleDeg: Number(item.launchAngleDeg ?? 6.8),
            targetTopspinRpm: Number(item.topspinRpm ?? 3000)
          });
        });
      } else {
        const lines = trimmed
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith('#') && !l.startsWith('//'));

        lines.forEach((line, idx) => {
          const cols = line.split(/[,;\t]+/).map((s) => parseFloat(s.trim()));
          if (cols.length < 3 || Number.isNaN(cols[0])) return;
          const [spd, rpm, launchAng, aimAng = 6.0, hx = -11.75, hy = -1.6, hz = 1.06] = cols;
          const side = idx % 2 === 0 ? 'A' : 'B';
          const isServe = hz > 1.95;
          const solved = solveRacketFromTargetLaunch({
            targetSpeedKmh: spd,
            targetLaunchAngleDeg: launchAng,
            targetTopspinRpm: rpm,
            incomingSpeedKmh: isServe ? 0 : 58,
            incomingAngleDeg: isServe ? 0 : -10,
            incomingSpinRpm: isServe ? 0 : 1800,
            stringTensionKg: 23,
            hitZ: hz
          });
          parsedTurns.push({
            side,
            titleZh: `#${idx + 1} 导入实测 (${Math.round(spd)}km/h)`,
            titleEn: `#${idx + 1} Imported (${Math.round(spd)}km/h)`,
            courtMode: isServe ? 'serve_deuce' : 'singles',
            hitX: hx,
            hitY: hy,
            hitZ: hz,
            racketSpeedKmh: solved.racketSpeedKmh,
            swingPathDeg: solved.swingPathDeg,
            faceAngleDeg: solved.faceAngleDeg,
            aimAngleDeg: aimAng,
            incomingSpeedKmh: isServe ? 0 : 58,
            incomingAngleDeg: isServe ? 0 : -10,
            incomingSpinRpm: isServe ? 0 : 1800,
            sidespinRpm: 200,
            targetSpeedKmh: spd,
            targetLaunchAngleDeg: launchAng,
            targetTopspinRpm: rpm
          });
        });
      }
    } catch (err) {
      console.error('ATP Import parse error:', err);
      return false;
    }

    if (!parsedTurns.length) return false;

    this.rallyMeta = {
      playerAZh: 'ATP 导入球员 A',
      playerBZh: 'ATP 导入球员 B',
      playerAEn: 'Imported Player A',
      playerBEn: 'Imported Player B'
    };
    this.rallyTurns = parsedTurns;
    this._rechainRallyFromTurn(0);
    this.selectTurn(0, false);
    return true;
  }

  /**
   * Applies a single-shot ATP player preset to the currently active turn.
   */
  applyPreset(presetKey) {
    const p = SHOT_PRESETS[presetKey];
    if (!p) return;

    Object.assign(this.state, {
      courtMode: p.courtMode,
      hitX: p.hitX,
      hitY: p.hitY,
      hitZ: p.hitZ,
      racketSpeedKmh: p.racketSpeedKmh,
      swingPathDeg: p.swingPathDeg,
      faceAngleDeg: p.faceAngleDeg,
      aimAngleDeg: p.aimAngleDeg,
      incomingSpeedKmh: p.incomingSpeedKmh,
      incomingAngleDeg: p.incomingAngleDeg,
      incomingSpinRpm: p.incomingSpinRpm,
      sidespinRpm: p.sidespinRpm
    });

    const courtSelect = document.getElementById('courtModeSelect');
    if (courtSelect) courtSelect.value = this.state.courtMode;

    this.scene3d.setTargetZone(this.state.courtMode, this.state.side);
    this.recomputeSimulation({ source: 'racket' });
    this.currentTime = WINDUP_START_TIME;
    this.isPlaying = true;
    this._updatePlayButtonUI();
  }

  /**
   * Bidirectional Physics Recompute:
   * - If `source === 'hud'`, runs `solveRacketFromTargetLaunch()` to back-solve `racketSpeedKmh`, `swingPathDeg`, `faceAngleDeg`
   *   so the Racket sliders & 3D swing biomechanics match the user's desired Launch Speed / Spin / Angle!
   * - If `source === 'racket'`, runs `computeRacketBallImpact()` forward to compute `speedKmh`, `launchAngleDeg`, `topspinRpm`.
   */
  recomputeSimulation({ source = 'racket', skipChain = false } = {}) {
    if (source === 'hud') {
      const solved = solveRacketFromTargetLaunch({
        targetSpeedKmh: this.state.speedKmh,
        targetLaunchAngleDeg: this.state.launchAngleDeg,
        targetTopspinRpm: this.state.topspinRpm,
        incomingSpeedKmh: this.state.incomingSpeedKmh,
        incomingAngleDeg: this.state.incomingAngleDeg,
        incomingSpinRpm: this.state.incomingSpinRpm,
        stringTensionKg: this.state.stringTensionKg,
        hitZ: this.state.hitZ
      });
      this.state.racketSpeedKmh = solved.racketSpeedKmh;
      this.state.swingPathDeg = solved.swingPathDeg;
      this.state.faceAngleDeg = solved.faceAngleDeg;
    }

    const impact = computeRacketBallImpact(this.state);
    this.lastImpactInfo = impact;

    if (source === 'racket') {
      this.state.speedKmh = impact.launchSpeedKmh;
      this.state.launchAngleDeg = impact.launchAngleDeg;
      this.state.topspinRpm = impact.topspinRpm;
    }

    // Sync sidebar sliders
    this.sliderBindings.forEach((b) => {
      const el = document.getElementById(b.id);
      const valEl = document.getElementById(`${b.id}Val`);
      const v = this.state[b.key];
      if (el && document.activeElement !== el) {
        el.value = v;
      }
      if (valEl && typeof v === 'number') {
        valEl.textContent = b.fmt(v);
      }
    });

    // Update Incoming Ball Effect Card
    if (impact.incomingEffect) {
      const { deltaSpeedKmh, deltaAngleDeg, deltaSpinRpm } = impact.incomingEffect;
      const spdSign = deltaSpeedKmh >= 0 ? '+' : '';
      const angSign = deltaAngleDeg >= 0 ? '+' : '';
      const spnSign = deltaSpinRpm >= 0 ? '+' : '';

      document.getElementById('effDeltaSpeed').textContent = `${spdSign}${this.formatSpeed(deltaSpeedKmh, 1)}`;
      document.getElementById('effDeltaAngle').textContent = `${angSign}${deltaAngleDeg.toFixed(1)}°`;
      document.getElementById('effDeltaSpin').textContent = `${spnSign}${Math.round(deltaSpinRpm)} RPM`;
    }

    this.simResult = simulateTrajectory(this.state);
    this.ghostSimResult = simulateTrajectory({
      ...this.state,
      topspinRpm: 0,
      sidespinRpm: 0
    });

    // Save current turn state & chain to subsequent rally turns if edited
    if (this.rallyTurns[this.currentTurnIndex]) {
      Object.assign(this.rallyTurns[this.currentTurnIndex], {
        courtMode: this.state.courtMode,
        hitX: this.state.hitX,
        hitY: this.state.hitY,
        hitZ: this.state.hitZ,
        racketSpeedKmh: this.state.racketSpeedKmh,
        swingPathDeg: this.state.swingPathDeg,
        faceAngleDeg: this.state.faceAngleDeg,
        aimAngleDeg: this.state.aimAngleDeg,
        incomingSpeedKmh: this.state.incomingSpeedKmh,
        incomingAngleDeg: this.state.incomingAngleDeg,
        incomingSpinRpm: this.state.incomingSpinRpm,
        stringTensionKg: this.state.stringTensionKg,
        sidespinRpm: this.state.sidespinRpm,
        speedKmh: this.state.speedKmh,
        launchAngleDeg: this.state.launchAngleDeg,
        topspinRpm: this.state.topspinRpm,
        targetSpeedKmh: this.state.speedKmh,
        targetLaunchAngleDeg: this.state.launchAngleDeg,
        targetTopspinRpm: this.state.topspinRpm
      });
      if (!skipChain) {
        this._rechainRallyFromTurn(this.currentTurnIndex);
        this._renderTurnChainUI();
      }
    }

    this.scene3d.updateTrajectory(this.simResult, this.ghostSimResult);
    this.timelineSlider.min = WINDUP_START_TIME.toFixed(3);
    this.timelineSlider.max = this.simResult.totalDuration.toFixed(3);
    if (this.currentTime > this.simResult.totalDuration) {
      this.currentTime = this.simResult.totalDuration;
    }

    this._updateRacketImpact3D();
    this._updateTopLeftInteractiveHUD();
    this.updateScrubberFrame();
  }

  updateScrubberFrame() {
    if (!this.simResult || !this.simResult.points.length) return;

    const pts = this.simResult.points;
    const t = Math.max(WINDUP_START_TIME, Math.min(this.simResult.totalDuration, this.currentTime));

    this.scene3d.updatePlayerAndRacket(this.state, t, this.simResult);

    const activePlayerEl = document.getElementById('instActivePlayer');
    if (activePlayerEl) {
      activePlayerEl.textContent =
        this.state.side === 'A'
          ? this.lang === 'zh'
            ? this.rallyMeta.playerAZh
            : this.rallyMeta.playerAEn
          : this.lang === 'zh'
          ? this.rallyMeta.playerBZh
          : this.rallyMeta.playerBEn;
    }

    if (t < 0) {
      this.scene3d.updateBallAtFrame(null, {
        t,
        side: this.state.side,
        hitX: this.state.hitX,
        hitY: this.state.hitY,
        hitZ: this.state.hitZ,
        incomingSpeedKmh: this.state.incomingSpeedKmh,
        incomingAngleDeg: this.state.incomingAngleDeg,
        incomingSpinRpm: this.state.incomingSpinRpm
      });

      if (document.activeElement !== this.timelineSlider) {
        this.timelineSlider.value = t;
      }
      document.getElementById('timeDisplay').textContent = `${t.toFixed(2)}s / ${this.simResult.totalDuration.toFixed(2)}s`;
      document.getElementById('instSpeed').textContent =
        this.state.hitZ > 1.95 || this.state.incomingSpeedKmh < 2
          ? this.lang === 'zh'
            ? '定点抛球'
            : 'Toss'
          : this.formatSpeed(this.state.incomingSpeedKmh, 0);
      document.getElementById('instHeight').textContent = `${this.state.hitZ.toFixed(2)} m`;
      document.getElementById('instPos').textContent = `${this.state.hitX.toFixed(2)}, ${this.state.hitY.toFixed(2)}m`;
      document.getElementById('instSpin').textContent = `${Math.round(this.state.incomingSpinRpm)} RPM`;
      document.getElementById('instAero').textContent = this.lang === 'zh' ? '引拍阶段' : 'Takeback';
      return;
    }

    const dt = 0.002;
    const idx = Math.min(pts.length - 1, Math.max(0, Math.floor(t / dt)));
    const pt = pts[idx];

    this.scene3d.updateBallAtFrame(pt, null);

    if (document.activeElement !== this.timelineSlider) {
      this.timelineSlider.value = t;
    }
    document.getElementById('timeDisplay').textContent = `${t.toFixed(2)}s / ${this.simResult.totalDuration.toFixed(2)}s`;

    document.getElementById('instSpeed').textContent = this.formatSpeed(pt.speedKmh, 1);
    document.getElementById('instHeight').textContent = `${pt.z.toFixed(2)} m`;
    document.getElementById('instPos').textContent = `${pt.x.toFixed(2)}, ${pt.y.toFixed(2)}m`;
    document.getElementById('instSpin').textContent = `${Math.round(pt.rpm)} RPM`;
    document.getElementById('instAero').textContent = `Cd ${pt.cd.toFixed(2)} / Cl ${pt.cl.toFixed(2)}`;
  }

  /**
   * Updates the Architectural Top-Left Interactive Telemetry Module
   */
  _updateTopLeftInteractiveHUD() {
    const res = this.simResult;
    const { speedKmh, topspinRpm, sidespinRpm, launchAngleDeg } = this.state;

    const hudTurnBadge = document.getElementById('hudTurnBadge');
    if (hudTurnBadge) {
      const turnTag = `#${this.currentTurnIndex + 1} (${this.state.side})`;
      hudTurnBadge.textContent =
        this.lang === 'zh' ? `${turnTag} 鹰眼判罚 // 第一落点` : `${turnTag} LINE CALL // 1ST BOUNCE`;
    }

    // 1. Launch Velocity Cell
    document.getElementById('hudSpeedBig').textContent = this.formatSpeed(speedKmh, 1);
    document.getElementById('hudApexBadge').textContent = `APEX ${res.maxHeightM.toFixed(2)}m`;
    const hudSpeedSlider = document.getElementById('hudSpeedSlider');
    if (hudSpeedSlider && document.activeElement !== hudSpeedSlider) {
      hudSpeedSlider.value = speedKmh;
    }

    // 2. Spin Rate Cell
    const absRpm = Math.abs(Math.round(topspinRpm));
    const isTop = topspinRpm >= 0;
    const spinBigEl = document.getElementById('hudSpinBig');
    spinBigEl.textContent = `${isTop ? '+' : '-'}${absRpm} RPM`;
    spinBigEl.className = `tel-big-mono ${isTop ? 'text-rose' : 'text-blue'}`;
    document.getElementById('hudSpinTypePill').textContent =
      this.lang === 'zh'
        ? isTop
          ? '上旋 TOPSPIN'
          : '切削 SLICE'
        : isTop
        ? 'TOPSPIN'
        : 'SLICE';

    const sideSign = sidespinRpm >= 0 ? '+' : '';
    document.getElementById('hudMagnusInfo').textContent =
      this.lang === 'zh'
        ? `侧旋 ${sideSign}${Math.round(sidespinRpm)} RPM`
        : `Side ${sideSign}${Math.round(sidespinRpm)} RPM`;

    const hudSpinSlider = document.getElementById('hudSpinSlider');
    if (hudSpinSlider && document.activeElement !== hudSpinSlider) {
      hudSpinSlider.value = topspinRpm;
    }

    // 3. Net Clearance Cell
    const netEl = document.getElementById('statNetClearance');
    if (res.netClearanceM !== null) {
      const cm = res.netClearanceM * 100;
      netEl.textContent = `${cm >= 0 ? '+' : ''}${cm.toFixed(1)} cm`;
      netEl.className = `tel-big-mono ${cm >= 0 && !res.hitNet ? 'text-ok' : 'text-err'}`;
    } else {
      netEl.textContent = this.lang === 'zh' ? '未过网' : 'SHORT';
      netEl.className = 'tel-big-mono text-err';
    }

    const netHAtPass = res.netPassPoint ? (res.netPassPoint.netHeightAtY * 100).toFixed(1) : '91.4';
    document.getElementById('hudLaunchAngleInfo').textContent =
      this.lang === 'zh'
        ? `仰角 ${launchAngleDeg >= 0 ? '+' : ''}${launchAngleDeg.toFixed(1)}° (网高 ${netHAtPass}cm)`
        : `Launch ${launchAngleDeg >= 0 ? '+' : ''}${launchAngleDeg.toFixed(1)}° (Net ${netHAtPass}cm)`;

    const hudAngleSlider = document.getElementById('hudAngleSlider');
    if (hudAngleSlider && document.activeElement !== hudAngleSlider) {
      hudAngleSlider.value = launchAngleDeg;
    }

    this._drawHudNetGauge(res);

    // 4. Line Call & 1st Bounce Cell
    const badge = document.getElementById('hawkeyeCallBadge');
    const detail = document.getElementById('hawkeyeCallDetail');
    const landEl = document.getElementById('statLandingCoord');
    const bounceSpeedEl = document.getElementById('statBounceSpeed');

    if (res.firstBounce) {
      const b = res.firstBounce;
      badge.textContent = this.lang === 'zh' ? b.callTextZh : b.callTextEn;
      badge.className = `call-tag ${b.isIn ? 'call-in' : 'call-out'}`;

      const distFromBaselineM = ITF_COURT.halfLength - b.localX;
      if (this.lang === 'zh') {
        detail.textContent = b.isIn
          ? `界内余量 ${b.marginCm} cm · 距底线 ${distFromBaselineM.toFixed(2)} m`
          : `出界幅度 ${b.marginCm} cm · 距底线 ${Math.abs(distFromBaselineM).toFixed(2)} m`;
      } else {
        detail.textContent = b.isIn
          ? `Margin ${b.marginCm} cm · Baseline ${distFromBaselineM.toFixed(2)} m`
          : `Out by ${b.marginCm} cm · Baseline ${Math.abs(distFromBaselineM).toFixed(2)} m`;
      }

      landEl.textContent = `X ${b.x.toFixed(2)} / Y ${b.y.toFixed(2)}m`;
      bounceSpeedEl.textContent = `${this.formatSpeed(b.speedBeforeKmh, 0)} → ${this.formatSpeed(
        b.speedAfterKmh,
        0
      )} (${b.reboundAngleDeg.toFixed(1)}°)`;
    } else {
      badge.textContent = this.lang === 'zh' ? 'OUT (出界)' : 'OUT (LONG)';
      badge.className = 'call-tag call-out';
      detail.textContent = this.lang === 'zh' ? '飞出球场围栏范围' : 'Beyond court boundary';
      landEl.textContent = '—';
      bounceSpeedEl.textContent = '—';
    }
  }

  /**
   * Draws the Precision Net Clearance Gauge inside the Top-Left Telemetry Module
   */
  _drawHudNetGauge(res) {
    const canvas = document.getElementById('hudNetGaugeCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const groundY = H - 7;
    const netTopY = groundY - 24;

    ctx.strokeStyle = '#a1a1aa';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(4, groundY);
    ctx.lineTo(W - 4, groundY);
    ctx.stroke();

    const netX = W / 2;
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(netX, groundY);
    ctx.lineTo(netX, netTopY);
    ctx.stroke();

    ctx.fillStyle = '#09090b';
    ctx.fillRect(netX - 3, netTopY - 2, 6, 4);

    if (res.netPassPoint && res.netClearanceM !== null) {
      const clearancePx = Math.max(-20, Math.min(25, res.netClearanceM * 24));
      const ballY = netTopY - clearancePx - 5;

      ctx.strokeStyle = res.hitNet ? '#b91c1c' : '#15803d';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(netX, netTopY);
      ctx.lineTo(netX, ballY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = res.hitNet ? '#b91c1c' : '#65a30d';
      ctx.beginPath();
      ctx.arc(netX, ballY, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  /**
   * Animates the Mini Spinning Tennis Ball in the Top-Left Telemetry Module
   */
  _drawHudSpinningBall(dtSec) {
    const canvas = document.getElementById('hudSpinBallCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const rpm = this.state.topspinRpm;
    const visualOmega = (rpm / 600) * Math.PI;
    this.hudBallPhase += visualOmega * dtSec;

    const cx = W / 2;
    const cy = H / 2;
    const R = 21;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.hudBallPhase);

    const grad = ctx.createRadialGradient(-5, -5, 2, 0, 0, R);
    grad.addColorStop(0, '#ecfccb');
    grad.addColorStop(0.5, '#a3e635');
    grad.addColorStop(1, '#4d7c0f');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(-R * 0.58, 0, R * 0.65, -0.85, 0.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(R * 0.58, 0, R * 0.65, Math.PI - 0.85, Math.PI + 0.85);
    ctx.stroke();
    ctx.restore();

    if (Math.abs(rpm) > 20) {
      const isTop = rpm > 0;
      ctx.strokeStyle = isTop ? '#e11d48' : '#0284c7';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      if (isTop) {
        ctx.arc(cx, cy, R + 6, -Math.PI * 0.7, Math.PI * 0.25, false);
      } else {
        ctx.arc(cx, cy, R + 6, Math.PI * 0.7, -Math.PI * 0.25, true);
      }
      ctx.stroke();
    }
  }

  /**
   * Updates the 3D Interactive Racket-Ball Impact Studio & 4-Cell Readout Bar
   */
  _updateRacketImpact3D() {
    if (this.racket3d) {
      this.racket3d.updateFromState(this.state);
    }

    const { swingPathDeg, faceAngleDeg, aimAngleDeg } = this.state;
    const attackDeg = swingPathDeg - faceAngleDeg;

    const rmFaceVal = document.getElementById('rmFaceVal');
    if (rmFaceVal) {
      rmFaceVal.textContent = `${faceAngleDeg >= 0 ? '+' : ''}${faceAngleDeg.toFixed(1)}°`;
    }

    const rmSwingVal = document.getElementById('rmSwingVal');
    if (rmSwingVal) {
      rmSwingVal.textContent = `${swingPathDeg >= 0 ? '+' : ''}${swingPathDeg.toFixed(1)}°`;
    }

    const attackBadge = document.getElementById('attackAngleBadge');
    if (attackBadge) {
      attackBadge.textContent = `${attackDeg >= 0 ? '+' : ''}${attackDeg.toFixed(1)}°`;
    }

    const rmAimVal = document.getElementById('rmAimVal');
    if (rmAimVal) {
      const prefix =
        this.lang === 'zh'
          ? aimAngleDeg > 0
            ? '左+'
            : aimAngleDeg < 0
            ? '右'
            : ''
          : aimAngleDeg > 0
          ? 'L+'
          : aimAngleDeg < 0
          ? 'R'
          : '';
      rmAimVal.textContent = `${prefix}${aimAngleDeg.toFixed(1)}°`;
    }
  }

  _updatePlayButtonUI() {
    const btn = document.getElementById('btnPlayPause');
    if (!btn) return;
    if (this.lang === 'zh') {
      btn.textContent = this.isPlaying ? '暂停' : '播放动画';
    } else {
      btn.textContent = this.isPlaying ? 'PAUSE' : 'PLAY';
    }
  }

  _startPlaybackLoop() {
    const tick = (now) => {
      const dtSec = Math.min(0.05, (now - this.lastFrameTs) / 1000);
      this.lastFrameTs = now;

      this._drawHudSpinningBall(dtSec);
      if (this.racket3d) {
        this.racket3d.renderStep(dtSec);
      }

      if (this.isPlaying && this.simResult) {
        this.currentTime += dtSec * this.playbackSpeed;

        // If playing full rally and ball reaches opponent's post-bounce strike zone, hand off to next turn!
        const handoffTime = this.simResult.interceptPoint
          ? this.simResult.interceptPoint.t
          : this.simResult.totalDuration;

        if (
          this.isPlayingFullRally &&
          this.currentTurnIndex + 1 < this.rallyTurns.length &&
          this.currentTime >= handoffTime
        ) {
          this.selectTurn(this.currentTurnIndex + 1, true);
          requestAnimationFrame(tick);
          return;
        }

        if (this.currentTime >= this.simResult.totalDuration) {
          this.currentTime = this.simResult.totalDuration;
          this.isPlaying = false;
          this.isPlayingFullRally = false;
          this._updatePlayButtonUI();
          this._renderTurnChainUI();
        }
        this.updateScrubberFrame();
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.tennisApp = new TennisSimApp();
});
