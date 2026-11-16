/**
 * Contact close-up: the shared 3D racket-face adjust mode (Coach view, Solo lab, Impact studio).
 *
 * open() freezes the shot at contact and flies the camera from the court view to a close-up of
 * the right hand holding the racket with the ball on the strings. There the user
 *   - drags the racket (or its knob): up/down opens/closes the face, left/right turns the aim
 *   - drags the spin knob: a topspin target, met by changing the swing path (contactMath.js)
 *   - drags the swing knob along the swing arrow: racket speed
 * and sees the launch arrow, the spin ring, the flight in the court behind and a result card
 * update live. close() flies back to where the camera was.
 *
 * The component owns no shot state: every change goes out through onChange(updates, { live })
 * (the same contract as the coach panel and the impact studio), and the host calls update()
 * with the recomputed shot.
 */
import * as THREE from 'three';
import { ITF_COURT, describeShotOutcome } from './physics.js?v=61';
import {
  clamp,
  lerp,
  band,
  ease,
  arcLengthMap,
  bezier3,
  contactRacketFrame,
  solveSwingPathForSpin,
  spinRangeForSwing
} from './contactMath.js?v=61';

const BALL_R = ITF_COURT.ballRadius;
const HEAD_LEN = 0.165; // string-bed half length (along the shaft)
const HEAD_WID = 0.125; // half width
const ENTER_MS = 1750;
const EXIT_MS = 1350;

const T = {
  en: {
    kicker: 'Contact · t = 0',
    title: 'Adjust at contact',
    hint: 'Drag the racket: up opens the face, down closes it, sideways aims. Drag the knobs for spin and swing speed. Drag empty space to look around.',
    hintTouch: 'Drag the racket: up opens, down closes, sideways aims. Drag the knobs for spin and swing speed.',
    done: 'Done',
    reset: 'Reset',
    face: 'Face',
    spin: 'Spin',
    speed: 'Swing',
    aim: 'Aim',
    open: 'open',
    closed: 'closed',
    square: 'square',
    left: 'left',
    right: 'right',
    centre: 'centre',
    top: 'topspin',
    back: 'backspin',
    flat: 'flat',
    viaPath: (p) => `swing path ${p >= 0 ? '+' : '−'}${Math.abs(p).toFixed(1)}°`,
    verdict: { IN: 'In', LONG: 'Long', WIDE: 'Wide', NET: 'Net' },
    net: 'Net',
    depthIn: 'In by',
    depthLong: 'Long by',
    launch: 'Launch',
    ballSpeed: 'Ball',
    before: 'dashed: before',
    faceAria: 'Racket face angle',
    spinAria: 'Spin rate',
    speedAria: 'Swing speed',
    layerAria: 'Racket face close-up at contact',
    sideTitle: 'Side view of the flight'
  },
  zh: {
    kicker: '触球瞬间 · t = 0',
    title: '击球瞬间调整',
    hint: '拖动球拍：向上拖拍面打开，向下拖拍面关闭，左右拖改变方向。拖动旋钮调旋转和挥速；拖动空白处可环视。',
    hintTouch: '拖动球拍：上开下关，左右改方向。拖动旋钮调旋转和挥速。',
    done: '完成',
    reset: '还原',
    face: '拍面',
    spin: '旋转',
    speed: '挥速',
    aim: '方向',
    open: '打开',
    closed: '关闭',
    square: '垂直',
    left: '偏左',
    right: '偏右',
    centre: '居中',
    top: '上旋',
    back: '下旋',
    flat: '平击',
    viaPath: (p) => `挥拍路径 ${p >= 0 ? '+' : '−'}${Math.abs(p).toFixed(1)}°`,
    verdict: { IN: '界内', LONG: '出底线', WIDE: '出边线', NET: '下网' },
    net: '过网',
    depthIn: '底线内',
    depthLong: '出界',
    launch: '出球角',
    ballSpeed: '球速',
    before: '虚线：调整前',
    faceAria: '拍面角度',
    spinAria: '旋转转速',
    speedAria: '挥拍速度',
    layerAria: '触球瞬间的拍面特写',
    sideTitle: '飞行侧视图'
  }
};

const ICONS = {
  face: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 15a8 8 0 0 1 14-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M19 4v5h-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 19h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  spin: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4.5 9.5A8 8 0 0 1 18.4 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M19 3.6V7.6h-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  speed: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7l5 5-5 5M11 7l5 5-5 5M18 7v10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};

const sgn = (v, d = 1) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(d)}`;

/** Court vector (hitter's frame) to three.js world; side B plays in the mirrored frame. */
function toThree(v, s, out = new THREE.Vector3()) {
  return out.set(s * v[0], v[2], -s * v[1]);
}

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Capsule from a to b (local vectors), radius r. */
function capsuleBetween(a, b, r, mat) {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = Math.max(1e-4, d.length());
  const geo = new THREE.CapsuleGeometry(r, len, 6, 12);
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return m;
}

export class ContactCloseup {
  /**
   * @param {TennisScene3D} scene3d
   * @param {HTMLElement} hostEl the viewport wrapper the overlay is laid over
   */
  constructor(scene3d, hostEl) {
    this.s3 = scene3d;
    this.host = hostEl;
    this.lang = 'en';
    this.phase = 'closed'; // closed | entering | open | exiting
    this.state = null;
    this.vis = null; // smoothed values the 3D follows
    this._lastNow = performance.now();
    this.touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    this._build3D();
    this._buildOverlay();
    this._bindPointer();
    this.s3.onFrame = (now) => this._frame(now);
    // compile the close-up's shaders while the page is idle so the first zoom does not stutter
    const warm = () => {
      try {
        this.root.visible = true;
        this.s3.renderer.compile(this.s3.scene, this.s3.camera);
      } catch (e) {
        /* compile is an optimisation only */
      }
      this.root.visible = false;
    };
    if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 4000 });
    else setTimeout(warm, 1500);
  }

  get isOpen() {
    return this.phase !== 'closed';
  }

  /* ------------------------------------------------------------------ */
  /* 3D                                                                  */
  /* ------------------------------------------------------------------ */

  _build3D() {
    const root = new THREE.Group();
    root.name = 'contactCloseup';
    root.visible = false;
    this.root = root;
    this.s3.scene.add(root);
    this.mats = [];
    const track = (m) => {
      m.userData.baseOpacity = m.opacity;
      m.userData.baseTransparent = m.transparent;
      this.mats.push(m);
      return m;
    };
    this._track = track;

    // Racket + hand share one frame: X = face normal, Y = face width, Z = towards the head tip.
    this.rig = new THREE.Group();
    root.add(this.rig);
    this.racket = new THREE.Group();
    this.rig.add(this.racket);
    this.hitTargets = [];
    this._buildRacket(track);
    this.hands = new THREE.Group();
    this.rig.add(this.hands);
    this._skin = track(new THREE.MeshStandardMaterial({ color: 0xe0a77f, roughness: 0.58, metalness: 0 }));
    this._band = track(new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.75 }));
    this._sleeve = track(new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.6 }));

    // the face at 0° (square), as a reference outline
    const ringPts = [];
    for (let i = 0; i <= 72; i++) {
      const t = (i / 72) * Math.PI * 2;
      ringPts.push(new THREE.Vector3(0, Math.cos(t) * (HEAD_WID + 0.012), Math.sin(t) * (HEAD_LEN + 0.012)));
    }
    this.squareRing = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(ringPts),
      track(new THREE.LineDashedMaterial({ color: 0x1b1a17, dashSize: 0.012, gapSize: 0.009, transparent: true, opacity: 0.55, depthWrite: false }))
    );
    this.squareRing.computeLineDistances();
    root.add(this.squareRing);

    // ball on the strings
    const ballTex = canvasTexture(512, 256, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#d8ec3c');
      g.addColorStop(1, '#c4dc2c');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // felt speckle
      for (let i = 0; i < 2600; i++) {
        ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,230' : '120,140,20'},${0.05 + Math.random() * 0.07})`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
      }
      ctx.strokeStyle = '#fbfbf4';
      ctx.lineWidth = 11;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let px = 0; px <= w; px += 3) {
        const u = (px / w) * Math.PI * 2;
        const py = h / 2 + Math.sin(u * 2) * h * 0.28;
        if (px === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    });
    this.ballMat = track(
      new THREE.MeshPhysicalMaterial({ map: ballTex, roughness: 0.92, sheen: 1, sheenRoughness: 0.7, sheenColor: new THREE.Color(0xf4ffb0) })
    );
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 40, 28), this.ballMat);
    this.ballSpin = new THREE.Group();
    this.ballSpin.add(this.ball);
    this.ballHolder = new THREE.Group();
    this.ballHolder.add(this.ballSpin);
    root.add(this.ballHolder);
    this._spinAngle = 0;

    // arrows: swing path (into the ball), launch (ball out), face normal
    const arrow = (color, radius, opacity = 1) => {
      const mat = track(new THREE.MeshStandardMaterial({ color, roughness: 0.4, transparent: opacity < 1, opacity, emissive: color, emissiveIntensity: 0.18 }));
      const g = new THREE.Group();
      const shaftGeo = new THREE.CylinderGeometry(radius, radius, 1, 14);
      shaftGeo.translate(0, 0.5, 0);
      const shaft = new THREE.Mesh(shaftGeo, mat);
      const headGeo = new THREE.ConeGeometry(radius * 2.6, 1, 18);
      headGeo.translate(0, 0.5, 0);
      const head = new THREE.Mesh(headGeo, mat);
      g.add(shaft, head);
      g.userData = { shaft, head, radius, mat };
      root.add(g);
      return g;
    };
    this.swingArrow = arrow(0x6f685c, 0.0055, 0.9);
    this.launchArrow = arrow(0x1f5b3f, 0.0065);
    this.normalArrow = arrow(0xd4a017, 0.0028, 0.95);

    // spin ring around the ball: arc length grows with the spin rate, the head shows the direction
    this.spinMat = track(new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.35, emissive: 0xc2410c, emissiveIntensity: 0.25 }));
    this.spinRing = new THREE.Group();
    root.add(this.spinRing);
    this.spinArc = new THREE.Mesh(new THREE.BufferGeometry(), this.spinMat);
    this.spinHead = new THREE.Mesh(new THREE.ConeGeometry(0.0075, 0.02, 14), this.spinMat);
    this.spinRing.add(this.spinArc, this.spinHead);
    this._spinArcKey = null;

    // the flash when the camera lands: time stops at contact
    this.flashMat = track(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    this.flash = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.036, 48), this.flashMat);
    root.add(this.flash);
    this._flashT0 = -1;
  }

  _buildRacket(track) {
    const R = this.racket;
    const frameMat = track(new THREE.MeshPhysicalMaterial({ color: 0xc8102e, roughness: 0.28, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.12 }));
    const carbonMat = track(new THREE.MeshPhysicalMaterial({ color: 0x15171c, roughness: 0.35, metalness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 }));
    const gripTex = canvasTexture(64, 256, (ctx, w, h) => {
      ctx.fillStyle = '#f1ede4';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(60,52,40,0.35)';
      ctx.lineWidth = 3;
      for (let y = -w; y < h + w; y += 22) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y + w * 0.55);
        ctx.stroke();
      }
    });
    gripTex.wrapS = gripTex.wrapT = THREE.RepeatWrapping;
    gripTex.repeat.set(3, 1);
    const gripMat = track(new THREE.MeshStandardMaterial({ map: gripTex, roughness: 0.85 }));
    this._frameMat = frameMat;

    // hoop: an elliptical tube in the Y-Z plane, deeper (X) than wide like a real beam
    class Ellipse extends THREE.Curve {
      getPoint(t, out = new THREE.Vector3()) {
        const a = t * Math.PI * 2;
        return out.set(0, Math.cos(a) * (HEAD_WID + 0.009), Math.sin(a) * (HEAD_LEN + 0.009));
      }
    }
    const beam = new THREE.Group();
    beam.scale.set(1.55, 1, 1);
    R.add(beam);
    const hoop = new THREE.Mesh(new THREE.TubeGeometry(new Ellipse(), 160, 0.0082, 14, true), frameMat);
    beam.add(hoop);
    // bumper guard over the tip
    class Bumper extends THREE.Curve {
      getPoint(t, out = new THREE.Vector3()) {
        const a = Math.PI / 2 + (t - 0.5) * 1.5;
        return out.set(0, Math.cos(a) * (HEAD_WID + 0.0175), Math.sin(a) * (HEAD_LEN + 0.0175));
      }
    }
    beam.add(new THREE.Mesh(new THREE.TubeGeometry(new Bumper(), 40, 0.0042, 8, false), carbonMat));
    // throat: two arms from the lower hoop into the shaft
    for (const s of [-1, 1]) {
      const c = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, s * 0.074, -0.138),
        new THREE.Vector3(0, s * 0.052, -0.2),
        new THREE.Vector3(0, s * 0.022, -0.262),
        new THREE.Vector3(0, s * 0.006, -0.3)
      ]);
      beam.add(new THREE.Mesh(new THREE.TubeGeometry(c, 40, 0.0078, 12, false), frameMat));
    }
    // shaft collar, handle (octagonal), butt cap
    const collarGeo = new THREE.CylinderGeometry(0.0128, 0.0145, 0.03, 16);
    collarGeo.rotateX(Math.PI / 2);
    const collar = new THREE.Mesh(collarGeo, carbonMat);
    collar.position.z = -0.302;
    R.add(collar);
    const handleGeo = new THREE.CylinderGeometry(0.0168, 0.0178, 0.2, 8, 1);
    handleGeo.rotateY(Math.PI / 8);
    handleGeo.rotateX(Math.PI / 2);
    const handle = new THREE.Mesh(handleGeo, gripMat);
    handle.position.z = -0.415;
    R.add(handle);
    const capGeo = new THREE.CylinderGeometry(0.0196, 0.0188, 0.016, 8);
    capGeo.rotateY(Math.PI / 8);
    capGeo.rotateX(Math.PI / 2);
    const cap = new THREE.Mesh(capGeo, frameMat);
    cap.position.z = -0.522;
    R.add(cap);

    // string bed: 16 mains x 19 crosses on a transparent texture
    const strTex = canvasTexture(1024, 768, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const mains = 16;
      const crosses = 19;
      ctx.lineCap = 'round';
      for (let i = 1; i <= mains; i++) {
        const y = (i / (mains + 1)) * h;
        ctx.strokeStyle = 'rgba(250,248,240,0.95)';
        ctx.lineWidth = 4.2;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(70,64,52,0.35)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, y + 2.6);
        ctx.lineTo(w, y + 2.6);
        ctx.stroke();
      }
      for (let j = 1; j <= crosses; j++) {
        const x = (j / (crosses + 1)) * w;
        ctx.strokeStyle = 'rgba(244,241,232,0.95)';
        ctx.lineWidth = 3.6;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      // stencil logo
      ctx.strokeStyle = 'rgba(200,16,46,0.75)';
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.arc(w * 0.62, h / 2, h * 0.16, Math.PI * 0.62, Math.PI * 1.38);
      ctx.stroke();
    });
    strTex.anisotropy = this.s3.renderer.capabilities.getMaxAnisotropy?.() || 1;
    const shape = new THREE.Shape();
    shape.absellipse(0, 0, HEAD_LEN, HEAD_WID, 0, Math.PI * 2, false, 0);
    const bedGeo = new THREE.ShapeGeometry(shape, 64);
    const pos = bedGeo.attributes.position;
    const uv = bedGeo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(i, (pos.getX(i) + HEAD_LEN) / (2 * HEAD_LEN), (pos.getY(i) + HEAD_WID) / (2 * HEAD_WID));
    }
    // shape x -> racket Z (along the shaft), shape y -> racket Y
    bedGeo.rotateY(-Math.PI / 2);
    const bedMat = track(new THREE.MeshStandardMaterial({ map: strTex, transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 0.6 }));
    const bed = new THREE.Mesh(bedGeo, bedMat);
    bed.renderOrder = 2;
    R.add(bed);

    // generous invisible grab area (head and handle) so a fingertip finds the racket
    const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
    const headProxy = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), proxyMat);
    headProxy.scale.set(0.05, HEAD_WID * 1.45, HEAD_LEN * 1.35);
    R.add(headProxy);
    const handleProxyGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.34, 10);
    handleProxyGeo.rotateX(Math.PI / 2);
    const handleProxy = new THREE.Mesh(handleProxyGeo, proxyMat);
    handleProxy.position.z = -0.36;
    R.add(handleProxy);
    this.hitTargets.push(headProxy, handleProxy);
  }

  /**
   * A right hand around the handle. Built in the racket frame: the fingers wrap the handle
   * (Z axis) under and round to the front, the thumb comes over the top to meet them, the palm
   * and the heel sit on the side the forearm leaves from. `forearm` is the wrist-to-elbow
   * direction in the racket frame; `left` mirrors it into a left hand (two-handed backhand).
   */
  _buildHand({ zc, forearm, left = false, sleeve = false }) {
    const hand = new THREE.Group();
    const skin = this._skin;
    const r = 0.0175; // handle radius
    const f = new THREE.Vector3(...forearm).normalize();
    // the heel faces where the forearm leaves; everything else is laid out from there
    const heelAng = Math.atan2(f.y, f.x);
    const at = (ang, rad, z) => new THREE.Vector3(Math.cos(ang) * rad, Math.sin(ang) * rad, z);
    const dir = left ? -1 : 1; // which way round the handle the fingers wrap
    const palmAng = heelAng + dir * 0.42;
    const knuckleAng = palmAng + dir * 0.95;

    // palm and back of the hand: one soft block tangent to the handle
    const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), skin);
    palm.scale.set(0.019, 0.036, 0.046);
    const pc = at(palmAng, r + 0.0165, zc - 0.002);
    palm.position.copy(pc);
    palm.rotation.z = palmAng;
    hand.add(palm);
    // heel of the hand, bridging to the wrist
    const heel = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), skin);
    heel.scale.set(0.02, 0.028, 0.034);
    const hc = at(heelAng, r + 0.022, zc - 0.012);
    heel.position.copy(hc);
    heel.rotation.z = heelAng;
    hand.add(heel);

    // fingers: index (towards the head, a little spread) to little finger (towards the butt)
    const fingers = [
      { dz: 0.034, len: [0.042, 0.026, 0.021], rad: 0.0091, wrap: 3.0, drift: 0.008 },
      { dz: 0.012, len: [0.045, 0.028, 0.022], rad: 0.0094, wrap: 3.1, drift: 0.002 },
      { dz: -0.009, len: [0.042, 0.027, 0.021], rad: 0.009, wrap: 3.05, drift: -0.002 },
      { dz: -0.028, len: [0.034, 0.022, 0.019], rad: 0.0079, wrap: 2.85, drift: -0.005 }
    ];
    const Rf = r + 0.0118;
    for (const fg of fingers) {
      const total = fg.len[0] + fg.len[1] + fg.len[2];
      let ang = knuckleAng;
      let z = zc + fg.dz;
      let p = at(ang, Rf + 0.004, z);
      const knuckle = new THREE.Mesh(new THREE.SphereGeometry(fg.rad * 1.12, 16, 12), skin);
      knuckle.position.copy(p);
      hand.add(knuckle);
      fg.len.forEach((len, i) => {
        const span = (len / total) * fg.wrap;
        ang += dir * span;
        z += fg.drift * (len / total);
        const rad = fg.rad * (1 - i * 0.08);
        const q = at(ang, Rf - i * 0.0012, z);
        hand.add(capsuleBetween(p, q, rad, skin));
        p = q;
      });
    }
    // thumb: from the base of the palm over the top of the handle, pointing up the handle
    const tb = at(palmAng - dir * 0.55, r + 0.017, zc + 0.012);
    const thenar = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), skin);
    thenar.scale.set(0.016, 0.02, 0.026);
    thenar.position.copy(tb);
    thenar.rotation.z = palmAng - dir * 0.55;
    hand.add(thenar);
    const t1 = at(palmAng - dir * 1.35, r + 0.0115, zc + 0.03);
    const t2 = at(palmAng - dir * 2.05, r + 0.0098, zc + 0.046);
    hand.add(capsuleBetween(tb, t1, 0.0098, skin));
    hand.add(capsuleBetween(t1, t2, 0.0088, skin));

    // wrist and forearm
    const w0 = hc.clone().addScaledVector(f, 0.012);
    const elbow = w0.clone().addScaledVector(f, 0.3);
    const armGeo = new THREE.CylinderGeometry(0.0225, 0.032, 0.3, 24, 1);
    armGeo.translate(0, 0.15, 0);
    const arm = new THREE.Mesh(armGeo, skin);
    arm.position.copy(w0);
    arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), f);
    arm.scale.set(1, 1, 0.82);
    hand.add(arm);
    const wrist = new THREE.Mesh(new THREE.SphereGeometry(0.0228, 20, 14), skin);
    wrist.position.copy(w0);
    wrist.scale.set(1, 1, 0.85);
    hand.add(wrist);
    const bandGeo = new THREE.CylinderGeometry(0.0262, 0.0272, 0.05, 24, 1);
    bandGeo.translate(0, 0.045, 0);
    const bandM = new THREE.Mesh(bandGeo, left ? this._sleeve : this._band);
    bandM.position.copy(w0);
    bandM.quaternion.copy(arm.quaternion);
    bandM.scale.set(1, 1, 0.84);
    hand.add(bandM);
    if (sleeve) {
      const slGeo = new THREE.CylinderGeometry(0.036, 0.042, 0.06, 20, 1, true);
      slGeo.translate(0, 0.3, 0);
      const sl = new THREE.Mesh(slGeo, this._sleeve);
      sl.position.copy(w0);
      sl.quaternion.copy(arm.quaternion);
      hand.add(sl);
    }
    hand.userData.elbow = elbow;
    hand.traverse((o) => {
      if (o.isMesh) this.hitTargets.push(o);
    });
    return hand;
  }

  /** Rebuild the hand(s) for a stroke (forehand, one/two-handed backhand, serve). */
  _setHands(frame) {
    const key = `${frame.kind}`;
    if (this._handsKey === key) return;
    this._handsKey = key;
    for (const c of [...this.hands.children]) {
      this.hands.remove(c);
      c.traverse((o) => o.geometry?.dispose());
    }
    this.hitTargets = this.hitTargets.filter((o) => this.racket.children.includes(o));
    // wrist-to-elbow direction in the hitter's frame for each stroke, mapped to the racket frame
    const court = {
      fh: [-0.55, 0.66, 0.18],
      bh1: [-0.4, -0.72, 0.42],
      bh2: [-0.45, -0.7, 0.2],
      serve: [-0.3, 0.12, -0.95]
    }[frame.kind];
    const toLocal = (v) => [
      v[0] * frame.n[0] + v[1] * frame.n[1] + v[2] * frame.n[2],
      v[0] * frame.b[0] + v[1] * frame.b[1] + v[2] * frame.b[2],
      v[0] * frame.a[0] + v[1] * frame.a[1] + v[2] * frame.a[2]
    ];
    this.hands.add(this._buildHand({ zc: -0.43, forearm: toLocal(court), sleeve: false }));
    if (frame.kind === 'bh2') {
      const lf = toLocal([-0.5, 0.55, 0.3]);
      this.hands.add(this._buildHand({ zc: -0.335, forearm: lf, left: true }));
    }
    this.hands.traverse((o) => {
      if (o.material && !this.mats.includes(o.material)) this._track(o.material);
    });
  }

  _setSpinArc(rpm) {
    const mag = Math.min(1, Math.abs(rpm) / 4200);
    const arc = 0.5 + mag * 4.6; // radians
    const key = Math.round(arc * 40);
    if (key === this._spinArcKey) return;
    this._spinArcKey = key;
    this.spinArc.geometry.dispose();
    const R = BALL_R * 1.85;
    const geo = new THREE.TorusGeometry(R, 0.0028 + mag * 0.0016, 8, 64, arc);
    // start behind the ball and run over the top towards the target for topspin
    geo.rotateZ(Math.PI - arc);
    this.spinArc.geometry = geo;
    const end = Math.PI; // torus arc ends at angle PI after the rotation
    this.spinHead.position.set(Math.cos(end) * R, Math.sin(end) * R, 0);
    // tangent at the end of the arc, pointing in the direction of travel (counter-clockwise)
    this.spinHead.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-Math.sin(end), Math.cos(end), 0));
  }

  /* ------------------------------------------------------------------ */
  /* Pose                                                                */
  /* ------------------------------------------------------------------ */

  /** World-space frame of the contact for the given (smoothed) values. */
  _frameFor(v) {
    const st = this.state;
    const s = st.side === 'B' ? -1 : 1;
    const fr = contactRacketFrame({ ...st, faceAngleDeg: v.face, aimAngleDeg: v.aim });
    const C = toThree([st.hitX, st.hitY, st.hitZ], s);
    const n = toThree(fr.n, s);
    const a = toThree(fr.a, s);
    const b = toThree(fr.b, s);
    const up = new THREE.Vector3(0, 1, 0);
    const fwd = toThree([Math.cos((v.aim * Math.PI) / 180), Math.sin((v.aim * Math.PI) / 180), 0], s);
    const left = toThree([-Math.sin((v.aim * Math.PI) / 180), Math.cos((v.aim * Math.PI) / 180), 0], s);
    return { fr, s, C, n, a, b, up, fwd, left };
  }

  _applyPose(dt) {
    if (!this.state || !this.vis) return;
    const v = this.vis;
    const F = this._frameFor(v);
    this._F = F;
    this._setHands(F.fr);
    // rig: strings centre sits one ball radius behind the ball centre
    const m = new THREE.Matrix4().makeBasis(F.n, F.b, F.a);
    this.rig.quaternion.setFromRotationMatrix(m);
    this.rig.position.copy(F.C).addScaledVector(F.n, -BALL_R * 0.94);
    // square-face reference: same racket with the face at 0°
    const F0 = this._frameFor({ face: 0, aim: v.aim });
    this.squareRing.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(F0.n, F0.b, F0.a));
    this.squareRing.position.copy(F.C).addScaledVector(F0.n, -BALL_R * 0.94);
    this.squareRing.visible = Math.abs(v.face) > 0.6;

    // ball: pressed a little into the strings, turning about the spin axis
    this.ballHolder.position.copy(F.C);
    this.ballHolder.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), F.n);
    this.ball.scale.set(0.9, 1.04, 1.04);
    const spinAxis = F.left.clone(); // topspin turns about the hitter's left (+y)
    this._spinAngle += (v.rpm / 60) * 2 * Math.PI * dt * 0.012;
    this.ballSpin.quaternion.setFromAxisAngle(this.ballHolder.worldToLocal(spinAxis.clone().add(this.ballHolder.position)).normalize(), -this._spinAngle);

    // spin ring in the vertical plane of the shot, around the ball
    this._setSpinArc(v.rpm);
    const ringBasis = new THREE.Matrix4().makeBasis(F.fwd, F.up, F.fwd.clone().cross(F.up));
    this.spinRing.quaternion.setFromRotationMatrix(ringBasis);
    // backspin: mirror the ring so the head points the other way
    this.spinRing.scale.set(v.rpm >= 0 ? 1 : -1, 1, 1);
    this.spinRing.position.copy(F.C);
    const warm = v.rpm >= 0;
    this.spinMat.color.setHex(Math.abs(v.rpm) < 250 ? 0x8f8573 : warm ? 0xc2410c : 0x2a6fc4);
    this.spinMat.emissive.copy(this.spinMat.color);

    // swing arrow: along the swing path into the back of the racket, longer = faster
    const pr = (v.path * Math.PI) / 180;
    const sdir = F.fwd.clone().multiplyScalar(Math.cos(pr)).addScaledVector(F.up, Math.sin(pr)).normalize();
    const sLen = 0.16 + (v.speed / 150) * 0.34;
    const sEnd = this.rig.position.clone().addScaledVector(F.n, -0.03);
    const sStart = sEnd.clone().addScaledVector(sdir, -sLen);
    this._placeArrow(this.swingArrow, sStart, sdir, sLen);
    this._swingTail = sStart;
    this._swingDir = sdir;

    // launch arrow: launch angle and aim from the impact model, longer = faster
    const la = ((this.impact?.launchAngleDeg ?? 0) * Math.PI) / 180;
    const ldir = F.fwd.clone().multiplyScalar(Math.cos(la)).addScaledVector(F.up, Math.sin(la)).normalize();
    const lLen = 0.18 + ((this.impact?.launchSpeedKmh ?? 100) / 200) * 0.5;
    this._placeArrow(this.launchArrow, F.C.clone().addScaledVector(ldir, BALL_R * 1.4), ldir, lLen);

    // face normal needle (thin, gold) from the strings
    this._placeArrow(this.normalArrow, this.rig.position.clone().addScaledVector(F.n, 0.004).addScaledVector(F.a, 0.09), F.n, 0.14);
  }

  _placeArrow(g, from, dir, len) {
    const { shaft, head, radius } = g.userData;
    const headLen = Math.min(len * 0.32, radius * 7);
    g.position.copy(from);
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    shaft.scale.set(1, Math.max(0.001, len - headLen), 1);
    head.scale.set(1, headLen, 1);
    head.position.y = len - headLen;
  }

  /** Camera pose for the close-up: three-quarter view from the hitter's side of the racket. */
  _closeupPose() {
    const F = this._frameFor({ face: this.state.faceAngleDeg, aim: this.state.aimAngleDeg, rpm: 0 });
    const kind = F.fr.kind;
    const cam = this.s3.camera;
    const aspect = cam.aspect || 1.6;
    const fov = aspect < 0.9 ? 46 : aspect < 1.3 ? 40 : 34;
    // look at a point between the ball and the hand so both are in frame
    const target = F.C.clone().addScaledVector(F.a, kind === 'serve' ? -0.12 : -0.14).addScaledVector(F.up, 0.02);
    // offset: in front of the face, out to the head side, a little above
    let off;
    if (kind === 'serve') off = F.n.clone().multiplyScalar(0.55).addScaledVector(F.left, -0.7).addScaledVector(F.up, -0.1);
    else off = F.n.clone().multiplyScalar(0.5).addScaledVector(F.a, 0.62).addScaledVector(F.up, 0.42);
    off.normalize();
    // distance that fits ~0.8 m of racket and arm across and ~0.55 m up
    const vfov = (fov * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    const dist = clamp(Math.max(0.82 / (2 * Math.tan(hfov / 2)), 0.6 / (2 * Math.tan(vfov / 2))), 0.75, 2.6);
    const pos = target.clone().addScaledVector(off, dist);
    if (pos.y < 0.12) pos.y = 0.12;
    return { pos, target, fov };
  }

  /* ------------------------------------------------------------------ */
  /* Overlay                                                             */
  /* ------------------------------------------------------------------ */

  _buildOverlay() {
    const L = document.createElement('div');
    L.className = 'cc-layer';
    L.hidden = true;
    L.setAttribute('role', 'dialog');
    L.innerHTML = `
      <div class="cc-vignette" aria-hidden="true"></div>
      <div class="cc-bar cc-bar-top" aria-hidden="true"></div>
      <div class="cc-bar cc-bar-bottom" aria-hidden="true"></div>
      <div class="cc-curtain" aria-hidden="true"></div>
      <svg class="cc-leaders" aria-hidden="true"><line data-k="face"/><line data-k="spin"/><line data-k="speed"/></svg>
      <header class="cc-head">
        <div class="cc-titles"><span class="cc-kicker"></span><strong class="cc-title"></strong></div>
        <div class="cc-actions">
          <button type="button" class="cc-btn cc-reset"></button>
          <button type="button" class="cc-btn cc-done"></button>
        </div>
      </header>
      <p class="cc-hint"></p>
      ${['face', 'spin', 'speed']
        .map(
          (k) => `<div class="cc-knob" data-k="${k}" role="slider" tabindex="0">
            <span class="cc-knob-dot">${ICONS[k]}</span>
            <span class="cc-knob-text"><span class="cc-knob-lab"></span><span class="cc-knob-val"></span><span class="cc-knob-sub"></span></span>
          </div>`
        )
        .join('')}
      <footer class="cc-hud">
        <span class="cc-verdict"></span>
        <dl class="cc-stats">
          <div><dt data-s="net"></dt><dd data-s="net"></dd></div>
          <div><dt data-s="depth"></dt><dd data-s="depth"></dd></div>
          <div><dt data-s="launch"></dt><dd data-s="launch"></dd></div>
          <div class="cc-st-ball"><dt data-s="ball"></dt><dd data-s="ball"></dd></div>
        </dl>
        <figure class="cc-prof"><svg class="cc-prof-svg" preserveAspectRatio="xMidYMid meet" role="img"></svg><figcaption class="cc-prof-cap"></figcaption></figure>
      </footer>`;
    this.host.appendChild(L);
    this.layer = L;
    this.el = {
      kicker: L.querySelector('.cc-kicker'),
      title: L.querySelector('.cc-title'),
      hint: L.querySelector('.cc-hint'),
      done: L.querySelector('.cc-done'),
      reset: L.querySelector('.cc-reset'),
      verdict: L.querySelector('.cc-verdict'),
      prof: L.querySelector('.cc-prof-svg'),
      profCap: L.querySelector('.cc-prof-cap'),
      leaders: Object.fromEntries([...L.querySelectorAll('.cc-leaders line')].map((n) => [n.dataset.k, n])),
      knobs: Object.fromEntries([...L.querySelectorAll('.cc-knob')].map((n) => [n.dataset.k, n])),
      dt: Object.fromEntries([...L.querySelectorAll('dt[data-s]')].map((n) => [n.dataset.s, n])),
      dd: Object.fromEntries([...L.querySelectorAll('dd[data-s]')].map((n) => [n.dataset.s, n]))
    };
    this.el.done.addEventListener('click', () => this.close());
    this.el.reset.addEventListener('click', () => this._reset());
    L.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.phase === 'open') {
        e.preventDefault();
        this.close();
      }
    });
    for (const [k, node] of Object.entries(this.el.knobs)) this._bindKnob(k, node);
    this.setLang(this.lang);
  }

  setLang(lang) {
    this.lang = lang === 'zh' ? 'zh' : 'en';
    const L = T[this.lang];
    this.el.kicker.textContent = L.kicker;
    this.el.title.textContent = L.title;
    this.el.hint.textContent = this.touch ? L.hintTouch : L.hint;
    this.el.done.textContent = L.done;
    this.el.reset.textContent = L.reset;
    this.layer.setAttribute('aria-label', L.layerAria);
    this.el.knobs.face.setAttribute('aria-label', L.faceAria);
    this.el.knobs.spin.setAttribute('aria-label', L.spinAria);
    this.el.knobs.speed.setAttribute('aria-label', L.speedAria);
    this.el.knobs.face.querySelector('.cc-knob-lab').textContent = L.face;
    this.el.knobs.spin.querySelector('.cc-knob-lab').textContent = L.spin;
    this.el.knobs.speed.querySelector('.cc-knob-lab').textContent = L.speed;
    this.el.dt.net.textContent = L.net;
    this.el.dt.launch.textContent = L.launch;
    this.el.dt.ball.textContent = L.ballSpeed;
    this.el.prof.setAttribute('aria-label', L.sideTitle);
    if (this.state) this._renderReadouts();
  }

  setTheme(theme) {
    this.theme = theme;
    this.squareRing.material.color.setHex(theme === 'dark' ? 0xebe8e2 : 0x1b1a17);
    this.launchArrow.userData.mat.color.setHex(theme === 'dark' ? 0x7cc7a8 : 0x1f5b3f);
    this.launchArrow.userData.mat.emissive.copy(this.launchArrow.userData.mat.color);
    if (this.phase === 'open' && this.s3.scene.fog) this.s3.scene.fog.density = this._fogClose();
  }

  _fogClose() {
    return (this.theme === 'dark' ? 0.012 : 0.0085) * 4.2;
  }

  /* ------------------------------------------------------------------ */
  /* Open / close                                                        */
  /* ------------------------------------------------------------------ */

  /**
   * @param {object} o
   * @param {object} o.state  the shot (read only; changes go through onChange)
   * @param {object} o.sim, o.impact
   * @param {object} o.ranges { face:[lo,hi], aim:[lo,hi], path:[lo,hi], speed:[lo,hi] }
   * @param {object} [o.startPose] camera pose to start from (when the 3D view was hidden)
   * @param {function} o.onChange (updates, { live }) => void
   * @param {function} [o.onInteractStart] before the first change of a gesture
   * @param {function} [o.onClosed] after the camera is back
   * @param {function} [o.formatSpeed]
   * @param {boolean} [o.reducedMotion]
   */
  open(o) {
    if (this.phase !== 'closed') return false;
    const s3 = this.s3;
    const cam = s3.camera;
    const ctl = s3.controls;
    this.opts = o;
    this.ranges = o.ranges;
    this.state = { ...o.state };
    this.sim = o.sim;
    this.impact = o.impact;
    this.entry = {
      faceAngleDeg: o.state.faceAngleDeg,
      aimAngleDeg: o.state.aimAngleDeg,
      swingPathDeg: o.state.swingPathDeg,
      racketSpeedKmh: o.state.racketSpeedKmh,
      sim: o.sim
    };
    this.reduced = !!o.reducedMotion;
    this.vis = {
      face: o.state.faceAngleDeg,
      aim: o.state.aimAngleDeg,
      path: o.state.swingPathDeg,
      speed: o.state.racketSpeedKmh,
      rpm: o.impact?.topspinRpm ?? 0
    };
    if (o.startPose) {
      cam.position.copy(o.startPose.pos);
      ctl.target.copy(o.startPose.target);
      ctl.update();
    }
    this.saved = {
      pos: cam.position.clone(),
      target: ctl.target.clone(),
      fov: cam.fov,
      fog: s3.scene.fog ? s3.scene.fog.density : 0,
      ctl: {
        minDistance: ctl.minDistance,
        maxDistance: ctl.maxDistance,
        minPolarAngle: ctl.minPolarAngle,
        maxPolarAngle: ctl.maxPolarAngle,
        minAzimuthAngle: ctl.minAzimuthAngle,
        maxAzimuthAngle: ctl.maxAzimuthAngle,
        enablePan: ctl.enablePan,
        rotateSpeed: ctl.rotateSpeed
      }
    };
    s3.cameraOverride = true;
    s3.keepRendering = true;
    ctl.enabled = false;
    s3._camTween = null;
    this._hideMainBall(true);
    this.rigPlayer = this.state.side === 'B' ? s3.playerB : s3.playerA;

    this._applyPose(0);
    this.close_ = this._closeupPose();
    this._path = this._makePath(this.saved.pos, this.saved.target, this.close_.pos, this.close_.target, 'in');
    this.root.visible = true;
    this._setCloseupOpacity(0);
    this._renderReadouts();

    this.layer.hidden = false;
    this.layer.classList.remove('is-open', 'is-exiting', 'is-reduced');
    this.layer.classList.toggle('is-reduced', this.reduced);
    void this.layer.offsetWidth;
    this.layer.classList.add('is-cine');
    document.body.classList.add('cc-on');
    this.phase = 'entering';
    this._t0 = performance.now();
    this._dur = this.reduced ? 260 : ENTER_MS;
    this._hintShown = false;
    return true;
  }

  /** Fly back to the court view; onClosed fires when the camera is there. */
  close() {
    if (this.phase !== 'open' && this.phase !== 'entering') return;
    this._endDrag();
    const s3 = this.s3;
    const cam = s3.camera;
    const ctl = s3.controls;
    ctl.enabled = false;
    this._exitFrom = { pos: cam.position.clone(), target: ctl.target.clone(), fov: cam.fov, fog: s3.scene.fog ? s3.scene.fog.density : 0 };
    // back to the court view's lens (it may have changed if the screen turned)
    this._exitFov = s3.baseFov || this.saved.fov;
    this._path = this._makePath(this._exitFrom.pos, this._exitFrom.target, this.saved.pos, this.saved.target, 'out');
    this.layer.classList.remove('is-open', 'is-cine');
    this.layer.classList.add('is-exiting');
    document.body.classList.remove('cc-on');
    this.phase = 'exiting';
    this._t0 = performance.now();
    this._dur = this.reduced ? 260 : EXIT_MS;
  }

  /** Leave at once (mode switch, page change): no animation. */
  abort() {
    if (this.phase === 'closed') return;
    this._endDrag();
    this._finish(false);
  }

  _finish(notify = true) {
    const s3 = this.s3;
    const cam = s3.camera;
    const ctl = s3.controls;
    Object.assign(ctl, this.saved.ctl);
    cam.position.copy(this.saved.pos);
    ctl.target.copy(this.saved.target);
    cam.fov = s3.baseFov || this.saved.fov;
    cam.updateProjectionMatrix();
    if (s3.scene.fog) s3.scene.fog.density = this.saved.fog;
    ctl.enabled = true;
    ctl.update();
    s3.setRigOpacity(this.rigPlayer, 1);
    this._hideMainBall(false);
    this.root.visible = false;
    s3.cameraOverride = false;
    s3.keepRendering = false;
    s3.markActive();
    this.layer.hidden = true;
    this.layer.classList.remove('is-open', 'is-cine', 'is-exiting');
    document.body.classList.remove('cc-on');
    this.phase = 'closed';
    const cb = this.opts?.onClosed;
    this.opts = null;
    if (notify && cb) cb();
  }

  _hideMainBall(hide) {
    const s3 = this.s3;
    for (const o of [s3.ballGroup, s3.ballGroundShadow, s3.ballHeightLine]) if (o) o.visible = !hide;
  }

  /**
   * Camera path: a cubic Bezier. Going in, the last stretch is a straight dolly along the final
   * line of sight (the camera "arrives" rather than swings into place) and the first stretch
   * lifts a little; coming out, the first stretch pulls straight back.
   */
  _makePath(p0, t0, p3, t3, dirn) {
    const d = p0.distanceTo(p3);
    const up = new THREE.Vector3(0, 1, 0);
    let p1;
    let p2;
    if (dirn === 'in') {
      const back = p3.clone().sub(t3).normalize();
      p2 = p3.clone().addScaledVector(back, 0.7 + d * 0.22).addScaledVector(up, 0.12 + d * 0.02);
      p1 = p0.clone().lerp(p2, 0.38).addScaledVector(up, Math.min(2.2, d * 0.07));
    } else {
      const back = p0.clone().sub(t0).normalize();
      p1 = p0.clone().addScaledVector(back, 0.7 + d * 0.22).addScaledVector(up, 0.12 + d * 0.02);
      p2 = p3.clone().lerp(p1, 0.35).addScaledVector(up, Math.min(2.2, d * 0.06));
    }
    const arr = (v) => [v.x, v.y, v.z];
    const P = [arr(p0), arr(p1), arr(p2), arr(p3)];
    return { P, map: arcLengthMap(...P), t0: t0.clone(), t3: t3.clone() };
  }

  _pathPoint(s, out) {
    const P = this._path.P;
    const u = this._path.map(s);
    const p = bezier3(P[0], P[1], P[2], P[3], u);
    return out.set(p[0], p[1], p[2]);
  }

  _setCloseupOpacity(a) {
    this._closeAlpha = a;
    for (const m of this.mats) {
      const base = m.userData.baseOpacity ?? 1;
      const fading = a < 0.999;
      m.transparent = fading || m.userData.baseTransparent;
      m.depthWrite = !m.transparent || m === this.ballMat;
      m.opacity = base * a;
    }
    this.root.visible = a > 0.002;
  }

  /* ------------------------------------------------------------------ */
  /* Frame loop                                                          */
  /* ------------------------------------------------------------------ */

  _frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - this._lastNow) / 1000));
    this._lastNow = now;
    if (this.phase === 'closed') return;
    const s3 = this.s3;
    const cam = s3.camera;
    const ctl = s3.controls;

    // smoothed values follow the shot (critically damped feel, ~70 ms)
    if (this.state && this.phase !== 'entering') {
      const k = 1 - Math.exp(-dt / 0.07);
      const t = this.state;
      this.vis.face = lerp(this.vis.face, t.faceAngleDeg, k);
      this.vis.aim = lerp(this.vis.aim, t.aimAngleDeg, k);
      this.vis.path = lerp(this.vis.path, t.swingPathDeg, k);
      this.vis.speed = lerp(this.vis.speed, t.racketSpeedKmh, k);
      this.vis.rpm = lerp(this.vis.rpm, this.impact?.topspinRpm ?? 0, k);
    }
    this._applyPose(dt);

    if (this.phase === 'entering' || this.phase === 'exiting') {
      const k = clamp((now - this._t0) / this._dur, 0, 1);
      const entering = this.phase === 'entering';
      if (this.reduced) {
        // reduced motion: no flight, a short dissolve through the curtain
        this.layer.style.setProperty('--cc-curtain', String(Math.sin(Math.PI * k)));
        const cut = k >= 0.5;
        const pose = entering ? (cut ? this.close_ : null) : cut ? { pos: this.saved.pos, target: this.saved.target, fov: this._exitFov } : null;
        if (pose) {
          cam.position.copy(pose.pos);
          ctl.target.copy(pose.target);
          cam.fov = pose.fov;
          cam.updateProjectionMatrix();
        }
        s3.setRigOpacity(this.rigPlayer, entering ? (cut ? 0 : 1) : cut ? 1 : 0);
        this._setCloseupOpacity(entering ? (cut ? 1 : 0) : cut ? 0 : 1);
        if (s3.scene.fog) s3.scene.fog.density = entering === cut ? this._fogClose() : this.saved.fog;
      } else if (entering) {
        const sPos = ease.inOutCubic(k);
        this._pathPoint(sPos, cam.position);
        // the eye turns towards the hand a little before the body travels
        const tk = ease.inOutCubic(band(k, 0, 0.82));
        ctl.target.lerpVectors(this._path.t0, this._path.t3, tk);
        cam.fov = lerp(this.saved.fov, this.close_.fov, ease.inOutSine(band(k, 0.1, 1)));
        cam.updateProjectionMatrix();
        s3.setRigOpacity(this.rigPlayer, 1 - ease.smooth(band(k, 0.52, 0.8)));
        this._setCloseupOpacity(ease.smooth(band(k, 0.56, 0.9)));
        if (s3.scene.fog) s3.scene.fog.density = lerp(this.saved.fog, this._fogClose(), ease.inOutSine(band(k, 0.3, 1)));
      } else {
        const sPos = ease.inOutCubic(k);
        this._pathPoint(sPos, cam.position);
        const tk = ease.inOutCubic(band(k, 0.08, 1));
        ctl.target.lerpVectors(this._path.t0, this._path.t3, tk);
        cam.fov = lerp(this._exitFrom.fov, this._exitFov, ease.inOutSine(band(k, 0, 0.9)));
        cam.updateProjectionMatrix();
        this._setCloseupOpacity(1 - ease.smooth(band(k, 0, 0.3)));
        s3.setRigOpacity(this.rigPlayer, ease.smooth(band(k, 0.08, 0.42)));
        if (s3.scene.fog) s3.scene.fog.density = lerp(this._exitFrom.fog, this.saved.fog, ease.inOutSine(band(k, 0, 0.7)));
      }
      if (k >= 1) {
        if (entering) this._arrive();
        else {
          this._finish(true);
          return;
        }
      }
    }

    if (this._flashT0 >= 0) {
      const f = clamp((now - this._flashT0) / 650, 0, 1);
      this.flash.position.copy(this._F.C).addScaledVector(this._F.n, BALL_R * 0.2);
      this.flash.lookAt(cam.position);
      this.flash.scale.setScalar(1 + ease.outCubic(f) * 2.6);
      this.flashMat.opacity = 0.75 * (1 - f) * this._closeAlpha;
      if (f >= 1) this._flashT0 = -1;
    }
    if (this.phase === 'open' || this.phase === 'entering') this._placeKnobs();
  }

  _arrive() {
    const s3 = this.s3;
    const ctl = s3.controls;
    const cam = s3.camera;
    cam.position.copy(this.close_.pos);
    ctl.target.copy(this.close_.target);
    cam.fov = this.close_.fov;
    cam.updateProjectionMatrix();
    s3.setRigOpacity(this.rigPlayer, 0);
    this._setCloseupOpacity(1);
    // look around the contact within limits, damped; no pan so the contact stays centred
    const off = cam.position.clone().sub(ctl.target);
    const sph = new THREE.Spherical().setFromVector3(off);
    Object.assign(ctl, {
      minDistance: Math.max(0.45, sph.radius * 0.55),
      maxDistance: sph.radius * 1.9,
      minPolarAngle: 0.25,
      maxPolarAngle: Math.min(Math.PI / 2 + 0.25, sph.phi + 0.9),
      minAzimuthAngle: sph.theta - 1.25,
      maxAzimuthAngle: sph.theta + 1.25,
      enablePan: false,
      rotateSpeed: this.touch ? 0.5 : 0.6
    });
    ctl.enabled = true;
    ctl.update();
    this.phase = 'open';
    this.layer.classList.add('is-open');
    if (!this.reduced) this._flashT0 = performance.now();
    this.el.done.focus({ preventScroll: true });
  }

  /* ------------------------------------------------------------------ */
  /* Knobs and labels anchored to the scene                              */
  /* ------------------------------------------------------------------ */

  _project(v) {
    const r = this.layer.getBoundingClientRect();
    const p = v.clone().project(this.s3.camera);
    return { x: (p.x * 0.5 + 0.5) * r.width, y: (-p.y * 0.5 + 0.5) * r.height, behind: p.z > 1, w: r.width, h: r.height };
  }

  _placeKnobs() {
    const F = this._F;
    if (!F) return;
    const centre = this._project(this.rig.position);
    const anchors = {
      face: this.rig.position.clone().addScaledVector(F.a, HEAD_LEN + 0.03),
      spin: F.C.clone().addScaledVector(F.up, BALL_R * 2.1),
      speed: this._swingTail.clone()
    };
    const headerH = 64;
    const hud = this.layer.querySelector('.cc-hud');
    const hudTop = hud ? hud.offsetTop : centre.h - 120;
    const placed = [];
    const away = { face: 64, spin: 70, speed: 62 };
    for (const k of ['face', 'spin', 'speed']) {
      const p = this._project(anchors[k]);
      let dx = p.x - centre.x;
      let dy = p.y - centre.y;
      if (k === 'spin') {
        dx = 0.35;
        dy = -1;
      }
      const l = Math.hypot(dx, dy) || 1;
      let x = p.x + (dx / l) * away[k];
      let y = p.y + (dy / l) * away[k];
      const knob = this.el.knobs[k];
      const kw = knob.offsetWidth || 150;
      // keep inside the overlay, clear of the header and the result card
      x = clamp(x, 30, p.w - kw + 18);
      y = clamp(y, headerH + 26, hudTop - 30);
      for (const q of placed) {
        if (Math.abs(q.x - x) < kw * 0.9 && Math.abs(q.y - y) < 54) y = q.y + (y >= q.y ? 54 : -54);
      }
      y = clamp(y, headerH + 26, hudTop - 30);
      placed.push({ x, y });
      knob.style.transform = `translate3d(${(x - 22).toFixed(1)}px, ${(y - 22).toFixed(1)}px, 0)`;
      const ln = this.el.leaders[k];
      ln.setAttribute('x1', p.x.toFixed(1));
      ln.setAttribute('y1', p.y.toFixed(1));
      ln.setAttribute('x2', x.toFixed(1));
      ln.setAttribute('y2', y.toFixed(1));
    }
  }

  /* ------------------------------------------------------------------ */
  /* Interaction                                                         */
  /* ------------------------------------------------------------------ */

  _emit(updates, live) {
    Object.assign(this.state, updates);
    this.opts?.onChange?.(updates, { live });
  }

  /** One recompute per animation frame while dragging. */
  _queue(updates) {
    this._pending = { ...(this._pending || {}), ...updates };
    Object.assign(this.state, updates);
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => {
      this._raf = 0;
      const u = this._pending;
      this._pending = null;
      if (u) this._emit(u, true);
    });
  }

  _flush(final) {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
    const u = this._pending;
    this._pending = null;
    if (u) this._emit(u, true);
    if (final) this._emit(final, false);
  }

  _gestureStart() {
    this.opts?.onInteractStart?.();
    if (!this._hintShown) {
      this._hintShown = true;
      this.layer.classList.add('hint-done');
    }
  }

  _setFace(face) {
    const [lo, hi] = this.ranges.face;
    this._queue({ faceAngleDeg: clamp(Math.round(face * 10) / 10, lo, hi) });
  }

  _setAim(aim) {
    const [lo, hi] = this.ranges.aim;
    this._queue({ aimAngleDeg: clamp(Math.round(aim * 10) / 10, lo, hi) });
  }

  _setSpeed(v) {
    const [lo, hi] = this.ranges.speed;
    this._queue({ racketSpeedKmh: clamp(Math.round(v * 2) / 2, lo, hi) });
  }

  _setSpin(rpm) {
    const [lo, hi] = this.ranges.path;
    const sol = solveSwingPathForSpin(this.state, rpm, { min: lo, max: hi });
    this._spinTarget = rpm;
    this._queue({ swingPathDeg: sol.swingPathDeg });
  }

  _spinBounds() {
    const [lo, hi] = this.ranges.path;
    return spinRangeForSwing(this.state, { min: lo, max: hi });
  }

  _bindPointer() {
    const el = this.s3.renderer.domElement;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const hits = (e) => {
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, this.s3.camera);
      return ray.intersectObjects(this.hitTargets, false).length > 0;
    };
    el.addEventListener(
      'pointerdown',
      (e) => {
        if (this.phase !== 'open' || this._drag) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (!hits(e)) return;
        e.stopImmediatePropagation();
        e.preventDefault();
        this._startRacketDrag(e, el);
      },
      true
    );
    el.addEventListener(
      'pointermove',
      (e) => {
        if (this.phase !== 'open') return;
        if (this._drag && e.pointerId === this._drag.id) {
          e.stopImmediatePropagation();
          this._moveRacketDrag(e);
          return;
        }
        if (e.pointerType === 'mouse' && !this._drag) el.style.cursor = hits(e) ? 'grab' : '';
      },
      true
    );
    const end = (e) => {
      if (this._drag && e.pointerId === this._drag.id) {
        e.stopImmediatePropagation();
        this._endDrag();
      }
    };
    el.addEventListener('pointerup', end, true);
    el.addEventListener('pointercancel', end, true);
  }

  _startRacketDrag(e, el) {
    // dragging right turns the face towards screen-right: find where the hitter's left is on screen
    const F = this._F;
    const a = this._project(F.C);
    const b = this._project(F.C.clone().addScaledVector(F.left, 0.2));
    this._drag = {
      kind: 'racket',
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      face0: this.state.faceAngleDeg,
      aim0: this.state.aimAngleDeg,
      leftSign: b.x - a.x >= 0 ? 1 : -1,
      axis: null,
      el
    };
    try {
      el.setPointerCapture(e.pointerId);
    } catch (err) {
      /* synthetic pointer */
    }
    this.s3.controls.enabled = false;
    el.style.cursor = 'grabbing';
    this.layer.classList.add('is-dragging', 'drag-face');
    this._gestureStart();
  }

  _moveRacketDrag(e) {
    const d = this._drag;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    // lock to the first clear direction so a vertical drag does not also nudge the aim
    if (!d.axis && Math.hypot(dx, dy) > 7) d.axis = Math.abs(dy) >= Math.abs(dx) * 0.8 ? 'face' : 'aim';
    const fine = e.shiftKey ? 0.25 : 1;
    const perPx = (this.touch ? 0.17 : 0.12) * fine;
    if (d.axis === 'face') this._setFace(d.face0 - dy * perPx);
    else if (d.axis === 'aim') this._setAim(d.aim0 + dx * perPx * 0.8 * d.leftSign);
    this.layer.classList.toggle('drag-aim', d.axis === 'aim');
    this.layer.classList.toggle('drag-face', d.axis !== 'aim');
  }

  _endDrag() {
    const d = this._drag;
    if (!d) return;
    this._drag = null;
    try {
      d.el.releasePointerCapture?.(d.id);
    } catch (err) {
      /* already released */
    }
    if (d.el) d.el.style.cursor = '';
    if (this.phase === 'open') this.s3.controls.enabled = true;
    this.layer.classList.remove('is-dragging', 'drag-face', 'drag-aim');
    for (const n of Object.values(this.el.knobs)) n.classList.remove('is-active');
    const keys = { racket: ['faceAngleDeg', 'aimAngleDeg'], face: ['faceAngleDeg'], spin: ['swingPathDeg'], speed: ['racketSpeedKmh'] }[d.kind];
    this._flush(Object.fromEntries(keys.map((k) => [k, this.state[k]])));
  }

  _bindKnob(k, node) {
    node.addEventListener('pointerdown', (e) => {
      if (this.phase !== 'open' || this._drag) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      let axis = null;
      if (k === 'speed') {
        // drag along the swing arrow on screen: away from the ball = faster
        const a = this._project(this._swingTail);
        const b = this._project(this._swingTail.clone().addScaledVector(this._swingDir, 0.2));
        const l = Math.hypot(b.x - a.x, b.y - a.y);
        axis = l > 8 ? { x: -(b.x - a.x) / l, y: -(b.y - a.y) / l } : { x: 0, y: -1 };
      }
      this._drag = {
        kind: k,
        id: e.pointerId,
        x0: e.clientX,
        y0: e.clientY,
        v0: k === 'face' ? this.state.faceAngleDeg : k === 'spin' ? this.impact?.topspinRpm ?? 0 : this.state.racketSpeedKmh,
        axis,
        el: node
      };
      try {
        node.setPointerCapture(e.pointerId);
      } catch (err) {
        /* synthetic pointer */
      }
      node.classList.add('is-active');
      this.layer.classList.add('is-dragging');
      this.s3.controls.enabled = false;
      this._gestureStart();
    });
    node.addEventListener('pointermove', (e) => {
      const d = this._drag;
      if (!d || d.el !== node || e.pointerId !== d.id) return;
      const dx = e.clientX - d.x0;
      const dy = e.clientY - d.y0;
      const fine = e.shiftKey ? 0.25 : 1;
      if (k === 'face') this._setFace(d.v0 - dy * (this.touch ? 0.17 : 0.12) * fine);
      else if (k === 'spin') {
        const b = this._spinBounds();
        this._setSpin(clamp(d.v0 - dy * 14 * fine, b.min, b.max));
      } else {
        const along = dx * d.axis.x + dy * d.axis.y;
        this._setSpeed(d.v0 + along * 0.32 * fine);
      }
    });
    const end = (e) => {
      const d = this._drag;
      if (!d || d.el !== node || e.pointerId !== d.id) return;
      this._endDrag();
    };
    node.addEventListener('pointerup', end);
    node.addEventListener('pointercancel', end);
    node.addEventListener('keydown', (e) => {
      if (this.phase !== 'open') return;
      const up = e.key === 'ArrowUp' || e.key === 'ArrowRight';
      const down = e.key === 'ArrowDown' || e.key === 'ArrowLeft';
      if (!up && !down) return;
      e.preventDefault();
      if (!e.repeat) this._gestureStart();
      const sgn1 = up ? 1 : -1;
      const big = e.shiftKey ? 4 : 1;
      if (k === 'face') this._setFace(this.state.faceAngleDeg + sgn1 * 0.5 * big);
      else if (k === 'spin') {
        const b = this._spinBounds();
        this._setSpin(clamp((this.impact?.topspinRpm ?? 0) + sgn1 * 100 * big, b.min, b.max));
      } else this._setSpeed(this.state.racketSpeedKmh + sgn1 * 1 * big);
      clearTimeout(this._keyT);
      this._keyT = setTimeout(() => this._flush({ faceAngleDeg: this.state.faceAngleDeg, swingPathDeg: this.state.swingPathDeg, racketSpeedKmh: this.state.racketSpeedKmh }), 220);
    });
  }

  _reset() {
    if (this.phase !== 'open') return;
    this._gestureStart();
    const e = this.entry;
    this._flush({ faceAngleDeg: e.faceAngleDeg, aimAngleDeg: e.aimAngleDeg, swingPathDeg: e.swingPathDeg, racketSpeedKmh: e.racketSpeedKmh });
  }

  /* ------------------------------------------------------------------ */
  /* Host → component                                                    */
  /* ------------------------------------------------------------------ */

  /** The host recomputed the shot. */
  update({ state, sim, impact }) {
    if (this.phase === 'closed') return;
    // keys the user is dragging stay as the gesture set them until the host catches up
    this.state = { ...state, ...(this._pending || {}) };
    this.sim = sim;
    this.impact = impact;
    this._renderReadouts();
  }

  _renderReadouts() {
    const L = T[this.lang];
    const st = this.state;
    const imp = this.impact || {};
    const fmt = this.opts?.formatSpeed || ((v, d) => `${v.toFixed(d)} km/h`);
    // knobs
    const face = st.faceAngleDeg;
    const faceWord = Math.abs(face) < 1 ? L.square : face > 0 ? L.open : L.closed;
    const aim = st.aimAngleDeg;
    const aimWord = Math.abs(aim) < 0.5 ? L.centre : aim > 0 ? L.left : L.right;
    this._knob('face', `${sgn(face)}°`, `${faceWord} · ${L.aim} ${Math.abs(aim).toFixed(1)}° ${aimWord}`, face, this.ranges.face, `${Math.abs(face).toFixed(1)}° ${faceWord}`);
    const rpm = Math.round(imp.topspinRpm ?? 0);
    const spinWord = Math.abs(rpm) < 250 ? L.flat : rpm > 0 ? L.top : L.back;
    const sb = this._spinBounds();
    this._knob('spin', `${rpm < 0 ? '−' : ''}${Math.abs(rpm).toLocaleString('en-US')} rpm`, `${spinWord} · ${L.viaPath(st.swingPathDeg)}`, rpm, [Math.round(sb.min), Math.round(sb.max)], `${Math.abs(rpm)} rpm ${spinWord}`);
    this._knob('speed', fmt(st.racketSpeedKmh, 0), '', st.racketSpeedKmh, this.ranges.speed, fmt(st.racketSpeedKmh, 0));
    this.el.knobs.face.dataset.lean = Math.abs(face) < 1 ? 'square' : face > 0 ? 'open' : 'closed';
    this.el.knobs.spin.dataset.kind = Math.abs(rpm) < 250 ? 'flat' : rpm > 0 ? 'top' : 'back';

    // result card
    const sim = this.sim;
    if (!sim) return;
    const o = describeShotOutcome(sim);
    this.el.verdict.textContent = L.verdict[o.verdict] || o.verdict;
    this.el.verdict.dataset.verdict = o.verdict;
    this.el.dd.net.textContent = o.netClearanceM === null ? '—' : `${sgn(o.netClearanceM * 100, 0)} cm`;
    const d = o.verdict === 'NET' ? null : o.depthM;
    this.el.dt.depth.textContent = d !== null && d < 0 ? L.depthLong : L.depthIn;
    this.el.dd.depth.textContent = o.verdict === 'NET' ? '—' : d === null ? '> 9 m' : `${Math.abs(d).toFixed(1)} m`;
    this.el.dd.launch.textContent = `${sgn(imp.launchAngleDeg ?? 0)}°`;
    this.el.dd.ball.textContent = fmt(imp.launchSpeedKmh ?? 0, 0);
    this._drawProfile(sim, this.entry?.sim);
    this.el.profCap.textContent = L.before;
  }

  _knob(k, val, sub, now, range, valueText) {
    const n = this.el.knobs[k];
    n.querySelector('.cc-knob-val').textContent = val;
    n.querySelector('.cc-knob-sub').textContent = sub;
    n.setAttribute('aria-valuemin', String(range[0]));
    n.setAttribute('aria-valuemax', String(range[1]));
    n.setAttribute('aria-valuenow', String(Math.round(now * 10) / 10));
    n.setAttribute('aria-valuetext', valueText);
  }

  _drawProfile(sim, ghost) {
    const svg = this.el.prof;
    const ns = 'http://www.w3.org/2000/svg';
    const X0 = -13;
    const farX = Math.max(sim?.firstBounce?.x ?? 0, ghost?.firstBounce?.x ?? 0);
    const X1 = Math.min(22, Math.max(14, farX + 1.5));
    const ex = 2;
    const pts = (r) => (r?.points || []).filter((p) => p.x >= X0 && p.x <= X1);
    const cur = pts(sim);
    const gh = ghost && ghost !== sim ? pts(ghost) : [];
    const zMax = Math.min(5.5, Math.max(2.2, ...cur.map((p) => p.z), ...gh.map((p) => p.z)) + 0.3);
    svg.setAttribute('viewBox', `${X0} ${(-zMax * ex).toFixed(2)} ${X1 - X0} ${(zMax * ex + 0.9).toFixed(2)}`);
    svg.replaceChildren();
    const add = (tag, attrs) => {
      const e = document.createElementNS(ns, tag);
      for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v);
      svg.appendChild(e);
      return e;
    };
    add('rect', { x: -11.885, y: 0, width: 23.77, height: 0.3, class: 'ccp-court' });
    for (const x of [-11.885, 11.885]) add('line', { x1: x, y1: -0.4, x2: x, y2: 0.3, class: 'ccp-base' });
    const netH = sim?.netPassPoint?.netHeightAtY ?? 0.914;
    add('line', { x1: 0, y1: 0.3, x2: 0, y2: -netH * ex, class: 'ccp-net' });
    const line = (arr, cls) => {
      if (arr.length > 1) add('polyline', { points: arr.map((p) => `${p.x.toFixed(2)},${(-p.z * ex).toFixed(3)}`).join(' '), class: cls });
    };
    line(gh, 'ccp-ghost');
    line(cur, 'ccp-path');
    const b = sim?.firstBounce;
    if (b) add('circle', { cx: b.x, cy: 0, r: 0.42, class: `ccp-bounce${b.isIn ? '' : ' is-out'}` });
    if (cur.length) add('circle', { cx: cur[0].x, cy: -cur[0].z * ex, r: 0.45, class: 'ccp-contact' });
  }
}
