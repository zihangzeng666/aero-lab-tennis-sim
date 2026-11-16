# Rackets Lab · Tennis Ball-Flight Teaching Simulator

An interactive 3D simulator for tennis coaches. Pick the ball coming at your player, tilt the racket face, change the swing path, and watch net clearance, depth, spin and the landing point respond.

**Live:** https://zihangzeng666.github.io/aero-lab-tennis-sim/ · **Validation:** [lab/validation.html](https://zihangzeng666.github.io/aero-lab-tennis-sim/lab/validation.html)

The site root (`index.html`) is a landing page; the simulator lives in [`lab/`](lab/). The old `/validation.html` address redirects to `lab/validation.html`.

> This is a **teaching simulator**, not a tracking system. Player presets and rallies are hand-tuned examples that imitate a playing style. They are not measured data and have no connection to Hawk-Eye, the ATP or the ITF.

## What it does

- **Coach view** (opens first): the lesson flow for a phone or tablet at the court.
  1. Pick the **incoming ball**: flat fast drive, heavy topspin high bouncer, low skidding slice, moonball, short ball, kick serve return, flat serve return, deep ball to the backhand. Each chip's thumbnail is that ball's simulated flight.
  2. Turn the **racket-face dial** (closed ↔ open; the dial is geared 0.4° per degree of finger turn so a single degree is easy to hit; arrow keys work too) and set the **swing path** (high-to-low ↔ low-to-high) and **swing speed**. The path redraws while you drag (one recompute per frame).
  3. Read the **result**: In / Long / Wide / Net, net clearance, depth from the baseline, spin and speed, and **coaching lines** built from the simulation (see below). The previous path stays as a dashed ghost in 3D and in the to-scale side view; **Pin** keeps one path for comparison. **Suggest face** keeps the swing and finds the face angle that lands the ball 1.5 m inside the baseline (bisection on the forward model). The swing is kept when you switch balls on purpose: the same swing against a different ball is the lesson.
- **Solo lab**: forehand, two- and one-handed backhand and serve. The racket–ball impact splits launch speed into the swing's own contribution and the pace "borrowed" from the incoming ball.
- **Hit it from here** (solo lab): pause at any instant after the ball crosses the net and hand the ball to the player at the other end. Its position, velocity and topspin at that instant become their contact point and incoming ball; the camera follows to that end and the previous player fades out. "Previous shot" goes back.
- **Rally mode**: two players take turns. The ball's state where the next player meets it becomes their incoming ball; a turn can volley it before the bounce or step in and take it inside the court.
- **Tactics mode**: nine lessons grouped by game situation (serving, returning, baseline, net, defence, transition): serve + 1, serve and volley, the deep return, cross-court then down the line (Wardlaw directionals), topspin to the backhand, the run-around forehand, approach and volley, high deep defence, and the drop shot. Some are inspired by well-known points; none are reconstructions. Every shot in a lesson was tuned against the physics, so each ball lands where its explanation says.
- **Court map** (rally and tactics): the rally drawn from above, shot by shot. For the selected shot it shows the opponent's widest replies, their bisector and your recovery spot on it (Cochet's angle rule), how far the opponent has to run and how much time they have, the lesson's target, and the common mistake as a ghost path. Opponent movement assumes a 4 m/s recovery speed.
- **Impact studio** (击球台; opens first in the solo lab on desktop): a large side view of the contact where every arrow is a draggable vector (direction = angle, length = speed) for the swing, the incoming ball and the launch (back-solved), plus the face angle; an inset splits the ball's velocity relative to the racket into the normal part (pace) and the part along the strings (spin) with the attack angle; a top view for direction, a to-scale flight profile and a landing map; and exact number fields for every input and for the launch target. Shift or the Fine toggle gives quarter-speed drags; knobs work from the keyboard (arrows, Shift for ×10).
- **Inverse solver**: drag the launch speed, angle or spin on the HUD and the racket speed, swing path and face angle are back-solved (damped Newton on a 3×3 Jacobian).

## Incoming-ball presets (coach view)

Each preset in `INCOMING_PRESETS` ([lab/presets.js](lab/presets.js)) is an **opponent's shot**, not a hand-typed incoming ball. `resolveIncomingBall()` ([lab/physics.js](lab/physics.js)) flies it with the same model as everything else, then the hitter meets it at the top of its bounce, or at the preset's `maxDepth` on the way up if the top is further back (a coaching choice, listed as `MODEL_ASSUMPTIONS.incomingBallContact`). Speed, angle and spin at that point become the incoming ball, exactly like a rally hand-off. Launch angles were tuned (bisection) so each shot lands where that kind of ball usually lands; nothing in `MODEL_ASSUMPTIONS` was changed to make them look better.

Hard court, 20 °C, sea level:

| Ball | Opponent hits | Lands (from hitter's baseline) | Bounce speed / peak | Met at | Speed at contact |
|---|---|---|---|---|---|
| Flat fast drive | 140 km/h, 5.3°, 1200 rpm | 2.3 m inside | 87 km/h / 0.65 m | 0.60 m | 55 km/h |
| Heavy topspin | 110 km/h, 16.0°, 3800 rpm (1.74 m over the net) | 0.6 m inside | 59 km/h / 1.32 m | 1.16 m, 2.9 m behind the baseline | 42 km/h |
| Low slice | 100 km/h, 4.3°, −2600 rpm | 2.3 m inside | 58 km/h / 0.49 m | 0.49 m | 36 km/h |
| Moonball | 82 km/h, 27.1°, 2300 rpm | 1.1 m inside | 48 km/h / 2.03 m | 1.80 m | 26 km/h |
| Short ball | 68 km/h, 20.1°, 1500 rpm | 7.1 m inside | 47 km/h / 1.24 m | 0.96 m, 6.6 m from the net | 28 km/h |
| Kick serve | 160 km/h, −1.9°, 4400 rpm from a 2.9 m contact (tall server), deuce box wide | in the box | 101 km/h / 1.45 m | 1.45 m | 59 km/h |
| Flat serve | 190 km/h, −5.7°, 900 rpm, down the T | in the box | 131 km/h / 1.17 m | 1.17 m | 72 km/h |
| Deep to the backhand | 122 km/h, 11.2°, 2800 rpm | 1.3 m inside | 68 km/h / 1.05 m | 0.82 m | 46 km/h |

Change the surface in the lab and the balls are flown again (clay bounces a little higher, grass a little lower and faster). The tests check the physical claims: topspin bounces higher than slice, slice is the lowest ball, the moonball is the highest, serves bounce faster than 90 km/h and land in the box, the flat serve is the fastest ball to meet, the short ball is met inside the court, the deep backhand ball is deep and on the backhand side, and the suggested face lands every ball 1.5 m deep (and needs a more open face against slice than against topspin).

### Coaching lines

[lab/coachFeedback.js](lab/coachFeedback.js) only says what the simulation shows:

- the verdict and depth/clearance from the flight (`describeShotOutcome`);
- the face fix ("Close the face about 3.5° (to −7.6°)") from `solveFaceAngleForDepth`, the same model searched over face angle;
- the incoming-ball effect ("Their topspin sends your ball off 7° higher than a ball with no spin would. Open face vs topspin = the ball climbs") from the racket impact run with and without the incoming spin, shown only when that difference is at least 1°;
- the comparison with the ghost path.

## Model

| Part | Model | Source |
|---|---|---|
| Flight | Gravity + drag + Magnus lift, classical RK4, Δt = 2 ms | — |
| Events | Net crossing and bounce located exactly inside a step (Illinois root finding on full RK4 sub-steps) | — |
| Drag / lift | C_D = C_D0 + 1/(22.5 + 4.2·(v/v_s)^2.5)^0.4, C_L = 1/(2.022 + 0.981·v/v_s), v_s = Rω | Štěpánek (1988); C_D0 raised from 0.508 to 0.55 (assumption) |
| Spin decay | ω(t) = ω₀·e^(−0.015 t) | assumption |
| Air density | Ideal gas + ISA pressure lapse from temperature and altitude (20 °C, sea level → 1.204 kg/m³) | standard |
| Wind | Head/tail and cross wind, constant in space and time | — |
| Racket impact | Rigid oblique impact in the vertical plane: v_out,n = (1+e_A)·v_racket,n + e_A·v_in,n; contact patch grips (e_T) or slides (friction 0.48) | Brody, Cross & Lindsey (2002); e_A ≈ 0.4 near the centre |
| Court bounce | Vertical COR + slide-or-grip tangential impulse, I = 0.55·mR², normal force acting D = k·|v_n| ahead of the centre (k = 0.64 ms) | Cross; COR calibrated to the ITF drop-test band (0.765–0.785), μ and e_T are assumptions; k fitted to one 500 fps grass bounce and checked on a clay bounce |
| Line calls | Lines belong to the court; 10 cm baseline, 5 cm other lines; 2.2 cm mark half-width | ITF court dimensions |
| Incoming coaching balls | Opponent shot flown with the model above; met at the bounce top or at `maxDepth` | assumption (where a player meets the ball) |

Every tunable constant lives in `MODEL_ASSUMPTIONS` in [lab/physics.js](lab/physics.js) with a `source` field that says whether it is from the literature or an assumption.

### Coordinate system

Metres, right-handed, in the **hitter's frame**:

- `x` along the court: hitter's baseline at −11.885, net at 0, far baseline at +11.885
- `y` across the court, positive to the hitter's left
- `z` up, ground at 0

Player B hits in the mirrored frame: world `(x, y) = (−x_local, −y_local)`. Wind is given in world coordinates, so a tail wind for player A is a head wind for player B.

### Assumptions and known limitations

- The racket impact is solved in the **vertical plane only**. Horizontal aim is passed straight through, sidespin is a manual input (not produced by face angle or the sideways part of the swing), and the topspin axis is always horizontal.
- e_A depends only on string tension (clamped to 0.36–0.48). Impact location, swing weight and incoming speed do not affect it, so the model always represents a centre hit. The sweet-spot graphic is illustrative.
- Dwell time and string-bed deflection are **empirical estimates** (linear formulas with limits), shown with "≈" in the UI.
- The court's vertical COR is constant; real COR falls as impact speed rises. COR values are calibrated so every surface passes the ITF drop test (254 cm → 135–147 cm), so that check is a calibration, not independent validation. Surface pace differences come mainly from the friction coefficient μ.
- Side-spin retention on the bounce (85 %), net-cord factors and the mark half-width are assumptions.
- C_D is for a new ball; felt wear and humidity are ignored.
- Bounces come out somewhat lower than real heavy balls: with realistic inputs a heavy topspin rally ball peaks at about 1.3 m and a kick serve at about 1.45 m, where on court ~1.5 m and ~1.5–1.8 m are common. Likely reasons are the constant vertical COR, the topspin-only spin axis (a real kick serve also carries side spin) and the ball model's simplified deformation. The presets are not pushed past realistic speeds or spins to hide this; the captions state the simulated heights.
- In rally mode the receiver's contact point and incoming angle are clamped to a playable window so rallies can continue. That part is gameplay, not physics.

## Player motion (motion capture)

Topspin forehands and two-handed backhands are driven by real motion-capture data:
13 recorded strokes (player tp2) from **3DTennisDS**, Lublin University of Technology
(Vicon, Plug-in Gait full body + 7-marker racket, 100 Hz).
[lab/mocap/export_3dtennisds.py](lab/mocap/export_3dtennisds.py) converts the C3D files into
[lab/mocap/strokes.json](lab/mocap/strokes.json): joint centres and racket pose in the contact frame,
resampled to 50 Hz.

At run time the clip closest in contact height and swing angle is chosen. The body is scaled
to the rig (0.88) about the contact point; pelvis and trunk rotation come from the recorded hips
and shoulders; arms and legs are solved with two-bone IK towards the recorded hands and feet;
the racket orientation comes from the hoop markers. Differences in contact height are absorbed
by the legs and, near impact only, by the arm. Swing-path and face-angle differences are applied
as a small rotation about the contact point that fades out within ~0.15 s of impact, so the racket
matches the physics inputs exactly at contact.

Serves and one-handed backhands come from a second dataset, **Tennis-MoCap**
(jdpulgarin/Tennis-MoCap, 17 Caldas-Colombia league players, OptiTrack 100 Hz, BVH skeleton),
converted by [lab/mocap/export_tennis_mocap_bvh.py](lab/mocap/export_tennis_mocap_bvh.py) into
[lab/mocap/strokes_bvh.json](lab/mocap/strokes_bvh.json): 4 serves and 4 one-handed backhands. That dataset
has no racket markers, so the racket follows the recorded wrist rotation, calibrated to the expected
contact pose at impact. Serves may leave the ground (the recorded players jump into the ball).
Only slices still use the procedural keyframe swing.

> Tennis-MoCap is licensed under CC BY-SA 3.0; `lab/mocap/strokes_bvh.json` is a derived work shared
> under the same licence. Pulgarin-Giraldo J.D., Alvarez-Meza A.M., Melo-Betancourt L.G.,
> Ramos-Bermudez S., Castellanos-Dominguez G. *A Similarity Indicator for Differentiating Kinematic
> Performance Between Qualified Tennis Players.* LNCS 10125, pp. 309–317, 2017.
> https://doi.org/10.1007/978-3-319-52277-7_38

> The used tennis motion capture dataset was obtained from https://tennisdb.cs.pollub.pl at the
> Lublin University of Technology.

## Validation

[lab/validation.html](lab/validation.html) runs `physics.js` in the browser and shows:

1. **Time-step convergence**: landing-point error vs Δt for three shots; observed order ≈ 4.0, error at the default 2 ms step ≈ 2·10⁻¹¹ m.
2. **Analytic limit**: with air density 0 the landing time and point match the parabola to ~10⁻¹³.
3. **Aerodynamic coefficients** against the in-flight C_D measured by Cross & Lindsey (2014).
4. **Court bounce**: ITF ball drop test per surface (all three in band after calibration), and a Court Pace Index check that clay < hard < grass. The bounce model is also tested against two bounces filmed at 500 fps by R. Cross: grass (29.1 / 8.92 m/s in, no spin; 20.5 / 7.14 m/s and 314 rad/s out), which sets the normal-force offset, and clay (25.1 / 7.54 m/s in; 14.9 / 6.89 m/s and 443 rad/s out), which the model predicts at 15.0 / 6.86 m/s and 435 rad/s without being fitted to it. Without the offset the grass spin would be 467 rad/s.
5. **Racket e_A** vs string tension, compared with the ~0.4 centre value in the literature.

Still to do: point-by-point comparison of C_L with wind-tunnel data, and a check against published serve speed-loss or landing statistics.

## Run locally

No build step. Any static file server works (ES modules need http://, not file://):

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000 (landing page) or http://localhost:8000/lab/ (the simulator).

Hosting: everything is static and every path is relative, so the repository root can be served as-is (GitHub Pages, Vercel with no build step, any file server). `lab/index.html` adds the trailing slash itself if it is opened as `/lab`, so relative imports keep working on hosts that do not redirect.

Tests use Node's built-in runner (Node 18+, no dependencies):

```bash
npm test
```

They cover the coaching presets (above), the face-angle suggestion, the verdicts and the coaching lines, the vacuum limit, 4th-order convergence, A/B mirror symmetry, line calls (including the 10 cm baseline), that every preset lands in, that every example rally and tactics lesson works (the answer passes inside the slider ranges, the starting shot fails with a tip), the inverse solver, air density and cross wind.

## Files

| File | Contents |
|---|---|
| `index.html`, `assets/` | Landing page, its stylesheet, screenshots and the animated preview (captured from the lab with Playwright) |
| `lab/index.html` | The simulator page |
| `lab/coach.js` | Coach view: ball chips, racket-face dial, swing sliders, result strip, side view |
| `lab/coachFeedback.js` | Coaching lines built from the simulated shot (pure, tested) |
| `lab/physics.js` | Flight integrator, impact and bounce models, line calls, rally chaining, coaching helpers (`resolveIncomingBall`, `solveFaceAngleForDepth`, `describeShotOutcome`), `MODEL_ASSUMPTIONS` |
| `lab/presets.js` | Hand-tuned style presets, example rallies, tactics lessons and their scoring |
| `lab/lessonMap.js` | Small top-down map in the tactics card |
| `lab/tacticsBoard.js` | Court map: rally from above, recovery bisector, opponent run and time |
| `lab/racketDiagram.js` | Impact diagram with draggable vectors (compact and detailed) |
| `lab/impactStudio.js` | Impact studio: large diagram, flight profile, landing map, number fields |
| `lab/mocap/` | Converted motion-capture strokes (3DTennisDS; Tennis-MoCap, CC BY-SA 3.0) and the conversion scripts |
| `lab/app.js` | UI controller: sliders, HUD, modes, playback |
| `lab/scene3d.js` | three.js court, player rigs and racket views |
| `lab/validation.html` / `lab/validation.js` | Validation page |
| `tests/` | `node --test` suite; `tests/e2e_smoke.py` is a Playwright smoke test (landing and lab, phone and desktop) |
| `lab/vendor/three/` | three.js r165 (MIT), served locally so the site does not depend on a CDN |

## References

1. A. Štěpánek, "The aerodynamics of tennis balls — The topspin lob," *Am. J. Phys.* 56, 138–142 (1988).
2. S. R. Goodwill, S. B. Chin, S. J. Haake, "Aerodynamics of spinning and non-spinning tennis balls," *J. Wind Eng. Ind. Aerodyn.* 92, 935–958 (2004).
3. R. Cross, C. Lindsey, "Measurements of drag and lift on tennis balls in flight," *Sports Engineering* (2014).
4. H. Brody, R. Cross, C. Lindsey, *The Physics and Technology of Tennis*, Racquet Tech Publishing (2002).
5. R. Cross, "Measurements of the horizontal and vertical speeds of tennis courts," *Sports Engineering* (2003).
6. International Tennis Federation, *Rules of Tennis*, Appendix I and court dimensions.
7. R. Cross, "Measurement of the speed and bounce of tennis courts" (University of Sydney); the two 500 fps bounces used above.
8. R. Cross, "Bounce of a spinning ball near normal incidence," *Am. J. Phys.* 73, 914–920 (2005).
9. R. Cross, "Oblique impact of a tennis ball on the strings of a tennis racket," *Sports Engineering* 6, 235–254 (2003).

Coaching ideas behind the lessons: P. Wardlaw's "directionals" (when to keep the ball cross-court and when to change direction); H. Cochet's bisector rule for positioning, examined with tracking data in *Scientific Reports* (2024, doi:10.1038/s41598-024-53136-7); and common serve-and-volley and approach guidance (serve down the T to narrow return angles, approach down the line, volley to the open court). The lesson text is written for this simulator; the numbers on the court map come from the simulation, not from match data.

## Third-party code and names

three.js is MIT-licensed (see `lab/vendor/three/LICENSE`). Player names are used only to describe playing styles; all trademarks belong to their owners.

Made by Jason Zeng.
