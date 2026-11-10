/**
 * Main application controller for AERO-LAB, a tennis ball-flight teaching simulator.
 * 1. Two-way coupling between racket sliders and launch HUD (3x3 Jacobian inverse solver)
 * 2. Turn-based two-player rallies with automatic post-bounce hand-off
 * 3. Illustrative (hand-tuned) player presets and rally scripts, plus a CSV / JSON importer
 * 4. 3D racket / player visualisation
 */

import {
  ITF_COURT,
  computeRacketBallImpact,
  solveRacketFromTargetLaunch,
  simulateTrajectory,
  samplePointAtTime,
  airDensityFromConditions,
  chainRallyTurns
} from './physics.js?v=41';
import {
  SHOT_PRESETS,
  INCOMING_PRESETS,
  EXAMPLE_RALLIES,
  TACTICAL_LESSONS,
  evaluateTacticalAttempt,
  describeTacticalGoal
} from './presets.js?v=41';
import { TennisScene3D } from './scene3d.js?v=41';
import { RacketDiagram } from './racketDiagram.js?v=41';
import { LessonMap } from './lessonMap.js?v=41';

const WINDUP_START_TIME = -0.35;
const KG_TO_LBS = 2.20462262;

const I18N = {
  zh: {
    loadKicker: '交互式物理教学模拟',
    loadModeSoloTag: '默认',
    loadModeSoloTitle: '单人球速实验室',
    loadModeSoloDesc: '主动发力 vs 来球借力，四种击球动作',
    loadModeRallyTag: '回合',
    loadModeRallyTitle: '双人多拍回合',
    loadModeRallyDesc: '两人轮流击球，落点自动接力',
    loadModeTacticsTag: '战术',
    loadModeTacticsTitle: '战术教学',
    loadModeTacticsDesc: '看示范，再自己调参打进靶区',
    btnEnterLab: '进入实验室 →',
    brandSub: '网球弹道教学模拟器',
    grpPosition: '击球位置',
    grpEnvironment: '环境',
    btnWelcomePage: '启动页',
    btnValidation: '验证',
    linkValidation: '模型说明与验证 →',
    loadHeadline: '3D 网球<span>弹道与击球教学模拟器</span>',
    loadSubtext:
      '调节挥拍与来球参数，看球速、旋转和落点如何变化。气动力采用 Štěpánek (1988) 拟合式，拍球与落地碰撞采用 Cross 刚体模型；球员预设为手调示例，并非实测数据。',
    soloSectionTitle: '模式与球员预设',
    modeBtnSolo: '单人球速',
    modeBtnRally: '双人回合',
    modeBtnTactics: '战术教学',
    lblStrokeType: '击球动作',
    strokeFH: '正手 FH',
    strokeBH2: '双反 2H',
    strokeBH1: '单反 1H',
    strokeServe: '发球',
    sscTitle: '球速合成剖析',
    sscActiveLbl: '主动发力',
    sscBorrowLbl: '来球借力',
    sscCorLbl: '拍面 e_A',
    sscDwellLbl: '驻留/形变 (估算)',
    sscSecondBounceLbl: '二跳深度',
    unitSpeedLabel: '速度单位',
    unitTensionLabel: '穿线张力',
    rallySectionTitle: '赛事回合与球员预设',
    btnReset: '重置',
    btnImportAtp: '导入',
    lblRallyPreset: '示例多拍回合',
    shotPresetLabel: '风格预设 (手调参数)',
    btnNextTurn: '+ 下一拍回击',
    racketVizTitle: '拍面触球示意',
    rViewTop: '俯视',
    rViewSide: '侧视',
    rmFace: '拍面',
    rmSwing: '轨迹',
    rmAttack: '攻角',
    rmAim: '方向',
    tabRacket: '挥拍',
    tabIncoming: '来球',
    tabPosition: '场地',
    lblRacketSpeed: '挥拍速度',
    lblSwingPath: '挥拍仰角',
    lblFaceAngle: '拍面倾角',
    lblAimAngle: '水平方向',
    lblStringTension: '穿线张力',
    lblIncomingPreset: '来球预设',
    lblIncomingSpeed: '来球速度',
    lblIncomingAngle: '入射仰角',
    lblIncomingSpin: '来球旋转',
    incomingEffectTitle: '借力增量 (对比定点球)',
    effBorrowSpeed: '借力球速',
    effLaunchAngle: '仰角偏移',
    effSpinChange: '转速变化',
    lblCourtMode: '判罚界线',
    optSingles: '单打 (Singles)',
    optDoubles: '双打 (Doubles)',
    optServeDeuce: '平分跳发 (Deuce)',
    optServeAd: '占先发球 (Ad)',
    lblSurface: '场地材质',
    optHard: '硬地 (Hard)',
    optClay: '红土 (Clay)',
    optGrass: '草地 (Grass)',
    lblHitX: '前后站位 X',
    lblHitY: '左右站位 Y',
    lblHitZ: '击球高度 Z',
    lblSidespin: '侧旋转速',
    lblWind: '纵向风 (+ 顺风)',
    lblCrossWind: '横向风 (+ 吹向左侧)',
    lblTemperature: '气温',
    lblAltitude: '海拔',
    hudTitleCall: '落点判罚',
    hudTitleSpeed: '出球速度',
    hudTitleSpin: '旋转转速',
    hudTitleNet: '过网净空',
    btnJumpBounce: '落点',
    btnJumpNet: '过网',
    camCloseup: '特写',
    camBroadcast: '全景',
    camSide: '侧面',
    camPov: '主视角',
    camHawkeye: '判线',
    camTop: '俯视',
    chkVectors: '物理矢量',
    chkGhost: '无旋对比',
    chkTrueScale: '真实球径',
    themeLight: '浅色',
    themeDark: '深色',
    chkStands: '观众席',
    hintDragPlayer: '长按球员可拖动站位',
    legIncoming: '来球',
    legPreBounce: '飞行',
    legPostBounce: '反弹',
    legMagnus: '马格努斯力',
    legNoSpin: '无旋基准',
    btnPlayFullRally: '连播回合',
    btnRestart: '重播',
    btnSnapImpact: '触球 t=0',
    spd015: '0.15x',
    spd025: '0.25x',
    spd040: '0.40x',
    spd100: '1.00x',
    telTurn: '球员',
    telSpeed: '球速',
    telHeight: '高度 Z',
    telPos: '坐标',
    telSpin: '转速',
    telAero: '气动',
    modalImportTitle: '导入出球参数 (CSV / JSON)',
    modalImportDesc:
      '每行一拍（速度km/h, 转速RPM, 仰角°, 水平角°, X, Y, Z），系统用逆解算反推挥拍参数。示例数据为虚构：',
    btnCancel: '取消',
    btnApplyImport: '解析生成',
    tabTactics: '战术',
    btnTacticDemo: '看示范',
    btnTacticChallenge: '自己打',
    btnExitTactics: '退出',
    btnShortDemo: '示范',
    btnShortChallenge: '自己打',
    btnTacticReset: '重来',
    btnTacticAnswer: '看答案',
    tacticalHowTo: '用挥拍滑块或示意图里的旋钮调这一拍；长按 3D 里的球员可以换站位。',
    tacDecisive: '关键拍',
    tacBest: '最佳',
    tacTries: (n) => `${n} 次尝试`,
    tacPassed: '已完成',
    tacWatching: '示范中',
    tacShotOf: (i, n) => `第 ${i}/${n} 拍`,
    tacOnTurn: (i) => `第 ${i} 拍是你来打的。先看完示范，或直接点「自己打」。`,
    tacMapLabel: '俯视球场：目标区、球路和落点',
    tacAnswerShown: '这是示范的参数。改动任意一项再试试。',
    btnMobileExpand3D: '全屏球场'
  },
  en: {
    loadKicker: 'Interactive physics teaching sim',
    loadModeSoloTag: 'Default',
    loadModeSoloTitle: 'Solo Ball Speed Lab',
    loadModeSoloDesc: 'Own swing vs borrowed pace, four strokes',
    loadModeRallyTag: 'Rally',
    loadModeRallyTitle: '2-Player Rally',
    loadModeRallyDesc: 'Two players take turns; bounces chain automatically',
    loadModeTacticsTag: 'Tactics',
    loadModeTacticsTitle: 'Tactics Lessons',
    loadModeTacticsDesc: 'Watch the demo, then tune your shot into the target',
    btnEnterLab: 'Enter the lab →',
    brandSub: 'Tennis ball-flight teaching simulator',
    grpPosition: 'Hitting position',
    grpEnvironment: 'Environment',
    btnWelcomePage: 'Welcome',
    btnValidation: 'Validation',
    linkValidation: 'Model notes & validation →',
    loadHeadline: '3D Tennis<span>Ball-Flight Teaching Simulator</span>',
    loadSubtext:
      'Change the swing and the incoming ball and watch speed, spin and landing point respond. Aerodynamics use the Štěpánek (1988) fits; racket and court impacts use Cross-style rigid-body models. Player presets are hand-tuned examples, not measured data.',
    soloSectionTitle: 'Stroke and preset',
    modeBtnSolo: 'Solo Lab',
    modeBtnRally: '2P Rally',
    modeBtnTactics: 'Tactics',
    lblStrokeType: 'Stroke',
    strokeFH: 'Forehand',
    strokeBH2: '2H-BH',
    strokeBH1: '1H-BH',
    strokeServe: 'Serve',
    sscTitle: 'Ball speed breakdown',
    sscActiveLbl: 'Active Power',
    sscBorrowLbl: 'Borrowed Pace',
    sscCorLbl: 'e_A',
    sscDwellLbl: 'Dwell/Defl (est.)',
    sscSecondBounceLbl: '2nd Bounce',
    unitSpeedLabel: 'Speed',
    unitTensionLabel: 'Tension',
    rallySectionTitle: 'Rally',
    btnReset: 'Reset',
    btnImportAtp: 'Import',
    lblRallyPreset: 'Example Rally',
    shotPresetLabel: 'Style Preset (hand-tuned)',
    btnNextTurn: '+ Next Shot',
    racketVizTitle: 'Impact view (illustrative)',
    rViewTop: 'Top',
    rViewSide: 'Side',
    rmFace: 'Face',
    rmSwing: 'Swing',
    rmAttack: 'Attack',
    rmAim: 'Aim',
    tabRacket: 'Swing',
    tabIncoming: 'Incoming',
    tabPosition: 'Court',
    lblRacketSpeed: 'Swing Speed',
    lblSwingPath: 'Swing Path',
    lblFaceAngle: 'Face Tilt',
    lblAimAngle: 'Horiz Aim',
    lblStringTension: 'Tension',
    lblIncomingPreset: 'Incoming Preset',
    lblIncomingSpeed: 'Incoming Speed',
    lblIncomingAngle: 'Incoming Angle',
    lblIncomingSpin: 'Incoming Spin',
    incomingEffectTitle: 'Borrowed Pace Delta',
    effBorrowSpeed: 'Pace Gain',
    effLaunchAngle: 'Angle Shift',
    effSpinChange: 'Spin Delta',
    lblCourtMode: 'Court Lines',
    optSingles: 'Singles',
    optDoubles: 'Doubles',
    optServeDeuce: 'Deuce Box',
    optServeAd: 'Ad Box',
    lblSurface: 'Surface',
    optHard: 'Hard',
    optClay: 'Clay',
    optGrass: 'Grass',
    lblHitX: 'Depth X',
    lblHitY: 'Lateral Y',
    lblHitZ: 'Height Z',
    lblSidespin: 'Sidespin',
    lblWind: 'Tail wind (+)',
    lblCrossWind: 'Cross Wind (+ to left)',
    lblTemperature: 'Temperature',
    lblAltitude: 'Altitude',
    hudTitleCall: 'Line call',
    hudTitleSpeed: 'Launch speed',
    hudTitleSpin: 'Spin',
    hudTitleNet: 'Net clearance',
    btnJumpBounce: 'Focus',
    btnJumpNet: 'Focus',
    camCloseup: 'Close-Up',
    camBroadcast: 'Broadcast',
    camSide: 'Side',
    camPov: 'POV',
    camHawkeye: 'Line Cam',
    camTop: 'Top',
    chkVectors: 'Vectors',
    chkGhost: 'No-Spin',
    chkTrueScale: '1:1 Ball',
    themeLight: 'Light',
    themeDark: 'Dark',
    chkStands: 'Stands',
    hintDragPlayer: 'Long-press the player to move them',
    legIncoming: 'Incoming',
    legPreBounce: 'Flight',
    legPostBounce: 'Rebound',
    legMagnus: 'Magnus',
    legNoSpin: 'No-Spin',
    btnPlayFullRally: 'Full Rally',
    btnRestart: 'Replay',
    btnSnapImpact: 'Impact t=0',
    spd015: '0.15x',
    spd025: '0.25x',
    spd040: '0.40x',
    spd100: '1.00x',
    telTurn: 'Player',
    telSpeed: 'Speed',
    telHeight: 'Height Z',
    telPos: 'Coords',
    telSpin: 'Spin',
    telAero: 'Aero',
    modalImportTitle: 'Import Launch Data (CSV / JSON)',
    modalImportDesc:
      'One shot per line (speedKmh, topspinRpm, launchAngleDeg, aimAngleDeg, hitX, hitY, hitZ); racket parameters are back-solved. Sample rows are made up:',
    btnCancel: 'Cancel',
    btnApplyImport: 'Build Rally',
    tabTactics: 'Tactics',
    btnTacticDemo: 'Watch',
    btnTacticChallenge: 'Your turn',
    btnExitTactics: 'Exit',
    btnShortDemo: 'Watch',
    btnShortChallenge: 'Your turn',
    btnTacticReset: 'Reset',
    btnTacticAnswer: 'Show answer',
    tacticalHowTo: 'Tune this shot with the swing sliders or the dials in the diagram. Long-press the player in 3D to move them.',
    tacDecisive: 'Key shot',
    tacBest: 'Best',
    tacTries: (n) => (n === 1 ? '1 try' : `${n} tries`),
    tacPassed: 'Done',
    tacWatching: 'Watching',
    tacShotOf: (i, n) => `Shot ${i}/${n}`,
    tacOnTurn: (i) => `Shot ${i} is yours. Watch the demo first, or go straight to Your turn.`,
    tacMapLabel: 'Court from above: target, ball path and landing',
    tacAnswerShown: 'These are the demo settings. Change anything and try again.',
    btnMobileExpand3D: 'Expand 3D'
  }
};

/** Reads a colour token from the stylesheet so canvas drawings follow the palette. */
function cssToken(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** Fills the part of a range track left of the thumb (CSS reads --pct). */
function paintRange(el) {
  const min = Number(el.min || 0);
  const max = Number(el.max || 100);
  const pct = max > min ? ((Number(el.value) - min) / (max - min)) * 100 : 0;
  el.style.setProperty('--pct', `${Math.max(0, Math.min(100, pct))}%`);
}

function paintAllRanges() {
  document.querySelectorAll('input[type="range"]').forEach(paintRange);
}

document.addEventListener('input', (e) => {
  if (e.target instanceof HTMLInputElement && e.target.type === 'range') paintRange(e.target);
});

// Buttons inside the collapsible racket panel header must not toggle the panel.
document.querySelector('#racketVizDetails > summary')?.addEventListener('click', (e) => {
  if (e.target.closest('button')) e.preventDefault();
});

class TennisSimApp {
  constructor() {
    this.lang = 'zh';
    this.speedUnit = 'kmh';
    this.tensionUnit = 'lbs';
    this.appMode = 'solo'; // Default mode: Solo Ball Speed & Biomechanics Lab!

    this.currentRallyKey = 'ao2024_sinner_medvedev';
    this.activeTacticalKey = null;
    this.tacticalMode = 'demo';
    this.rallyMeta = {
      playerAZh: 'C. Alcaraz (单人实验室)',
      playerBZh: 'D. Medvedev (远端 B)',
      playerAEn: 'C. Alcaraz (Solo Lab)',
      playerBEn: 'D. Medvedev (Far B)'
    };
    this.rallyTurns = [];
    this.currentTurnIndex = 0;
    this.isPlayingFullRally = false;

    this.state = {
      side: 'A',
      strokeType: 'fh',
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

      temperatureC: 20,
      altitudeM: 0,
      windSpeedKmh: 0,
      crossWindKmh: 0
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
    this._initMobileShell();
    this._initLoadingScreen();
    this._applyLanguageUI();
    // Initialize in Default Mode: Solo Ball Speed & Biomechanics Lab
    this.setAppMode('solo');
    this.applyPreset('alcaraz_fh');
    this.setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
    this._startPlaybackLoop();
  }

  _init3D() {
    const viewportEl = document.getElementById('viewport3d');
    this.scene3d = new TennisScene3D(viewportEl);
    this.scene3d.onClipsLoaded = () => this.updateScrubberFrame();
    // Long-press the hitter in 3D and drag: moves the contact point (the player follows)
    this.scene3d.onPlayerDrag = ({ phase, dWorldX = 0, dWorldY = 0 }) => {
      if (phase === 'start') {
        this._dragBase = { hitX: this.state.hitX, hitY: this.state.hitY };
        return;
      }
      if (phase !== 'move' || !this._dragBase) return;
      const sign = this.state.side === 'B' ? -1 : 1; // player B hits in the mirrored frame
      const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
      this.state.hitX = Math.round(clamp(this._dragBase.hitX + sign * dWorldX, -14.5, -1.0) * 20) / 20;
      this.state.hitY = Math.round(clamp(this._dragBase.hitY + sign * dWorldY, -5.4, 5.4) * 20) / 20;
      this.recomputeSimulation({ source: 'racket' });
    };

    const racketCanvasEl = document.getElementById('racketImpactCanvas');
    if (racketCanvasEl) {
      this.racket3d = new RacketDiagram(racketCanvasEl);
      // Dragging a dial in the diagram behaves exactly like moving the matching slider
      this.racket3d.onChange = (key, value) => {
        this.state[key] = value;
        this.recomputeSimulation({ source: 'racket' });
      };
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
      for (const [k, r] of Object.entries(EXAMPLE_RALLIES)) {
        const opt = document.createElement('option');
        opt.value = k;
        opt.textContent = this.lang === 'zh' ? r.nameZh : r.nameEn;
        rallySelect.appendChild(opt);
      }
      if (EXAMPLE_RALLIES[curRally]) {
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

    this._renderLessonList();
  }

  /**
   * Phone shell (< 768px): the court fills the screen and the controls live in a bottom
   * sheet with three snap heights. Existing elements are moved (not copied) so every
   * event binding keeps working; they go back to their desktop places on wider screens.
   */
  _initMobileShell() {
    const mq = window.matchMedia('(max-width: 767px)');
    const root = document.documentElement;
    const sheet = document.getElementById('mobileSheet');
    const handle = document.getElementById('mobileSheetHandle');
    const peek = document.getElementById('mobileSheetPeek');
    const body = document.getElementById('mobileSheetBody');
    const topbar = document.querySelector('.topbar');
    const footer = document.querySelector('.sidebar-footer');
    if (!sheet || !handle || !peek || !body || !topbar || !footer) return;

    const settingsRow = document.createElement('div');
    settingsRow.className = 'm-settings-row';
    const moves = [
      [document.querySelector('.scrubber-bar'), peek],
      [document.getElementById('interactiveHudLeft'), body],
      [document.getElementById('tacticalHudBanner'), body],
      [document.querySelector('.view-toolbar'), body],
      [document.querySelector('.sidebar'), body],
      [document.getElementById('themeSwitchGroup'), settingsRow],
      [document.getElementById('langSwitchGroup'), settingsRow],
      [document.querySelector('.topbar-actions a.ghost-btn'), settingsRow],
      [document.getElementById('btnReopenWelcome'), settingsRow]
    ].filter(([node]) => node);
    const homes = new Map();

    const safeBottom = () => {
      const probe = document.createElement('div');
      probe.style.cssText = 'position:fixed;visibility:hidden;padding-bottom:env(safe-area-inset-bottom,0px)';
      document.body.appendChild(probe);
      const v = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
      probe.remove();
      return v;
    };
    const viewportH = () => (window.visualViewport ? window.visualViewport.height : window.innerHeight);
    const snapPx = (name) => {
      const vh = viewportH();
      const top = topbar.offsetHeight;
      if (name === 'peek') return handle.offsetHeight + peek.offsetHeight + safeBottom() + 1;
      if (name === 'full') return Math.round(vh - top);
      return Math.round(vh * 0.52);
    };
    const setSheetHeight = (px) => {
      root.style.setProperty('--sheet-h', `${Math.round(px)}px`);
    };
    this._setSheetSnap = (name) => {
      this._sheetSnap = name;
      sheet.dataset.snap = name;
      setSheetHeight(snapPx(name));
    };
    const syncTop = () => root.style.setProperty('--m-top', `${topbar.offsetHeight}px`);

    const enter = () => {
      moves.forEach(([node, target]) => {
        if (!homes.has(node)) homes.set(node, { parent: node.parentNode, next: node.nextSibling });
        target.appendChild(node);
      });
      footer.appendChild(settingsRow);
      sheet.hidden = false;
      document.body.classList.add('m-shell');
      syncTop();
      this._setSheetSnap(this._sheetSnap || 'half');
    };
    const leave = () => {
      this.toggleImmersive(false);
      [...moves].reverse().forEach(([node]) => {
        const home = homes.get(node);
        if (home) home.parent.insertBefore(node, home.next);
      });
      settingsRow.remove();
      sheet.hidden = true;
      document.body.classList.remove('m-shell');
      root.style.removeProperty('--sheet-h');
      root.style.removeProperty('--m-top');
    };

    // Drag the handle; release snaps to the nearest height (a quick flick goes one step further)
    const order = ['peek', 'half', 'full'];
    let drag = null;
    handle.addEventListener('pointerdown', (e) => {
      drag = { y: e.clientY, h: sheet.getBoundingClientRect().height, t: performance.now(), moved: false, lastY: e.clientY, lastT: performance.now(), v: 0 };
      try {
        handle.setPointerCapture(e.pointerId);
      } catch (err) {
        /* synthetic or already-released pointer: dragging still works while over the handle */
      }
      sheet.classList.add('dragging');
    });
    handle.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dy = e.clientY - drag.y;
      if (Math.abs(dy) > 4) drag.moved = true;
      const now = performance.now();
      drag.v = (e.clientY - drag.lastY) / Math.max(1, now - drag.lastT);
      drag.lastY = e.clientY;
      drag.lastT = now;
      setSheetHeight(Math.min(snapPx('full'), Math.max(snapPx('peek'), drag.h - dy)));
    });
    const endDrag = () => {
      if (!drag) return;
      sheet.classList.remove('dragging');
      const current = this._sheetSnap || 'half';
      let next = current;
      if (!drag.moved) {
        next = current === 'peek' ? 'half' : current === 'half' ? 'full' : 'half';
      } else {
        const h = sheet.getBoundingClientRect().height;
        if (Math.abs(drag.v) > 0.6) {
          const i = order.indexOf(current);
          next = order[Math.max(0, Math.min(2, i + (drag.v < 0 ? 1 : -1)))];
        } else {
          next = order.reduce((best, n) => (Math.abs(snapPx(n) - h) < Math.abs(snapPx(best) - h) ? n : best), 'half');
        }
      }
      drag = null;
      this._setSheetSnap(next);
    };
    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);
    handle.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      const current = this._sheetSnap || 'half';
      this._setSheetSnap(current === 'peek' ? 'half' : current === 'half' ? 'full' : 'peek');
    });

    // Fullscreen court
    document.getElementById('btnImmersive')?.addEventListener('click', () => this.toggleImmersive(true));
    document.getElementById('btnImmersiveExit')?.addEventListener('click', () => this.toggleImmersive(false));
    document.getElementById('btnImmersivePlay')?.addEventListener('click', () => {
      document.getElementById('btnPlayPause')?.click();
    });
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && document.body.classList.contains('m-immersive')) this.toggleImmersive(false);
    });

    const onResize = () => {
      if (!mq.matches) return;
      syncTop();
      if (this._sheetSnap) this._setSheetSnap(this._sheetSnap);
    };
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    mq.addEventListener('change', (e) => (e.matches ? enter() : leave()));
    if (mq.matches) enter();
  }

  /** Phone fullscreen: hide the top bar and the sheet; use the Fullscreen API where the browser has it. */
  toggleImmersive(on) {
    const body = document.body;
    if (on === body.classList.contains('m-immersive')) return;
    body.classList.toggle('m-immersive', on);
    try {
      if (on && document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else if (!on && document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (e) {
      /* iPhone Safari has no element fullscreen: the in-app fullscreen still applies */
    }
    this._updatePlayButtonUI();
  }

  setTheme(theme) {
    const t = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem('aerolab-theme', t);
    } catch (e) {
      /* storage unavailable: theme still applies for this visit */
    }
    document.querySelectorAll('#themeSwitchGroup [data-theme-choice]').forEach((b) =>
      b.classList.toggle('active', b.getAttribute('data-theme-choice') === t)
    );
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#1a1a1a' : '#fbfaf7');
    if (this.scene3d) {
      this.scene3d.setTheme(t);
      if (this.simResult) this.scene3d.updateTrajectory(this.simResult, this.ghostSimResult);
    }
    if (this.racket3d && this.racket3d.setTheme) this.racket3d.setTheme(t);
    this.updateScrubberFrame?.();
  }

  _applyLanguageUI() {
    const dict = I18N[this.lang] || I18N.zh;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });
    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
      const key = el.getAttribute('data-i18n-html');
      if (dict[key]) {
        el.innerHTML = dict[key];
      }
    });
    document.documentElement.lang = this.lang === 'zh' ? 'zh-CN' : 'en';
    this._populatePresetSelects();
    this._updatePlayButtonUI();
    this._renderTurnChainUI();
    this.recomputeSimulation({ source: 'racket', skipChain: true });
    this._updateTacticalUI();
  }

  /**
   * Loads a multi-shot example rally and chains each turn's incoming ball from the previous turn's bounce.
   */
  loadRally(rallyKey) {
    const rally = EXAMPLE_RALLIES[rallyKey];
    if (!rally) return;

    this.activeTacticalKey = null;
    if (this.scene3d) {
      this.scene3d.updateTacticalOverlay(null, 0, false);
    }

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
    this._updateTacticalUI();
  }

  _lessonKey() {
    return this.activeTacticalKey || this._pickedLessonKey || 'federer_serve_plus_one';
  }

  _loadLessonProgress() {
    if (this._lessonProgress) return this._lessonProgress;
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem('aerolab.lessons') || '{}') || {};
    } catch (e) {
      saved = {};
    }
    this._lessonProgress = saved;
    return saved;
  }

  _saveLessonProgress() {
    try {
      localStorage.setItem('aerolab.lessons', JSON.stringify(this._lessonProgress || {}));
    } catch (e) {
      /* private mode: progress lasts for this visit only */
    }
  }

  _renderLessonList() {
    const list = document.getElementById('tacticalLessonList');
    if (!list) return;
    const zh = this.lang === 'zh';
    const dict = I18N[this.lang] || I18N.zh;
    const progress = this._loadLessonProgress();
    const current = this._lessonKey();
    list.replaceChildren();
    for (const [k, lesson] of Object.entries(TACTICAL_LESSONS)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lesson-row';
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-selected', String(k === current));
      btn.dataset.lesson = k;
      const p = progress[k];
      const status = p?.passed ? dict.tacPassed : p?.best ? `${dict.tacBest} ${p.best}` : '';
      btn.innerHTML =
        `<span class="lr-num">${lesson.number}</span>` +
        `<span class="lr-name">${zh ? lesson.nameZh : lesson.nameEn}</span>` +
        `<span class="lr-status${p?.passed ? ' is-pass' : ''}">${status}</span>`;
      btn.addEventListener('click', () => {
        this._pickedLessonKey = k;
        this.loadTacticalLesson(k, 'demo');
      });
      list.appendChild(btn);
    }
  }

  _renderLessonRally(lesson) {
    const ol = document.getElementById('tacticalRally');
    if (!ol) return;
    const zh = this.lang === 'zh';
    const dict = I18N[this.lang] || I18N.zh;
    ol.replaceChildren();
    lesson.turns.forEach((t, i) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lr-shot';
      const isKey = i === lesson.challengeTurnIndex;
      btn.classList.toggle('is-key', isKey);
      btn.classList.toggle('is-current', !!this.activeTacticalKey && i === this.currentTurnIndex);
      const who = (t.side || (i % 2 ? 'B' : 'A')) === 'A'
        ? (zh ? lesson.playerAZh : lesson.playerAEn)
        : (zh ? lesson.playerBZh : lesson.playerBEn);
      btn.innerHTML =
        `<span class="lr-shot-n">${i + 1}</span>` +
        `<span class="lr-shot-body"><span class="lr-shot-title">${zh ? t.titleZh : t.titleEn}</span>` +
        `<span class="lr-shot-who">${who}${isKey ? ` · ${dict.tacDecisive}` : ''}</span></span>`;
      btn.addEventListener('click', () => {
        if (this.activeTacticalKey !== lesson.id) this.loadTacticalLesson(lesson.id, 'demo');
        this.selectTurn(i, false);
      });
      li.appendChild(btn);
      ol.appendChild(li);
    });
  }

  /**
   * Loads a tactics lesson. 'demo' plays the scripted rally with the worked answer on the
   * key shot; 'challenge' jumps to the key shot with deliberately off settings to fix.
   */
  loadTacticalLesson(lessonKey, mode = 'demo') {
    const lesson = TACTICAL_LESSONS[lessonKey];
    if (!lesson) return;

    if (this.activeTacticalKey !== lessonKey || mode !== this.tacticalMode) {
      this._tacticAttempts = [];
      this._tacticAnswerShown = false;
    }
    // The starting settings are not an attempt; only changes the user makes count.
    this._tacticBaselinePending = mode === 'challenge';
    this.activeTacticalKey = lessonKey;
    this._pickedLessonKey = lessonKey;
    this.tacticalMode = mode;

    this.rallyMeta = {
      playerAZh: lesson.playerAZh,
      playerBZh: lesson.playerBZh,
      playerAEn: lesson.playerAEn,
      playerBEn: lesson.playerBEn
    };

    if (lesson.surfaceKey) {
      this.state.surfaceKey = lesson.surfaceKey;
      const surfEl = document.getElementById('surfaceSelect');
      if (surfEl) surfEl.value = lesson.surfaceKey;
      this.scene3d.setCourtSurface(lesson.surfaceKey);
    }

    this.rallyTurns = lesson.turns.map((t, idx) => ({
      side: t.side || (idx % 2 === 0 ? 'A' : 'B'),
      titleZh: `#${idx + 1} ${t.titleZh || '击球'}`,
      titleEn: `#${idx + 1} ${t.titleEn || 'Shot'}`,
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

    const cIdx = lesson.challengeTurnIndex;
    const override = mode === 'challenge' ? lesson.challengeStart : lesson.proSolution;
    if (this.rallyTurns[cIdx] && override) {
      Object.assign(this.rallyTurns[cIdx], override);
    }

    this._rechainRallyFromTurn(0);

    if (mode === 'challenge') {
      this.isPlayingFullRally = false;
      this.selectTurn(cIdx, false);
    } else {
      this.isPlayingFullRally = true;
      this.selectTurn(0, true);
      this.currentTime = WINDUP_START_TIME;
      this.isPlaying = true;
      this._updatePlayButtonUI();
    }
    this._renderLessonList();
    this._updateTacticalUI();
  }

  /** Puts the key shot back to its starting (challenge) settings. */
  resetTacticalChallenge() {
    this._tacticAttempts = [];
    this._tacticAnswerShown = false;
    this.tacticalMode = null; // force a clean reload
    this.loadTacticalLesson(this._lessonKey(), 'challenge');
  }

  /** Applies the worked answer to the key shot without leaving the challenge. */
  showTacticalAnswer() {
    const lesson = TACTICAL_LESSONS[this._lessonKey()];
    if (!lesson) return;
    if (this.activeTacticalKey !== lesson.id || this.tacticalMode !== 'challenge') {
      this.loadTacticalLesson(lesson.id, 'challenge');
    }
    const cIdx = lesson.challengeTurnIndex;
    // Same path as the demo: the key shot's racket settings are solved from its target launch.
    Object.assign(this.rallyTurns[cIdx], lesson.proSolution);
    this._rechainRallyFromTurn(0);
    this._tacticAnswerShown = true;
    this._tacticBaselinePending = true;
    this.selectTurn(cIdx, false);
  }

  exitTacticalLesson() {
    this.activeTacticalKey = null;
    clearTimeout(this._tacticAttemptTimer);
    if (this.scene3d) {
      this.scene3d.updateTacticalOverlay(null, 0, false);
    }
    this._renderLessonList();
    this._updateTacticalUI();
  }

  /** Records a landing as an attempt once the controls have been still for a moment. */
  _queueTacticalAttempt(lesson, evalRes) {
    clearTimeout(this._tacticAttemptTimer);
    if (this.tacticalMode !== 'challenge' || !evalRes) return;
    const sig = [this.state.racketSpeedKmh, this.state.swingPathDeg, this.state.faceAngleDeg,
      this.state.aimAngleDeg, this.state.hitX, this.state.hitY].join('|');
    if (this._tacticBaselinePending) {
      this._tacticBaselinePending = false;
      this._tacticLastSig = sig;
      return;
    }
    if (sig === this._tacticLastSig) return;
    this._tacticAnswerShown = false;
    this._tacticAttemptTimer = setTimeout(() => {
      this._tacticLastSig = sig;
      if (evalRes.landing) {
        this._tacticAttempts = [...(this._tacticAttempts || []), evalRes.landing].slice(-8);
      }
      {
        const progress = this._loadLessonProgress();
        const p = progress[lesson.id] || { best: 0, passed: false, tries: 0 };
        p.tries = (p.tries || 0) + 1;
        p.best = Math.max(p.best || 0, evalRes.score);
        p.passed = p.passed || evalRes.passed;
        progress[lesson.id] = p;
        this._saveLessonProgress();
        this._renderLessonList();
      }
      this._updateTacticalUI();
    }, 700);
  }

  /** Flashes the control a coach tip refers to (and opens the swing tab if needed). */
  _focusControl(controlId) {
    const input = document.getElementById(controlId);
    if (!input) return;
    const tabBtn = document.querySelector('#sidebarNavTabs .nav-tab[data-tab="tab-racket"]');
    if (tabBtn && !tabBtn.classList.contains('active')) tabBtn.click();
    const row = input.closest('.slider-group') || input.parentElement;
    row?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    row?.classList.remove('flash-target');
    void row?.offsetWidth;
    row?.classList.add('flash-target');
    const view = this.racket3d?.flashDial?.(controlId);
    if (view) {
      const details = document.getElementById('racketVizDetails');
      if (details) details.open = true;
      document.querySelectorAll('#racket3DViewGroup .seg-btn').forEach((b) =>
        b.classList.toggle('active', b.getAttribute('data-racket-view') === view)
      );
    }
  }

  _updateTacticalUI() {
    const zh = this.lang === 'zh';
    const dict = I18N[this.lang] || I18N.zh;
    const banner = document.getElementById('tacticalHudBanner');
    const lesson = this.activeTacticalKey ? TACTICAL_LESSONS[this.activeTacticalKey] : null;
    const shown = lesson || TACTICAL_LESSONS[this._lessonKey()];

    const demoBtn = document.getElementById('btnTacticDemo');
    const chalBtn = document.getElementById('btnTacticChallenge');
    if (demoBtn && chalBtn) {
      demoBtn.classList.toggle('active', !!lesson && this.tacticalMode === 'demo');
      chalBtn.classList.toggle('active', !!lesson && this.tacticalMode === 'challenge');
    }

    const setText = (id, text) => {
      const n = document.getElementById(id);
      if (n) n.textContent = text;
    };
    if (shown) {
      setText('tacticalLessonName', `${shown.number}  ${zh ? shown.nameZh : shown.nameEn}`);
      setText('tacticalBadgeText', zh ? shown.inspirationZh : shown.inspirationEn);
      setText('tacticalPrincipleText', zh ? shown.ideaZh : shown.ideaEn);
      setText('tacticalHintText', zh ? shown.goalZh : shown.goalEn);
      this._renderLessonRally(shown);
    }

    const evalRes = lesson ? evaluateTacticalAttempt(lesson, this.currentTurnIndex, this.state, this.simResult) : null;
    const onKey = !!evalRes;

    // Checklist
    const checksEl = document.getElementById('tacticalChecks');
    if (checksEl && shown) {
      checksEl.replaceChildren();
      const values = {
        zone: '',
        speed: `${this.state.speedKmh?.toFixed(0) ?? '–'} km/h`,
        spin: `${Math.round(this.state.topspinRpm ?? 0)} rpm`
      };
      for (const row of describeTacticalGoal(shown)) {
        const li = document.createElement('li');
        const ok = onKey ? evalRes.checks[row.key] : null;
        li.className = 'lc-row' + (ok === true ? ' is-ok' : ok === false ? ' is-bad' : '');
        li.innerHTML =
          `<span class="lc-mark" aria-hidden="true"></span>` +
          `<span class="lc-label">${zh ? row.zh : row.en}</span>` +
          `<span class="lc-val">${onKey ? values[row.key] : ''}</span>`;
        checksEl.appendChild(li);
      }
    }

    // Coach tips: each one points at the control that fixes it
    const tipsEl = document.getElementById('tacticalCoachFeedback');
    if (tipsEl) {
      tipsEl.replaceChildren();
      let note = '';
      if (!lesson) note = '';
      else if (!onKey) note = dict.tacOnTurn(shown.challengeTurnIndex + 1);
      else if (this._tacticAnswerShown) note = dict.tacAnswerShown;
      else if (evalRes.passed) note = zh ? evalRes.feedbackZh : evalRes.feedbackEn;
      if (note) {
        const p = document.createElement('p');
        p.className = 'lt-note' + (onKey && evalRes.passed ? ' is-pass' : '');
        p.textContent = note;
        tipsEl.appendChild(p);
      }
      if (onKey && !evalRes.passed) {
        const seen = new Set();
        for (const t of evalRes.tips) {
          if (seen.has(t.control) || seen.size >= 2) continue;
          seen.add(t.control);
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'lt-tip';
          btn.textContent = zh ? t.zh : t.en;
          btn.addEventListener('click', () => this._focusControl(t.control));
          tipsEl.appendChild(btn);
        }
      }
    }

    // Score + best
    const scoreText = onKey ? String(evalRes.score) : lesson ? dict.tacShotOf(this.currentTurnIndex + 1, this.rallyTurns.length) : '';
    for (const id of ['tacticalScoreBadge', 'thbScorePill']) {
      const pill = document.getElementById(id);
      if (!pill) continue;
      pill.textContent = scoreText;
      pill.classList.toggle('score-pass', onKey && evalRes.passed);
      pill.hidden = !scoreText;
    }
    const prog = shown ? this._loadLessonProgress()[shown.id] : null;
    setText('tacticalBest', prog?.tries ? `${dict.tacBest} ${prog.best} · ${dict.tacTries(prog.tries)}` : '');

    // Map
    const mapEl = document.getElementById('tacticalMap');
    if (mapEl && !this.lessonMap) {
      this.lessonMap = new LessonMap(mapEl);
    }
    if (this.lessonMap) {
      this.lessonMap.setLabel(dict.tacMapLabel);
      this.lessonMap.update({
        lesson: shown,
        sim: lesson ? this.simResult : null,
        showZone: !!lesson && (onKey || this.tacticalMode === 'demo'),
        passed: onKey ? evalRes.passed : null,
        attempts: onKey ? this._tacticAttempts || [] : []
      });
    }
    document.getElementById('tacticalChallengeBox')?.classList.toggle('is-idle', !lesson);

    if (!lesson) {
      if (banner) banner.style.display = 'none';
      if (this.scene3d) this.scene3d.updateTacticalOverlay(null, 0, false);
      return;
    }

    // Docked banner over the court
    if (banner) banner.style.display = 'flex';
    setText('thbTitle', `${lesson.number} ${zh ? lesson.nameZh : lesson.nameEn} · ${dict.tacShotOf(this.currentTurnIndex + 1, this.rallyTurns.length)}`);
    const thbFeedback = document.getElementById('thbFeedback');
    if (thbFeedback) {
      if (onKey) {
        const top = evalRes.tips[0];
        thbFeedback.textContent = evalRes.passed
          ? (zh ? evalRes.feedbackZh : evalRes.feedbackEn)
          : top ? (zh ? top.zh : top.en) : '';
      } else {
        thbFeedback.textContent = zh ? lesson.goalZh : lesson.goalEn;
      }
    }

    if (this.scene3d) {
      this.scene3d.updateTacticalOverlay(lesson, this.currentTurnIndex, onKey && evalRes.passed);
    }
    if (onKey) this._queueTacticalAttempt(lesson, evalRes);
  }

  /**
   * Initializes the Architectural Loading & Mode-Launch Screen (`#aeroLoadingOverlay`)
   */
  _initLoadingScreen() {
    const overlay = document.getElementById('aeroLoadingOverlay');
    const enterBtn = document.getElementById('btnEnterLab');
    const reopenBtn = document.getElementById('btnReopenWelcome');

    let selectedLaunchMode = 'solo';

    document.querySelectorAll('.loading-mode-card[data-launch-mode]').forEach((card) => {
      card.addEventListener('click', () => {
        selectedLaunchMode = card.getAttribute('data-launch-mode') || 'solo';
        document.querySelectorAll('.loading-mode-card').forEach((c) => {
          const isAct = c === card;
          c.classList.toggle('active', isAct);
          const chk = c.querySelector('.lmc-check');
          if (chk) chk.textContent = '';
        });
      });
    });

    const closeOverlayAndLaunch = (modeToLaunch) => {
      if (overlay) {
        overlay.classList.add('is-hidden');
      }
      if (modeToLaunch) {
        this.setAppMode(modeToLaunch);
      }
    };

    enterBtn?.addEventListener('click', () => {
      closeOverlayAndLaunch(selectedLaunchMode);
    });

    reopenBtn?.addEventListener('click', () => {
      if (overlay) {
        overlay.classList.remove('is-hidden');
      }
    });

  }

  /**
   * Switches between the 3 Core Modes:
   * - 'solo' (DEFAULT): Single-player ball speed synthesis & Forehand/Backhand/Serve biomechanics lab (no opponent cutoff, full 2nd bounce)
   * - 'rally': Two-player turn-based example rally with receiver running interception
   * - 'tactics': Grand Slam interactive tactical masterclass
   */
  setAppMode(mode = 'solo') {
    this.appMode = mode;

    // Sync top-level mode buttons
    document.querySelectorAll('#appModeSwitchGroup [data-app-mode]').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-app-mode') === mode);
    });

    const soloBox = document.getElementById('soloModeContainer');
    const rallyBox = document.getElementById('rallyModeContainer');
    const fullRallyBtn = document.getElementById('btnPlayFullRally');
    const sectionTitle = document.getElementById('coreModeSectionTitle');

    if (mode === 'solo') {
      this.isPlayingFullRally = false;
      this.activeTacticalKey = null;
      if (this.scene3d) {
        this.scene3d.setSoloMode(true);
        this.scene3d.updateTacticalOverlay(null, 0, false);
      }
      if (soloBox) soloBox.style.display = 'block';
      if (rallyBox) rallyBox.style.display = 'none';
      if (fullRallyBtn) fullRallyBtn.style.display = 'none';
      if (sectionTitle) {
        sectionTitle.textContent =
          this.lang === 'zh'
            ? I18N.zh.soloSectionTitle
            : I18N.en.soloSectionTitle;
      }

      this.state.side = 'A';
      const activePresetKey = document.getElementById('presetSelect')?.value || 'alcaraz_fh';
      const activePreset = SHOT_PRESETS[activePresetKey];
      const playerTitleZh = activePreset ? activePreset.labelZh.split('·')[0].trim() : 'C. Alcaraz';
      const playerTitleEn = activePreset ? activePreset.labelEn.split('·')[0].trim() : 'C. Alcaraz';
      this.rallyMeta.playerAZh = playerTitleZh;
      this.rallyMeta.playerAEn = playerTitleEn;

      // Ensure we are on a physics control tab if previously in tactics
      const activeTab = document.querySelector('#sidebarNavTabs .nav-tab.active')?.getAttribute('data-tab');
      if (activeTab === 'tab-tactics') {
        document.querySelector('#sidebarNavTabs [data-tab="tab-racket"]')?.click();
      }

      this.scene3d.setTargetZone(this.state.courtMode, 'A');
      this.recomputeSimulation({ source: 'racket', skipChain: true });
      this._updateTacticalUI();
      this.currentTime = WINDUP_START_TIME;
      this.isPlaying = true;
      this._updatePlayButtonUI();
    } else if (mode === 'rally') {
      this.activeTacticalKey = null;
      if (this.scene3d) {
        this.scene3d.setSoloMode(false);
        this.scene3d.updateTacticalOverlay(null, 0, false);
      }
      if (soloBox) soloBox.style.display = 'none';
      if (rallyBox) rallyBox.style.display = 'block';
      if (fullRallyBtn) fullRallyBtn.style.display = 'inline-flex';
      if (sectionTitle) {
        sectionTitle.textContent =
          this.lang === 'zh'
            ? I18N.zh.rallySectionTitle
            : I18N.en.rallySectionTitle;
      }

      const activeTab = document.querySelector('#sidebarNavTabs .nav-tab.active')?.getAttribute('data-tab');
      if (activeTab === 'tab-tactics') {
        document.querySelector('#sidebarNavTabs [data-tab="tab-racket"]')?.click();
      }

      this.loadRally(this.currentRallyKey || 'ao2024_sinner_medvedev');
    } else if (mode === 'tactics') {
      if (this.scene3d) {
        this.scene3d.setSoloMode(false);
      }
      if (soloBox) soloBox.style.display = 'none';
      if (rallyBox) rallyBox.style.display = 'block';
      if (fullRallyBtn) fullRallyBtn.style.display = 'inline-flex';
      if (sectionTitle) {
        sectionTitle.textContent =
          this.lang === 'zh' ? '战术教学' : 'Tactics lessons';
      }

      document.querySelectorAll('#sidebarNavTabs .nav-tab').forEach((b) =>
        b.classList.toggle('active', b.getAttribute('data-tab') === 'tab-tactics')
      );
      document.querySelectorAll('.tab-panel').forEach((panel) =>
        panel.classList.toggle('active', panel.id === 'tab-tactics')
      );
      this.loadTacticalLesson(this._lessonKey(), this.tacticalMode || 'demo');
    }
  }

  /**
   * Switches the 3D Biomechanical Stroke Type ('fh' | 'bh2' | 'bh1' | 'serve') in Solo Mode.
   */
  setStrokeType(strokeType = 'fh', fromPreset = false) {
    this.state.strokeType = strokeType;
    document.querySelectorAll('#strokeTypeGroup [data-stroke]').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-stroke') === strokeType);
    });

    if (!fromPreset) {
      if (strokeType === 'serve') {
        const presetSelect = document.getElementById('presetSelect');
        if (presetSelect) presetSelect.value = 'shelton_serve';
        this.applyPreset('shelton_serve');
        return;
      }

      // If switching from Serve back to groundstroke, restore groundstroke height & incoming ball
      if (this.state.hitZ > 1.95) {
        this.state.hitZ = 1.05;
        this.state.courtMode = 'singles';
        this.state.incomingSpeedKmh = 56;
        this.state.incomingAngleDeg = -10;
        this.state.incomingSpinRpm = 1850;
        this.state.swingPathDeg = 25.0;
        this.state.faceAngleDeg = -1.8;
        this.state.racketSpeedKmh = 92;
      }

      // Mirror stance lateral coordinate (hitY) & cross-court aim angle naturally between FH (Deuce -Y) and BH (Ad +Y)
      if ((strokeType === 'bh2' || strokeType === 'bh1') && this.state.hitY < -0.2) {
        this.state.hitY = Math.abs(this.state.hitY);
        this.state.aimAngleDeg = -Math.abs(this.state.aimAngleDeg);
        this.state.sidespinRpm = -Math.abs(this.state.sidespinRpm);
      } else if (strokeType === 'fh' && this.state.hitY > 0.2) {
        this.state.hitY = -Math.abs(this.state.hitY);
        this.state.aimAngleDeg = Math.abs(this.state.aimAngleDeg);
        this.state.sidespinRpm = Math.abs(this.state.sidespinRpm);
      }

      const courtSelect = document.getElementById('courtModeSelect');
      if (courtSelect) courtSelect.value = this.state.courtMode;
      this.scene3d.setTargetZone(this.state.courtMode, this.state.side);
      this.recomputeSimulation({ source: 'racket', skipChain: true });
      this.currentTime = WINDUP_START_TIME;
      this.isPlaying = true;
      this._updatePlayButtonUI();
    }
  }

  /**
   * Updates the Solo Ball Speed Synthesis & Impact Physics Breakdown Card (`#soloSpeedBreakdownCard`)
   */
  _updateSoloSpeedCard(impact, simRes) {
    if (!impact) return;
    const totalKmh = impact.launchSpeedKmh || this.state.speedKmh;
    const activeKmh = impact.activePowerKmh ?? totalKmh * 0.82;
    const borrowKmh = impact.borrowedPowerKmh ?? Math.max(0, totalKmh - activeKmh);
    const sumParts = Math.max(1, activeKmh + borrowKmh);
    const activePct = Math.round((activeKmh / sumParts) * 100);
    const borrowPct = Math.max(0, 100 - activePct);

    const totalEl = document.getElementById('sscTotalSpeed');
    if (totalEl) totalEl.textContent = this.formatSpeed(totalKmh, 1);

    const barActive = document.getElementById('sscBarActive');
    const barBorrow = document.getElementById('sscBarBorrow');
    if (barActive) barActive.style.width = `${activePct}%`;
    if (barBorrow) barBorrow.style.width = `${borrowPct}%`;

    const activeValEl = document.getElementById('sscActiveVal');
    if (activeValEl) {
      activeValEl.textContent = `${this.formatSpeed(activeKmh, 1)} (${activePct}%)`;
    }

    const borrowValEl = document.getElementById('sscBorrowVal');
    if (borrowValEl) {
      borrowValEl.textContent = `+${this.formatSpeed(borrowKmh, 1)} (${borrowPct}%)`;
    }

    const corEl = document.getElementById('sscCorVal');
    if (corEl) {
      corEl.textContent = `${(impact.apparentCor ?? 0.42).toFixed(3)}`;
    }

    const dwellEl = document.getElementById('sscDwellVal');
    if (dwellEl) {
      const dwellMs = Number(impact.dwellTimeMs ?? 4.6).toFixed(1);
      const deflMm = Number(impact.stringDeflectionMm ?? 12.8).toFixed(0);
      dwellEl.textContent = `≈${dwellMs} ms · ${deflMm} mm`;
    }

    const sbEl = document.getElementById('sscSecondBounceVal');
    if (sbEl) {
      if (simRes && simRes.secondBounce) {
        sbEl.textContent = `X ${Math.abs(simRes.secondBounce.x).toFixed(1)}m`;
      } else if (simRes && simRes.firstBounce) {
        sbEl.textContent = `>${(Math.abs(simRes.firstBounce.x) + 4.8).toFixed(1)}m`;
      } else {
        sbEl.textContent = '—';
      }
    }
  }

  /**
   * One-Click Reset: restores current mode (Solo or Rally), sliders, camera, and playback to clean benchmark state.
   */
  resetAll() {
    this.isPlayingFullRally = false;
    this.activeTacticalKey = null;
    this.state.windSpeedKmh = 0;
    this.state.crossWindKmh = 0;
    this.state.temperatureC = 20;
    this.state.altitudeM = 0;
    this.state.stringTensionKg = 23;
    if (this.appMode === 'solo') {
      const presetSelect = document.getElementById('presetSelect');
      if (presetSelect) presetSelect.value = 'alcaraz_fh';
      this.applyPreset('alcaraz_fh');
    } else {
      this.loadRally(this.currentRallyKey || 'ao2024_sinner_medvedev');
    }
    this.scene3d.setCameraPreset('broadcast', this.simResult, this.state);
    if (this.racket3d) {
      this.racket3d.setViewMode('side');
      document.querySelectorAll('#racket3DViewGroup .seg-btn').forEach((b) =>
        b.classList.toggle('active', b.getAttribute('data-racket-view') === 'side')
      );
    }
  }

  /**
   * Propagates post-bounce intercept coordinates and incoming ball state from Turn k to Turn k+1.
   */
  _rechainRallyFromTurn(startIdx = 0) {
    chainRallyTurns(this.rallyTurns, startIdx, {
      surfaceKey: this.state.surfaceKey,
      temperatureC: this.state.temperatureC,
      altitudeM: this.state.altitudeM,
      windSpeedKmh: this.state.windSpeedKmh,
      crossWindKmh: this.state.crossWindKmh
    });
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

    // When advancing from a previous rally turn at t = interceptPoint.t, the receiver's racket has JUST met the ball (t = 0.0)!
    this.currentTime = fromFullRallyAutoAdvance ? 0.0 : WINDUP_START_TIME;
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

    // 3b. Impact diagram view switcher ('side' | 'top')
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

    // 4. Sidebar 4-Tab Navigation
    const switchSidebarTab = (targetId) => {
      document.querySelectorAll('#sidebarNavTabs .nav-tab').forEach((b) =>
        b.classList.toggle('active', b.getAttribute('data-tab') === targetId)
      );
      document.querySelectorAll('.tab-panel').forEach((panel) =>
        panel.classList.toggle('active', panel.id === targetId)
      );
      if (targetId === 'tab-tactics' && !this.activeTacticalKey) {
        this.loadTacticalLesson(this._lessonKey(), 'demo');
      }
    };

    document.querySelectorAll('#sidebarNavTabs .nav-tab').forEach((tabBtn) => {
      tabBtn.addEventListener('click', () => {
        switchSidebarTab(tabBtn.getAttribute('data-tab'));
      });
    });

    // 4b. Tactics lesson controls
    const triggerTacDemo = () => this.loadTacticalLesson(this._lessonKey(), 'demo');
    const triggerTacChallenge = () => this.loadTacticalLesson(this._lessonKey(), 'challenge');

    document.getElementById('btnTacticDemo')?.addEventListener('click', triggerTacDemo);
    document.getElementById('thbBtnDemo')?.addEventListener('click', triggerTacDemo);
    document.getElementById('btnTacticChallenge')?.addEventListener('click', triggerTacChallenge);
    document.getElementById('thbBtnChallenge')?.addEventListener('click', triggerTacChallenge);
    document.getElementById('btnTacticReset')?.addEventListener('click', () => this.resetTacticalChallenge());
    document.getElementById('btnTacticAnswer')?.addEventListener('click', () => this.showTacticalAnswer());
    document.getElementById('btnExitTactics')?.addEventListener('click', () => this.exitTacticalLesson());
    document.getElementById('thbBtnClose')?.addEventListener('click', () => this.exitTacticalLesson());

    // 4c. Mobile 3D Court Expand / Collapse Toggle
    document.getElementById('btnMobileExpand3D')?.addEventListener('click', (e) => {
      const expanded = document.body.classList.toggle('mobile-3d-expanded');
      e.currentTarget.textContent =
        this.lang === 'zh'
          ? expanded
            ? '收起球场'
            : '全屏球场'
          : expanded
          ? 'Split View'
          : 'Expand 3D';
      setTimeout(() => {
        if (this.scene3d) this.scene3d._onResize();
        if (this.racket3d) this.racket3d._onResize();
      }, 240);
    });

    // 5. Core Mode Switcher, Stroke Selector, Rally & Shot Preset Selectors
    document.querySelectorAll('#appModeSwitchGroup [data-app-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-app-mode') || 'solo';
        this.setAppMode(mode);
      });
    });

    document.querySelectorAll('#strokeTypeGroup [data-stroke]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const stroke = btn.getAttribute('data-stroke') || 'fh';
        this.setStrokeType(stroke, false);
      });
    });

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
      { id: 'windSpeedKmh', key: 'windSpeedKmh', fmt: (v) => this.formatSpeed(v, 0) },
      { id: 'crossWindKmh', key: 'crossWindKmh', fmt: (v) => this.formatSpeed(v, 0) },
      {
        id: 'temperatureC',
        key: 'temperatureC',
        fmt: (v) => `${v.toFixed(0)} °C · ρ ${airDensityFromConditions(v, this.state.altitudeM).toFixed(3)}`
      },
      {
        id: 'altitudeM',
        key: 'altitudeM',
        fmt: (v) => `${v.toFixed(0)} m · ρ ${airDensityFromConditions(this.state.temperatureC, v).toFixed(3)}`
      }
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
        const standsOn = cam === 'side' ? false : this.showStandsPref;
        this.scene3d.setStandsVisible(standsOn);
        const standsBox = document.getElementById('toggleStands');
        if (standsBox) standsBox.checked = standsOn;
        document.querySelectorAll('[data-cam]').forEach((b) => b.classList.toggle('active', b === btn));
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

    // Light / dark theme
    document.querySelectorAll('#themeSwitchGroup [data-theme-choice]').forEach((btn) => {
      btn.addEventListener('click', () => this.setTheme(btn.getAttribute('data-theme-choice')));
    });

    // Stands: user preference; the side camera hides them temporarily so the profile stays clear
    this.showStandsPref = true;
    document.getElementById('toggleStands')?.addEventListener('change', (e) => {
      this.showStandsPref = e.target.checked;
      this.scene3d.setStandsVisible(e.target.checked);
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

    // 11. CSV / JSON launch-data import modal
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
      if (this._parseAndImportLaunchData(raw)) {
        closeModal();
      }
    });
  }

  /**
   * Parses user-supplied launch data (CSV or JSON) and rebuilds a turn-based rally from it.
   */
  _parseAndImportLaunchData(rawText) {
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
            titleZh: `#${idx + 1} 导入拍 (${Math.round(item.speedKmh || 135)}km/h)`,
            titleEn: `#${idx + 1} Imported (${Math.round(item.speedKmh || 135)}km/h)`,
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
            titleZh: `#${idx + 1} 导入拍 (${Math.round(spd)}km/h)`,
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
      console.error('Import parse error:', err);
      return false;
    }

    if (!parsedTurns.length) return false;

    this.setAppMode('rally');
    this.rallyMeta = {
      playerAZh: '导入球员 A',
      playerBZh: '导入球员 B',
      playerAEn: 'Imported Player A',
      playerBEn: 'Imported Player B'
    };
    this.rallyTurns = parsedTurns;
    this._rechainRallyFromTurn(0);
    this.selectTurn(0, false);
    return true;
  }

  /**
   * Applies a single-shot style preset to the currently active turn.
   */
  applyPreset(presetKey) {
    const p = SHOT_PRESETS[presetKey];
    if (!p) return;

    const strokeType = p.strokeType || (p.hitZ > 1.95 ? 'serve' : p.hitY > 0.25 ? 'bh2' : 'fh');
    Object.assign(this.state, {
      strokeType,
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

    this.setStrokeType(strokeType, true);

    if (this.appMode === 'solo') {
      const playerTitleZh = p.labelZh.split('·')[0].trim();
      const playerTitleEn = p.labelEn.split('·')[0].trim();
      this.rallyMeta.playerAZh = playerTitleZh;
      this.rallyMeta.playerAEn = playerTitleEn;
    }

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

    const stopAtIntercept = this.appMode !== 'solo';
    this.simResult = simulateTrajectory({
      ...this.state,
      stopAtIntercept
    });
    this.ghostSimResult = simulateTrajectory({
      ...this.state,
      topspinRpm: 0,
      sidespinRpm: 0,
      stopAtIntercept
    });

    this._updateSoloSpeedCard(impact, this.simResult);

    // Save current turn state & chain to subsequent rally turns if edited in Rally/Tactics Mode
    if (this.appMode !== 'solo' && this.rallyTurns[this.currentTurnIndex]) {
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
    this._updateTacticalUI();
    this.updateScrubberFrame();
    paintAllRanges();
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
      paintRange(this.timelineSlider);
        paintRange(this.timelineSlider);
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

    const pt = samplePointAtTime(pts, t);

    this.scene3d.updateBallAtFrame(pt, null);

    if (document.activeElement !== this.timelineSlider) {
      this.timelineSlider.value = t;
      paintRange(this.timelineSlider);
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
      if (this.appMode === 'solo') {
        const strokeMapZh = { fh: '正手 FH', bh2: '双反 2H', bh1: '单反 1H', serve: '发球 SERVE' };
        const strokeMapEn = { fh: 'FH', bh2: '2H-BH', bh1: '1H-BH', serve: 'SERVE' };
        const st = this.state.strokeType || 'fh';
        hudTurnBadge.textContent =
          this.lang === 'zh'
            ? `${strokeMapZh[st] || '正手'} · 落点判罚`
            : `${strokeMapEn[st] || 'FH'} · LINE CALL`;
      } else {
        const turnTag = `#${this.currentTurnIndex + 1} (${this.state.side})`;
        hudTurnBadge.textContent =
          this.lang === 'zh' ? `${turnTag} · 落点判罚` : `${turnTag} · LINE CALL`;
      }
    }

    // 1. Launch Velocity Cell
    document.getElementById('hudSpeedBig').textContent = this.formatSpeed(speedKmh, 1);
    document.getElementById('hudApexBadge').textContent = `apex ${res.maxHeightM.toFixed(2)} m`;
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
          ? '上旋'
          : '切削'
        : isTop
        ? 'Topspin'
        : 'Backspin';

    const sideSign = sidespinRpm >= 0 ? '+' : '';
    document.getElementById('hudMagnusInfo').textContent =
      this.lang === 'zh'
        ? `侧旋 ${sideSign}${Math.round(sidespinRpm)}`
        : `Side ${sideSign}${Math.round(sidespinRpm)}`;

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
      netEl.textContent = this.lang === 'zh' ? '未过网' : 'Short';
      netEl.className = 'tel-big-mono text-err';
    }

    document.getElementById('hudLaunchAngleInfo').textContent =
      this.lang === 'zh'
        ? `仰角 ${launchAngleDeg >= 0 ? '+' : ''}${launchAngleDeg.toFixed(1)}°`
        : `Launch ${launchAngleDeg >= 0 ? '+' : ''}${launchAngleDeg.toFixed(1)}°`;

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
          ? `余量 ${b.marginCm} cm · 距底线 ${distFromBaselineM.toFixed(1)}m`
          : `出界 ${b.marginCm} cm · 距底线 ${Math.abs(distFromBaselineM).toFixed(1)}m`;
      } else {
        detail.textContent = b.isIn
          ? `Margin ${b.marginCm} cm · Base ${distFromBaselineM.toFixed(1)}m`
          : `Out ${b.marginCm} cm · Base ${Math.abs(distFromBaselineM).toFixed(1)}m`;
      }

      landEl.textContent = `X ${b.x.toFixed(1)} / Y ${b.y.toFixed(1)}m`;
      bounceSpeedEl.textContent = `${this.formatSpeed(b.speedBeforeKmh, 0)} → ${this.formatSpeed(
        b.speedAfterKmh,
        0
      )}`;
    } else {
      badge.textContent = this.lang === 'zh' ? 'OUT (出界)' : 'OUT (LONG)';
      badge.className = 'call-tag call-out';
      detail.textContent = this.lang === 'zh' ? '飞出球场范围' : 'Beyond boundary';
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
    const ink = cssToken('--ink', '#ecefe6');
    const muted = cssToken('--ink-3', '#86999f');
    const inC = cssToken('--in', '#63d297');
    const outC = cssToken('--out', '#ff7a63');

    ctx.strokeStyle = muted;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(4, groundY);
    ctx.lineTo(W - 4, groundY);
    ctx.stroke();

    const netX = W / 2;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(netX, groundY);
    ctx.lineTo(netX, netTopY);
    ctx.stroke();

    ctx.fillStyle = ink;
    ctx.fillRect(netX - 3, netTopY - 2, 6, 3);

    if (res.netPassPoint && res.netClearanceM !== null) {
      const clearancePx = Math.max(-20, Math.min(25, res.netClearanceM * 24));
      const ballY = netTopY - clearancePx - 5;

      ctx.strokeStyle = res.hitNet ? outC : inC;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(netX, netTopY);
      ctx.lineTo(netX, ballY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = res.hitNet ? outC : cssToken('--ball', '#c6d93a');
      ctx.beginPath();
      ctx.arc(netX, ballY, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = ink;
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

    // Flat tennis-ball yellow with an ink outline and white seams (no gradient)
    ctx.fillStyle = cssToken('--ball', '#c6d93a');
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = cssToken('--ink', '#1b1a17');
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
      ctx.strokeStyle = isTop ? cssToken('--rose', '#ff8f7c') : cssToken('--blue', '#7cbcff');
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
      this.racket3d.updateFromState({ ...this.state, lang: this.lang });
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
    const fab = document.getElementById('btnImmersivePlay');
    if (fab) {
      fab.innerHTML = this.isPlaying
        ? '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M5 3h3v12H5zM10 3h3v12h-3z" fill="currentColor"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M5 3l10 6-10 6z" fill="currentColor"/></svg>';
    }
    const btn = document.getElementById('btnPlayPause');
    if (!btn) return;
    if (this.lang === 'zh') {
      btn.textContent = this.isPlaying ? '暂停' : '播放动画';
    } else {
      btn.textContent = this.isPlaying ? 'Pause' : 'Play';
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
