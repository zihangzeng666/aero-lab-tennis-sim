# AERO-LAB · Tennis Ball-Flight Teaching Simulator

An interactive 3D simulator for tennis ball flight. Change the swing and the incoming ball and watch launch speed, spin, net clearance and the landing point respond.

**Live:** https://zihangzeng666.github.io/aero-lab-tennis-sim/ · **Validation:** [validation.html](https://zihangzeng666.github.io/aero-lab-tennis-sim/validation.html)

> This is a **teaching simulator**, not a tracking system. Player presets and rallies are hand-tuned examples that imitate a playing style. They are not measured data and have no connection to Hawk-Eye, the ATP or the ITF.

## What it does

- **Solo lab**: forehand, two- and one-handed backhand and serve. The racket–ball impact splits launch speed into the swing's own contribution and the pace "borrowed" from the incoming ball.
- **Rally mode**: two players take turns. Each shot's post-bounce state becomes the next player's incoming ball.
- **Tactics mode**: four lessons inspired by well-known points (not reconstructions). Each one plays a scripted rally, then hands you the key shot: a top-down court map, a checklist (placement, pace, spin) and tips that jump to the control that fixes the shot.
- **Inverse solver**: drag the launch speed, angle or spin on the HUD and the racket speed, swing path and face angle are back-solved (damped Newton on a 3×3 Jacobian).

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
| Court bounce | Vertical COR + slide-or-grip tangential impulse, I = 0.55·mR² | Cross; COR calibrated to the ITF drop-test band (0.765–0.785), μ and e_T are assumptions |
| Line calls | Lines belong to the court; 10 cm baseline, 5 cm other lines; 2.2 cm mark half-width | ITF court dimensions |

Every tunable constant lives in `MODEL_ASSUMPTIONS` in [physics.js](physics.js) with a `source` field that says whether it is from the literature or an assumption.

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
- In rally mode the receiver's contact point and incoming angle are clamped to a playable window so rallies can continue. That part is gameplay, not physics.

## Player motion (motion capture)

Topspin forehands and two-handed backhands are driven by real motion-capture data:
13 recorded strokes (player tp2) from **3DTennisDS**, Lublin University of Technology
(Vicon, Plug-in Gait full body + 7-marker racket, 100 Hz).
[mocap/export_3dtennisds.py](mocap/export_3dtennisds.py) converts the C3D files into
[mocap/strokes.json](mocap/strokes.json): joint centres and racket pose in the contact frame,
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
converted by [mocap/export_tennis_mocap_bvh.py](mocap/export_tennis_mocap_bvh.py) into
[mocap/strokes_bvh.json](mocap/strokes_bvh.json): 4 serves and 4 one-handed backhands. That dataset
has no racket markers, so the racket follows the recorded wrist rotation, calibrated to the expected
contact pose at impact. Serves may leave the ground (the recorded players jump into the ball).
Only slices still use the procedural keyframe swing.

> Tennis-MoCap is licensed under CC BY-SA 3.0; `mocap/strokes_bvh.json` is a derived work shared
> under the same licence. Pulgarin-Giraldo J.D., Alvarez-Meza A.M., Melo-Betancourt L.G.,
> Ramos-Bermudez S., Castellanos-Dominguez G. *A Similarity Indicator for Differentiating Kinematic
> Performance Between Qualified Tennis Players.* LNCS 10125, pp. 309–317, 2017.
> https://doi.org/10.1007/978-3-319-52277-7_38

> The used tennis motion capture dataset was obtained from https://tennisdb.cs.pollub.pl at the
> Lublin University of Technology.

## Validation

[validation.html](validation.html) runs `physics.js` in the browser and shows:

1. **Time-step convergence**: landing-point error vs Δt for three shots; observed order ≈ 4.0, error at the default 2 ms step ≈ 2·10⁻¹¹ m.
2. **Analytic limit**: with air density 0 the landing time and point match the parabola to ~10⁻¹³.
3. **Aerodynamic coefficients** against the in-flight C_D measured by Cross & Lindsey (2014).
4. **Court bounce**: ITF ball drop test per surface (all three in band after calibration), and a Court Pace Index check that clay < hard < grass.
5. **Racket e_A** vs string tension, compared with the ~0.4 centre value in the literature.

Still to do: point-by-point comparison of C_L with wind-tunnel data, and a check against published serve speed-loss or landing statistics.

## Run locally

No build step. Any static file server works (ES modules need http://, not file://):

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

Tests use Node's built-in runner (Node 18+, no dependencies):

```bash
npm test
```

They cover the vacuum limit, 4th-order convergence, A/B mirror symmetry, line calls (including the 10 cm baseline), that every preset lands in, that every example rally and tactics lesson works (the answer passes inside the slider ranges, the starting shot fails with a tip), the inverse solver, air density and cross wind.

## Files

| File | Contents |
|---|---|
| `physics.js` | Flight integrator, impact and bounce models, line calls, rally chaining, `MODEL_ASSUMPTIONS` |
| `presets.js` | Hand-tuned style presets, example rallies, tactics lessons and their scoring |
| `lessonMap.js` | Top-down court map for the tactics card |
| `mocap/` | Converted motion-capture strokes (3DTennisDS; Tennis-MoCap, CC BY-SA 3.0) and the conversion scripts |
| `app.js` | UI controller: sliders, HUD, modes, playback |
| `scene3d.js` | three.js court, player rigs and racket views |
| `validation.html` / `validation.js` | Validation page |
| `tests/` | `node --test` suite |
| `vendor/three/` | three.js r165 (MIT), served locally so the site does not depend on a CDN |

## References

1. A. Štěpánek, "The aerodynamics of tennis balls — The topspin lob," *Am. J. Phys.* 56, 138–142 (1988).
2. S. R. Goodwill, S. B. Chin, S. J. Haake, "Aerodynamics of spinning and non-spinning tennis balls," *J. Wind Eng. Ind. Aerodyn.* 92, 935–958 (2004).
3. R. Cross, C. Lindsey, "Measurements of drag and lift on tennis balls in flight," *Sports Engineering* (2014).
4. H. Brody, R. Cross, C. Lindsey, *The Physics and Technology of Tennis*, Racquet Tech Publishing (2002).
5. R. Cross, "Measurements of the horizontal and vertical speeds of tennis courts," *Sports Engineering* (2003).
6. International Tennis Federation, *Rules of Tennis*, Appendix I and court dimensions.

## Third-party code and names

three.js is MIT-licensed (see `vendor/three/LICENSE`). Player names are used only to describe playing styles; all trademarks belong to their owners.

Made by Jason Zeng.
