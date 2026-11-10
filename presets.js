/**
 * Illustrative presets, rally scripts and tactical lessons.
 *
 * IMPORTANT: every number in this file is HAND-TUNED so that the shot looks
 * plausible and lands where the scene needs it. None of it is measured data,
 * and none of it comes from Hawk-Eye, the ATP, the ITF or any tracking system.
 * Player names only describe the playing style each preset imitates.
 */

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

/**
 * Single-shot style presets. Racket parameters are hand-tuned to give a shot
 * typical of the named player's style; launch speed / spin are COMPUTED by the
 * impact model, which is why labels carry no numbers.
 */
export const SHOT_PRESETS = {
  alcaraz_fh: {
    labelZh: 'C. Alcaraz · 正手斜线',
    labelEn: 'C. Alcaraz · Forehand Cross',
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
    labelZh: 'J. Sinner · 双反斜线',
    labelEn: 'J. Sinner · 2H-Backhand Cross',
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
    labelZh: 'N. Djokovic · 双反直线',
    labelEn: 'N. Djokovic · 2H-Backhand DTL',
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
    labelZh: 'S. Wawrinka · 单反重炮',
    labelEn: 'S. Wawrinka · 1H-Backhand Drive',
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
    labelZh: 'J. Sinner · 正手快撕',
    labelEn: 'J. Sinner · Power Forehand',
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
    labelZh: 'R. Nadal · 超级上旋正手',
    labelEn: 'R. Nadal · Extreme Topspin FH',
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
    labelZh: 'N. Djokovic · 正手变直线',
    labelEn: 'N. Djokovic · Forehand DTL',
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
    labelZh: 'R. Federer · 单反切削',
    labelEn: 'R. Federer · 1H Slice',
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
    labelZh: 'B. Shelton · 平击一发',
    labelEn: 'B. Shelton · Flat 1st Serve',
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
    labelZh: '高跳上旋二发 · 占先区外角',
    labelEn: 'Kick 2nd Serve · Ad Wide',
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
 * Example multi-shot rallies, loosely inspired by well-known matches.
 * They are NOT reconstructions of the actual points.
 * Each turn alternates `side: 'A'` (Near Player, -X) and `side: 'B'` (Far Player, +X).
 * When Turn k is modified, Turn k+1's incoming position & ball speed/spin automatically chain from Turn k's bounce!
 */
export const EXAMPLE_RALLIES = {
  wim2023_alcaraz_djokovic: {
    nameZh: '示例回合 · Alcaraz vs Djokovic 草地 5 拍 (灵感: 2023 温网决赛)',
    nameEn: 'Example · Alcaraz vs Djokovic, grass, 5 shots (inspired by 2023 Wimbledon final)',
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
    nameZh: '示例回合 · Sinner vs Medvedev 硬地 4 拍 (灵感: 2024 澳网决赛)',
    nameEn: 'Example · Sinner vs Medvedev, hard, 4 shots (inspired by 2024 AO final)',
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
    nameZh: '示例回合 · Nadal 上旋 vs Federer 切削 红土 4 拍',
    nameEn: 'Example · Nadal topspin vs Federer slice, clay, 4 shots',
    surfaceKey: 'clay',
    playerAZh: 'R. Nadal (近端 A)',
    playerBZh: 'R. Federer (远端 B)',
    playerAEn: 'R. Nadal (Near A)',
    playerBEn: 'R. Federer (Far B)',
    turns: [
      {
        side: 'A',
        titleZh: '#1 Nadal 高压上旋',
        titleEn: '#1 Nadal Heavy Spin',
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
 * Tactical lessons inspired by well-known points (illustrative, not reconstructions).
 * Each lesson includes:
 * - A scripted multi-turn rally leading up to the decisive tactical shot (`challengeTurnIndex`)
 * - 3D Court Target Zone (`targetZone`: `{ x, y, rx, ry }` in canonical hitter coordinates)
 * - `proSolution`: hand-tuned parameters that hit the bullseye
 * - `challengeStart`: Suboptimal "club player" parameters for the user to fix in Interactive Challenge Mode
 * - Tactical theory & physics explanation (Zh / En)
 */
export const TACTICAL_LESSONS = {
  federer_serve_plus_one: {
    id: 'federer_serve_plus_one',
    number: '01',
    nameZh: '发球 + 1',
    nameEn: 'Serve + 1',
    inspirationZh: '灵感：2017 澳网决赛，费德勒对纳达尔',
    inspirationEn: 'Inspired by the 2017 Australian Open final',
    surfaceKey: 'hard',
    playerAZh: 'R. Federer',
    playerBZh: 'R. Nadal',
    playerAEn: 'R. Federer',
    playerBEn: 'R. Nadal',
    ideaZh:
      '外角发球把接发方拉出场外。回球一短，就迎前一步，打向他刚离开的那一侧。',
    ideaEn:
      'Serve wide to pull the returner off the court. When the reply lands short, step in and hit to the side they just left.',
    goalZh: '第 3 拍：迎前把球打进右侧空档，要快。',
    goalEn: 'Shot 3: step in and drive it into the open right corner, fast.',
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
        titleZh: '外角发球',
        titleEn: 'Wide serve',
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
        titleZh: '被动挡回中路',
        titleEn: 'Blocked return',
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
        titleZh: '迎前打空档',
        titleEn: 'Step in, hit the gap',
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
    number: '02',
    nameZh: '上旋压反手',
    nameEn: 'Topspin to the backhand',
    inspirationZh: '灵感：2008 温网决赛，纳达尔对费德勒',
    inspirationEn: 'Inspired by the 2008 Wimbledon final',
    surfaceKey: 'grass',
    playerAZh: 'R. Nadal',
    playerBZh: 'R. Federer',
    playerAEn: 'R. Nadal',
    playerBEn: 'R. Federer',
    ideaZh:
      '高弧线重上旋把单反压在肩膀以上。等来一个慢的切削，用更陡的挥拍刷出大角度，让球在底线前下坠。',
    ideaEn:
      'Heavy, high topspin pins a one-handed backhand above the shoulder. When a slow slice comes back, swing steeper and whip it wide so it dips before the baseline.',
    goalZh: '第 3 拍：上旋拉满，打进左侧深角。',
    goalEn: 'Shot 3: max out the topspin and land it deep in the left corner.',
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
        titleZh: '高弧线上旋压反手',
        titleEn: 'High topspin to the backhand',
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
        titleZh: '单反切削过渡',
        titleEn: 'Defensive slice',
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
        titleZh: '重上旋大角度',
        titleEn: 'Heavy topspin, wide',
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
    number: '03',
    nameZh: '斜线相持，直线变线',
    nameEn: 'Cross-court, then down the line',
    inspirationZh: '灵感：2019 温网决赛，德约科维奇对费德勒',
    inspirationEn: 'Inspired by the 2019 Wimbledon final',
    surfaceKey: 'grass',
    playerAZh: 'R. Federer',
    playerBZh: 'N. Djokovic',
    playerAEn: 'R. Federer',
    playerBEn: 'N. Djokovic',
    ideaZh:
      '斜线更长，过网点也更低，所以相持打斜线。等对手被拉到边线外，再变直线。直线短，出球要压低一点。',
    ideaEn:
      'Cross-court is longer and crosses the low middle of the net, so rally there. Once the opponent is pulled wide, change to down the line. The line is shorter, so keep the ball lower.',
    goalZh: '第 4 拍（远端球员）：变直线，落进直线深区。',
    goalEn: 'Shot 4 (far player): go down the line and land it deep.',
    challengeTurnIndex: 3,
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
        titleZh: '正手斜线',
        titleEn: 'Cross-court forehand',
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
        titleZh: '斜线回压',
        titleEn: 'Deep cross-court reply',
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
        titleZh: '继续斜线',
        titleEn: 'Cross-court again',
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
        titleZh: '借力变直线',
        titleEn: 'Redirect down the line',
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
    number: '04',
    nameZh: '深球后放小球',
    nameEn: 'Deep, then drop',
    inspirationZh: '灵感：2023 温网决赛，阿尔卡拉斯对德约科维奇',
    inspirationEn: 'Inspired by the 2023 Wimbledon final',
    surfaceKey: 'grass',
    playerAZh: 'C. Alcaraz',
    playerBZh: 'N. Djokovic',
    playerAEn: 'C. Alcaraz',
    playerBEn: 'N. Djokovic',
    ideaZh:
      '先用重球把对手压到底线后面。再用同样的引拍突然放短，下旋让球落地后几乎不往前走。',
    ideaEn:
      'First push the opponent well behind the baseline with heavy drives. Then, from the same preparation, play it short; backspin keeps the ball from running on after the bounce.',
    goalZh: '第 3 拍：放慢、打下旋，落进网前浅区。',
    goalEn: 'Shot 3: slow it down, add backspin, land it short near the net.',
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
        titleZh: '重球压底线',
        titleEn: 'Heavy deep drive',
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
        titleZh: '退后中路过渡',
        titleEn: 'Neutral reply from deep',
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
        titleZh: '突然放小球',
        titleEn: 'Disguised drop shot',
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

/**
 * Human-readable requirements for a lesson's decisive shot, used by the checklist.
 * Spin is in rpm; negative values are backspin.
 */
export function describeTacticalGoal(lesson) {
  const tz = lesson?.targetZone;
  if (!tz) return [];
  const rows = [{ key: 'zone', zh: '落进目标区', en: 'Lands in the target' }];
  if (tz.minSpeedKmh !== undefined || tz.maxSpeedKmh !== undefined) {
    const lo = tz.minSpeedKmh;
    const hi = tz.maxSpeedKmh;
    const range = lo !== undefined && hi !== undefined ? `${lo}–${hi}` : lo !== undefined ? `≥ ${lo}` : `≤ ${hi}`;
    rows.push({ key: 'speed', zh: `球速 ${range} km/h`, en: `Speed ${range} km/h` });
  }
  if (tz.minSpinRpm !== undefined || tz.maxSpinRpm !== undefined) {
    const back = (tz.maxSpinRpm ?? 0) < 0;
    if (back) {
      const a = Math.abs(tz.maxSpinRpm);
      const b = Math.abs(tz.minSpinRpm ?? -9999);
      rows.push({ key: 'spin', zh: `下旋 ${a}–${b} rpm`, en: `Backspin ${a}–${b} rpm` });
    } else {
      const lo = tz.minSpinRpm;
      const hi = tz.maxSpinRpm;
      const range = lo !== undefined && hi !== undefined ? `${lo}–${hi}` : lo !== undefined ? `≥ ${lo}` : `≤ ${hi}`;
      rows.push({ key: 'spin', zh: `上旋 ${range} rpm`, en: `Topspin ${range} rpm` });
    }
  }
  return rows;
}

/**
 * Scores the current shot against the active lesson.
 * Returns null unless the decisive shot is selected. Otherwise:
 * `{ score, passed, checks: {zone, speed, spin}, tips: [{control, zh, en}], landing, feedbackZh, feedbackEn }`.
 * `control` names the input that fixes the problem (a slider / dial id).
 * Score: position up to 70 (Gaussian in normalised ellipse distance) + 15 speed + 15 spin.
 */
export function evaluateTacticalAttempt(lesson, turnIndex, state, simResult) {
  if (!lesson || turnIndex !== lesson.challengeTurnIndex || !simResult) {
    return null;
  }

  const tz = lesson.targetZone;
  const b = simResult.firstBounce;
  const halfLen = 11.885;
  const halfWidth = 4.115;
  const speed = state.speedKmh;
  const spin = state.topspinRpm;
  const wantsBackspin = (tz.maxSpinRpm ?? 0) < 0;

  const checks = { zone: false, speed: true, spin: true };
  const tips = [];
  const tip = (control, zh, en) => tips.push({ control, zh, en });

  if (tz.minSpeedKmh !== undefined && speed < tz.minSpeedKmh) {
    checks.speed = false;
    tip('racketSpeedKmh', `挥速再快一点（球速 ${speed.toFixed(0)}，要 ≥ ${tz.minSpeedKmh} km/h）`,
      `Swing faster (ball ${speed.toFixed(0)} km/h, need ≥ ${tz.minSpeedKmh})`);
  }
  if (tz.maxSpeedKmh !== undefined && speed > tz.maxSpeedKmh) {
    checks.speed = false;
    tip('racketSpeedKmh', `挥速放慢（球速 ${speed.toFixed(0)}，要 ≤ ${tz.maxSpeedKmh} km/h）`,
      `Swing slower (ball ${speed.toFixed(0)} km/h, need ≤ ${tz.maxSpeedKmh})`);
  }
  if (tz.minSpinRpm !== undefined && spin < tz.minSpinRpm) {
    checks.spin = false;
    if (wantsBackspin) {
      tip('swingPathDeg', `切得更深：轨迹再往下（现在 ${Math.round(spin)} rpm）`,
        `Cut more: steeper downward path (now ${Math.round(spin)} rpm)`);
    } else {
      tip('swingPathDeg', `轨迹更由下往上，多刷上旋（现在 ${Math.round(spin)} rpm）`,
        `Swing more low-to-high for more topspin (now ${Math.round(spin)} rpm)`);
    }
  }
  if (tz.maxSpinRpm !== undefined && spin > tz.maxSpinRpm) {
    checks.spin = false;
    if (wantsBackspin) {
      tip('swingPathDeg', `要下旋：轨迹改成从上往下，拍面打开（现在 ${Math.round(spin)} rpm）`,
        `Needs backspin: swing high-to-low with an open face (now ${Math.round(spin)} rpm)`);
    } else {
      tip('swingPathDeg', `上旋太多，轨迹放平一点（现在 ${Math.round(spin)} rpm）`,
        `Too much topspin; flatten the swing path (now ${Math.round(spin)} rpm)`);
    }
  }

  const finish = (score, passed, headZh, headEn) => {
    const first = tips[0];
    return {
      score,
      passed,
      checks,
      tips,
      landing: b && !simResult.hitNet ? { localX: b.localX, localY: b.localY } : null,
      feedbackZh: first ? `${headZh}${first.zh}` : headZh.replace(/[：，]$/, ''),
      feedbackEn: first ? `${headEn}${first.en}` : headEn.replace(/[:,] $/, '')
    };
  };

  if (simResult.hitNet || !b || b.localX <= 0) {
    tips.unshift({ control: 'faceAngleDeg', zh: '拍面打开一点，让球过网', en: 'Open the face a little to clear the net' });
    return finish(15, false, '下网。', 'Into the net. ');
  }

  if (!b.isIn) {
    if (Math.abs(b.localY) > halfWidth) {
      const toLeft = b.localY < 0;
      tips.unshift({ control: 'aimAngleDeg', zh: `出边线：方向往${toLeft ? '左（+）' : '右（−）'}收`,
        en: `Wide: aim back to the ${toLeft ? 'left (+)' : 'right (−)'}` });
    } else if (b.localX > halfLen) {
      tips.unshift({ control: 'faceAngleDeg', zh: '出底线：拍面关一点，或多加上旋', en: 'Long: close the face a little or add topspin' });
    }
    return finish(28, false, '出界。', 'Out. ');
  }

  const normDx = (b.localX - tz.localX) / tz.rx;
  const normDy = (b.localY - tz.localY) / tz.ry;
  const radialNorm = Math.hypot(normDx, normDy);
  checks.zone = radialNorm <= 1.05;

  if (!checks.zone) {
    const posTips = [];
    if (normDy < -0.7) posTips.push({ control: 'aimAngleDeg', zh: '落点偏右：方向往左（+）', en: 'Landing right of target: aim left (+)' });
    else if (normDy > 0.7) posTips.push({ control: 'aimAngleDeg', zh: '落点偏左：方向往右（−）', en: 'Landing left of target: aim right (−)' });
    if (normDx < -0.7) {
      posTips.push(wantsBackspin
        ? { control: 'faceAngleDeg', zh: '落点太浅：拍面再开一点', en: 'Too short: open the face a little' }
        : { control: 'faceAngleDeg', zh: '落点太浅：拍面开一点或挥快一点', en: 'Too short: open the face a little or swing faster' });
    } else if (normDx > 0.7) {
      posTips.push(wantsBackspin
        ? { control: 'racketSpeedKmh', zh: '落点太深：挥速再慢一点', en: 'Too deep: swing slower' }
        : { control: 'faceAngleDeg', zh: '落点太深：拍面关一点', en: 'Too deep: close the face a little' });
    }
    tips.push(...posTips); // pace/spin fixes first: they also move the landing
  }

  const posScore = Math.max(0, Math.round(70 * Math.exp(-0.55 * radialNorm * radialNorm)));
  const totalScore = Math.min(100, posScore + (checks.speed ? 15 : 4) + (checks.spin ? 15 : 4));
  const passed = checks.zone && checks.speed && checks.spin;

  if (passed) {
    const score = Math.max(88, totalScore);
    return finish(score, true, '完成：落点、球速和旋转都达标。', 'Done: placement, pace and spin all on target.');
  }
  return finish(totalScore, false, '', '');
}
