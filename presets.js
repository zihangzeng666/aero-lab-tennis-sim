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
    badgeZh: '战术课 01 // 发球+1 组合拳',
    badgeEn: 'LESSON 01 // SERVE + 1',
    titleZh: '灵感 · 2017 澳网决赛 · 费德勒「外角一发 + 迎前反方向正手制胜」',
    titleEn: 'Inspired by 2017 AO Final · Federer Wide Serve + Inside-In Forehand Winner',
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
    badgeZh: '战术课 02 // 西班牙十字战术',
    badgeEn: 'LESSON 02 // THE SPANISH X',
    titleZh: '灵感 · 2008 温网史诗决赛 · 纳达尔「超级上旋锁反手 + 侧身大对角突袭」',
    titleEn: 'Inspired by 2008 Wimbledon Final · Nadal Heavy Topspin Cage + Inside-Out Whip',
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
        titleZh: '#1 纳达尔高压上旋锁反手',
        titleEn: '#1 Nadal High Topspin Cage',
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
    badgeZh: '战术课 03 // 沃德洛变线法则',
    badgeEn: 'LESSON 03 // WARDLAW DTL REDIRECT',
    titleZh: '灵感 · 2019 温网决赛 · 德约科维奇「斜线相持耐心蓄力 + 借力变直线」',
    titleEn: 'Inspired by 2019 Wimbledon Final · Djokovic Cross-Court Patience + DTL Redirect',
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
    badgeZh: '战术课 04 // 纵深撕扯放小球',
    badgeEn: 'LESSON 04 // DEPTH & DROP SHOT',
    titleZh: '灵感 · 2023 温网决赛 · 阿尔卡拉斯「重炮逼退底线 + 突然切削放小球」',
    titleEn: 'Inspired by 2023 Wimbledon Final · Alcaraz Heavy Drive + Disguised Drop Shot',
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
      feedbackZh: `战术完美达成（${Math.max(88, totalScore)}分）！落点精准命中金色制胜靶区，球速与旋转达到本课目标！`,
      feedbackEn: `Lesson passed (${Math.max(88, totalScore)}/100)! Bullseye hit with the target pace & spin!`
    };
  }

  return {
    score: totalScore,
    passed: false,
    feedbackZh: `当前评分 ${totalScore}分 · 教练建议：${tipsZh.join('；') || '微调角度与球速以更贴近金色靶心'}`,
    feedbackEn: `Score ${totalScore}/100 · Coach Tip: ${tipsEn.join('; ') || 'Fine-tune aim and speed toward the Gold Bullseye'}`
  };
}
