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
// Each lesson is a scripted rally. Shots are given as launch targets (speed, angle, spin, aim);
// the racket settings are back-solved and every receiver's position comes from the previous
// flight (chainRallyTurns). The numbers were tuned so each ball lands where the coaching text
// says it does. `receive` on a turn says how that player takes the incoming ball (volley,
// or inside the court); otherwise they let it bounce and take it near the baseline.
export const TACTICAL_LESSONS = {
  federer_serve_plus_one: {
    id: "federer_serve_plus_one",
    number: "01",
    situationZh: "发球局",
    situationEn: "Serving",
    nameZh: "发球 + 1",
    nameEn: "Serve + 1",
    inspirationZh: "灵感：2017 澳网决赛，费德勒对纳达尔",
    inspirationEn: "Inspired by the 2017 Australian Open final",
    surfaceKey: "hard",
    playerAZh: 'A', playerBZh: 'B', playerAEn: 'A', playerBEn: 'B',
    ideaZh: "外角发球把接发方拉出场外。回球一短，就迎前一步，打向他刚离开的那一侧。",
    ideaEn: "Serve wide to pull the returner off the court. When the reply lands short, step in and hit to the side they just left.",
    keyPointsZh: ["平分区外角发球带外拐的侧旋，接发方要追到单打边线外约 1 米才碰得到球。","第 3 拍站进底线里打：同样的球速，对手的反应时间少了约 0.2–0.3 秒。","打空档而不是打人：对手回位要跑的距离，比球速更能决定这一拍能不能得分。"],
    keyPointsEn: ["A wide slice serve on the deuce side curves away; the returner has to reach about 1 m outside the singles sideline.","Take the third shot from inside the baseline: at the same pace, the opponent loses about 0.2–0.3 s.","Hit the space, not the player: the distance they must run decides the point more than raw pace."],
    goalZh: "第 3 拍：迎前把球打进右侧空档，要快。",
    goalEn: "Shot 3: step in and drive it into the open right corner, fast.",
    mistakeZh: "打回中路：对手两三步就回到位置",
    mistakeEn: "Back to the middle: two or three steps and they are back in position",
    challengeTurnIndex: 2,
    targetZone: { side: "A", localX: 8.6, localY: -2.65, rx: 1.85, ry: 1.15, minSpeedKmh: 138, minSpinRpm: 2200, maxSpinRpm: 3800 },
    proSolution: { targetSpeedKmh: 145, targetLaunchAngleDeg: 5.3, targetTopspinRpm: 2950, aimAngleDeg: -3.4 },
    challengeStart: { targetSpeedKmh: 126, targetLaunchAngleDeg: 6.9, targetTopspinRpm: 2700, aimAngleDeg: 7.6 },
    turns: [
      {
        side: "A",
        titleZh: "外角发球",
        titleEn: "Wide serve",
        whyZh: "从中点附近发外角，侧旋让球向外拐，把 B 拉到单打边线外。B 只能伸手挡，回球角度也被限制在中路。",
        whyEn: "Served from near the centre mark, sidespin curves the ball away and drags B outside the singles sideline. B can only reach and block, which keeps the reply in the middle.",
        courtMode: "serve_deuce",
        hitX: -11.88,
        hitY: -0.85,
        hitZ: 2.72,
        incomingSpeedKmh: 0,
        incomingAngleDeg: 0,
        incomingSpinRpm: 0,
        sidespinRpm: 550,
        targetSpeedKmh: 182,
        targetLaunchAngleDeg: -3.7,
        targetTopspinRpm: 1650,
        aimAngleDeg: 14.8
      },
      {
        side: "B",
        titleZh: "被动挡回中路",
        titleEn: "Blocked return",
        whyZh: "B 在场外伸手挡球，拍面控制有限。最安全的是回中路：不快、偏浅。",
        whyEn: "Stretched outside the court, B has little control of the face. The safe reply is through the middle: slow and a bit short.",
        sidespinRpm: 120,
        targetSpeedKmh: 100,
        targetLaunchAngleDeg: 14.4,
        targetTopspinRpm: 1800,
        aimAngleDeg: 15.2
      },
      {
        side: "A",
        titleZh: "迎前打空档",
        titleEn: "Step in, hit the gap",
        whyZh: "A 不退，站进底线里抢早打。B 还在场外，右侧整片是空的：打这里，B 要跑过大半个场。打回中路或 B 那一侧，等于把时间还给他。",
        whyEn: "A does not back off and takes the ball early from inside the baseline. B is still off the court and the whole right side is open; B has to run across most of the court. Hitting to the middle or to B gives the time back.",
        receive: { mode: "bounce", depth: 10.4 },
        sidespinRpm: 280,
        targetSpeedKmh: 145,
        targetLaunchAngleDeg: 5.3,
        targetTopspinRpm: 2950,
        aimAngleDeg: -3.4
      }
    ]
  },
  serve_and_volley: {
    id: "serve_and_volley",
    number: "02",
    situationZh: "发球局",
    situationEn: "Serving",
    nameZh: "发球上网",
    nameEn: "Serve and volley",
    inspirationZh: "基本战术",
    inspirationEn: "Core pattern",
    surfaceKey: "grass",
    playerAZh: 'A', playerBZh: 'B', playerAEn: 'A', playerBEn: 'B',
    ideaZh: "发完球直接上网，在对手站稳之前用截击结束这一分。发中路 T 点能把接发的角度收窄，回球多半从中间回来，正好在你上网的路线上。",
    ideaEn: "Follow the serve to the net and finish with volleys before the opponent recovers. A serve down the T narrows the return angles, so most returns come back through the middle, right on your path forward.",
    keyPointsZh: ["发 T 点：接发方能打出的斜线角度最小，回球多数回到中路。","发完沿着球的方向冲，第一拍截击大约在发球线附近（离网 6–7 m），对手击球时分腿垫步。","第一拍低截击不求打死：送深、送到角，再继续往前压，站到对手回球角度的平分线上。"],
    keyPointsEn: ["Serve down the T: the returner has the least angle, so most returns come back through the middle.","Follow the line of the serve; the first volley is around the service line (6–7 m from the net). Split-step as the opponent hits.","Do not try to win with a low first volley. Play it deep into a corner, keep moving in, and stand on the bisector of their possible replies."],
    goalZh: "第 3 拍（第一拍截击）：低截击送深到右侧底角。",
    goalEn: "Shot 3 (first volley): play the low volley deep into the right corner.",
    mistakeZh: "软截回中路：落点浅、正对着 B，下一拍就是穿越球",
    mistakeEn: "Soft volley to the middle: short and straight at B, who then passes you",
    challengeTurnIndex: 2,
    targetZone: { side: "A", localX: 9, localY: -2.6, rx: 1.7, ry: 1.15, minSpeedKmh: 55, minSpinRpm: -2600, maxSpinRpm: -150 },
    proSolution: { targetSpeedKmh: 70, targetLaunchAngleDeg: 11.7, targetTopspinRpm: -900, aimAngleDeg: -10.8 },
    challengeStart: { targetSpeedKmh: 74, targetLaunchAngleDeg: 8.4, targetTopspinRpm: -900, aimAngleDeg: 1.9 },
    turns: [
      {
        side: "A",
        titleZh: "发 T 点",
        titleEn: "Serve down the T",
        whyZh: "落点在中线附近，B 的回球角度被压到最小。A 发完立刻向前。",
        whyEn: "Landing on the centre line leaves B the least angle. A moves forward straight after the serve.",
        courtMode: "serve_deuce",
        hitX: -11.88,
        hitY: -0.35,
        hitZ: 2.75,
        incomingSpeedKmh: 0,
        incomingAngleDeg: 0,
        incomingSpinRpm: 0,
        sidespinRpm: 300,
        targetSpeedKmh: 178,
        targetLaunchAngleDeg: -4.2,
        targetTopspinRpm: 1500,
        aimAngleDeg: 2.7
      },
      {
        side: "B",
        titleZh: "压低回到脚下",
        titleEn: "Low return at the feet",
        whyZh: "B 对上网者最好的回应：把球压低打到脚下，逼对方从低处往上截。",
        whyEn: "The best answer to a net rusher: keep it low at the feet so the volley has to be lifted.",
        sidespinRpm: 100,
        targetSpeedKmh: 95,
        targetLaunchAngleDeg: 15.6,
        targetTopspinRpm: 1800,
        aimAngleDeg: 1.3
      },
      {
        side: "A",
        titleZh: "第一拍截击送深",
        titleEn: "First volley, deep",
        whyZh: "球在离网约 6.6 m、离地约 0.6 m 处被截到，低于网高，只能往上托。所以不发力：拍面打开，送深送到角，给自己时间继续向前。",
        whyEn: "The volley is taken about 6.6 m from the net and 0.6 m off the ground, below net height, so it has to go up. No power: open the face, send it deep into a corner, and use the time to keep closing.",
        receive: { mode: "volley", depth: 6.6 },
        sidespinRpm: -150,
        targetSpeedKmh: 70,
        targetLaunchAngleDeg: 11.7,
        targetTopspinRpm: -900,
        aimAngleDeg: -10.8
      }
    ]
  },
  return_deep_middle: {
    id: "return_deep_middle",
    number: "03",
    situationZh: "接发球",
    situationEn: "Returning",
    nameZh: "接发：深回中路",
    nameEn: "Return deep through the middle",
    inspirationZh: "基本战术",
    inspirationEn: "Core pattern",
    surfaceKey: "hard",
    playerAZh: 'A', playerBZh: 'B', playerAEn: 'A', playerBEn: 'B',
    ideaZh: "面对大力外角发球，接发的首要目标是把这一分拉回中立：回深、回中路。回中路让发球方没有角度，深度让他没法迎前打第三拍。",
    ideaEn: "Against a big wide serve, the return’s first job is to make the point neutral again: deep and through the middle. The middle takes away the server’s angles, and depth stops them stepping in on the third shot.",
    keyPointsZh: ["接外角发球时人在单打边线外约 1 米。从这里打直线：过网点最高，场地最短。","深回中路：从球网中段（最低 0.914 m）过网，落在底线前 2 m 以内。","缩短引拍、借对方的球速：挡或短抽，拍速比底线相持低得多。"],
    keyPointsEn: ["Returning a wide serve, you are about 1 m outside the singles sideline. A line return from there crosses the highest part of the net over the shortest court.","Deep through the middle: over the lowest part of the net (0.914 m), landing within 2 m of the baseline.","Shorten the swing and use the server’s pace: block or chip; racket speed is far below a rally swing."],
    goalZh: "第 2 拍：回深、回中路。",
    goalEn: "Shot 2: return deep through the middle.",
    mistakeZh: "抢直线：过网点高、场地短，进了你也还在场外",
    mistakeEn: "Going for the line: high net, short court, and you are still off the court if it goes in",
    challengeTurnIndex: 1,
    targetZone: { side: "A", localX: 9.8, localY: 0, rx: 1.8, ry: 1.3, minSpeedKmh: 90, minSpinRpm: 400, maxSpinRpm: 3600 },
    proSolution: { targetSpeedKmh: 105, targetLaunchAngleDeg: 14.7, targetTopspinRpm: 1500, aimAngleDeg: 12.3 },
    challengeStart: { targetSpeedKmh: 125, targetLaunchAngleDeg: 8.6, targetTopspinRpm: 1400, aimAngleDeg: 3.7 },
    turns: [
      {
        side: "B",
        titleZh: "外角大力发球",
        titleEn: "Big wide serve",
        whyZh: "平分区外角，把 A 拉到单打边线外。",
        whyEn: "Wide on the deuce side, pulling A outside the singles sideline.",
        courtMode: "serve_deuce",
        hitX: -11.88,
        hitY: -0.7,
        hitZ: 2.75,
        incomingSpeedKmh: 0,
        incomingAngleDeg: 0,
        incomingSpinRpm: 0,
        sidespinRpm: 500,
        targetSpeedKmh: 182,
        targetLaunchAngleDeg: -3.9,
        targetTopspinRpm: 1600,
        aimAngleDeg: 14.2
      },
      {
        side: "A",
        titleZh: "深回中路",
        titleEn: "Deep through the middle",
        whyZh: "A 在场外被动接球。深回中路，B 的第三拍只能在底线后中立地打，这一分重新开始。",
        whyEn: "A is stretched off the court. A deep return through the middle leaves B a neutral third shot from behind the baseline, and the point starts over.",
        sidespinRpm: 100,
        targetSpeedKmh: 105,
        targetLaunchAngleDeg: 14.7,
        targetTopspinRpm: 1500,
        aimAngleDeg: 12.3
      }
    ]
  },
  djokovic_wardlaw_dtl: {
    id: "djokovic_wardlaw_dtl",
    number: "04",
    situationZh: "底线相持",
    situationEn: "Baseline rally",
    nameZh: "斜线相持，直线变线",
    nameEn: "Cross-court, then down the line",
    inspirationZh: "灵感：2019 温网决赛，德约科维奇对费德勒",
    inspirationEn: "Inspired by the 2019 Wimbledon final",
    surfaceKey: "grass",
    playerAZh: 'A', playerBZh: 'B', playerAEn: 'A', playerBEn: 'B',
    ideaZh: "斜线更长、过网点更低，所以相持打斜线。等对手被拉到边线外、来球又在你舒服的位置时，再变直线。直线短，出球要压低一点。",
    ideaEn: "Cross-court is longer and crosses the low middle of the net, so rally there. Change to down the line once the opponent is pulled wide and the ball is in your comfort zone. The line is shorter, so keep it lower.",
    keyPointsZh: ["单打场对角线约 25.2 m，直线 23.8 m：斜线多出约 1.4 m 的出界余量。","斜线从球网中段过（约 0.92–0.95 m），直线从边线附近过（约 1.04 m）。","Wardlaw 方向法则：来球又深又快、把你挤到身体外侧时，顺着斜线打回去；来球在舒适区内，才考虑变线。"],
    keyPointsEn: ["The singles diagonal is about 25.2 m, the line 23.8 m: cross-court has about 1.4 m more room.","Cross-court crosses the middle of the net (about 0.92–0.95 m); down the line crosses near the sideline (about 1.04 m).","Wardlaw directionals: when the ball is deep and fast and jams you, send it back where it came from; change direction only on a ball inside your comfort zone."],
    goalZh: "第 4 拍（远端 B）：变直线，落进直线深区。",
    goalEn: "Shot 4 (far player B): go down the line and land it deep.",
    mistakeZh: "继续回斜线：安全，但把主动权还给 A",
    mistakeEn: "Cross-court again: safe, but it hands the initiative back to A",
    challengeTurnIndex: 3,
    targetZone: { side: "B", localX: 8.6, localY: -2.85, rx: 1.95, ry: 1.05, minSpeedKmh: 132, minSpinRpm: 2200, maxSpinRpm: 3600 },
    proSolution: { targetSpeedKmh: 138, targetLaunchAngleDeg: 8.5, targetTopspinRpm: 2750, aimAngleDeg: 5.9 },
    challengeStart: { targetSpeedKmh: 136, targetLaunchAngleDeg: 9.9, targetTopspinRpm: 2600, aimAngleDeg: 19.9 },
    turns: [
      {
        side: "A",
        titleZh: "正手斜线",
        titleEn: "Cross-court forehand",
        whyZh: "相持的默认选择：长、过网低、容错大。",
        whyEn: "The default rally ball: long, low over the net, plenty of margin.",
        hitX: -11.75,
        hitY: -1.65,
        hitZ: 1.06,
        sidespinRpm: 220,
        targetSpeedKmh: 135,
        targetLaunchAngleDeg: 8.3,
        targetTopspinRpm: 2900,
        aimAngleDeg: 12.5
      },
      {
        side: "B",
        titleZh: "斜线回压",
        titleEn: "Cross-court reply",
        whyZh: "B 也打斜线，双方在拼深度和角度，谁先打短谁吃亏。",
        whyEn: "B answers cross-court. Both players fight for depth and angle; whoever lands short first is in trouble.",
        sidespinRpm: 180,
        targetSpeedKmh: 133,
        targetLaunchAngleDeg: 11.1,
        targetTopspinRpm: 2750,
        aimAngleDeg: 16.6
      },
      {
        side: "A",
        titleZh: "更有角度的斜线",
        titleEn: "Sharper cross-court",
        whyZh: "A 打出更大的角度，把 B 拉到边线外。但球的高度和速度都在 B 的舒适区。",
        whyEn: "A finds a sharper angle and pulls B outside the sideline, but the ball arrives at a comfortable height and pace for B.",
        sidespinRpm: 240,
        targetSpeedKmh: 136,
        targetLaunchAngleDeg: 10.2,
        targetTopspinRpm: 2950,
        aimAngleDeg: 19.4
      },
      {
        side: "B",
        titleZh: "借力变直线",
        titleEn: "Redirect down the line",
        whyZh: "B 在边线外，来球舒服，这时变直线：A 刚打完斜线还在另一侧，直线是离他最远的地方。压低出球，直线比斜线短。",
        whyEn: "B is wide but the ball is comfortable, so B changes direction: A has just hit cross-court and is on the other side, and the line is the farthest point from A. Keep it lower: the line is shorter.",
        sidespinRpm: 140,
        targetSpeedKmh: 138,
        targetLaunchAngleDeg: 8.5,
        targetTopspinRpm: 2750,
        aimAngleDeg: 5.9
      }
    ]
  },
  nadal_spanish_x: {
    id: "nadal_spanish_x",
    number: "05",
    situationZh: "底线相持",
    situationEn: "Baseline rally",
    nameZh: "上旋压反手",
    nameEn: "Topspin to the backhand",
    inspirationZh: "灵感：2008 温网决赛。纳达尔是左手，用正手斜线压费德勒的单反；这里 A 是右手，同样的几何是反手斜线对反手。",
    inspirationEn: "Inspired by the 2008 Wimbledon final. Nadal is left-handed and used his cross-court forehand on Federer’s one-hander; for right-handed A the same geometry is the backhand diagonal.",
    surfaceKey: "grass",
    playerAZh: 'A', playerBZh: 'B', playerAEn: 'A', playerBEn: 'B',
    ideaZh: "高弧线、重上旋的球落地后弹得高，单手反手只能在肩膀以上击球，很难发力，多半只能切回来。连续压这一侧，等来一个慢的切削，再用更陡的挥拍拉出更大的角度。",
    ideaEn: "A high, heavy topspin ball kicks up after the bounce, so a one-handed backhand has to play above the shoulder and usually slices. Keep working that side, wait for the slow slice, then swing steeper for a bigger angle.",
    keyPointsZh: ["上旋 ≥3500 rpm、过网 1 m 左右：落地后弹得明显更高（对比 3D 里的无旋虚线）。","压同一侧不是为了一拍制胜，而是逼出一个短的、慢的回球。","对方切削回来的球几乎没有上旋，你要自己制造全部的速度和旋转：挥拍更由下往上。"],
    keyPointsEn: ["3500 rpm or more and about 1 m over the net: the bounce is clearly higher (compare the no-spin ghost in 3D).","Working one side is not about one winning shot; it forces a short, slow reply.","A sliced reply carries almost no topspin, so you create all the pace and spin yourself: swing more low-to-high."],
    goalZh: "第 3 拍：上旋拉满，压到对手反手深角。",
    goalEn: "Shot 3: max out the topspin and push it deep to the backhand corner.",
    mistakeZh: "平打回中路：没有弹跳，B 在舒服的高度就能反击",
    mistakeEn: "Flat to the middle: no kick, so B attacks from a comfortable height",
    challengeTurnIndex: 2,
    targetZone: { side: "A", localX: 9.4, localY: -2.8, rx: 1.8, ry: 1.15, minSpeedKmh: 118, minSpinRpm: 3500, maxSpinRpm: 4800, minNetClearanceM: 0.8 },
    proSolution: { targetSpeedKmh: 126, targetLaunchAngleDeg: 11.3, targetTopspinRpm: 3900, aimAngleDeg: -16.6 },
    challengeStart: { targetSpeedKmh: 132, targetLaunchAngleDeg: 7.5, targetTopspinRpm: 2100, aimAngleDeg: -11.1 },
    turns: [
      {
        side: "A",
        titleZh: "高弧线上旋压反手",
        titleEn: "High topspin to the backhand",
        whyZh: "过网高、上旋重，落地后弹到 B 的肩膀以上。",
        whyEn: "High over the net with heavy spin; it kicks above B’s shoulder.",
        hitX: -12,
        hitY: 2,
        hitZ: 1.1,
        sidespinRpm: -200,
        targetSpeedKmh: 120,
        targetLaunchAngleDeg: 11.7,
        targetTopspinRpm: 3600,
        aimAngleDeg: -13.2
      },
      {
        side: "B",
        titleZh: "单反切削过渡",
        titleEn: "One-handed slice",
        whyZh: "B 在肩膀以上够不到发力点，只能切：切削慢、偏浅、几乎没有上旋。",
        whyEn: "Above the shoulder B cannot drive the ball and slices: slow, a bit short, almost no topspin.",
        sidespinRpm: -250,
        targetSpeedKmh: 98,
        targetLaunchAngleDeg: 7.1,
        targetTopspinRpm: -1500,
        aimAngleDeg: -17.1
      },
      {
        side: "A",
        titleZh: "重上旋大角度",
        titleEn: "Heavy topspin, wider",
        whyZh: "来球慢、没有上旋，A 自己制造速度和旋转：挥拍更陡，过网高，落地后弹得更高、更往外。",
        whyEn: "The ball is slow with no topspin, so A creates it: a steeper swing, high over the net, kicking higher and wider after the bounce.",
        sidespinRpm: -200,
        targetSpeedKmh: 126,
        targetLaunchAngleDeg: 11.3,
        targetTopspinRpm: 3900,
        aimAngleDeg: -16.6
      }
    ]
  },
  inside_out_forehand: {
    id: "inside_out_forehand",
    number: "06",
    situationZh: "底线相持",
    situationEn: "Baseline rally",
    nameZh: "侧身正手",
    nameEn: "Run-around forehand",
    inspirationZh: "基本战术",
    inspirationEn: "Core pattern",
    surfaceKey: "hard",
    playerAZh: 'A', playerBZh: 'B', playerAEn: 'A', playerBEn: 'B',
    ideaZh: "用正手（多数人更强的一边）控制场地：跑到反手位侧身打正手反斜，压对手反手。对手回球一短一偏，就用同样的准备打正手内角直线，打向他的正手空档。",
    ideaEn: "Use the forehand, usually the stronger side, to control the court: run around the backhand and hit inside-out to the opponent’s backhand. When the reply comes back short and central, use the same preparation to go inside-in, into the open forehand side.",
    keyPointsZh: ["侧身的代价是让出自己的正手位：只有来球够慢、够靠中路时才侧身。","反斜（inside-out）从球网中段过、场地长，是安全的进攻；内角直线（inside-in）是变线，用在对手离开位置之后。","同样的准备打两个方向，对手在你击球前分辨不出来。"],
    keyPointsEn: ["Running around costs you the forehand side of the court, so only do it on a slow ball near the middle.","Inside-out crosses the middle of the net over a long court: a safe attack. Inside-in is the change of direction, used once the opponent has left that side.","One preparation, two directions: the opponent cannot read it before contact."],
    goalZh: "第 5 拍：正手内角直线，打到对手正手空档。",
    goalEn: "Shot 5: inside-in forehand into the open forehand side.",
    mistakeZh: "再打反斜：打回 B 正在等的位置",
    mistakeEn: "Inside-out again: right where B is waiting",
    challengeTurnIndex: 4,
    targetZone: { side: "A", localX: 9.3, localY: 2.9, rx: 1.7, ry: 1.05, minSpeedKmh: 132, minSpinRpm: 2000, maxSpinRpm: 3900 },
    proSolution: { targetSpeedKmh: 142, targetLaunchAngleDeg: 8.1, targetTopspinRpm: 2800, aimAngleDeg: 1.5 },
    challengeStart: { targetSpeedKmh: 130, targetLaunchAngleDeg: 9.8, targetTopspinRpm: 2700, aimAngleDeg: -12.9 },
    turns: [
      {
        side: "A",
        titleZh: "反手斜线",
        titleEn: "Backhand cross-court",
        whyZh: "反手对反手的相持。",
        whyEn: "A backhand-to-backhand rally.",
        hitX: -11.9,
        hitY: 2.4,
        hitZ: 1,
        sidespinRpm: -150,
        targetSpeedKmh: 118,
        targetLaunchAngleDeg: 10.7,
        targetTopspinRpm: 2400,
        aimAngleDeg: -14.1
      },
      {
        side: "B",
        titleZh: "回球偏短",
        titleEn: "Reply lands short",
        whyZh: "B 的回球落在 A 的反手区，但不够深，这是可以侧身的信号。",
        whyEn: "B’s reply lands on A’s backhand side but not deep: the cue to run around it.",
        sidespinRpm: -150,
        targetSpeedKmh: 110,
        targetLaunchAngleDeg: 13.8,
        targetTopspinRpm: 2300,
        aimAngleDeg: -15.7
      },
      {
        side: "A",
        titleZh: "侧身正手反斜",
        titleEn: "Inside-out forehand",
        whyZh: "A 跑到球的左侧用正手打，速度和旋转都比反手大，继续压 B 的反手，把他拉得更外。",
        whyEn: "A moves left of the ball and uses the forehand, with more pace and spin than the backhand, pushing B wider on the backhand side.",
        sidespinRpm: 250,
        targetSpeedKmh: 135,
        targetLaunchAngleDeg: 9.6,
        targetTopspinRpm: 3000,
        aimAngleDeg: -16.3
      },
      {
        side: "B",
        titleZh: "被动回中路",
        titleEn: "Defensive reply",
        whyZh: "B 被拉到边线外，只能回一个偏中、偏浅的球。",
        whyEn: "Pulled wide, B can only send back a central, shortish ball.",
        sidespinRpm: -100,
        targetSpeedKmh: 100,
        targetLaunchAngleDeg: 14.1,
        targetTopspinRpm: 1800,
        aimAngleDeg: -15.4
      },
      {
        side: "A",
        titleZh: "正手内角直线",
        titleEn: "Inside-in forehand",
        whyZh: "B 还在反手位，正手一侧全空。A 用同样的侧身准备，突然打直线。",
        whyEn: "B is still on the backhand side and the forehand side is empty. With the same preparation, A goes down the line.",
        sidespinRpm: 250,
        targetSpeedKmh: 142,
        targetLaunchAngleDeg: 8.1,
        targetTopspinRpm: 2800,
        aimAngleDeg: 1.5
      }
    ]
  },
  approach_and_volley: {
    id: "approach_and_volley",
    number: "07",
    situationZh: "上网",
    situationEn: "At the net",
    nameZh: "随球上网",
    nameEn: "Approach and volley",
    inspirationZh: "基本战术",
    inspirationEn: "Core pattern",
    surfaceKey: "hard",
    playerAZh: 'A', playerBZh: 'B', playerAEn: 'A', playerBEn: 'B',
    ideaZh: "对手的球一短，就借这一拍上网：随球打直线、打深，然后站到对手回球角度的平分线上。对手只能穿越或挑高球，你在网前把截击打向空档。",
    ideaEn: "When the opponent lands short, use that ball to come in: approach down the line and deep, then stand on the bisector of their possible replies. They must pass or lob; you volley into the open court.",
    keyPointsZh: ["随球打直线：你上网的路线和球在同一侧，对手最好打的直线穿越被你挡住，只剩更难的斜线。","随球用切削：球低、滑，对手要从低处往上打穿越。","上网站在平分线上：对手能打出的最左、最右两条线的正中间（平面图上画出来了）。","网前截击打向空档：对手刚离开的另一侧，或者短斜线。"],
    keyPointsEn: ["Approach down the line: you follow the ball on the same side, so the easy line pass is covered and only the harder cross-court pass is left.","Slice the approach: it stays low and skids, so the pass has to be lifted.","Stand on the bisector at the net: halfway between the widest replies to either side (drawn on the court map).","Volley into the open court: the side the opponent just left, or a short angle."],
    goalZh: "第 5 拍（网前截击）：向下打向空档的短斜线。",
    goalEn: "Shot 5 (volley): angle it down into the open court.",
    mistakeZh: "截回深处、打到 B 身边：给了他第二次穿越机会",
    mistakeEn: "Volleying deep back to B: a second chance to pass",
    challengeTurnIndex: 4,
    targetZone: { side: "A", localX: 6, localY: 3.6, rx: 1.5, ry: 0.9, minSpeedKmh: 60, minSpinRpm: -3000, maxSpinRpm: 600 },
    proSolution: { targetSpeedKmh: 88, targetLaunchAngleDeg: -7.4, targetTopspinRpm: -600, aimAngleDeg: 15.4 },
    challengeStart: { targetSpeedKmh: 88, targetLaunchAngleDeg: -1.5, targetTopspinRpm: -600, aimAngleDeg: -15 },
    turns: [
      {
        side: "A",
        titleZh: "正手斜线",
        titleEn: "Cross-court forehand",
        whyZh: "相持中的一拍深斜线。",
        whyEn: "A deep cross-court rally ball.",
        hitX: -11.8,
        hitY: -1.5,
        hitZ: 1,
        sidespinRpm: 200,
        targetSpeedKmh: 128,
        targetLaunchAngleDeg: 9,
        targetTopspinRpm: 2700,
        aimAngleDeg: 11.9
      },
      {
        side: "B",
        titleZh: "回球偏短",
        titleEn: "Short reply",
        whyZh: "B 的回球落在发球线附近：A 可以向前。",
        whyEn: "B’s ball lands near the service line: A can move forward.",
        sidespinRpm: 100,
        targetSpeedKmh: 90,
        targetLaunchAngleDeg: 16,
        targetTopspinRpm: 1500,
        aimAngleDeg: 16.1
      },
      {
        side: "A",
        titleZh: "直线随球",
        titleEn: "Approach down the line",
        whyZh: "A 在场内约 7.6 m 处打切削直线到深角，然后继续上网。",
        whyEn: "From about 7.6 m inside the court A slices down the line into the deep corner and keeps coming in.",
        receive: { mode: "bounce", depth: 7.6 },
        sidespinRpm: -200,
        targetSpeedKmh: 90,
        targetLaunchAngleDeg: 5.8,
        targetTopspinRpm: -1000,
        aimAngleDeg: -2.4
      },
      {
        side: "B",
        titleZh: "斜线穿越",
        titleEn: "Cross-court pass",
        whyZh: "B 在边角被动，直线被 A 封住，只能打斜线穿越。",
        whyEn: "B is pinned in the corner; the line is covered, so B tries the cross-court pass.",
        sidespinRpm: 150,
        targetSpeedKmh: 115,
        targetLaunchAngleDeg: 12.5,
        targetTopspinRpm: 2800,
        aimAngleDeg: -15.1
      },
      {
        side: "A",
        titleZh: "截击打空档",
        titleEn: "Volley into the open court",
        whyZh: "A 已经到网前约 2.2 m，球在约 1.6 m 高：机会球。B 在另一侧底线角，向下打短斜线到空档。",
        whyEn: "A is about 2.2 m from the net and the ball is about 1.6 m high: a sitter. B is in the far corner, so A angles it down into the open side.",
        receive: { mode: "volley", depth: 2.2 },
        sidespinRpm: -100,
        targetSpeedKmh: 88,
        targetLaunchAngleDeg: -7.4,
        targetTopspinRpm: -600,
        aimAngleDeg: 15.4
      }
    ]
  },
  defend_high_deep: {
    id: "defend_high_deep",
    number: "08",
    situationZh: "防守",
    situationEn: "Defending",
    nameZh: "高弧线防守",
    nameEn: "High, deep defence",
    inspirationZh: "基本战术",
    inspirationEn: "Core pattern",
    surfaceKey: "clay",
    playerAZh: 'A', playerBZh: 'B', playerAEn: 'A', playerBEn: 'B',
    ideaZh: "被拉到场外时，不要硬打制胜分。打一个过网很高、落点很深的斜线球，换来时间回到场地中央。",
    ideaEn: "When you are pulled off the court, do not force a winner. Play high over the net and deep cross-court to buy the time to get back to the middle.",
    keyPointsZh: ["被调到边线外约 1 米时打直线：过网点最高、路线最短、又是全力挥拍，失误率最高。","高弧线斜线：过网 ≥1.4 m、飞行 ≥1.2 s，这段时间够你跑回中间。","落点要深：浅的高球就是送给对方的抢攻机会。"],
    keyPointsEn: ["Going down the line from 1 m outside the sideline means the highest net, the shortest court and a full swing: the lowest-percentage shot.","High cross-court: 1.4 m or more over the net and 1.2 s or more in the air, enough time to get back to the middle.","Keep it deep: a short high ball is an invitation to attack."],
    goalZh: "第 3 拍：过网高、落点深的斜线，换时间回位。",
    goalEn: "Shot 3: high over the net and deep cross-court, to buy time.",
    mistakeZh: "场外硬打直线：过网点高、场地短、全力击球，失误率最高",
    mistakeEn: "Forcing the line from off the court: high net, short court, full swing",
    challengeTurnIndex: 2,
    targetZone: { side: "A", localX: 9.6, localY: 2.6, rx: 1.8, ry: 1.3, maxSpeedKmh: 115, minSpinRpm: 1200, maxSpinRpm: 4200, minNetClearanceM: 1.4, minFlightTimeS: 1.2 },
    proSolution: { targetSpeedKmh: 95, targetLaunchAngleDeg: 19.4, targetTopspinRpm: 2600, aimAngleDeg: 19.9 },
    challengeStart: { targetSpeedKmh: 135, targetLaunchAngleDeg: 7.5, targetTopspinRpm: 2500, aimAngleDeg: 4.3 },
    turns: [
      {
        side: "A",
        titleZh: "正手斜线",
        titleEn: "Cross-court forehand",
        whyZh: "常规相持球。",
        whyEn: "A normal rally ball.",
        hitX: -11.8,
        hitY: -1.4,
        hitZ: 1,
        sidespinRpm: 200,
        targetSpeedKmh: 124,
        targetLaunchAngleDeg: 9.5,
        targetTopspinRpm: 2700,
        aimAngleDeg: 11.1
      },
      {
        side: "B",
        titleZh: "大角度斜线",
        titleEn: "Sharp angle",
        whyZh: "B 打出大角度短斜线，把 A 拉到边线外。",
        whyEn: "B hits a sharp short angle and drags A outside the sideline.",
        sidespinRpm: 250,
        targetSpeedKmh: 130,
        targetLaunchAngleDeg: 10.4,
        targetTopspinRpm: 3200,
        aimAngleDeg: 19.6
      },
      {
        side: "A",
        titleZh: "高弧线斜线",
        titleEn: "High cross-court",
        whyZh: "A 在边线外够到球，先保证不丢分：挥拍更向上，过网很高，斜线落深。",
        whyEn: "A reaches it outside the sideline and plays to stay in the point: a more upward swing, high over the net, deep cross-court.",
        sidespinRpm: 150,
        targetSpeedKmh: 95,
        targetLaunchAngleDeg: 19.4,
        targetTopspinRpm: 2600,
        aimAngleDeg: 19.9
      }
    ]
  },
  alcaraz_drop_shot: {
    id: "alcaraz_drop_shot",
    number: "09",
    situationZh: "转换",
    situationEn: "Transition",
    nameZh: "深球后放小球",
    nameEn: "Deep, then drop",
    inspirationZh: "灵感：2023 温网决赛，阿尔卡拉斯对德约科维奇",
    inspirationEn: "Inspired by the 2023 Wimbledon final",
    surfaceKey: "grass",
    playerAZh: 'A', playerBZh: 'B', playerAEn: 'A', playerBEn: 'B',
    ideaZh: "先用重球把对手压到底线后面，再用同样的引拍突然放短，下旋让球落地后几乎不往前走。",
    ideaEn: "Push the opponent well behind the baseline with heavy drives, then, from the same preparation, play it short; backspin keeps the ball from running on after the bounce.",
    keyPointsZh: ["放小球的前提是对手站得深：他离网越远，跑到网前的时间越长。","下旋让球落地后几乎不前进，第二跳还在发球区里。","引拍和平时一样，最后才打开拍面、放慢挥拍。"],
    keyPointsEn: ["The drop needs a deep opponent: the farther they are from the net, the longer the run.","Backspin stops the ball after the bounce, so the second bounce stays inside the service box.","Prepare exactly as usual; open the face and slow the swing only at the end."],
    goalZh: "第 3 拍：放慢、打下旋，落进网前浅区。",
    goalEn: "Shot 3: slow it down, add backspin, land it short near the net.",
    mistakeZh: "继续底线抽球：B 已经适应了这个节奏",
    mistakeEn: "Another baseline drive: B is used to that rhythm",
    challengeTurnIndex: 2,
    targetZone: { side: "A", localX: 4.1, localY: 1.55, rx: 1.75, ry: 1.25, minSpeedKmh: 52, maxSpeedKmh: 78, minSpinRpm: -2800, maxSpinRpm: -600 },
    proSolution: { targetSpeedKmh: 62, targetLaunchAngleDeg: 12.9, targetTopspinRpm: -1650, aimAngleDeg: 9 },
    challengeStart: { targetSpeedKmh: 135, targetLaunchAngleDeg: 8.1, targetTopspinRpm: 2800, aimAngleDeg: 4.8 },
    turns: [
      {
        side: "A",
        titleZh: "重球压底线",
        titleEn: "Heavy deep drive",
        whyZh: "深、重的斜线把 B 逼退到底线后约 2 m。",
        whyEn: "A deep, heavy cross-court ball pushes B about 2 m behind the baseline.",
        hitX: -11.7,
        hitY: -1.6,
        hitZ: 1.08,
        sidespinRpm: 260,
        targetSpeedKmh: 141,
        targetLaunchAngleDeg: 8.6,
        targetTopspinRpm: 3200,
        aimAngleDeg: 10.6
      },
      {
        side: "B",
        titleZh: "退后中路过渡",
        titleEn: "Neutral reply from deep",
        whyZh: "B 在底线后只能回中路，球不深。",
        whyEn: "From that deep, B can only send a central ball that is not deep.",
        sidespinRpm: 140,
        targetSpeedKmh: 118,
        targetLaunchAngleDeg: 12,
        targetTopspinRpm: 2500,
        aimAngleDeg: 9.8
      },
      {
        side: "A",
        titleZh: "突然放小球",
        titleEn: "Disguised drop shot",
        whyZh: "A 迎前一步，B 还在底线后面：放小球，B 要跑十多米。",
        whyEn: "A steps in while B is still far behind the baseline: a drop shot means a run of more than ten metres.",
        receive: { mode: "bounce", depth: 10.4 },
        sidespinRpm: -220,
        targetSpeedKmh: 62,
        targetLaunchAngleDeg: 12.9,
        targetTopspinRpm: -1650,
        aimAngleDeg: 9
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
  if (tz.minNetClearanceM !== undefined) {
    rows.push({ key: 'clear', zh: `过网高度 ≥ ${tz.minNetClearanceM} m`, en: `Net clearance ≥ ${tz.minNetClearanceM} m` });
  }
  if (tz.minFlightTimeS !== undefined) {
    rows.push({ key: 'time', zh: `落地前飞行 ≥ ${tz.minFlightTimeS} s`, en: `Time to bounce ≥ ${tz.minFlightTimeS} s` });
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

  const checks = { zone: false, speed: true, spin: true, clear: true, time: true };
  const clearance = simResult.netClearanceM;
  const flightTime = b ? b.t : 0;
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

  if (tz.minNetClearanceM !== undefined && !(clearance >= tz.minNetClearanceM)) {
    checks.clear = false;
    tip('swingPathDeg', `过网再高一点：挥拍更由下往上（现在 ${clearance?.toFixed(2) ?? '–'} m）`,
      `Clear the net by more: swing more low-to-high (now ${clearance?.toFixed(2) ?? '–'} m)`);
  }
  if (tz.minFlightTimeS !== undefined && flightTime < tz.minFlightTimeS) {
    checks.time = false;
    tip('racketSpeedKmh', `球在空中的时间太短：放慢挥速，弧线打高（现在 ${flightTime.toFixed(2)} s）`,
      `Too little hang time: swing slower with a higher arc (now ${flightTime.toFixed(2)} s)`);
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
  const extraFail = (checks.clear ? 0 : 6) + (checks.time ? 0 : 6);
  const totalScore = Math.max(0, Math.min(100, posScore + (checks.speed ? 15 : 4) + (checks.spin ? 15 : 4) - extraFail));
  const passed = checks.zone && checks.speed && checks.spin && checks.clear && checks.time;

  if (passed) {
    const score = Math.max(88, totalScore);
    return finish(score, true, '完成：落点、球速和旋转都达标。', 'Done: placement, pace and spin all on target.');
  }
  return finish(totalScore, false, '', '');
}
