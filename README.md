# AERO-LAB · Tennis Ball-Flight Teaching Simulator

An interactive 3D simulator for tennis ball flight. Change the swing and the incoming ball and watch launch speed, spin, net clearance and the landing point respond.

**Live:** https://zihangzeng666.github.io/aero-lab-tennis-sim/ · **Validation:** [validation.html](https://zihangzeng666.github.io/aero-lab-tennis-sim/validation.html)

> This is a **teaching simulator**, not a tracking system. Player presets and rallies are hand-tuned examples that imitate a playing style. They are not measured data and have no connection to Hawk-Eye, the ATP or the ITF.

## What it does

- **Solo lab**: forehand, two- and one-handed backhand and serve. The racket–ball impact splits launch speed into the swing's own contribution and the pace "borrowed" from the incoming ball.
- **Rally mode**: two players take turns. Each shot's post-bounce state becomes the next player's incoming ball.
- **Tactics mode**: scripted rallies with a target zone for the last shot.
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
| Court bounce | Vertical COR + slide-or-grip tangential impulse, I = 0.55·mR² | Cross; surface values are assumptions |
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
- The court's vertical COR is constant; real COR falls as impact speed rises. In the ITF drop test (see validation page) the hard-court value sits inside the 135–147 cm band, clay sits above it and grass below it.
- Side-spin retention on the bounce (85 %), net-cord factors and the mark half-width are assumptions.
- C_D is for a new ball; felt wear and humidity are ignored.
- In rally mode the receiver's contact point and incoming angle are clamped to a playable window so rallies can continue. That part is gameplay, not physics.

## Validation

[validation.html](validation.html) runs `physics.js` in the browser and shows:

1. **Time-step convergence**: landing-point error vs Δt for three shots; observed order ≈ 4.0, error at the default 2 ms step ≈ 2·10⁻¹¹ m.
2. **Analytic limit**: with air density 0 the landing time and point match the parabola to ~10⁻¹³.
3. **Aerodynamic coefficients** against the in-flight C_D measured by Cross & Lindsey (2014).
4. **Court bounce**: ITF ball drop test per surface, and a Court Pace Index check that clay < hard < grass.
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

They cover the vacuum limit, 4th-order convergence, A/B mirror symmetry, line calls (including the 10 cm baseline), that every preset lands in, that every example rally and tactics lesson works, the inverse solver, air density and cross wind.

## Files

| File | Contents |
|---|---|
| `physics.js` | Flight integrator, impact and bounce models, line calls, rally chaining, `MODEL_ASSUMPTIONS` |
| `presets.js` | Hand-tuned style presets, example rallies, tactics lessons and their scoring |
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
