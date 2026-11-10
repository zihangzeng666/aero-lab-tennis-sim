/**
 * High-End 3D Tennis Stadium, Dual Articulated Players (Turn-Based Rally A vs B),
 * Articulated IK player rigs, racket model and line-call visualiser
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ITF_COURT, COURT_SURFACES, getNetHeightAtY } from './physics.js?v=23';

// Net profile drawn with singles sticks in place (matches the physics for singles play):
// 0.914 m at the centre rising to 1.07 m at the sticks, then level out to the posts.
function drawnNetHeightAtY(y) {
  const stickY = ITF_COURT.halfSinglesWidth + ITF_COURT.netPostOffset;
  return Math.abs(y) >= stickY ? ITF_COURT.netHeightPost : getNetHeightAtY(y, true);
}

// Rig limb lengths are ~0.88 of the motion-capture player's (thigh 0.42 vs 0.48 m, forearm 0.27 vs 0.29 m)
const MOCAP_BODY_SCALE = 0.88;

export function physToThree(x, y, z) {
  return new THREE.Vector3(x, z, -y);
}

const UP_VEC = new THREE.Vector3(0, 1, 0);

function solveTwoBoneIK(rootPos, targetPos, L1, L2, poleDirWorld) {
  const toTarget = new THREE.Vector3().subVectors(targetPos, rootPos);
  const maxReach = L1 + L2 - 0.005;
  const minReach = Math.abs(L1 - L2) + 0.025;

  let dist = toTarget.length();
  if (dist < 1e-5) {
    toTarget.set(0, -1, 0);
    dist = minReach;
  }

  const dir = toTarget.clone().normalize();
  const clampedDist = THREE.MathUtils.clamp(dist, minReach, maxReach);
  const effectiveTarget = rootPos.clone().addScaledVector(dir, clampedDist);

  const cosAngle = THREE.MathUtils.clamp(
    (L1 * L1 + clampedDist * clampedDist - L2 * L2) / (2 * L1 * clampedDist),
    -1,
    1
  );
  const angle = Math.acos(cosAngle);

  const poleOrtho = poleDirWorld.clone().addScaledVector(dir, -poleDirWorld.dot(dir));
  if (poleOrtho.lengthSq() < 1e-5) {
    poleOrtho.set(1, 0, 0).addScaledVector(dir, -dir.x);
  }
  poleOrtho.normalize();

  const midPos = rootPos
    .clone()
    .addScaledVector(dir, Math.cos(angle) * L1)
    .addScaledVector(poleOrtho, Math.sin(angle) * L1);

  return { midPos, effectiveTarget };
}

function alignBoneMesh(boneGroup, pStart, pEnd) {
  boneGroup.position.copy(pStart);
  const dir = new THREE.Vector3().subVectors(pEnd, pStart);
  if (dir.lengthSq() > 1e-6) {
    dir.normalize();
    boneGroup.quaternion.setFromUnitVectors(UP_VEC, dir);
  }
}

export class TennisScene3D {
  constructor(containerEl) {
    this.container = containerEl;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xe6dfd1);
    this.scene.fog = new THREE.FogExp2(0xe6dfd1, 0.0085);

    const w = containerEl.clientWidth || 960;
    const h = containerEl.clientHeight || 600;

    this.camera = new THREE.PerspectiveCamera(44, w / h, 0.05, 220);
    this.camera.position.set(-18.8, 5.2, 3.8);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    containerEl.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.012;
    this.controls.minDistance = 0.4;
    this.controls.maxDistance = 60;
    this.controls.target.set(-1.5, 0.9, 0.2);

    this.ballVisualScale = 2.0;
    this.showVectors = true;
    this.showGhostNoSpin = true;
    this.soloMode = true;

    this.rigLengths = {
      thigh: 0.42,
      shin: 0.41,
      upperArm: 0.29,
      forearm: 0.27
    };

    this._initSkyAndAtmosphere();
    this._initLights();
    this._initCourt();
    this._initNet();
    this._initPlayersAndRackets();
    this._initBallAndVectors();
    this._initTrajectoryMeshes();
    this._initHawkEyeMarkers();
    this.strokeClips = null;
    this._loadStrokeClips();
    if (this.playerB && this.playerB.root) {
      this.playerB.root.visible = !this.soloMode;
    }

    this._onResize = () => {
      if (!this.container) return;
      const cw = this.container.clientWidth;
      const ch = this.container.clientHeight;
      if (cw === 0 || ch === 0) return;
      const aspect = cw / ch;
      this.camera.aspect = aspect;
      if (cw < 760) {
        this.camera.fov = aspect < 1.0 ? 50 : 44;
        if (!this._mobileCamAdjusted) {
          this._mobileCamAdjusted = true;
          this.camera.position.set(-21.0, 8.2, 2.2);
          this.controls.target.set(-1.8, -0.2, 0);
          this.controls.update();
        }
      } else {
        this.camera.fov = 39;
        this._mobileCamAdjusted = false;
      }
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(cw, ch);
    };
    window.addEventListener('resize', this._onResize);
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(() => this._onResize()).observe(this.container);
    }
    this._onResize();

    this._animateLoop();
  }

  /**
   * Creates a soothing, eye-friendly Golden-Hour Sky Dome with soft cumulus clouds and warm champagne horizon
   * (Replaces the harsh pure-white background)
   */
  _initSkyAndAtmosphere() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Vertical sky gradient: zenith soft cerulean -> mid powder blue -> warm champagne ivory horizon
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 512);
    skyGrad.addColorStop(0.0, '#688fb5');
    skyGrad.addColorStop(0.24, '#8fb0ce');
    skyGrad.addColorStop(0.42, '#bfd1df');
    skyGrad.addColorStop(0.50, '#e8dfd1');
    skyGrad.addColorStop(0.56, '#dfd5c5');
    skyGrad.addColorStop(1.0, '#c8bda8');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 1024, 512);

    // Warm golden-hour sun halo in the upper afternoon sky
    const sunGrad = ctx.createRadialGradient(280, 145, 8, 280, 145, 190);
    sunGrad.addColorStop(0.0, 'rgba(255, 250, 235, 0.85)');
    sunGrad.addColorStop(0.35, 'rgba(253, 238, 205, 0.35)');
    sunGrad.addColorStop(1.0, 'rgba(253, 238, 205, 0.0)');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, 1024, 512);

    // Soft layered cumulus clouds across the mid-sky
    const cloudPuffs = [
      [120, 195, 130, 28],
      [185, 188, 95, 24],
      [390, 205, 155, 26],
      [470, 196, 110, 22],
      [680, 185, 165, 30],
      [760, 192, 120, 25],
      [920, 202, 140, 26]
    ];
    cloudPuffs.forEach(([cx, cy, rx, ry]) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(rx / 50, ry / 50);
      const cg = ctx.createRadialGradient(0, -8, 4, 0, 0, 50);
      cg.addColorStop(0.0, 'rgba(255, 252, 244, 0.52)');
      cg.addColorStop(0.55, 'rgba(247, 241, 229, 0.25)');
      cg.addColorStop(1.0, 'rgba(232, 223, 209, 0.0)');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(0, 0, 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    const skyTex = new THREE.CanvasTexture(canvas);
    skyTex.colorSpace = THREE.SRGBColorSpace;
    const skyGeo = new THREE.SphereGeometry(145, 48, 32);
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false
    });
    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyDome);
  }

  _initLights() {
    const ambient = new THREE.AmbientLight(0xf5efe4, 0.76);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0xdce8f5, 0x5c5346, 0.60);
    this.scene.add(hemi);

    const sunLight = new THREE.DirectionalLight(0xfff6e5, 1.48);
    sunLight.position.set(-10, 24, 14);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 65;
    const d = 19;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0004;
    this.scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xe0ecff, 0.42);
    fillLight.position.set(14, 12, -10);
    this.scene.add(fillLight);
  }

  /**
   * Generates a high-detail procedural court surface texture (Acrylic grain, Clay sweep, or Wimbledon mowed Grass stripes)
   */
  _createCourtTexture(surfaceKey, isInnerCourt) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    if (surfaceKey === 'clay') {
      ctx.fillStyle = isInnerCourt ? '#b8522a' : '#943f1f';
      ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 4200; i++) {
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,220,190,0.06)' : 'rgba(60,20,5,0.06)';
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.025)';
      for (let y = 0; y < 512; y += 6) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
      }
    } else if (surfaceKey === 'grass') {
      const base = isInnerCourt ? '#2d6a3e' : '#235331';
      const stripe = isInnerCourt ? '#357a48' : '#265935';
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, 512, 512);
      if (isInnerCourt) {
        const numStripes = 8;
        const sw = 512 / numStripes;
        ctx.fillStyle = stripe;
        for (let s = 0; s < numStripes; s += 2) {
          ctx.fillRect(s * sw, 0, sw, 512);
        }
      }
      for (let i = 0; i < 3800; i++) {
        ctx.fillStyle = i % 2 === 0 ? 'rgba(220,255,210,0.05)' : 'rgba(10,35,15,0.06)';
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
      }
    } else {
      // Pro Acrylic Hard Court (Two-tone cushioned acrylic with fine silica quartz micro-texture)
      ctx.fillStyle = isInnerCourt ? '#1e4fd6' : '#1e3a5f';
      ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 4000; i++) {
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(10,20,40,0.045)';
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(isInnerCourt ? 2 : 4, isInnerCourt ? 1 : 2);
    tex.needsUpdate = true;
    return tex;
  }

  _initCourt() {
    this.courtGroup = new THREE.Group();
    this.scene.add(this.courtGroup);

    // Outer architectural stadium floor
    const floorGeo = new THREE.PlaneGeometry(120, 90);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x8d9089,
      roughness: 0.95,
      metalness: 0.0
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = -0.014;
    floorMesh.receiveShadow = true;
    this.courtGroup.add(floorMesh);

    // Tournament Run-Off Apron (36.6m x 18.3m surround)
    const surroundGeo = new THREE.PlaneGeometry(38.0, 19.6);
    surroundGeo.rotateX(-Math.PI / 2);
    this.surroundMat = new THREE.MeshStandardMaterial({
      map: this._createCourtTexture('hard', false),
      roughness: 0.80,
      metalness: 0.04
    });
    const surroundMesh = new THREE.Mesh(surroundGeo, this.surroundMat);
    surroundMesh.position.y = -0.005;
    surroundMesh.receiveShadow = true;
    this.courtGroup.add(surroundMesh);

    // Main ITF Playing Surface (23.77m x 10.97m)
    const courtGeo = new THREE.PlaneGeometry(ITF_COURT.length, ITF_COURT.doublesWidth);
    courtGeo.rotateX(-Math.PI / 2);
    this.courtMat = new THREE.MeshStandardMaterial({
      map: this._createCourtTexture('hard', true),
      roughness: 0.68,
      metalness: 0.05
    });
    const courtMesh = new THREE.Mesh(courtGeo, this.courtMat);
    courtMesh.receiveShadow = true;
    this.courtGroup.add(courtMesh);

    // Crisp Anti-Aliased White Court Lines
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    const addLine = (cx, cy, widthX, lengthY) => {
      const g = new THREE.PlaneGeometry(widthX, lengthY);
      g.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(g, lineMat);
      m.position.set(cx, 0.002, -cy);
      this.courtGroup.add(m);
    };

    const L2 = ITF_COURT.halfLength;
    const Wd = ITF_COURT.halfDoublesWidth;
    const Ws = ITF_COURT.halfSinglesWidth;
    const Sv = ITF_COURT.serviceLineDist;
    const lw = ITF_COURT.lineWidth;
    const bw = ITF_COURT.baselineWidth;

    addLine(-L2 + bw / 2, 0, bw, ITF_COURT.doublesWidth);
    addLine(L2 - bw / 2, 0, bw, ITF_COURT.doublesWidth);
    addLine(0, Wd - lw / 2, ITF_COURT.length, lw);
    addLine(0, -Wd + lw / 2, ITF_COURT.length, lw);
    addLine(0, Ws - lw / 2, ITF_COURT.length, lw);
    addLine(0, -Ws + lw / 2, ITF_COURT.length, lw);
    addLine(-Sv + lw / 2, 0, lw, ITF_COURT.singlesWidth);
    addLine(Sv - lw / 2, 0, lw, ITF_COURT.singlesWidth);
    addLine(0, 0, Sv * 2, lw);
    addLine(-L2 + bw + 0.06, 0, 0.12, lw);
    addLine(L2 - bw - 0.06, 0, 0.12, lw);

    // Target Valid Zone Highlight
    const targetGeo = new THREE.PlaneGeometry(1, 1);
    targetGeo.rotateX(-Math.PI / 2);
    this.targetZoneMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.10,
      depthWrite: false
    });
    this.targetZoneMesh = new THREE.Mesh(targetGeo, this.targetZoneMat);
    this.targetZoneMesh.position.y = 0.0015;
    this.courtGroup.add(this.targetZoneMesh);

    // Architectural Low-Profile Stadium Perimeter Barrier Walls & Umpire Chair
    this._initStadiumArchitecture();
  }

  _initStadiumArchitecture() {
    const archGroup = new THREE.Group();
    this.courtGroup.add(archGroup);

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x14213d,
      roughness: 0.55,
      metalness: 0.15
    });
    this.venueWallMat = wallMat;
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.35,
      metalness: 0.1
    });
    const slateMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.55,
      metalness: 0.3
    });

    const wallH = 0.82;
    const wallThick = 0.16;
    const rx = 19.0;
    const rz = 9.8;

    // Backboards (-X and +X)
    const backWallGeo = new THREE.BoxGeometry(wallThick, wallH, rz * 2 + wallThick);
    const backWallLeft = new THREE.Mesh(backWallGeo, wallMat);
    backWallLeft.position.set(-rx, wallH / 2, 0);
    backWallLeft.castShadow = true;
    backWallLeft.receiveShadow = true;

    const backWallRight = new THREE.Mesh(backWallGeo, wallMat);
    backWallRight.position.set(rx, wallH / 2, 0);
    backWallRight.castShadow = true;
    backWallRight.receiveShadow = true;

    // Top white coping rail on backboards
    const railGeo = new THREE.BoxGeometry(wallThick + 0.02, 0.035, rz * 2 + wallThick);
    const railL = new THREE.Mesh(railGeo, trimMat);
    railL.position.set(-rx, wallH + 0.015, 0);
    const railR = new THREE.Mesh(railGeo, trimMat);
    railR.position.set(rx, wallH + 0.015, 0);

    // Side low barriers (-Z and +Z)
    const sideWallGeo = new THREE.BoxGeometry(rx * 2, wallH * 0.72, wallThick);
    const sideWallFar = new THREE.Mesh(sideWallGeo, wallMat);
    sideWallFar.position.set(0, (wallH * 0.72) / 2, -rz);
    sideWallFar.receiveShadow = true;

    const sideWallNear = new THREE.Mesh(sideWallGeo, wallMat);
    sideWallNear.position.set(0, (wallH * 0.72) / 2, rz);
    sideWallNear.receiveShadow = true;

    archGroup.add(backWallLeft, backWallRight, railL, railR, sideWallFar, sideWallNear);

    // Championship Court Perimeter Branding Plaques ("AERO-LAB // MADE BY JASON ZENG")
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 1024;
    signCanvas.height = 128;
    this._signCanvas = signCanvas;
    this._drawVenueSign('#14213d');

    const signTex = new THREE.CanvasTexture(signCanvas);
    this._signTex = signTex;
    signTex.colorSpace = THREE.SRGBColorSpace;
    const signMat = new THREE.MeshBasicMaterial({ map: signTex });
    const backSignGeo = new THREE.PlaneGeometry(9.6, 0.54);

    const signLeft = new THREE.Mesh(backSignGeo, signMat);
    signLeft.position.set(-rx + wallThick / 2 + 0.01, wallH * 0.5, 0);
    signLeft.rotation.y = Math.PI / 2;

    const signRight = new THREE.Mesh(backSignGeo, signMat);
    signRight.position.set(rx - wallThick / 2 - 0.01, wallH * 0.5, 0);
    signRight.rotation.y = -Math.PI / 2;

    const signFar = new THREE.Mesh(new THREE.PlaneGeometry(11.0, 0.44), signMat);
    signFar.position.set(0, wallH * 0.36, -rz + wallThick / 2 + 0.01);

    archGroup.add(signLeft, signRight, signFar);

    // Minimalist Umpire Chair at (0, y, -7.8) (Far side of net post)
    const chairGroup = new THREE.Group();
    chairGroup.position.set(0, 0, -7.65);
    const legGeo = new THREE.CylinderGeometry(0.025, 0.03, 2.15, 10);
    const legOffsets = [
      [-0.38, -0.35],
      [0.38, -0.35],
      [-0.32, 0.35],
      [0.32, 0.35]
    ];
    legOffsets.forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, slateMat);
      leg.position.set(lx, 1.07, lz);
      leg.castShadow = true;
      chairGroup.add(leg);
    });
    const seatMesh = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.06, 0.58), wallMat);
    seatMesh.position.set(0, 2.15, -0.05);
    const backMesh = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.52, 0.06), wallMat);
    backMesh.position.set(0, 2.42, -0.32);
    const canopyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.04, 0.90), trimMat);
    canopyMesh.position.set(0, 2.95, -0.05);
    chairGroup.add(seatMesh, backMesh, canopyMesh);
    archGroup.add(chairGroup);

    // Decorative camera pods on the 4 corners
    const podGeo = new THREE.BoxGeometry(0.28, 0.18, 0.18);
    [
      [-rx + 0.1, wallH + 0.12, -rz + 0.4],
      [-rx + 0.1, wallH + 0.12, rz - 0.4],
      [rx - 0.1, wallH + 0.12, -rz + 0.4],
      [rx - 0.1, wallH + 0.12, rz - 0.4]
    ].forEach(([px, py, pz]) => {
      const pod = new THREE.Mesh(podGeo, trimMat);
      pod.position.set(px, py, pz);
      archGroup.add(pod);
    });

    this._initStands();
    this._applyVenueTheme('hard');
  }

  _drawVenueSign(bgHex) {
    const sctx = this._signCanvas.getContext('2d');
    sctx.fillStyle = bgHex;
    sctx.fillRect(0, 0, 1024, 128);
    sctx.strokeStyle = 'rgba(232, 222, 200, 0.55)';
    sctx.lineWidth = 3;
    sctx.strokeRect(10, 10, 1004, 108);
    sctx.fillStyle = '#f2ece0';
    sctx.font = '600 38px "JetBrains Mono", "Inter", sans-serif';
    sctx.textAlign = 'center';
    sctx.textBaseline = 'middle';
    sctx.fillText('AERO-LAB  ·  MADE BY JASON ZENG', 512, 64);
    if (this._signTex) this._signTex.needsUpdate = true;
  }

  /**
   * Low, tiered spectator stands on all four sides with an instanced seated crowd.
   * Deliberately muted (desaturated colours, no shadows, fog) so the court stays the focus.
   */
  _initStands() {
    const standGroup = new THREE.Group();
    this.standGroup = standGroup;
    this.courtGroup.add(standGroup);

    const ROWS = 9;
    const ROW_DEPTH = 0.8;
    const ROW_RISE = 0.4;
    const BASE_H = 1.15;
    const SEAT_PITCH = 0.62;

    const concreteMat = new THREE.MeshLambertMaterial({ color: 0x9e998f });
    const concreteDarkMat = new THREE.MeshLambertMaterial({ color: 0x938e84 });
    this.standAccentMat = new THREE.MeshLambertMaterial({ color: 0x1f2d47 });
    const trimMat = new THREE.MeshLambertMaterial({ color: 0xcfc9bc });

    // Each stand: front edge position, outward direction and length along the court.
    // Three.js axes: x = along the court, z = across (court y is -z).
    // The near sideline stand is split to leave a camera bay for the "side" view.
    const stands = [
      { axis: 'z', sign: 1, front: 11.2, from: -17.6, to: -4.6 },
      { axis: 'z', sign: 1, front: 11.2, from: 4.6, to: 17.6 },
      { axis: 'z', sign: -1, front: 11.2, from: -17.6, to: 17.6 },
      { axis: 'x', sign: 1, front: 20.5, from: -8.6, to: 8.6 },
      { axis: 'x', sign: -1, front: 20.5, from: -8.6, to: 8.6 }
    ];

    const seatSpots = [];
    stands.forEach((st) => {
      const length = st.to - st.from;
      const mid = (st.from + st.to) / 2;
      const place = (mesh, along, out, y) => {
        if (st.axis === 'z') mesh.position.set(along, y, st.sign * out);
        else {
          mesh.position.set(st.sign * out, y, along);
          mesh.rotation.y = Math.PI / 2;
        }
      };

      // Stepped concrete rows
      for (let i = 0; i < ROWS; i++) {
        const top = BASE_H + i * ROW_RISE;
        const row = new THREE.Mesh(
          new THREE.BoxGeometry(length, top, ROW_DEPTH),
          i % 2 ? concreteDarkMat : concreteMat
        );
        place(row, mid, st.front + (i + 0.5) * ROW_DEPTH, top / 2);
        standGroup.add(row);

        for (let a = st.from + SEAT_PITCH / 2; a < st.to; a += SEAT_PITCH) {
          seatSpots.push({ st, along: a, out: st.front + (i + 0.55) * ROW_DEPTH, y: top, row: i });
        }
      }

      // Dark hoarding along the front of the stand, with a light coping line
      const hoard = new THREE.Mesh(new THREE.BoxGeometry(length, BASE_H + 0.05, 0.08), this.standAccentMat);
      place(hoard, mid, st.front - 0.04, (BASE_H + 0.05) / 2);
      const coping = new THREE.Mesh(new THREE.BoxGeometry(length, 0.04, 0.12), trimMat);
      place(coping, mid, st.front - 0.04, BASE_H + 0.07);

      // Back wall / fascia closing the top of the stand
      const backTop = BASE_H + ROWS * ROW_RISE + 0.8;
      const back = new THREE.Mesh(new THREE.BoxGeometry(length, backTop, 0.25), this.standAccentMat);
      place(back, mid, st.front + ROWS * ROW_DEPTH + 0.12, backTop / 2);
      const backTrim = new THREE.Mesh(new THREE.BoxGeometry(length, 0.06, 0.3), trimMat);
      place(backTrim, mid, st.front + ROWS * ROW_DEPTH + 0.12, backTop + 0.03);
      standGroup.add(hoard, coping, back, backTrim);
    });

    // Deterministic pseudo-random so the crowd looks the same on every load
    let seed = 1337;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const crowdPalette = [
      0xe9e5dc, 0xd8d0c0, 0xc9bda8, 0xf1eee7, 0x3b4656, 0x56616e, 0x8a96a3, 0xa9b4bd,
      0x7b8a74, 0x9c8c78, 0xb7776b, 0xd8bf98, 0x2f3944, 0x6e6259, 0xc3cfd6, 0x8f7f9a
    ];
    const skinPalette = [0xe7c3a1, 0xd8a982, 0xc28e6a, 0x9c6b4c, 0xf0d2b6, 0x7b5139];

    const spots = seatSpots;
    const occupied = spots.filter(() => rand() < 0.72);

    const seatGeo = new THREE.BoxGeometry(0.46, 0.12, 0.42);
    this.seatMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const seats = new THREE.InstancedMesh(seatGeo, this.seatMat, spots.length);
    const bodyGeo = new THREE.BoxGeometry(0.42, 0.52, 0.28);
    bodyGeo.translate(0, 0.26, 0);
    const bodies = new THREE.InstancedMesh(bodyGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), occupied.length);
    const headGeo = new THREE.SphereGeometry(0.105, 10, 8);
    const heads = new THREE.InstancedMesh(headGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), occupied.length);

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const v = new THREE.Vector3();
    const sc = new THREE.Vector3();
    const col = new THREE.Color();
    const stone = new THREE.Color(0x8c877d);
    const toWorld = (p, along, out) =>
      p.st.axis === 'z' ? v.set(along, 0, p.st.sign * out) : v.set(p.st.sign * out, 0, along);
    const yaw = (p) => (p.st.axis === 'z' ? 0 : Math.PI / 2);

    spots.forEach((p, i) => {
      toWorld(p, p.along, p.out);
      v.y = p.y + 0.06;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw(p));
      m.compose(v, q, sc.set(1, 1, 1));
      seats.setMatrixAt(i, m);
    });
    this._seatCount = spots.length;
    this.seatInstances = seats;

    occupied.forEach((p, i) => {
      const jitter = (rand() - 0.5) * 0.12;
      const lean = (rand() - 0.5) * 0.08;
      const s = 0.9 + rand() * 0.2;
      toWorld(p, p.along + jitter, p.out + lean);
      v.y = p.y + 0.12;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw(p) + (rand() - 0.5) * 0.3);
      m.compose(v, q, sc.set(s, s * (0.92 + rand() * 0.16), s));
      bodies.setMatrixAt(i, m);
      bodies.setColorAt(i, col.setHex(crowdPalette[Math.floor(rand() * crowdPalette.length)]).lerp(stone, 0.6));

      v.y = p.y + 0.12 + 0.52 * s * 1.0 + 0.11 * s;
      m.compose(v, q, sc.set(s, s, s));
      heads.setMatrixAt(i, m);
      heads.setColorAt(i, col.setHex(skinPalette[Math.floor(rand() * skinPalette.length)]).lerp(stone, 0.45));
    });

    [seats, bodies, heads].forEach((im) => {
      im.castShadow = false;
      im.receiveShadow = false;
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      standGroup.add(im);
    });
  }

  /** Re-tints walls, hoardings, seats and signs to suit the court surface. */
  _applyVenueTheme(surfaceKey) {
    const themes = {
      hard: { wall: 0x14213d, accent: 0x1f2d47, seat: 0x2c4a73, sign: '#14213d' },
      clay: { wall: 0x1d3a2e, accent: 0x22402f, seat: 0x2f5a44, sign: '#1d3a2e' },
      grass: { wall: 0x1f3a2b, accent: 0x243f2f, seat: 0x3e5b3f, sign: '#1f3a2b' }
    };
    const t = themes[surfaceKey] || themes.hard;
    if (this.venueWallMat) this.venueWallMat.color.setHex(t.wall);
    if (this.standAccentMat) this.standAccentMat.color.setHex(t.accent);
    if (this.seatInstances) {
      const c = new THREE.Color();
      for (let i = 0; i < this._seatCount; i++) {
        // slight per-seat variation keeps the empty seats from looking flat
        const k = 0.9 + ((i * 7919) % 17) / 170;
        this.seatInstances.setColorAt(i, c.setHex(t.seat).multiplyScalar(k));
      }
      this.seatInstances.instanceColor.needsUpdate = true;
    }
    if (this._signCanvas) this._drawVenueSign(t.sign);
  }

  _initNet() {
    this.netGroup = new THREE.Group();
    this.scene.add(this.netGroup);

    const postY = ITF_COURT.halfDoublesWidth + ITF_COURT.netPostOffset;
    const postRadius = 0.042;
    const postGeo = new THREE.CylinderGeometry(postRadius, postRadius, ITF_COURT.netHeightPost, 20);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.65, roughness: 0.25 });

    const leftPost = new THREE.Mesh(postGeo, postMat);
    leftPost.position.set(0, ITF_COURT.netHeightPost / 2, -postY);
    leftPost.castShadow = true;
    this.netGroup.add(leftPost);

    const rightPost = new THREE.Mesh(postGeo, postMat);
    rightPost.position.set(0, ITF_COURT.netHeightPost / 2, postY);
    rightPost.castShadow = true;
    this.netGroup.add(rightPost);

    const stickY = ITF_COURT.halfSinglesWidth + ITF_COURT.netPostOffset;
    const stickH = drawnNetHeightAtY(stickY);
    const stickGeo = new THREE.CylinderGeometry(0.018, 0.018, stickH, 12);
    const stickMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.3 });
    const leftStick = new THREE.Mesh(stickGeo, stickMat);
    leftStick.position.set(0, stickH / 2, -stickY);
    this.netGroup.add(leftStick);
    const rightStick = new THREE.Mesh(stickGeo, stickMat);
    rightStick.position.set(0, stickH / 2, stickY);
    this.netGroup.add(rightStick);

    const strapGeo = new THREE.BoxGeometry(0.022, ITF_COURT.netHeightCenter, 0.052);
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
    const centerStrap = new THREE.Mesh(strapGeo, whiteMat);
    centerStrap.position.set(0, ITF_COURT.netHeightCenter / 2, 0);
    this.netGroup.add(centerStrap);

    const segments = 52;
    const netGeo = new THREE.BufferGeometry();
    const positions = [];
    const indices = [];

    for (let i = 0; i <= segments; i++) {
      const frac = i / segments;
      const y = -postY + frac * (2 * postY);
      const h = drawnNetHeightAtY(y);
      positions.push(0, 0, -y);
      positions.push(0, h - 0.052, -y);
    }

    for (let i = 0; i < segments; i++) {
      const b0 = 2 * i;
      const t0 = 2 * i + 1;
      const b1 = 2 * (i + 1);
      const t1 = 2 * (i + 1) + 1;
      indices.push(b0, t0, b1, t0, t1, b1);
    }

    netGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    netGeo.setIndex(indices);
    netGeo.computeVertexNormals();

    const netMeshMat = new THREE.MeshBasicMaterial({
      color: 0x09090b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.56
    });
    this.netGroup.add(new THREE.Mesh(netGeo, netMeshMat));

    const wireMat = new THREE.LineBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.42 });
    const wirePoints = [];
    for (let i = 0; i <= segments; i++) {
      const y = -postY + (i / segments) * (2 * postY);
      const h = drawnNetHeightAtY(y) - 0.052;
      wirePoints.push(new THREE.Vector3(0, 0, -y), new THREE.Vector3(0, h, -y));
    }
    for (let r = 1; r <= 7; r++) {
      const rFrac = r / 8;
      for (let i = 0; i < segments; i++) {
        const y0 = -postY + (i / segments) * (2 * postY);
        const y1 = -postY + ((i + 1) / segments) * (2 * postY);
        const h0 = (drawnNetHeightAtY(y0) - 0.052) * rFrac;
        const h1 = (drawnNetHeightAtY(y1) - 0.052) * rFrac;
        wirePoints.push(new THREE.Vector3(0, h0, -y0), new THREE.Vector3(0, h1, -y1));
      }
    }
    const wireGeo = new THREE.BufferGeometry().setFromPoints(wirePoints);
    this.netGroup.add(new THREE.LineSegments(wireGeo, wireMat));

    const tapeGeo = new THREE.BufferGeometry();
    const tapePos = [];
    const tapeIdx = [];
    for (let i = 0; i <= segments; i++) {
      const y = -postY + (i / segments) * (2 * postY);
      const h = drawnNetHeightAtY(y);
      tapePos.push(0, h - 0.058, -y);
      tapePos.push(0, h, -y);
    }
    for (let i = 0; i < segments; i++) {
      const b0 = 2 * i;
      const t0 = 2 * i + 1;
      const b1 = 2 * (i + 1);
      const t1 = 2 * (i + 1) + 1;
      tapeIdx.push(b0, t0, b1, t0, t1, b1);
    }
    tapeGeo.setAttribute('position', new THREE.Float32BufferAttribute(tapePos, 3));
    tapeGeo.setIndex(tapeIdx);
    tapeGeo.computeVertexNormals();
    const tapeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    this.netGroup.add(new THREE.Mesh(tapeGeo, tapeMat));
  }

  _createStringbedTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 512, 512);

    const grad = ctx.createRadialGradient(256, 256, 12, 256, 256, 175);
    grad.addColorStop(0, 'rgba(217, 249, 38, 0.22)');
    grad.addColorStop(0.55, 'rgba(56, 189, 248, 0.06)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(256, 256, 230, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(241, 245, 249, 0.72)';
    ctx.lineWidth = 3.2;
    for (let i = 1; i <= 16; i++) {
      const x = 32 + (i / 17) * 448;
      ctx.beginPath();
      ctx.moveTo(x, 16);
      ctx.lineTo(x, 496);
      ctx.stroke();
    }
    for (let j = 1; j <= 19; j++) {
      const y = 24 + (j / 20) * 464;
      ctx.beginPath();
      ctx.moveTo(16, y);
      ctx.lineTo(496, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(244, 63, 94, 0.85)';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(175, 195);
    ctx.lineTo(337, 195);
    ctx.moveTo(256, 195);
    ctx.lineTo(256, 345);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  /**
   * Factory that builds a complete articulated 3D tennis player rig + Pro Tour racket.
   * Instantiated twice: `this.playerA` (Near Baseline -X) and `this.playerB` (Far Baseline +X, rotated 180°).
   */
  _createSinglePlayerRig({
    jerseyHex = 0x0284c7,
    shortsHex = 0x0f172a,
    capHex = 0x0f172a,
    bandHex = 0xe11d48,
    frameHex = 0xe11d48,
    sideSign = 1
  }) {
    const rig = { sideSign };
    rig.root = new THREE.Group();
    if (sideSign === -1) {
      rig.root.rotation.y = Math.PI;
    }
    this.scene.add(rig.root);

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c292, roughness: 0.45, metalness: 0.02 });
    const jerseyMat = new THREE.MeshStandardMaterial({ color: jerseyHex, roughness: 0.52, metalness: 0.05 });
    const collarMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    const shortsMat = new THREE.MeshStandardMaterial({ color: shortsHex, roughness: 0.65 });
    const sockMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.65 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
    const soleMat = new THREE.MeshStandardMaterial({ color: 0x84cc16, roughness: 0.5 });
    const capMat = new THREE.MeshStandardMaterial({ color: capHex, roughness: 0.45 });
    const sweatbandMat = new THREE.MeshStandardMaterial({ color: bandHex, roughness: 0.5 });

    const L = this.rigLengths;

    const createBone = (len, rStart, rEnd, mat, jointMat = mat) => {
      const grp = new THREE.Group();
      const geo = new THREE.CylinderGeometry(rEnd, rStart, len, 18);
      geo.translate(0, len / 2, 0);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      grp.add(mesh);

      const jSphere = new THREE.Mesh(new THREE.SphereGeometry(rStart * 0.98, 16, 16), jointMat);
      jSphere.castShadow = true;
      grp.add(jSphere);

      rig.root.add(grp);
      return grp;
    };

    // 1. Pelvis
    rig.pelvisGroup = new THREE.Group();
    rig.root.add(rig.pelvisGroup);

    const pelvisGeo = new THREE.CylinderGeometry(0.132, 0.136, 0.15, 20);
    pelvisGeo.scale(0.70, 1.0, 1.05);
    const pelvisMesh = new THREE.Mesh(pelvisGeo, shortsMat);
    pelvisMesh.position.set(0, 0.03, 0);
    pelvisMesh.castShadow = true;
    rig.pelvisGroup.add(pelvisMesh);

    const crotchGeo = new THREE.SphereGeometry(0.128, 16, 14);
    crotchGeo.scale(0.68, 0.55, 1.02);
    const crotchMesh = new THREE.Mesh(crotchGeo, shortsMat);
    crotchMesh.position.set(0, -0.03, 0);
    rig.pelvisGroup.add(crotchMesh);

    rig.leftHipLocal = new THREE.Vector3(0, -0.04, -0.105);
    rig.rightHipLocal = new THREE.Vector3(0, -0.04, 0.105);

    // 2. Spine & Chest
    rig.spinePivot = new THREE.Group();
    rig.spinePivot.position.set(0, 0.09, 0);
    rig.pelvisGroup.add(rig.spinePivot);

    const waistGeo = new THREE.CylinderGeometry(0.145, 0.130, 0.22, 20);
    waistGeo.scale(0.68, 1.0, 1.04);
    const waistMesh = new THREE.Mesh(waistGeo, jerseyMat);
    waistMesh.position.set(0, 0.10, 0);
    waistMesh.castShadow = true;
    rig.spinePivot.add(waistMesh);

    rig.chestPivot = new THREE.Group();
    rig.chestPivot.position.set(0, 0.20, 0);
    rig.spinePivot.add(rig.chestPivot);

    const chestGeo = new THREE.CylinderGeometry(0.175, 0.145, 0.28, 22);
    chestGeo.scale(0.66, 1.0, 1.08);
    const chestMesh = new THREE.Mesh(chestGeo, jerseyMat);
    chestMesh.position.set(0, 0.14, 0);
    chestMesh.castShadow = true;
    rig.chestPivot.add(chestMesh);

    const topChestGeo = new THREE.SphereGeometry(0.172, 20, 16);
    topChestGeo.scale(0.65, 0.36, 1.08);
    const topChestMesh = new THREE.Mesh(topChestGeo, jerseyMat);
    topChestMesh.position.set(0, 0.275, 0);
    rig.chestPivot.add(topChestMesh);

    const vneckGeo = new THREE.CylinderGeometry(0.068, 0.062, 0.04, 16);
    vneckGeo.scale(0.85, 1.0, 1.0);
    const vneckMesh = new THREE.Mesh(vneckGeo, collarMat);
    vneckMesh.position.set(0.01, 0.315, 0);
    rig.chestPivot.add(vneckMesh);

    rig.leftShoulderLocal = new THREE.Vector3(0, 0.25, -0.195);
    rig.rightShoulderLocal = new THREE.Vector3(0, 0.25, 0.195);

    // 3. Neck & Head
    rig.neckPivot = new THREE.Group();
    rig.neckPivot.position.set(0, 0.315, 0);
    rig.chestPivot.add(rig.neckPivot);

    const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.054, 0.085, 16), skinMat);
    neckMesh.position.set(0, 0.035, 0);
    rig.neckPivot.add(neckMesh);

    rig.headGroup = new THREE.Group();
    rig.headGroup.position.set(0, 0.14, 0);
    rig.neckPivot.add(rig.headGroup);

    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.108, 24, 24), skinMat);
    headMesh.scale.set(1.06, 1.14, 0.96);
    headMesh.castShadow = true;
    rig.headGroup.add(headMesh);

    const earGeo = new THREE.SphereGeometry(0.024, 12, 12);
    earGeo.scale(0.55, 1.1, 0.45);
    const leftEar = new THREE.Mesh(earGeo, skinMat);
    leftEar.position.set(-0.005, 0.0, -0.104);
    const rightEar = new THREE.Mesh(earGeo, skinMat);
    rightEar.position.set(-0.005, 0.0, 0.104);
    rig.headGroup.add(leftEar, rightEar);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.013, 12, 12), eyeMat);
    leftEye.position.set(0.102, 0.018, -0.036);
    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.013, 12, 12), eyeMat);
    rightEye.position.set(0.102, 0.018, 0.036);

    const noseGeo = new THREE.ConeGeometry(0.015, 0.038, 12);
    noseGeo.rotateZ(-Math.PI / 2);
    const noseMesh = new THREE.Mesh(noseGeo, skinMat);
    noseMesh.position.set(0.118, -0.004, 0);
    rig.headGroup.add(leftEye, rightEye, noseMesh);

    const capCrownGeo = new THREE.SphereGeometry(0.112, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.52);
    capCrownGeo.scale(1.06, 1.08, 0.97);
    const capCrown = new THREE.Mesh(capCrownGeo, capMat);
    capCrown.position.set(0, 0.022, 0);
    capCrown.castShadow = true;
    rig.headGroup.add(capCrown);

    const bandGeo = new THREE.CylinderGeometry(0.111, 0.111, 0.026, 24);
    bandGeo.scale(1.06, 1.0, 0.97);
    const bandMesh = new THREE.Mesh(bandGeo, sweatbandMat);
    bandMesh.position.set(0, 0.036, 0);
    rig.headGroup.add(bandMesh);

    const brimGeo = new THREE.CylinderGeometry(0.108, 0.108, 0.010, 20, 1, false, 0, Math.PI);
    brimGeo.scale(1.35, 1.0, 0.92);
    const brimMesh = new THREE.Mesh(brimGeo, capMat);
    brimMesh.position.set(0.045, 0.038, 0);
    brimMesh.rotation.z = -0.10;
    brimMesh.castShadow = true;
    rig.headGroup.add(brimMesh);

    // 4. Limbs
    rig.leftThighBone = createBone(L.thigh, 0.072, 0.055, skinMat, shortsMat);
    rig.rightThighBone = createBone(L.thigh, 0.072, 0.055, skinMat, shortsMat);

    const addShortsLeg = (thighBone) => {
      const sGeo = new THREE.CylinderGeometry(0.082, 0.088, 0.22, 18);
      sGeo.translate(0, 0.105, 0);
      const sMesh = new THREE.Mesh(sGeo, shortsMat);
      sMesh.castShadow = true;
      thighBone.add(sMesh);
    };
    addShortsLeg(rig.leftThighBone);
    addShortsLeg(rig.rightThighBone);

    rig.leftShinBone = createBone(L.shin, 0.054, 0.040, skinMat, skinMat);
    rig.rightShinBone = createBone(L.shin, 0.054, 0.040, skinMat, skinMat);

    const addCrewSock = (shinBone) => {
      const sockGeo = new THREE.CylinderGeometry(0.043, 0.048, 0.16, 16);
      sockGeo.translate(0, L.shin - 0.08, 0);
      const sockMesh = new THREE.Mesh(sockGeo, sockMat);
      shinBone.add(sockMesh);
    };
    addCrewSock(rig.leftShinBone);
    addCrewSock(rig.rightShinBone);

    const createTennisShoe = () => {
      const sg = new THREE.Group();
      const heelCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.048, 0.045, 14), shoeMat);
      heelCollar.position.set(0, -0.015, 0);
      const upperGeo = new THREE.CapsuleGeometry(0.044, 0.13, 10, 16);
      upperGeo.rotateZ(Math.PI / 2);
      const upperMesh = new THREE.Mesh(upperGeo, shoeMat);
      upperMesh.scale.set(1.0, 0.82, 1.05);
      upperMesh.position.set(0.05, -0.032, 0);
      upperMesh.castShadow = true;

      const soleGeo = new THREE.BoxGeometry(0.23, 0.020, 0.098);
      const soleMesh = new THREE.Mesh(soleGeo, soleMat);
      soleMesh.position.set(0.048, -0.062, 0);
      sg.add(heelCollar, upperMesh, soleMesh);
      rig.root.add(sg);
      return sg;
    };
    rig.leftShoeGroup = createTennisShoe();
    rig.rightShoeGroup = createTennisShoe();

    rig.leftUpperArmBone = createBone(L.upperArm, 0.048, 0.040, skinMat, jerseyMat);
    rig.rightUpperArmBone = createBone(L.upperArm, 0.049, 0.041, skinMat, jerseyMat);

    const addSleeve = (armBone) => {
      const slvGeo = new THREE.CylinderGeometry(0.054, 0.060, 0.13, 16);
      slvGeo.translate(0, 0.06, 0);
      const slvMesh = new THREE.Mesh(slvGeo, jerseyMat);
      slvMesh.castShadow = true;
      armBone.add(slvMesh);
    };
    addSleeve(rig.leftUpperArmBone);
    addSleeve(rig.rightUpperArmBone);

    rig.leftForearmBone = createBone(L.forearm, 0.040, 0.032, skinMat, skinMat);
    rig.rightForearmBone = createBone(L.forearm, 0.041, 0.033, skinMat, skinMat);

    const addWristAndHand = (forearmBone, isRight) => {
      const wbGeo = new THREE.CylinderGeometry(0.038, 0.040, 0.052, 16);
      wbGeo.translate(0, L.forearm - 0.04, 0);
      const wbMesh = new THREE.Mesh(wbGeo, isRight ? sweatbandMat : sockMat);
      forearmBone.add(wbMesh);

      const palm = new THREE.Mesh(new THREE.SphereGeometry(0.040, 14, 14), skinMat);
      palm.scale.set(1.15, 1.25, 0.92);
      palm.position.set(0, L.forearm + 0.018, 0);
      forearmBone.add(palm);
    };
    addWristAndHand(rig.leftForearmBone, false);
    addWristAndHand(rig.rightForearmBone, true);

    // 5. Contact Pivot & Pro Tour 3D Tennis Racket
    rig.contactPivot = new THREE.Group();
    rig.root.add(rig.contactPivot);

    rig.swingTrailGroup = new THREE.Group();
    rig.contactPivot.add(rig.swingTrailGroup);

    rig.impactPlaneIndicator = new THREE.Group();
    const ghostRingGeo = new THREE.RingGeometry(0.125, 0.14, 32);
    ghostRingGeo.rotateY(Math.PI / 2);
    ghostRingGeo.scale(1.0, 0.98, 1.25);
    const ghostRingMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25
    });
    rig.impactPlaneIndicator.add(new THREE.Mesh(ghostRingGeo, ghostRingMat));
    rig.contactPivot.add(rig.impactPlaneIndicator);

    const impactRingGeo = new THREE.RingGeometry(0.05, 0.15, 28);
    impactRingGeo.rotateY(Math.PI / 2);
    rig.impactFlashMat = new THREE.MeshBasicMaterial({
      color: 0xd9f926,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0
    });
    rig.impactFlashRing = new THREE.Mesh(impactRingGeo, rig.impactFlashMat);
    rig.contactPivot.add(rig.impactFlashRing);

    rig.racketGroup = new THREE.Group();
    rig.contactPivot.add(rig.racketGroup);

    const frameCrimsonMat = new THREE.MeshStandardMaterial({ color: frameHex, metalness: 0.6, roughness: 0.22 });
    const carbonMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.5, roughness: 0.3 });
    const pwsSilverMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.7, roughness: 0.2 });
    const gripMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 });

    const hoopGroup = new THREE.Group();
    hoopGroup.rotation.y = Math.PI / 2;
    hoopGroup.scale.set(1.26, 0.98, 1.0);

    const hoopGeo = new THREE.TorusGeometry(0.135, 0.0115, 16, 44);
    const hoopMesh = new THREE.Mesh(hoopGeo, frameCrimsonMat);
    hoopMesh.castShadow = true;
    hoopGroup.add(hoopMesh);

    const bumperGeo = new THREE.TorusGeometry(0.138, 0.009, 12, 24, Math.PI * 0.65);
    bumperGeo.rotateZ(-Math.PI * 0.325);
    const bumperMesh = new THREE.Mesh(bumperGeo, carbonMat);
    hoopGroup.add(bumperMesh);

    const pwsGeo = new THREE.CapsuleGeometry(0.013, 0.045, 8, 12);
    const pwsTop = new THREE.Mesh(pwsGeo, pwsSilverMat);
    pwsTop.position.set(0, 0.134, 0);
    pwsTop.rotation.z = Math.PI / 2;
    const pwsBot = new THREE.Mesh(pwsGeo, pwsSilverMat);
    pwsBot.position.set(0, -0.134, 0);
    pwsBot.rotation.z = Math.PI / 2;
    hoopGroup.add(pwsTop, pwsBot);

    const stringDiscGeo = new THREE.CircleGeometry(0.132, 36);
    const stringDiscMat = new THREE.MeshBasicMaterial({
      map: this._stringbedTex,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    hoopGroup.add(new THREE.Mesh(stringDiscGeo, stringDiscMat));

    const dampGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.008, 16);
    dampGeo.rotateX(Math.PI / 2);
    const dampMesh = new THREE.Mesh(dampGeo, sweatbandMat);
    dampMesh.position.set(-0.102, 0, 0);
    hoopGroup.add(dampMesh);

    rig.racketGroup.add(hoopGroup);

    const shaftGeo = new THREE.CylinderGeometry(0.0085, 0.010, 0.15, 12);
    shaftGeo.rotateX(Math.PI / 2);
    const topShaft = new THREE.Mesh(shaftGeo, carbonMat);
    topShaft.position.set(0, 0.032, -0.225);
    topShaft.rotation.x = -0.22;
    const botShaft = new THREE.Mesh(shaftGeo, carbonMat);
    botShaft.position.set(0, -0.032, -0.225);
    botShaft.rotation.x = 0.22;
    rig.racketGroup.add(topShaft, botShaft);

    const handleGeo = new THREE.CylinderGeometry(0.016, 0.0175, 0.20, 8);
    handleGeo.rotateX(Math.PI / 2);
    const handleMesh = new THREE.Mesh(handleGeo, gripMat);
    handleMesh.position.set(0, 0, -0.39);
    rig.racketGroup.add(handleMesh);

    for (let gz = -0.31; gz >= -0.47; gz -= 0.025) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0168, 0.0012, 6, 12), carbonMat);
      ring.position.set(0, 0, gz);
      rig.racketGroup.add(ring);
    }

    const buttCapGeo = new THREE.CylinderGeometry(0.020, 0.019, 0.018, 8);
    buttCapGeo.rotateX(Math.PI / 2);
    const buttCap = new THREE.Mesh(buttCapGeo, carbonMat);
    buttCap.position.set(0, 0, -0.49);
    rig.racketGroup.add(buttCap);

    rig.gripPointLocal = new THREE.Vector3(0, 0, -0.40);
    rig.throatPointLocal = new THREE.Vector3(0, 0.02, -0.23);

    rig.faceNormalArrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 0),
      0.36,
      0xfbbf24,
      0.08,
      0.045
    );
    rig.racketGroup.add(rig.faceNormalArrow);

    const dropGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -1, 0)
    ]);
    const dropMat = new THREE.LineDashedMaterial({ color: 0x64748b, dashSize: 0.08, gapSize: 0.06 });
    rig.contactDropLine = new THREE.Line(dropGeo, dropMat);
    rig.root.add(rig.contactDropLine);

    const ringGeo = new THREE.RingGeometry(0.08, 0.13, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, side: THREE.DoubleSide });
    rig.contactFloorRing = new THREE.Mesh(ringGeo, ringMat);
    rig.contactFloorRing.position.y = 0.004;
    rig.root.add(rig.contactFloorRing);

    return rig;
  }

  _initPlayersAndRackets() {
    this._stringbedTex = this._createStringbedTexture();

    // Player A (Near Baseline -X, Cobalt Blue / Slate Navy Kit)
    this.playerA = this._createSinglePlayerRig({
      jerseyHex: 0x0284c7,
      shortsHex: 0x0f172a,
      capHex: 0x0f172a,
      bandHex: 0xe11d48,
      frameHex: 0xe11d48,
      sideSign: 1
    });

    // Player B (Far Baseline +X, Tour Crimson / Dark Charcoal Kit, rotated 180 deg facing -X)
    this.playerB = this._createSinglePlayerRig({
      jerseyHex: 0xe11d48,
      shortsHex: 0x18181b,
      capHex: 0x18181b,
      bandHex: 0xf8fafc,
      frameHex: 0x0284c7,
      sideSign: -1
    });
  }

  _initBallAndVectors() {
    this.ballGroup = new THREE.Group();
    this.scene.add(this.ballGroup);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#d9f926';
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 18;
    ctx.beginPath();
    for (let px = 0; px <= 512; px += 4) {
      const u = (px / 512) * Math.PI * 2;
      const py = 128 + Math.sin(u * 2) * 72;
      if (px === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    const ballTex = new THREE.CanvasTexture(canvas);
    const ballGeo = new THREE.SphereGeometry(ITF_COURT.ballRadius, 28, 28);
    const ballMat = new THREE.MeshStandardMaterial({
      map: ballTex,
      roughness: 0.6,
      emissive: 0x4d7c0f,
      emissiveIntensity: 0.18
    });
    this.ballMesh = new THREE.Mesh(ballGeo, ballMat);
    this.ballMesh.castShadow = true;
    this.ballMesh.scale.setScalar(this.ballVisualScale);
    this.ballGroup.add(this.ballMesh);

    const shadowGeo = new THREE.CircleGeometry(0.11, 24);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.42
    });
    this.ballGroundShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.ballGroundShadow.position.y = 0.004;
    this.scene.add(this.ballGroundShadow);

    const ballDropGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 1, 0)
    ]);
    const ballDropMat = new THREE.LineBasicMaterial({
      color: 0x65a30d,
      transparent: true,
      opacity: 0.35
    });
    this.ballHeightLine = new THREE.Line(ballDropGeo, ballDropMat);
    this.scene.add(this.ballHeightLine);

    this.velArrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 0),
      1.2,
      0x0284c7,
      0.18,
      0.10
    );
    this.magnusArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 0, 0),
      0.9,
      0xe11d48,
      0.16,
      0.09
    );
    this.ballGroup.add(this.velArrow);
    this.ballGroup.add(this.magnusArrow);
  }

  _initTrajectoryMeshes() {
    this.trajGroup = new THREE.Group();
    this.scene.add(this.trajGroup);
  }

  _initHawkEyeMarkers() {
    this.markersGroup = new THREE.Group();
    this.scene.add(this.markersGroup);

    const spotGeo = new THREE.CircleGeometry(0.065, 32);
    spotGeo.rotateX(-Math.PI / 2);
    this.bounceSpotMat = new THREE.MeshBasicMaterial({ color: 0x16a34a });
    this.bounceSpotMesh = new THREE.Mesh(spotGeo, this.bounceSpotMat);
    this.bounceSpotMesh.position.y = 0.005;
    this.markersGroup.add(this.bounceSpotMesh);

    const ringGeo = new THREE.RingGeometry(0.11, 0.16, 36);
    ringGeo.rotateX(-Math.PI / 2);
    this.bounceRingMat = new THREE.MeshBasicMaterial({
      color: 0x16a34a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    this.bounceRingMesh = new THREE.Mesh(ringGeo, this.bounceRingMat);
    this.bounceRingMesh.position.y = 0.005;
    this.markersGroup.add(this.bounceRingMesh);

    // Receiver Strike-Zone Target Ring (shows where opponent intercepts the ball on the next turn!)
    const interceptRingGeo = new THREE.RingGeometry(0.16, 0.22, 32);
    interceptRingGeo.rotateX(-Math.PI / 2);
    this.interceptRingMat = new THREE.MeshBasicMaterial({
      color: 0xea580c,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.72
    });
    this.interceptRingMesh = new THREE.Mesh(interceptRingGeo, this.interceptRingMat);
    this.interceptRingMesh.position.y = 0.005;
    this.markersGroup.add(this.interceptRingMesh);

    const netGaugeGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 1, 0)
    ]);
    this.netGaugeMat = new THREE.LineBasicMaterial({ color: 0x0284c7, linewidth: 2 });
    this.netGaugeLine = new THREE.Line(netGaugeGeo, this.netGaugeMat);
    this.markersGroup.add(this.netGaugeLine);

    // 3D Tactical Masterclass Target Zone Overlay (Gold Bullseye + Tactical Box)
    this.tacticalZoneGroup = new THREE.Group();
    this.tacticalZoneGroup.visible = false;
    this.scene.add(this.tacticalZoneGroup);

    const tacPlaneGeo = new THREE.PlaneGeometry(1, 1);
    tacPlaneGeo.rotateX(-Math.PI / 2);
    this.tacBoxMat = new THREE.MeshBasicMaterial({
      color: 0xd97706,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.tacBoxMesh = new THREE.Mesh(tacPlaneGeo, this.tacBoxMat);
    this.tacBoxMesh.position.y = 0.006;
    this.tacticalZoneGroup.add(this.tacBoxMesh);

    const tacBorderPts = [
      new THREE.Vector3(-0.5, 0, -0.5),
      new THREE.Vector3(0.5, 0, -0.5),
      new THREE.Vector3(0.5, 0, 0.5),
      new THREE.Vector3(-0.5, 0, 0.5),
      new THREE.Vector3(-0.5, 0, -0.5)
    ];
    const tacBorderGeo = new THREE.BufferGeometry().setFromPoints(tacBorderPts);
    this.tacBorderMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 2 });
    this.tacBorderLine = new THREE.Line(tacBorderGeo, this.tacBorderMat);
    this.tacBorderLine.position.y = 0.008;
    this.tacticalZoneGroup.add(this.tacBorderLine);

    const bullOuterGeo = new THREE.RingGeometry(0.42, 0.52, 36);
    bullOuterGeo.rotateX(-Math.PI / 2);
    this.bullOuterMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    this.bullOuterMesh = new THREE.Mesh(bullOuterGeo, this.bullOuterMat);
    this.bullOuterMesh.position.y = 0.008;
    this.tacticalZoneGroup.add(this.bullOuterMesh);

    const bullInnerGeo = new THREE.CircleGeometry(0.18, 28);
    bullInnerGeo.rotateX(-Math.PI / 2);
    this.bullInnerMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide
    });
    this.bullInnerMesh = new THREE.Mesh(bullInnerGeo, this.bullInnerMat);
    this.bullInnerMesh.position.y = 0.009;
    this.tacticalZoneGroup.add(this.bullInnerMesh);
  }

  /**
   * Renders the 3D Tactical Target Zone & Bullseye on the court when a Tactical Lesson is active.
   */
  updateTacticalOverlay(lesson, currentTurnIndex = 0, passed = false) {
    if (!this.tacticalZoneGroup) return;
    if (!lesson || !lesson.targetZone) {
      this.tacticalZoneGroup.visible = false;
      return;
    }

    this.tacticalZoneGroup.visible = true;
    const tz = lesson.targetZone;
    const sign = tz.side === 'B' ? -1 : 1;
    const wx = sign * tz.localX;
    const wz = -sign * tz.localY;
    const sx = tz.rx * 2;
    const sz = tz.ry * 2;

    this.tacBoxMesh.position.set(wx, 0.006, wz);
    this.tacBoxMesh.scale.set(sx, 1, sz);

    this.tacBorderLine.position.set(wx, 0.008, wz);
    this.tacBorderLine.scale.set(sx, 1, sz);

    this.bullOuterMesh.position.set(wx, 0.008, wz);
    this.bullInnerMesh.position.set(wx, 0.009, wz);

    const isChallengeTurn = currentTurnIndex === lesson.challengeTurnIndex;
    if (passed) {
      this.tacBoxMat.color.setHex(0x10b981);
      this.tacBoxMat.opacity = 0.28;
      this.tacBorderMat.color.setHex(0x059669);
      this.bullOuterMat.color.setHex(0x10b981);
    } else if (isChallengeTurn) {
      this.tacBoxMat.color.setHex(0xd97706);
      this.tacBoxMat.opacity = 0.24;
      this.tacBorderMat.color.setHex(0xf59e0b);
      this.bullOuterMat.color.setHex(0xfbbf24);
    } else {
      this.tacBoxMat.color.setHex(0xd97706);
      this.tacBoxMat.opacity = 0.12;
      this.tacBorderMat.color.setHex(0xd97706);
      this.bullOuterMat.color.setHex(0xd97706);
    }
  }

  setStandsVisible(visible) {
    if (this.standGroup) this.standGroup.visible = visible;
  }

  setCourtSurface(surfaceKey) {
    this.courtMat.map = this._createCourtTexture(surfaceKey, true);
    this.courtMat.needsUpdate = true;
    this.surroundMat.map = this._createCourtTexture(surfaceKey, false);
    this.surroundMat.needsUpdate = true;
    this._applyVenueTheme(surfaceKey);
  }

  setTargetZone(courtMode, side = 'A') {
    const sign = side === 'B' ? -1 : 1;
    const L2 = ITF_COURT.halfLength;
    const Ws = ITF_COURT.halfSinglesWidth;
    const Wd = ITF_COURT.halfDoublesWidth;
    const Sv = ITF_COURT.serviceLineDist;

    if (courtMode === 'singles') {
      this.targetZoneMesh.scale.set(L2, 1, Ws * 2);
      this.targetZoneMesh.position.set(sign * (L2 / 2), 0.0015, 0);
    } else if (courtMode === 'doubles') {
      this.targetZoneMesh.scale.set(L2, 1, Wd * 2);
      this.targetZoneMesh.position.set(sign * (L2 / 2), 0.0015, 0);
    } else if (courtMode === 'serve_deuce') {
      this.targetZoneMesh.scale.set(Sv, 1, Ws);
      this.targetZoneMesh.position.set(sign * (Sv / 2), 0.0015, sign * (-Ws / 2));
    } else if (courtMode === 'serve_ad') {
      this.targetZoneMesh.scale.set(Sv, 1, Ws);
      this.targetZoneMesh.position.set(sign * (Sv / 2), 0.0015, sign * (Ws / 2));
    }
  }

  setSoloMode(isSolo) {
    this.soloMode = Boolean(isSolo);
    if (this.playerA && this.playerA.root) this.playerA.root.visible = true;
    if (this.playerB && this.playerB.root) this.playerB.root.visible = !this.soloMode;
  }

  /**
   * Resolves effective stroke type ('fh' | 'bh2' | 'bh1' | 'serve') from explicit strokeType or court position.
   */
  _resolveStrokeType(strokeType, hitY, hitZ, swingPathDeg) {
    if (hitZ > 1.95 || strokeType === 'serve') return 'serve';
    if (strokeType === 'bh2' || strokeType === 'bh1' || strokeType === 'fh') return strokeType;
    // In automatic / rally mode, balls on the left (Ad) side (hitY > 0.35) use Backhand!
    if (hitY > 0.35) {
      return swingPathDeg < -3 ? 'bh1' : 'bh2';
    }
    return 'fh';
  }

  /**
   * Evaluates the Zero-Clipping 3D Biomechanical Racket Pose at time `tau` (tau = 0 is impact).
   * Supports:
   * - Forehand ('fh'): Modern circular loop & wrap over left shoulder
   * - Two-Handed Backhand ('bh2'): Coiled left-hip unit turn & double-handed wrap over right shoulder
   * - One-Handed Backhand ('bh1'): Classic eastern backhand drive or knife slice with high right-side finish
   * - Overhead Serve ('serve'): Trophy pose -> racquet drop -> pronation extension
   */
  _evaluateSwingPoseAtTime(tau, swingPathDeg, faceAngleDeg, hitZ, strokeType = 'fh') {
    const deg2rad = Math.PI / 180;
    const swingRad = swingPathDeg * deg2rad;
    const faceRad = faceAngleDeg * deg2rad;
    const isOverhead = hitZ > 1.95 || strokeType === 'serve';
    const isBackhand = !isOverhead && (strokeType === 'bh2' || strokeType === 'bh1');

    const s = THREE.MathUtils.clamp(tau, -0.35, 0.42);
    const vx0 = Math.cos(swingRad) * 2.15;
    const vy0 = Math.sin(swingRad) * 2.15;

    const pos = new THREE.Vector3();
    let rotX = -0.25;
    let rotY = 0;
    let rotZ = faceRad;

    if (isOverhead) {
      const baseRx = -1.35;
      if (s < 0) {
        const u = -s / 0.35;
        const u2 = u * u;
        pos.x = vx0 * s - 0.06 * u2;
        pos.y = vy0 * s - 0.65 * u2;
        pos.z = -0.18 * u2;
        rotX = baseRx + 1.45 * u2;
        rotY = -0.45 * u2;
        rotZ = faceRad - 0.50 * u;
      } else {
        const u = s / 0.42;
        const u2 = u * u;
        pos.x = vx0 * s - 0.85 * u2;
        pos.y = vy0 * s - 1.50 * u2;
        pos.z = -0.58 * u2;
        rotX = baseRx + 0.90 * u;
        rotY = -0.85 * u2;
        rotZ = faceRad - 0.65 * u;
      }
    } else if (isBackhand) {
      // BACKHAND BIOMECHANICS ('bh2' Two-Handed or 'bh1' One-Handed)
      // Rotating around local X by PI + 0.25 flips the handle (-Z -> +Z) toward the player standing on the right (+Z) of the ball,
      // while keeping the stringbed face normal (+X) pointing toward the net!
      const baseRx = Math.PI + 0.25;
      if (swingPathDeg < -3) {
        // Backhand Knife Slice
        if (s < 0) {
          const u = -s / 0.35;
          const u2 = u * u;
          pos.x = vx0 * s - 0.08 * u2;
          pos.y = vy0 * s + 0.28 * u2;
          pos.z = 0.08 * u2;
          rotX = baseRx + 0.32 * u;
          rotY = 0.65 * u2;
          rotZ = faceRad + 0.28 * u;
        } else {
          const u = s / 0.42;
          const u2 = u * u;
          pos.x = vx0 * s - 0.46 * u2;
          pos.y = vy0 * s + 0.22 * u2;
          pos.z = 0.46 * u2;
          rotX = baseRx + 0.30 * u;
          rotY = 0.60 * u2;
          rotZ = faceRad + 0.14 * u;
        }
      } else if (strokeType === 'bh1') {
        // One-Handed Topspin Backhand (Wawrinka / Federer High Right Finish)
        if (s < 0) {
          const u = -s / 0.35;
          const u2 = u * u;
          const u3 = u2 * u;
          pos.x = vx0 * s + 0.18 * u2;
          pos.y = vy0 * s + 0.18 * u3;
          pos.z = 0.10 * u2;
          rotX = baseRx + 0.28 * u3;
          rotY = 0.85 * u2;
          rotZ = faceRad - 0.16 * u2;
        } else {
          const u = s / 0.42;
          const u2 = u * u;
          const u3 = u2 * u;
          pos.x = vx0 * s - 0.78 * u3;
          pos.y = vy0 * s + 0.18 * u2;
          pos.z = 0.72 * Math.pow(u, 1.12);
          rotX = baseRx + 0.30 * u;
          rotY = 1.45 * Math.pow(u, 1.12);
          rotZ = faceRad + 0.15 * u2;
        }
      } else {
        // Two-Handed Topspin Backhand (Sinner / Djokovic Compact Wrap Over Right Shoulder)
        if (s < 0) {
          const u = -s / 0.35;
          const u2 = u * u;
          const u3 = u2 * u;
          pos.x = vx0 * s + 0.20 * u2;
          pos.y = vy0 * s + 0.20 * u3;
          pos.z = 0.08 * u2;
          rotX = baseRx + 0.28 * u3;
          rotY = 0.82 * u2;
          rotZ = faceRad - 0.16 * u2;
        } else {
          const u = s / 0.42;
          const u2 = u * u;
          const u3 = u2 * u;
          pos.x = vx0 * s - 1.02 * u3;
          pos.y = vy0 * s + 0.02 * u2;
          pos.z = 0.88 * Math.pow(u, 1.15);
          rotX = baseRx + 0.34 * u;
          rotY = 1.98 * Math.pow(u, 1.15);
          rotZ = faceRad + 0.15 * u2;
        }
      }
    } else if (swingPathDeg < -3) {
      const baseRx = -0.20;
      if (s < 0) {
        const u = -s / 0.35;
        const u2 = u * u;
        pos.x = vx0 * s - 0.08 * u2;
        pos.y = vy0 * s + 0.26 * u2;
        pos.z = -0.06 * u2;
        rotX = baseRx - 0.35 * u;
        rotY = -0.65 * u2;
        rotZ = faceRad + 0.30 * u;
      } else {
        const u = s / 0.42;
        const u2 = u * u;
        pos.x = vx0 * s - 0.48 * u2;
        pos.y = vy0 * s + 0.22 * u2;
        pos.z = -0.42 * u2;
        rotX = baseRx - 0.32 * u;
        rotY = -0.55 * u2;
        rotZ = faceRad + 0.15 * u;
      }
    } else {
      // MODERN TOPSPIN FOREHAND (Zero-Clipping Circular Wrap Over Left Shoulder)
      const baseRx = -0.25;
      if (s < 0) {
        const u = -s / 0.35;
        const u2 = u * u;
        const u3 = u2 * u;
        pos.x = vx0 * s + 0.22 * u2;
        pos.y = vy0 * s + 0.24 * u3;
        pos.z = -0.06 * u2;
        rotX = baseRx - 0.30 * u3;
        rotY = -0.80 * u2;
        rotZ = faceRad - 0.18 * u2;
      } else {
        const u = s / 0.42;
        const u2 = u * u;
        const u3 = u2 * u;
        pos.x = vx0 * s - 1.05 * u3;
        pos.y = vy0 * s - 0.02 * u2;
        pos.z = -0.92 * Math.pow(u, 1.15);
        rotX = baseRx - 0.35 * u;
        rotY = -2.05 * Math.pow(u, 1.15);
        rotZ = faceRad + 0.15 * u2;
      }
    }

    // Racket-head path: smooth keyframe spline (see _swingPathPosition). The polynomial
    // positions above are superseded; their rotations are kept.
    let kind = 'fh';
    if (isOverhead) kind = 'serve';
    else if (isBackhand) kind = swingPathDeg < -3 ? 'bh_slice' : strokeType === 'bh1' ? 'bh1' : 'bh2';
    else if (swingPathDeg < -3) kind = 'fh_slice';
    pos.copy(this._swingPathPosition(s, swingRad, kind));

    const euler = new THREE.Euler(rotX, rotY, rotZ, 'ZYX');
    const quat = new THREE.Quaternion().setFromEuler(euler);
    return { pos, quat };
  }

  /**
   * Racket sweet-spot path in the contact-pivot frame (x toward the target, y up,
   * z to the hitter's right), as a cubic Hermite spline through stroke keyframes.
   * Guarantees: passes through the contact point at tau = 0 with its tangent exactly
   * along the swing-path angle, and the head speed peaks at contact.
   */
  _swingPathPosition(tau, swingRad, kind) {
    const d = [Math.cos(swingRad), Math.sin(swingRad), 0];
    const along = (k, off = [0, 0, 0]) => [k * d[0] + off[0], k * d[1] + off[1], k * d[2] + off[2]];
    const CONTACT_SPEED = 9.0; // m/s, visual (real head speed is ~25 m/s; slowed so it reads on screen)

    // [t, position] keyframes; contact is at t = 0
    // Keyframes are kept inside the player's reach (checked against the arm-reach clamp),
    // so the rendered racket follows this path instead of being pulled off it.
    const paths = {
      fh: [
        [-0.35, [-0.55, 0.30, -0.10]],   // unit turn, racket up and back
        [-0.22, [-0.78, -0.02, 0.04]],   // loop drops behind
        [-0.11, along(-0.48, [-0.06, 0.10, 0.02])], // slot: below and behind the ball
        [0, [0, 0, 0]],
        [0.08, along(0.30, [0.01, 0.15, -0.12])],   // extend through the ball
        [0.22, [0.05, 0.55, -0.62]],     // wrap across the body
        [0.42, [-0.30, 0.62, -0.88]]     // finish over the left shoulder
      ],
      fh_slice: [
        [-0.35, [-0.50, 0.42, 0.02]],    // high takeback, open face
        [-0.20, [-0.70, 0.30, 0.06]],
        [-0.11, along(-0.58, [0, 0.03, 0.03])],
        [0, [0, 0, 0]],
        [0.09, [0.16, 0.0, -0.10]],      // short, low extension
        [0.24, [0.20, 0.05, -0.32]],
        [0.42, [0.12, 0.12, -0.50]]
      ],
      bh2: [
        [-0.35, [-0.60, 0.20, 0.12]],
        [-0.22, [-0.58, 0.06, 0.09]],
        [-0.11, along(-0.36, [-0.05, 0.15, 0.06])],
        [0, [0, 0, 0]],
        [0.08, along(0.28, [0.01, 0.16, 0.14])],
        [0.22, [0.02, 0.52, 0.60]],
        [0.42, [-0.26, 0.60, 0.86]]      // finish over the right shoulder
      ],
      bh1: [
        [-0.35, [-0.70, 0.24, 0.10]],
        [-0.22, [-0.62, 0.07, 0.09]],
        [-0.11, along(-0.36, [-0.05, 0.11, 0.08])],
        [0, [0, 0, 0]],
        [0.09, along(0.36, [0.03, 0.15, 0.10])],
        [0.25, [0.10, 0.72, 0.50]],
        [0.42, [-0.02, 0.86, 0.66]]      // high, open finish
      ],
      bh_slice: [
        [-0.35, [-0.55, 0.40, 0.04]],
        [-0.20, [-0.67, 0.32, 0.04]],
        [-0.11, along(-0.50, [-0.03, 0.09, 0.01])],
        [0, [0, 0, 0]],
        [0.09, [0.16, 0.0, 0.12]],
        [0.24, [0.20, 0.06, 0.33]],
        [0.42, [0.12, 0.16, 0.45]]
      ],
      serve: [
        [-0.35, [-0.46, -0.78, 0.11]],   // trophy position
        [-0.22, [-0.48, -0.98, 0.06]],   // racket drop behind the back
        [-0.10, [-0.42, -0.42, 0.02]],   // swing up
        [0, [0, 0, 0]],
        [0.10, along(0.42, [0, -0.22, -0.08])], // pronation, through and down
        [0.24, [0.32, -0.96, -0.40]],
        [0.42, [0.02, -1.40, -0.43]]     // finish by the left hip
      ]
    };
    const keys = paths[kind] || paths.fh;
    const n = keys.length;

    // Tangents: Catmull-Rom (non-uniform), eased at the ends, fixed along the swing path at contact
    const vel = keys.map((k, i) => {
      if (k[0] === 0) return d.map((c) => c * CONTACT_SPEED);
      const a = keys[Math.max(0, i - 1)];
      const b = keys[Math.min(n - 1, i + 1)];
      const ease = i === 0 || i === n - 1 ? 0.35 : 1;
      return [0, 1, 2].map((j) => ((b[1][j] - a[1][j]) / (b[0] - a[0])) * ease);
    });

    const t = THREE.MathUtils.clamp(tau, keys[0][0], keys[n - 1][0]);
    let i = 0;
    while (i < n - 2 && t > keys[i + 1][0]) i++;
    const [t0, p0] = keys[i];
    const [t1, p1] = keys[i + 1];
    const h = t1 - t0;
    const u = (t - t0) / h;
    const u2 = u * u;
    const u3 = u2 * u;
    const h00 = 2 * u3 - 3 * u2 + 1;
    const h10 = u3 - 2 * u2 + u;
    const h01 = -2 * u3 + 3 * u2;
    const h11 = u3 - u2;
    const v0 = vel[i];
    const v1 = vel[i + 1];
    return new THREE.Vector3(
      h00 * p0[0] + h10 * h * v0[0] + h01 * p1[0] + h11 * h * v1[0],
      h00 * p0[1] + h10 * h * v0[1] + h01 * p1[1] + h11 * h * v1[1],
      h00 * p0[2] + h10 * h * v0[2] + h01 * p1[2] + h11 * h * v1[2]
    );
  }

  /* ----------------------------------------------------------------------- */
  /* Motion-capture driven strokes (3DTennisDS, see mocap/strokes.json)       */
  /* ----------------------------------------------------------------------- */

  _loadStrokeClips() {
    fetch('./mocap/strokes.json?v=2')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data || !Array.isArray(data.clips)) return;
        this.strokeClips = data.clips;
        [this.playerA, this.playerB].forEach((rig) => {
          if (rig) rig._lastTrailKey = null;
        });
        if (typeof this.onClipsLoaded === 'function') this.onClipsLoaded();
      })
      .catch(() => {
        /* fall back to the procedural swing */
      });
  }

  /** Picks the recorded stroke closest in contact height and swing angle (topspin FH / 2H-BH only). */
  _pickClip(strokeType, hitZ, swingPathDeg) {
    if (!this.strokeClips || swingPathDeg < -3) return null;
    if (strokeType !== 'fh' && strokeType !== 'bh2') return null;
    let best = null;
    let bestScore = Infinity;
    for (const c of this.strokeClips) {
      if (c.stroke !== strokeType) continue;
      const score =
        Math.abs(c.impactHeight * MOCAP_BODY_SCALE - hitZ) / 0.12 + Math.abs(c.swingDeg - swingPathDeg) / 15;
      if (score < bestScore) {
        bestScore = score;
        best = c;
      }
    }
    return best;
  }

  _clipVec(clip, key, tau, out = new THREE.Vector3()) {
    const arr = clip.frames[key];
    const f = (tau - clip.t0) * clip.rate;
    const i = THREE.MathUtils.clamp(Math.floor(f), 0, arr.length - 2);
    const u = THREE.MathUtils.clamp(f - i, 0, 1);
    const a = arr[i];
    const b = arr[i + 1];
    return out.set(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u);
  }

  _clipQuat(clip, tau) {
    const arr = clip.frames.racketQuat;
    const f = (tau - clip.t0) * clip.rate;
    const i = THREE.MathUtils.clamp(Math.floor(f), 0, arr.length - 2);
    const u = THREE.MathUtils.clamp(f - i, 0, 1);
    const qa = new THREE.Quaternion(...arr[i]);
    const qb = new THREE.Quaternion(...arr[i + 1]);
    return qa.slerp(qb, u);
  }

  /**
   * Poses a rig from a recorded stroke. The body is scaled to the rig about the contact
   * point; feet stay on the ground; the difference between the recorded and requested
   * contact height is absorbed by the legs and (near impact only) by the arm; the racket
   * is rotated about the contact point near impact so its path and face match the
   * physics inputs exactly at contact.
   */
  _updatePoseFromClip(rig, localParams, tau, clip, strokeType, runningStridePhase = 0) {
    const { hitZ = 1.05, swingPathDeg = 20, faceAngleDeg = -2, aimAngleDeg = 0 } = localParams;
    const S = MOCAP_BODY_SCALE;
    const deg2rad = Math.PI / 180;
    const aimRad = aimAngleDeg * deg2rad;
    const t = THREE.MathUtils.clamp(tau, -0.35, 0.42);
    const L = this.rigLengths;

    rig.contactPivot.updateMatrix();
    const M = rig.contactPivot.matrix;
    const toRoot = (v) => v.clone().applyMatrix4(M);

    // Body placement in the contact frame
    const rwri0 = this._clipVec(clip, 'rwri', 0);
    const T = rwri0.clone().multiplyScalar(1 - S);
    const groundBelowContact = S * clip.impactHeight - T.y;
    const dH = hitZ - groundBelowContact; // > 0: ball higher than in the recording
    const bodyLift = THREE.MathUtils.clamp(dH, -0.3, 0.08);
    const bodyOffsetY = -dH + bodyLift;
    const near = Math.exp(-Math.pow(t / 0.16, 2));
    const racketOffsetY = bodyOffsetY + (dH - bodyLift) * near;

    const body = (key) => {
      const v = this._clipVec(clip, key, t).multiplyScalar(S).add(T);
      v.y += bodyOffsetY;
      return v;
    };
    const ankle = (key) => {
      const raw = this._clipVec(clip, key, t);
      const v = raw.clone().multiplyScalar(S).add(T);
      v.y = -hitZ + S * (raw.y - clip.groundY) * 0.97; // ankle height above the court
      return v;
    };

    // Racket: follows the recorded hand, then is corrected near impact
    const rwri = this._clipVec(clip, 'rwri', t);
    const racketPos = this._clipVec(clip, 'racketPos', t)
      .sub(rwri)
      .add(rwri.clone().multiplyScalar(S).add(T));
    racketPos.y += racketOffsetY;
    const racketQuat = this._clipQuat(clip, t);
    const corrSwing = (swingPathDeg - clip.swingDeg) * deg2rad * near;
    const corrFace = (faceAngleDeg - clip.faceDeg) * deg2rad * near;
    const zAxis = new THREE.Vector3(0, 0, 1);
    racketPos.applyAxisAngle(zAxis, corrSwing);
    racketQuat.premultiply(new THREE.Quaternion().setFromAxisAngle(zAxis, corrFace));
    rig.racketGroup.position.copy(racketPos);
    rig.racketGroup.quaternion.copy(racketQuat);

    const q0 = this._clipQuat(clip, 0).premultiply(
      new THREE.Quaternion().setFromAxisAngle(zAxis, (faceAngleDeg - clip.faceDeg) * deg2rad)
    );
    rig.impactPlaneIndicator.quaternion.copy(q0);

    // Pelvis and trunk from the recorded hips and shoulders
    const lhip = toRoot(body('lhip'));
    const rhip = toRoot(body('rhip'));
    const lsho = toRoot(body('lsho'));
    const rsho = toRoot(body('rsho'));
    const hipMid = lhip.clone().add(rhip).multiplyScalar(0.5);
    const shoMid = lsho.clone().add(rsho).multiplyScalar(0.5);
    const hipAxis = rhip.clone().sub(lhip);
    const shoAxis = rsho.clone().sub(lsho);
    const pelvisYaw = Math.atan2(hipAxis.x, hipAxis.z);
    let twist = Math.atan2(shoAxis.x, shoAxis.z) - pelvisYaw;
    twist = Math.atan2(Math.sin(twist), Math.cos(twist));

    const pelvisFwd = new THREE.Vector3(Math.cos(pelvisYaw), 0, -Math.sin(pelvisYaw));
    const pelvisRight = new THREE.Vector3(Math.sin(pelvisYaw), 0, Math.cos(pelvisYaw));
    const trunk = shoMid.clone().sub(hipMid);
    const lean = Math.atan2(trunk.dot(pelvisFwd), trunk.y);
    const side = Math.atan2(trunk.dot(pelvisRight), trunk.y);

    rig.pelvisGroup.position.copy(hipMid).add(new THREE.Vector3(0, 0.04, 0));
    rig.pelvisGroup.rotation.set(0, pelvisYaw, 0);
    rig.spinePivot.rotation.set(side * 0.5, twist * 0.45, -lean * 0.5);
    rig.chestPivot.rotation.set(side * 0.5, twist * 0.55, -lean * 0.5);
    rig.root.updateMatrixWorld(true);

    const invRootMat = new THREE.Matrix4().copy(rig.root.matrixWorld).invert();
    const toRootLocal = (localPt, obj) => localPt.clone().applyMatrix4(obj.matrixWorld).applyMatrix4(invRootMat);

    // The rig's trunk is proportionally longer than the recorded player's: move the pelvis so the
    // rig's shoulders land on the recorded shoulders (the legs absorb the difference).
    const rigShoMid = toRootLocal(rig.rightShoulderLocal, rig.chestPivot)
      .add(toRootLocal(rig.leftShoulderLocal, rig.chestPivot))
      .multiplyScalar(0.5);
    const shoDelta = shoMid.clone().sub(rigShoMid);
    shoDelta.y = THREE.MathUtils.clamp(shoDelta.y, -0.16, 0.04);
    rig.pelvisGroup.position.add(shoDelta);
    rig.root.updateMatrixWorld(true);

    const rShoulder = toRootLocal(rig.rightShoulderLocal, rig.chestPivot);
    const lShoulder = toRootLocal(rig.leftShoulderLocal, rig.chestPivot);
    const headRoot = toRootLocal(new THREE.Vector3(0, 0, 0), rig.headGroup);
    const fwdDir = new THREE.Vector3(Math.cos(aimRad), 0, -Math.sin(aimRad));
    const rightDir = new THREE.Vector3(Math.sin(aimRad), 0, Math.cos(aimRad));

    // Keep the hand on the racket: clamp the grip into arm reach (outside the moment of impact).
    // The recorded hands sit near the butt of the handle, so the grips are placed low on the handle.
    const rGripLocal = new THREE.Vector3(0, 0, strokeType === 'bh2' ? -0.47 : -0.43);
    let gripRoot = toRootLocal(rGripLocal, rig.racketGroup);
    const maxReach = L.upperArm + L.forearm - 0.012;
    const shToGrip = gripRoot.clone().sub(rShoulder);
    if (shToGrip.length() > maxReach && Math.abs(t) > 0.01) {
      const delta = rShoulder.clone().add(shToGrip.setLength(maxReach)).sub(gripRoot);
      rig.racketGroup.position.add(delta.applyAxisAngle(UP_VEC, -aimRad));
      rig.root.updateMatrixWorld(true);
      gripRoot = toRootLocal(rGripLocal, rig.racketGroup);
    }

    // Arms: two-bone IK with elbow poles taken from the recorded elbows
    const pole = (shoulder, wrist, elbowKey) => {
      const elbow = toRoot(body(elbowKey));
      const mid = shoulder.clone().add(wrist).multiplyScalar(0.5);
      const d = elbow.sub(mid);
      return d.lengthSq() > 1e-6 ? d.normalize() : new THREE.Vector3(0, -1, 0);
    };
    const rArm = solveTwoBoneIK(rShoulder, gripRoot, L.upperArm, L.forearm, pole(rShoulder, gripRoot, 'relb'));
    alignBoneMesh(rig.rightUpperArmBone, rShoulder, rArm.midPos);
    alignBoneMesh(rig.rightForearmBone, rArm.midPos, rArm.effectiveTarget);

    const leftTarget =
      strokeType === 'bh2'
        ? toRootLocal(new THREE.Vector3(0, 0, -0.37), rig.racketGroup)
        : toRoot(body('lwri'));
    if (strokeType !== 'bh2') {
      this._pushOutOfTorsoAndHead(leftTarget, rig.pelvisGroup.position, headRoot, fwdDir, rightDir, 0.22, 0.23);
    }
    const lArm = solveTwoBoneIK(lShoulder, leftTarget, L.upperArm, L.forearm, pole(lShoulder, leftTarget, 'lelb'));
    alignBoneMesh(rig.leftUpperArmBone, lShoulder, lArm.midPos);
    alignBoneMesh(rig.leftForearmBone, lArm.midPos, lArm.effectiveTarget);

    // Legs: feet from the recording (on the court), knees from the recorded knee direction
    const stride = Math.sin(runningStridePhase) * 0.18;
    const lAnk = toRoot(ankle('lank')).addScaledVector(fwdDir, stride);
    const rAnk = toRoot(ankle('rank')).addScaledVector(fwdDir, -stride);
    if (runningStridePhase) {
      lAnk.y += Math.max(0, Math.cos(runningStridePhase)) * 0.06;
      rAnk.y += Math.max(0, -Math.cos(runningStridePhase)) * 0.06;
    }
    const lHip = toRootLocal(rig.leftHipLocal, rig.pelvisGroup);
    const rHip = toRootLocal(rig.rightHipLocal, rig.pelvisGroup);
    const kneePole = (hip, ank, kneeKey) => {
      const knee = toRoot(body(kneeKey));
      const d = knee.sub(hip.clone().add(ank).multiplyScalar(0.5));
      d.y = Math.min(d.y, 0.05);
      return d.lengthSq() > 1e-6 ? d.normalize() : fwdDir.clone();
    };
    const lLeg = solveTwoBoneIK(lHip, lAnk, L.thigh, L.shin, kneePole(lHip, lAnk, 'lkne'));
    const rLeg = solveTwoBoneIK(rHip, rAnk, L.thigh, L.shin, kneePole(rHip, rAnk, 'rkne'));
    alignBoneMesh(rig.leftThighBone, lHip, lLeg.midPos);
    alignBoneMesh(rig.leftShinBone, lLeg.midPos, lLeg.effectiveTarget);
    alignBoneMesh(rig.rightThighBone, rHip, rLeg.midPos);
    alignBoneMesh(rig.rightShinBone, rLeg.midPos, rLeg.effectiveTarget);

    const footYaw = (ankKey, toeKey) => {
      const a = toRoot(body(ankKey));
      const b = toRoot(body(toeKey));
      return Math.atan2(-(b.z - a.z), b.x - a.x);
    };
    rig.leftShoeGroup.position.copy(lLeg.effectiveTarget);
    rig.leftShoeGroup.rotation.set(0, footYaw('lank', 'ltoe'), 0);
    rig.rightShoeGroup.position.copy(rLeg.effectiveTarget);
    rig.rightShoeGroup.rotation.set(0, footYaw('rank', 'rtoe'), 0);

    // Head: recorded gaze direction, expressed relative to the chest
    const hF = toRoot(body('headF')).sub(toRoot(body('head')));
    const chestYaw = pelvisYaw + twist;
    const gazeYaw = Math.atan2(-hF.z, hF.x);
    let neckYaw = gazeYaw - chestYaw;
    neckYaw = Math.atan2(Math.sin(neckYaw), Math.cos(neckYaw));
    const pitch = Math.atan2(hF.y, Math.hypot(hF.x, hF.z));
    rig.headGroup.rotation.set(0, THREE.MathUtils.clamp(neckYaw, -1.1, 1.1), THREE.MathUtils.clamp(pitch, -0.6, 0.4));

    // Flash, contact markers
    const flashAlpha = rig.swingTrailGroup.visible ? Math.max(0, 1 - Math.abs(tau) * 18) : 0;
    rig.impactFlashMat.opacity = flashAlpha * 0.75;
    rig.impactFlashRing.scale.setScalar(0.7 + (1 - flashAlpha) * 0.9);
    const contactPos = rig.contactPivot.position;
    rig.contactDropLine.position.copy(contactPos);
    rig.contactDropLine.scale.set(1, hitZ, 1);
    rig.contactDropLine.computeLineDistances();
    rig.contactFloorRing.position.set(contactPos.x, 0.004, contactPos.z);
  }

  /**
   * Swing trail from sampled racket poses ([tau, position, quaternion] in the contact-pivot frame).
   * Fades in toward contact and out after it; colour runs takeback (slate) -> contact (ball yellow)
   * -> follow-through (green). Three faint racket-head outlines mark slot, contact and finish.
   */
  _rebuildSwingTrailRibbon(rig, samples) {
    while (rig.swingTrailGroup.children.length > 0) {
      const c = rig.swingTrailGroup.children[0];
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
      rig.swingTrailGroup.remove(c);
    }
    if (!samples || samples.length < 2) return;

    const cTake = new THREE.Color(0x7c8ea6);
    const cHit = new THREE.Color(0xd4e157);
    const cFollow = new THREE.Color(0x2f9e6a);
    const colourAt = (tau) =>
      tau < 0
        ? new THREE.Color().lerpColors(cHit, cTake, Math.min(1, -tau / 0.2))
        : new THREE.Color().lerpColors(cHit, cFollow, Math.min(1, tau / 0.2));
    const alphaAt = (tau, peak, floor) => floor + (peak - floor) * Math.exp(-Math.pow(tau / 0.13, 2));

    const ribbonPositions = [];
    const ribbonColors = [];
    const ribbonIndices = [];
    const linePositions = [];
    const lineColors = [];

    samples.forEach(([tau, pos, quat]) => {
      const top = new THREE.Vector3(0, 0.1, 0).applyQuaternion(quat).add(pos);
      const bot = new THREE.Vector3(0, -0.1, 0).applyQuaternion(quat).add(pos);
      ribbonPositions.push(bot.x, bot.y, bot.z, top.x, top.y, top.z);
      const c = colourAt(tau);
      const a = alphaAt(tau, 0.42, 0.12);
      ribbonColors.push(c.r, c.g, c.b, a, c.r, c.g, c.b, a);
      linePositions.push(pos.x, pos.y, pos.z);
      lineColors.push(c.r, c.g, c.b, alphaAt(tau, 1.0, 0.5));
    });
    for (let i = 0; i < samples.length - 1; i++) {
      const b0 = 2 * i;
      const t0 = b0 + 1;
      const b1 = b0 + 2;
      const t1 = b0 + 3;
      ribbonIndices.push(b0, t0, b1, t0, t1, b1);
    }

    const ribGeo = new THREE.BufferGeometry();
    ribGeo.setAttribute('position', new THREE.Float32BufferAttribute(ribbonPositions, 3));
    ribGeo.setAttribute('color', new THREE.Float32BufferAttribute(ribbonColors, 4));
    ribGeo.setIndex(ribbonIndices);
    const ribMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false
    });
    rig.swingTrailGroup.add(new THREE.Mesh(ribGeo, ribMat));

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    lineGeo.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 4));
    const lineMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false });
    rig.swingTrailGroup.add(new THREE.Line(lineGeo, lineMat));

    // Racket-head outlines at slot (tau = -0.11), contact (0) and finish (end of trail)
    const hoop = new THREE.EllipseCurve(0, 0, 0.125, 0.165, 0, Math.PI * 2).getPoints(40);
    const hoopPts = hoop.map((p) => new THREE.Vector3(0, p.x, p.y + 0.01));
    const nearest = (target) =>
      samples.reduce((best, smp) => (Math.abs(smp[0] - target) < Math.abs(best[0] - target) ? smp : best));
    [
      [nearest(-0.11), 0x7c8ea6, 0.4],
      [nearest(0), 0xd4e157, 0.9],
      [samples[samples.length - 1], 0x2f9e6a, 0.35]
    ].forEach(([[, pos, quat], color, opacity]) => {
      const g = new THREE.BufferGeometry().setFromPoints(hoopPts);
      const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
      const loop = new THREE.LineLoop(g, m);
      loop.position.copy(pos);
      loop.quaternion.copy(quat);
      rig.swingTrailGroup.add(loop);
    });
  }

  /** Samples the racket pose the player actually reaches (including arm-reach clamping). */
  _sampleRenderedSwing(rig, localParams) {
    const samples = [];
    const N = 56;
    for (let i = 0; i <= N; i++) {
      const tau = -0.35 + (i / N) * 0.77;
      this._updateSinglePlayerPose(rig, localParams, tau, false, 0, true);
      samples.push([tau, rig.racketGroup.position.clone(), rig.racketGroup.quaternion.clone()]);
    }
    return samples;
  }

  /**
   * 3D Anatomical Capsule Repulsion Constraint:
   * Ensures a point `pt` (in `rig.root` local space) NEVER enters the player's torso cylinder or head sphere!
   */
  _pushOutOfTorsoAndHead(pt, pelvisPos, headPos, fwdDir, rightDir, minTorsoR = 0.23, minHeadR = 0.22) {
    // 1. Repel from torso vertical axis (from pelvisPos.y to pelvisPos.y + 0.50)
    if (pt.y >= pelvisPos.y - 0.05 && pt.y <= pelvisPos.y + 0.54) {
      const dx = pt.x - pelvisPos.x;
      const dz = pt.z - pelvisPos.z;
      const rHoriz = Math.hypot(dx, dz);
      if (rHoriz < minTorsoR) {
        const pushDir = new THREE.Vector3(dx, 0, dz);
        if (pushDir.lengthSq() < 1e-5) {
          pushDir.copy(fwdDir);
        } else {
          pushDir.normalize();
        }
        pt.x = pelvisPos.x + pushDir.x * minTorsoR;
        pt.z = pelvisPos.z + pushDir.z * minTorsoR;
      }
    }

    // 2. Repel from head sphere
    const toHead = new THREE.Vector3().subVectors(pt, headPos);
    const dHead = toHead.length();
    if (dHead < minHeadR && dHead > 1e-5) {
      toHead.normalize().multiplyScalar(minHeadR);
      pt.copy(headPos).add(toHead);
    }
  }

  /**
   * Updates one articulated player rig (`this.playerA` or `this.playerB`) in its canonical local coordinates.
   */
  _updateSinglePlayerPose(rig, localParams, tau, showTrail = true, runningStridePhase = 0, sampling = false) {
    const {
      hitX = -11.9,
      hitY = -1.8,
      hitZ = 1.05,
      swingPathDeg = 27,
      faceAngleDeg = -1.8,
      aimAngleDeg = 7.5
    } = localParams;

    const deg2rad = Math.PI / 180;
    const aimRad = aimAngleDeg * deg2rad;
    const contactPos = physToThree(hitX, hitY, hitZ);
    const strokeType = this._resolveStrokeType(localParams.strokeType, hitY, hitZ, swingPathDeg);
    const isOverhead = strokeType === 'serve';
    const isBackhand = strokeType === 'bh2' || strokeType === 'bh1';

    rig.swingTrailGroup.visible = showTrail;
    rig.impactPlaneIndicator.visible = showTrail;
    rig.contactDropLine.visible = showTrail;
    rig.contactFloorRing.visible = showTrail;
    rig.faceNormalArrow.visible = showTrail && this.showVectors;

    const clip = this._pickClip(strokeType, hitZ, swingPathDeg);

    if (showTrail && !sampling) {
      const trailKey = `${swingPathDeg.toFixed(1)}_${faceAngleDeg.toFixed(1)}_${strokeType}_${hitZ.toFixed(2)}_${clip ? clip.id : 'proc'}`;
      if (rig._lastTrailKey !== trailKey) {
        rig._lastTrailKey = trailKey;
        this._rebuildSwingTrailRibbon(rig, this._sampleRenderedSwing(rig, localParams));
        // Sampling left the rig at the last sample; pose it again for the current time.
        this._updateSinglePlayerPose(rig, localParams, tau, showTrail, runningStridePhase);
        return;
      }
    }

    rig.contactPivot.position.copy(contactPos);
    rig.contactPivot.rotation.set(0, aimRad, 0);

    if (clip) {
      this._updatePoseFromClip(rig, localParams, tau, clip, strokeType, runningStridePhase);
      return;
    }

    const impactPose0 = this._evaluateSwingPoseAtTime(0, swingPathDeg, faceAngleDeg, hitZ, strokeType);
    rig.impactPlaneIndicator.quaternion.copy(impactPose0.quat);

    const flashAlpha = showTrail ? Math.max(0, 1 - Math.abs(tau) * 18) : 0;
    rig.impactFlashMat.opacity = flashAlpha * 0.75;
    rig.impactFlashRing.scale.setScalar(0.7 + (1 - flashAlpha) * 0.9);

    const swingPose = this._evaluateSwingPoseAtTime(tau, swingPathDeg, faceAngleDeg, hitZ, strokeType);
    rig.racketGroup.position.copy(swingPose.pos);
    rig.racketGroup.quaternion.copy(swingPose.quat);

    // Kinetic Chain Uncoiling Progress: coilPhase in [-1 (takeback), 0 (impact), +1 (follow-through)]
    const s = THREE.MathUtils.clamp(tau, -0.35, 0.42);
    const coilPhase = s < 0 ? s / 0.35 : s / 0.42;

    const fwdDir = new THREE.Vector3(Math.cos(aimRad), 0, -Math.sin(aimRad));
    const rightDir = new THREE.Vector3(Math.sin(aimRad), 0, Math.cos(aimRad));

    const stanceBackOffset = isOverhead ? -0.22 : isBackhand ? -0.15 : -0.26;
    const stanceSideOffset = isOverhead ? -0.25 : isBackhand ? 0.50 : -0.64;
    const stanceGroundCenter = new THREE.Vector3(contactPos.x, 0, contactPos.z)
      .addScaledVector(fwdDir, stanceBackOffset)
      .addScaledVector(rightDir, stanceSideOffset);

    const crouchWave = Math.exp(-Math.pow((coilPhase + 0.62) * 2.5, 2));
    const jumpWave = Math.exp(-Math.pow((coilPhase - 0.03) * 3.0, 2));
    const jumpOffset = isOverhead
      ? Math.max(0, hitZ - 2.25) * jumpWave + 0.14 * jumpWave
      : 0.04 * jumpWave;

    const targetHipY = isOverhead
      ? 0.89 - 0.14 * crouchWave + jumpOffset
      : THREE.MathUtils.clamp(0.58 + hitZ * 0.28, 0.66, 0.90) - 0.08 * crouchWave + jumpOffset;

    const weightShiftFwd = 0.12 * Math.tanh(coilPhase * 1.8);
    const pelvisPos = stanceGroundCenter
      .clone()
      .addScaledVector(fwdDir, weightShiftFwd)
      .setY(targetHipY);

    // Full biomechanical torso rotation around +Y:
    // - Forehand / Serve: coils right (-1.45 rad, left shoulder fwd) -> impact (+0.25 rad) -> follow-through (+1.28 rad)
    // - Backhand (2H / 1H): coils left (+1.38 rad, right shoulder fwd) -> impact (+0.52 rad, right shoulder leading into ball!) -> follow-through (-0.28 rad for 1H-BH / -0.82 rad for 2H-BH)
    const totalYawRel = isBackhand
      ? coilPhase < 0
        ? THREE.MathUtils.lerp(1.38, 0.52, 1 + coilPhase)
        : THREE.MathUtils.lerp(
            0.52,
            strokeType === 'bh1' ? -0.28 : -0.82,
            Math.pow(coilPhase, 0.85)
          )
      : coilPhase < 0
      ? THREE.MathUtils.lerp(-1.45, 0.25, 1 + coilPhase)
      : THREE.MathUtils.lerp(0.25, 1.28, Math.pow(coilPhase, 0.85));

    const hipTurnRad = aimRad + totalYawRel * 0.56;
    const totalTorsoExtraTurn = totalYawRel * 0.44;

    rig.pelvisGroup.position.copy(pelvisPos);
    rig.pelvisGroup.rotation.set(0, hipTurnRad, 0);

    const torsoForwardLean = isOverhead
      ? -0.18 * crouchWave + 0.16 * Math.max(0, coilPhase)
      : THREE.MathUtils.clamp((1.10 - hitZ) * 0.22, 0.04, 0.24);

    rig.spinePivot.rotation.set(0, totalTorsoExtraTurn * 0.45, -torsoForwardLean * 0.5);
    rig.chestPivot.rotation.set(0, totalTorsoExtraTurn * 0.55, -torsoForwardLean * 0.5);
    rig.root.updateMatrixWorld(true);

    // Compute Joint Positions in `rig.root` Local Space (so Player B with root.rotation.y = PI works identically!)
    const invRootMat = new THREE.Matrix4().copy(rig.root.matrixWorld).invert();
    const toRootLocal = (localPt, obj) =>
      localPt.clone().applyMatrix4(obj.matrixWorld).applyMatrix4(invRootMat);

    const rightShoulderRoot = toRootLocal(rig.rightShoulderLocal, rig.chestPivot);
    const leftShoulderRoot = toRootLocal(rig.leftShoulderLocal, rig.chestPivot);
    const headRoot = toRootLocal(new THREE.Vector3(0, 0, 0), rig.headGroup);

    const rGripLocal = strokeType === 'bh2' ? new THREE.Vector3(0, 0, -0.42) : rig.gripPointLocal;
    let gripRoot = toRootLocal(rGripLocal, rig.racketGroup);
    let sweetRoot = toRootLocal(new THREE.Vector3(0, 0, 0), rig.racketGroup);

    // Anti-Clipping Step 1: Ensure gripRoot never enters torso or head sphere during takeback/follow-through
    if (Math.abs(tau) > 0.02) {
      this._pushOutOfTorsoAndHead(gripRoot, pelvisPos, headRoot, fwdDir, rightDir, 0.22, 0.23);
    }

    // Anti-Clipping Step 2: Clamp gripRoot to maxArmReach from rightShoulderRoot (and leftShoulderRoot on 2H-BH)
    const L = this.rigLengths;
    const maxArmReach = L.upperArm + L.forearm - 0.012;
    const shToGrip = new THREE.Vector3().subVectors(gripRoot, rightShoulderRoot);
    if (shToGrip.length() > maxArmReach && Math.abs(tau) > 0.01) {
      const clampedGrip = rightShoulderRoot.clone().add(shToGrip.setLength(maxArmReach));
      const deltaGrip = new THREE.Vector3().subVectors(clampedGrip, gripRoot);
      const deltaPivotLocal = deltaGrip.clone().applyAxisAngle(UP_VEC, -aimRad);
      rig.racketGroup.position.add(deltaPivotLocal);
      rig.root.updateMatrixWorld(true);
      gripRoot = toRootLocal(rGripLocal, rig.racketGroup);
      sweetRoot = toRootLocal(new THREE.Vector3(0, 0, 0), rig.racketGroup);
    }

    if (strokeType === 'bh2' && Math.abs(tau) > 0.01) {
      const upperGripRoot = toRootLocal(new THREE.Vector3(0, 0, -0.32), rig.racketGroup);
      const leftShToUpper = new THREE.Vector3().subVectors(upperGripRoot, leftShoulderRoot);
      if (leftShToUpper.length() > maxArmReach) {
        const clampedUpper = leftShoulderRoot.clone().add(leftShToUpper.setLength(maxArmReach));
        const deltaUpper = new THREE.Vector3().subVectors(clampedUpper, upperGripRoot);
        const deltaPivotLocal = deltaUpper.clone().applyAxisAngle(UP_VEC, -aimRad);
        rig.racketGroup.position.add(deltaPivotLocal);
        rig.root.updateMatrixWorld(true);
        gripRoot = toRootLocal(rGripLocal, rig.racketGroup);
        sweetRoot = toRootLocal(new THREE.Vector3(0, 0, 0), rig.racketGroup);
      }
    }

    const throatRoot = toRootLocal(rig.throatPointLocal, rig.racketGroup);
    const upperHandleRoot = toRootLocal(new THREE.Vector3(0, 0, -0.32), rig.racketGroup);

    // Right Arm Two-Bone IK (with elevated forward elbow pole during follow-through)
    const followFactor = Math.max(0, coilPhase);
    const rightElbowPole = isBackhand
      ? rightDir
          .clone()
          .multiplyScalar(THREE.MathUtils.lerp(0.25, 0.72, followFactor))
          .addScaledVector(fwdDir, THREE.MathUtils.lerp(0.55, 0.45, followFactor))
          .add(new THREE.Vector3(0, THREE.MathUtils.lerp(-0.68, -0.15, followFactor), 0))
      : rightDir
          .clone()
          .multiplyScalar(THREE.MathUtils.lerp(0.75, 0.20, followFactor))
          .addScaledVector(fwdDir, THREE.MathUtils.lerp(-0.30, 0.92, followFactor))
          .add(
            new THREE.Vector3(
              0,
              isOverhead && coilPhase < 0 ? 0.25 : THREE.MathUtils.lerp(-0.68, -0.05, followFactor),
              0
            )
          );

    const rightArmIK = solveTwoBoneIK(
      rightShoulderRoot,
      gripRoot,
      L.upperArm,
      L.forearm,
      rightElbowPole
    );
    this._pushOutOfTorsoAndHead(rightArmIK.midPos, pelvisPos, headRoot, fwdDir, rightDir, 0.22, 0.22);
    alignBoneMesh(rig.rightUpperArmBone, rightShoulderRoot, rightArmIK.midPos);
    alignBoneMesh(rig.rightForearmBone, rightArmIK.midPos, rightArmIK.effectiveTarget);

    // Left Arm Two-Bone IK (Two-Handed Grip for bh2, Throat-Cradle + Wingspan for bh1, Balance/Catch for fh)
    const currentChestYaw = hipTurnRad + totalTorsoExtraTurn;
    const chestFwdRoot = new THREE.Vector3(Math.cos(currentChestYaw), 0, -Math.sin(currentChestYaw));
    const chestLeftRoot = new THREE.Vector3(-Math.sin(currentChestYaw), 0, -Math.cos(currentChestYaw));

    const leftHandTarget = new THREE.Vector3();
    if (isOverhead) {
      const tossUp = coilPhase < 0 ? THREE.MathUtils.lerp(0.44, -0.05, 1 + coilPhase) : -0.22;
      const tossFwd = coilPhase < 0 ? 0.34 : 0.24;
      leftHandTarget
        .copy(leftShoulderRoot)
        .addScaledVector(chestFwdRoot, tossFwd)
        .addScaledVector(chestLeftRoot, 0.08)
        .add(new THREE.Vector3(0, tossUp, 0));
    } else if (strokeType === 'bh2') {
      // Two-Handed Backhand: Left hand stays locked on upper handle right above right hand!
      leftHandTarget.copy(upperHandleRoot);
    } else if (strokeType === 'bh1') {
      // One-Handed Backhand: Left hand cradles throat during takeback, then opens backward into wingspan!
      const releaseWeight = THREE.MathUtils.smoothstep(coilPhase, -0.15, 0.22);
      const wingspanPos = leftShoulderRoot
        .clone()
        .addScaledVector(fwdDir, -0.36)
        .addScaledVector(rightDir, 0.34)
        .add(new THREE.Vector3(0, 0.06 + 0.16 * Math.max(0, coilPhase), 0));
      leftHandTarget.lerpVectors(throatRoot, wingspanPos, releaseWeight);
    } else {
      const catchFinishWeight =
        coilPhase > 0.42 ? THREE.MathUtils.smoothstep(coilPhase, 0.42, 0.88) * 0.92 : 0;
      const balancePos = leftShoulderRoot
        .clone()
        .addScaledVector(chestFwdRoot, 0.34)
        .addScaledVector(chestLeftRoot, 0.06)
        .add(new THREE.Vector3(0, -0.10, 0));
      leftHandTarget.lerpVectors(balancePos, throatRoot, catchFinishWeight);
    }
    if (strokeType !== 'bh2' || Math.abs(tau) > 0.02) {
      this._pushOutOfTorsoAndHead(leftHandTarget, pelvisPos, headRoot, fwdDir, rightDir, 0.22, 0.23);
    }

    const leftElbowPole = isBackhand
      ? rightDir
          .clone()
          .multiplyScalar(-0.65)
          .addScaledVector(fwdDir, 0.35)
          .add(new THREE.Vector3(0, -0.58, 0))
      : chestLeftRoot
          .clone()
          .multiplyScalar(0.85)
          .addScaledVector(chestFwdRoot, 0.55)
          .add(new THREE.Vector3(0, -0.55, 0));

    const leftArmIK = solveTwoBoneIK(
      leftShoulderRoot,
      leftHandTarget,
      L.upperArm,
      L.forearm,
      leftElbowPole
    );
    this._pushOutOfTorsoAndHead(leftArmIK.midPos, pelvisPos, headRoot, fwdDir, rightDir, 0.23, 0.22);
    alignBoneMesh(rig.leftUpperArmBone, leftShoulderRoot, leftArmIK.midPos);
    alignBoneMesh(rig.leftForearmBone, leftArmIK.midPos, leftArmIK.effectiveTarget);

    // Legs Two-Bone IK (supports running footwork stride when player is intercepting!)
    const leftHipRoot = toRootLocal(rig.leftHipLocal, rig.pelvisGroup);
    const rightHipRoot = toRootLocal(rig.rightHipLocal, rig.pelvisGroup);

    const actualHipY = rig.pelvisGroup.position.y;
    const airborneLift = Math.max(0, actualHipY - 0.85);
    const strideSwing = Math.sin(runningStridePhase) * 0.18;
    const strideLiftL = Math.max(0, Math.cos(runningStridePhase)) * 0.06 * (Math.abs(runningStridePhase) > 0.01 ? 1 : 0);
    const strideLiftR = Math.max(0, -Math.cos(runningStridePhase)) * 0.06 * (Math.abs(runningStridePhase) > 0.01 ? 1 : 0);

    const leftAnkleTarget = isBackhand
      ? stanceGroundCenter
          .clone()
          .addScaledVector(fwdDir, -0.16 + 0.10 * Math.max(0, coilPhase) + strideSwing)
          .addScaledVector(rightDir, 0.18)
          .setY(0.068 + airborneLift + strideLiftL + (coilPhase > 0.15 ? 0.03 * coilPhase : 0))
      : stanceGroundCenter
          .clone()
          .addScaledVector(fwdDir, 0.20 + strideSwing)
          .addScaledVector(rightDir, -0.17)
          .setY(0.068 + airborneLift + strideLiftL);

    const rightAnkleTarget = isBackhand
      ? stanceGroundCenter
          .clone()
          .addScaledVector(fwdDir, 0.20 - strideSwing)
          .addScaledVector(rightDir, -0.16)
          .setY(0.068 + airborneLift + strideLiftR)
      : stanceGroundCenter
          .clone()
          .addScaledVector(fwdDir, -0.16 + 0.12 * Math.max(0, coilPhase) - strideSwing)
          .addScaledVector(rightDir, 0.20)
          .setY(0.068 + airborneLift + strideLiftR + (coilPhase > 0.15 ? 0.03 * coilPhase : 0));

    const leftKneePole = fwdDir.clone().addScaledVector(rightDir, -0.18).normalize();
    const rightKneePole = fwdDir.clone().addScaledVector(rightDir, 0.32).normalize();

    const leftLegIK = solveTwoBoneIK(leftHipRoot, leftAnkleTarget, L.thigh, L.shin, leftKneePole);
    const rightLegIK = solveTwoBoneIK(rightHipRoot, rightAnkleTarget, L.thigh, L.shin, rightKneePole);

    alignBoneMesh(rig.leftThighBone, leftHipRoot, leftLegIK.midPos);
    alignBoneMesh(rig.leftShinBone, leftLegIK.midPos, leftLegIK.effectiveTarget);
    alignBoneMesh(rig.rightThighBone, rightHipRoot, rightLegIK.midPos);
    alignBoneMesh(rig.rightShinBone, rightLegIK.midPos, rightLegIK.effectiveTarget);

    rig.leftShoeGroup.position.copy(leftLegIK.effectiveTarget);
    rig.leftShoeGroup.rotation.set(0, aimRad + 0.15, 0);

    rig.rightShoeGroup.position.copy(rightLegIK.effectiveTarget);
    rig.rightShoeGroup.rotation.set(0, aimRad - 0.35 + 0.35 * Math.max(0, coilPhase), 0);

    // Head Tracking
    const desiredWorldYaw = aimRad + (isBackhand ? 0.10 : -0.10) * Math.max(0, 1 - coilPhase);
    const neckCounterYaw = THREE.MathUtils.clamp(desiredWorldYaw - currentChestYaw, -0.95, 0.95);
    const headPitchZ = isOverhead
      ? THREE.MathUtils.lerp(0.45, -0.05, Math.max(0, coilPhase))
      : THREE.MathUtils.clamp((hitZ - 1.35) * 0.32, -0.28, 0.28);

    rig.headGroup.rotation.set(0, neckCounterYaw, headPitchZ);

    rig.contactDropLine.position.copy(contactPos);
    rig.contactDropLine.scale.set(1, hitZ, 1);
    rig.contactDropLine.computeLineDistances();
    rig.contactFloorRing.position.set(contactPos.x, 0.004, contactPos.z);
  }

  /**
   * Updates Player A (Near -X) and (when in Rally / Tactics mode) Player B (Far +X) at time `currentTime`!
   * - In Solo Mode (`this.soloMode === true`), only Player A is visible on court (`playerB.root.visible = false`).
   * - In Rally / Tactics Mode (`this.soloMode === false`), both players are active and the receiver runs to intercept.
   */
  updatePlayerAndRacket(params, currentTime = 0, simResult = null) {
    if (this.soloMode) {
      this.playerA.root.visible = true;
      this.playerB.root.visible = false;
      const soloTau = THREE.MathUtils.clamp(currentTime, -0.35, 0.42);
      this._updateSinglePlayerPose(this.playerA, { ...params, side: 'A' }, soloTau, true, 0);
      return;
    }

    this.playerA.root.visible = true;
    this.playerB.root.visible = true;
    const activeSide = params.side || 'A';
    const hitterRig = activeSide === 'B' ? this.playerB : this.playerA;
    const receiverRig = activeSide === 'B' ? this.playerA : this.playerB;

    // 1. Update Active Hitter
    let hitterTau = currentTime;
    let hitterParams = params;
    let hitterStride = 0;

    // After finishing the follow-through (t > 0.48s), hitter smoothly recovers toward center baseline
    if (currentTime > 0.48) {
      const rec = Math.min(1, (currentTime - 0.48) / 0.75);
      const smoothRec = rec * rec * (3 - 2 * rec);
      hitterParams = {
        ...params,
        hitX: THREE.MathUtils.lerp(params.hitX, -11.8, smoothRec * 0.65),
        hitY: THREE.MathUtils.lerp(params.hitY, 0, smoothRec * 0.55),
        hitZ: THREE.MathUtils.lerp(params.hitZ, 1.02, smoothRec)
      };
      hitterTau = THREE.MathUtils.lerp(0.42, -0.18, smoothRec);
      hitterStride = rec < 0.95 ? (currentTime - 0.48) * 14 : 0;
    }
    this._updateSinglePlayerPose(hitterRig, hitterParams, hitterTau, true, hitterStride);

    // 2. Update Receiving Opponent on the Far Side (Running to Intercept & Coiling Backswing!)
    const intercept = simResult && simResult.interceptPoint ? simResult.interceptPoint : null;
    const recSign = activeSide === 'B' ? 1 : -1;
    const targetHitX = intercept ? recSign * intercept.worldX : -11.8;
    const targetHitY = intercept ? recSign * intercept.worldY : -params.hitY * 0.5;
    const targetHitZ = intercept ? intercept.z : 1.05;
    const tIntercept = intercept ? intercept.t : 1.15;

    const startReadyX = -11.85;
    const startReadyY = THREE.MathUtils.clamp(-params.hitY * 0.25, -1.8, 1.8);
    const isStaticPreview = Math.abs(currentTime) < 1e-4;
    const runProgress = isStaticPreview
      ? 1
      : currentTime < 0
      ? 0
      : THREE.MathUtils.clamp(currentTime / Math.max(0.35, tIntercept - 0.12), 0, 1);
    const smoothMove = runProgress * runProgress * (3 - 2 * runProgress);

    const currRecX = THREE.MathUtils.lerp(startReadyX, targetHitX, smoothMove);
    const currRecY = THREE.MathUtils.lerp(startReadyY, targetHitY, smoothMove);
    const currRecZ = THREE.MathUtils.lerp(1.02, targetHitZ, smoothMove);

    // As ball approaches tIntercept (from tIntercept - 0.35s to tIntercept + 0.35s), receiver coils and swings!
    const receiverTau = isStaticPreview
      ? 0
      : THREE.MathUtils.clamp(currentTime - tIntercept, -0.35, 0.42);
    const isRunning =
      !isStaticPreview &&
      runProgress > 0.02 &&
      runProgress < 0.96 &&
      Math.hypot(targetHitX - startReadyX, targetHitY - startReadyY) > 0.4;
    const receiverStride = isRunning ? currentTime * 16 : 0;

    this._updateSinglePlayerPose(
      receiverRig,
      {
        hitX: currRecX,
        hitY: currRecY,
        hitZ: currRecZ,
        strokeType: currRecY > 0.35 ? 'bh2' : 'fh',
        swingPathDeg: intercept && intercept.nextIncomingSpinRpm < -500 ? 28 : 24,
        faceAngleDeg: -1.5,
        aimAngleDeg: currRecY > 0 ? -6.5 : 6.5
      },
      receiverTau,
      false,
      receiverStride
    );
  }

  updateTrajectory(simResult, ghostSimResult = null) {
    while (this.trajGroup.children.length > 0) {
      const child = this.trajGroup.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
      this.trajGroup.remove(child);
    }

    if (simResult.incomingPreviewPoints && simResult.incomingPreviewPoints.length >= 2) {
      const inPts = simResult.incomingPreviewPoints.map((p) => physToThree(p.x, p.y, p.z));
      const inCurve = new THREE.CatmullRomCurve3(inPts);
      const inGeo = new THREE.TubeGeometry(inCurve, 28, 0.022, 8, false);
      const inMat = new THREE.MeshBasicMaterial({
        color: 0xea580c,
        transparent: true,
        opacity: 0.68
      });
      this.trajGroup.add(new THREE.Mesh(inGeo, inMat));
    }

    const prePoints = [];
    const postPoints = [];

    for (const pt of simResult.points) {
      const v = physToThree(pt.x, pt.y, pt.z);
      if (pt.phase === 0) {
        prePoints.push(v);
      } else {
        if (postPoints.length === 0 && prePoints.length > 0) {
          postPoints.push(prePoints[prePoints.length - 1].clone());
        }
        postPoints.push(v);
      }
    }

    if (prePoints.length >= 2) {
      const curve1 = new THREE.CatmullRomCurve3(prePoints);
      const geo1 = new THREE.TubeGeometry(curve1, Math.min(160, prePoints.length), 0.032, 10, false);
      const mat1 = new THREE.MeshStandardMaterial({
        color: 0x84cc16,
        emissive: 0x65a30d,
        emissiveIntensity: 0.45,
        roughness: 0.3
      });
      this.trajGroup.add(new THREE.Mesh(geo1, mat1));
    }

    if (postPoints.length >= 2) {
      const curve2 = new THREE.CatmullRomCurve3(postPoints);
      const geo2 = new THREE.TubeGeometry(curve2, Math.min(100, postPoints.length), 0.026, 8, false);
      const mat2 = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        emissive: 0x0369a1,
        emissiveIntensity: 0.35,
        roughness: 0.3
      });
      this.trajGroup.add(new THREE.Mesh(geo2, mat2));
    }

    const shadowPts = simResult.points.map((pt) => new THREE.Vector3(pt.x, 0.003, -pt.y));
    if (shadowPts.length >= 2) {
      const shadowGeo = new THREE.BufferGeometry().setFromPoints(shadowPts);
      const shadowMat = new THREE.LineBasicMaterial({
        color: 0x0f172a,
        transparent: true,
        opacity: 0.42
      });
      this.trajGroup.add(new THREE.Line(shadowGeo, shadowMat));
    }

    if (ghostSimResult && this.showGhostNoSpin && ghostSimResult.points.length >= 2) {
      const ghostPts = ghostSimResult.points
        .filter((p) => p.phase === 0)
        .map((pt) => physToThree(pt.x, pt.y, pt.z));
      if (ghostPts.length >= 2) {
        const ghostGeo = new THREE.BufferGeometry().setFromPoints(ghostPts);
        const ghostMat = new THREE.LineDashedMaterial({
          color: 0x64748b,
          dashSize: 0.18,
          gapSize: 0.12,
          transparent: true,
          opacity: 0.65
        });
        const ghostLine = new THREE.Line(ghostGeo, ghostMat);
        ghostLine.computeLineDistances();
        this.trajGroup.add(ghostLine);
      }
    }

    if (simResult.firstBounce) {
      const b = simResult.firstBounce;
      this.bounceSpotMesh.visible = true;
      this.bounceRingMesh.visible = true;
      this.bounceSpotMesh.position.set(b.x, 0.005, -b.y);
      this.bounceRingMesh.position.set(b.x, 0.005, -b.y);
      this.bounceSpotMesh.scale.set(1.45, 1, 0.85);
      const colorHex = b.isIn ? 0x16a34a : 0xdc2626;
      this.bounceSpotMat.color.setHex(colorHex);
      this.bounceRingMat.color.setHex(colorHex);
    } else {
      this.bounceSpotMesh.visible = false;
      this.bounceRingMesh.visible = false;
    }

    if (this.soloMode && simResult.secondBounce) {
      const sb = simResult.secondBounce;
      this.interceptRingMesh.visible = true;
      this.interceptRingMesh.position.set(sb.x, 0.005, -sb.y);
    } else if (!this.soloMode && simResult.interceptPoint && simResult.firstBounce && simResult.firstBounce.isIn) {
      const ip = simResult.interceptPoint;
      this.interceptRingMesh.visible = true;
      this.interceptRingMesh.position.set(ip.worldX, 0.005, -ip.worldY);
    } else {
      this.interceptRingMesh.visible = false;
    }

    if (simResult.netPassPoint) {
      const np = simResult.netPassPoint;
      this.netGaugeLine.visible = true;
      const posArr = this.netGaugeLine.geometry.attributes.position.array;
      posArr[0] = 0;
      posArr[1] = np.netHeightAtY;
      posArr[2] = -np.y;
      posArr[3] = 0;
      posArr[4] = np.z;
      posArr[5] = -np.y;
      this.netGaugeLine.geometry.attributes.position.needsUpdate = true;
      this.netGaugeMat.color.setHex(simResult.hitNet ? 0xdc2626 : 0x0284c7);
    } else {
      this.netGaugeLine.visible = false;
    }
  }

  updateBallAtFrame(point, preContactState = null) {
    if (preContactState && preContactState.t < 0) {
      const {
        side = 'A',
        t,
        hitX,
        hitY,
        hitZ,
        incomingSpeedKmh = 52,
        incomingAngleDeg = -11,
        incomingSpinRpm = 1800
      } = preContactState;
      const sign = side === 'B' ? -1 : 1;
      const isOverhead = hitZ > 1.95 || incomingSpeedKmh < 2;
      let bx = hitX;
      let by = hitY;
      let bz = hitZ;

      if (isOverhead) {
        bz = Math.max(0.85, hitZ - 4.9 * t * t + 0.35 * t);
      } else {
        const vin = incomingSpeedKmh / 3.6;
        const inRad = (incomingAngleDeg * Math.PI) / 180;
        bx = hitX - vin * Math.cos(inRad) * t;
        bz = hitZ + vin * Math.sin(inRad) * t - 0.5 * 9.80665 * t * t;
        if (bz < ITF_COURT.ballRadius) {
          bz = ITF_COURT.ballRadius + (ITF_COURT.ballRadius - bz) * 1.15;
        }
      }

      const pos = physToThree(sign * bx, sign * by, bz);
      this.ballGroup.position.copy(pos);
      this.ballGroundShadow.position.set(pos.x, 0.004, pos.z);
      this.ballHeightLine.position.set(pos.x, 0, pos.z);
      this.ballHeightLine.scale.set(1, bz, 1);

      const wIn = (incomingSpinRpm * 2 * Math.PI) / 60;
      this.ballMesh.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, sign * 1), wIn * t);

      this.velArrow.visible = false;
      this.magnusArrow.visible = false;
      return;
    }

    if (!point) return;
    const pos = physToThree(point.x, point.y, point.z);
    this.ballGroup.position.copy(pos);

    this.ballGroundShadow.position.set(pos.x, 0.004, pos.z);
    const heightScale = Math.max(0.35, 1.2 - point.z * 0.25);
    this.ballGroundShadow.scale.setScalar(heightScale * (this.ballVisualScale * 0.7));

    this.ballHeightLine.position.set(pos.x, 0, pos.z);
    this.ballHeightLine.scale.set(1, point.z, 1);

    const spinAxis = new THREE.Vector3(point.wx, point.wz, -point.wy);
    if (spinAxis.lengthSq() > 1e-4) {
      spinAxis.normalize();
      this.ballMesh.quaternion.setFromAxisAngle(spinAxis, point.spinAngleRad);
    }

    this.velArrow.visible = this.showVectors;
    this.magnusArrow.visible = this.showVectors && point.fMagnus > 0.01;

    if (this.showVectors) {
      const velVec = new THREE.Vector3(point.vx, point.vz, -point.vy);
      const speed = velVec.length();
      if (speed > 0.1) {
        this.velArrow.setDirection(velVec.clone().normalize());
        this.velArrow.setLength(Math.min(2.2, 0.35 + speed * 0.038), 0.18, 0.09);
      }

      const omegaThree = new THREE.Vector3(point.wx, point.wz, -point.wy);
      const magDir = new THREE.Vector3().crossVectors(omegaThree, velVec);
      if (magDir.lengthSq() > 1e-4 && point.fMagnus > 0.01) {
        magDir.normalize();
        this.magnusArrow.setDirection(magDir);
        this.magnusArrow.setLength(Math.min(1.8, 0.28 + point.fMagnus * 1.4), 0.16, 0.08);
      }
    }
  }

  setBallVisualScale(scale) {
    this.ballVisualScale = scale;
    this.ballMesh.scale.setScalar(scale);
  }

  setCameraPreset(presetName, simResult, hitParams) {
    const sign = hitParams.side === 'B' ? -1 : 1;
    const p = physToThree(sign * hitParams.hitX, sign * hitParams.hitY, hitParams.hitZ);
    const strokeType = this._resolveStrokeType(
      hitParams.strokeType,
      hitParams.hitY,
      hitParams.hitZ,
      hitParams.swingPathDeg
    );
    const sideFlip = strokeType === 'bh2' || strokeType === 'bh1' ? -1 : 1;

    if (presetName === 'broadcast') {
      this.camera.position.set(sign * -19.5, 6.2, sign * 3.5);
      this.controls.target.set(sign * -0.5, 0.8, 0);
    } else if (presetName === 'player_closeup') {
      this.camera.position.set(
        p.x - sign * 1.75,
        Math.max(1.38, p.y + 0.35),
        p.z + sign * sideFlip * 1.85
      );
      this.controls.target.set(
        p.x - sign * 0.08,
        Math.max(0.95, p.y - 0.05),
        p.z - sign * sideFlip * 0.32
      );
    } else if (presetName === 'side') {
      this.camera.position.set(0, 2.8, 18.0);
      this.controls.target.set(0, 1.1, 0);
    } else if (presetName === 'player_pov') {
      this.camera.position.set(
        p.x - sign * 3.2,
        p.y + 0.75,
        p.z + sign * sideFlip * 0.85
      );
      this.controls.target.set(sign * 4.0, 0.6, 0);
    } else if (presetName === 'hawkeye' && simResult && simResult.firstBounce) {
      const b = simResult.firstBounce;
      this.camera.position.set(b.x - sign * 1.8, 1.35, -b.y + 1.8);
      this.controls.target.set(b.x, 0.02, -b.y);
    } else if (presetName === 'net_closeup' && simResult && simResult.netPassPoint) {
      const np = simResult.netPassPoint;
      this.camera.position.set(-1.6, Math.max(1.25, np.z + 0.25), -np.y + 2.4);
      this.controls.target.set(0, np.netHeightAtY + 0.15, -np.y);
    } else if (presetName === 'top') {
      this.camera.position.set(0, 25.5, 0.01);
      this.controls.target.set(0, 0, 0);
    }
    this.controls.update();
  }

  _animateLoop() {
    requestAnimationFrame(() => this._animateLoop());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

/**
 * Dedicated Interactive 3D WebGL Racket-Ball Impact & Stringbed Deflection Studio
 * Renders onto `#racketImpactCanvas` with 360° OrbitControls, 3D pocketed 16x19 stringbed,
 * 3D compressed spinning tennis ball, and 3D volumetric vectors (Swing Path, Launch, Face Normal, Incoming).
 */
export class RacketImpact3DStudio {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf3ede1);

    const w = canvasEl.clientWidth || 356;
    const h = canvasEl.clientHeight || 190;

    this.camera = new THREE.PerspectiveCamera(34, w / h, 0.02, 15);
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvasEl,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(w, h, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.controls = new OrbitControls(this.camera, canvasEl);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 0.34;
    this.controls.maxDistance = 1.15;

    this.spinPhase = 0;
    this.currentParams = null;

    this._initLightsAndStudioFloor();
    this._init3DRacketAndBall();
    this._init3DVectors();
    this.setViewMode('iso');

    this._onResize = () => {
      if (!this.canvas) return;
      const cw = this.canvas.clientWidth;
      const ch = this.canvas.clientHeight;
      if (cw === 0 || ch === 0) return;
      this.camera.aspect = cw / ch;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(cw, ch, false);
    };
    window.addEventListener('resize', this._onResize);
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(() => this._onResize()).observe(this.canvas);
    }
  }

  _initLightsAndStudioFloor() {
    this.scene.add(new THREE.AmbientLight(0xfaf5eb, 0.92));

    const keyLight = new THREE.DirectionalLight(0xfff8eb, 1.55);
    keyLight.position.set(1.2, 1.8, 2.2);
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xdbeafe, 0.75);
    rimLight.position.set(-1.5, -0.8, -1.6);
    this.scene.add(rimLight);

    // Subtle 3D Studio Floor Grid & Horizontal Datum Circle
    const grid = new THREE.GridHelper(1.2, 14, 0xc7bca8, 0xe2dacb);
    grid.position.y = -0.19;
    this.scene.add(grid);

    const datumRingGeo = new THREE.RingGeometry(0.21, 0.215, 48);
    datumRingGeo.rotateX(-Math.PI / 2);
    const datumRingMat = new THREE.MeshBasicMaterial({
      color: 0xb5a892,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55
    });
    const datumRing = new THREE.Mesh(datumRingGeo, datumRingMat);
    datumRing.position.y = -0.188;
    this.scene.add(datumRing);
  }

  _init3DRacketAndBall() {
    // Root pivot at Sweetspot (0, 0, 0)
    // In this 3D Studio coordinate system:
    // +Z is forward toward the net (outgoing direction),
    // +Y is vertical up,
    // +X is right (so the racket handle extends toward -X for a horizontal forehand!)
    this.racketRoot = new THREE.Group();
    this.scene.add(this.racketRoot);

    this.racketPostureGroup = new THREE.Group();
    this.racketRoot.add(this.racketPostureGroup);

    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      metalness: 0.45,
      roughness: 0.28
    });
    const crimsonMat = new THREE.MeshStandardMaterial({
      color: 0xbe123c,
      metalness: 0.55,
      roughness: 0.22
    });
    const champagneGoldMat = new THREE.MeshStandardMaterial({
      color: 0xc5a059,
      metalness: 0.72,
      roughness: 0.22
    });
    const gripWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf7f4ed,
      roughness: 0.62
    });

    // Elliptical Horizontal Hoop (Major radius along X = 0.168, Minor radius along Y = 0.128)
    this.rxHoop = 0.168;
    this.ryHoop = 0.128;

    const hoopGroup = new THREE.Group();
    hoopGroup.scale.set(this.rxHoop / 0.135, this.ryHoop / 0.135, 1.0);

    const mainTorus = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.0115, 20, 64), carbonMat);
    hoopGroup.add(mainTorus);

    // PWS crimson accents at top & bottom (+Y / -Y)
    const pwsArcTop = new THREE.Mesh(
      new THREE.TorusGeometry(0.135, 0.0124, 16, 28, 0.68),
      crimsonMat
    );
    pwsArcTop.rotation.z = Math.PI * 0.5 - 0.34;
    const pwsArcBot = new THREE.Mesh(
      new THREE.TorusGeometry(0.135, 0.0124, 16, 28, 0.68),
      crimsonMat
    );
    pwsArcBot.rotation.z = -Math.PI * 0.5 - 0.34;
    hoopGroup.add(pwsArcTop, pwsArcBot);

    // Champagne Gold inner rim accent
    const goldInner = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.0022, 10, 56), champagneGoldMat);
    hoopGroup.add(goldInner);

    this.racketPostureGroup.add(hoopGroup);

    // V-Throat Bridge & Octagonal Handle on the Left (-X)
    const shaftGeo = new THREE.CylinderGeometry(0.0085, 0.010, 0.145, 14);
    shaftGeo.rotateZ(Math.PI / 2);

    const topShaft = new THREE.Mesh(shaftGeo, carbonMat);
    topShaft.position.set(-this.rxHoop - 0.055, 0.032, 0);
    topShaft.rotation.z = 0.23;

    const botShaft = new THREE.Mesh(shaftGeo, carbonMat);
    botShaft.position.set(-this.rxHoop - 0.055, -0.032, 0);
    botShaft.rotation.z = -0.23;

    const bridgePiece = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.078, 0.018), champagneGoldMat);
    bridgePiece.position.set(-this.rxHoop - 0.004, 0, 0);

    const handleGeo = new THREE.CylinderGeometry(0.016, 0.0175, 0.18, 8);
    handleGeo.rotateZ(Math.PI / 2);
    const handleMesh = new THREE.Mesh(handleGeo, gripWhiteMat);
    handleMesh.position.set(-this.rxHoop - 0.195, 0, 0);

    const buttCapGeo = new THREE.CylinderGeometry(0.020, 0.019, 0.018, 8);
    buttCapGeo.rotateZ(Math.PI / 2);
    const buttCap = new THREE.Mesh(buttCapGeo, carbonMat);
    buttCap.position.set(-this.rxHoop - 0.285, 0, 0);

    this.racketPostureGroup.add(topShaft, botShaft, bridgePiece, handleMesh, buttCap);

    // Sweetspot Glowing Aura Disc
    const sweetGeo = new THREE.CircleGeometry(0.095, 32);
    sweetGeo.scale(1.25, 0.95, 1.0);
    const sweetMat = new THREE.MeshBasicMaterial({
      color: 0x84cc16,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.sweetspotDisc = new THREE.Mesh(sweetGeo, sweetMat);
    this.racketPostureGroup.add(this.sweetspotDisc);

    // Dynamic 3D 16x19 Stringbed Geometry (updates vertices on impact to show 3D stringbed pocketing!)
    this.stringBedGroup = new THREE.Group();
    this.racketPostureGroup.add(this.stringBedGroup);
    this.stringGeo = new THREE.BufferGeometry();
    this.stringMat = new THREE.LineBasicMaterial({
      color: 0x44403c,
      transparent: true,
      opacity: 0.72
    });
    this.stringLines = new THREE.LineSegments(this.stringGeo, this.stringMat);
    this.stringBedGroup.add(this.stringLines);

    // Pro Tour Red 'T' Stencil in 3D on the strings
    this.stencilGeo = new THREE.BufferGeometry();
    const stencilMat = new THREE.LineBasicMaterial({ color: 0xbe123c, linewidth: 2 });
    this.stencilLines = new THREE.LineSegments(this.stencilGeo, stencilMat);
    this.stringBedGroup.add(this.stencilLines);

    // 3D Compressed Spinning Tennis Ball at Impact
    this.ballPivot = new THREE.Group();
    this.racketRoot.add(this.ballPivot);

    const ballCanvas = document.createElement('canvas');
    ballCanvas.width = 256;
    ballCanvas.height = 128;
    const bctx = ballCanvas.getContext('2d');
    bctx.fillStyle = '#d9f926';
    bctx.fillRect(0, 0, 256, 128);
    bctx.strokeStyle = '#ffffff';
    bctx.lineWidth = 10;
    bctx.beginPath();
    for (let px = 0; px <= 256; px += 4) {
      const u = (px / 256) * Math.PI * 2;
      const py = 64 + Math.sin(u * 2) * 36;
      if (px === 0) bctx.moveTo(px, py);
      else bctx.lineTo(px, py);
    }
    bctx.stroke();

    const ballTex = new THREE.CanvasTexture(ballCanvas);
    this.ballMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.036, 28, 28),
      new THREE.MeshStandardMaterial({
        map: ballTex,
        roughness: 0.5,
        emissive: 0x4d7c0f,
        emissiveIntensity: 0.14
      })
    );
    // Slight compression along Z against stringbed
    this.ballMesh.scale.set(1.04, 1.04, 0.86);
    this.ballPivot.add(this.ballMesh);

    // 3D Curved Spin Orbit Ring + Cone around the Ball
    this.spinRingGroup = new THREE.Group();
    this.ballPivot.add(this.spinRingGroup);
    this.spinRingMat = new THREE.MeshStandardMaterial({
      color: 0xbe123c,
      roughness: 0.3
    });
    const spinArc = new THREE.Mesh(
      new THREE.TorusGeometry(0.048, 0.0026, 10, 32, Math.PI * 1.35),
      this.spinRingMat
    );
    spinArc.rotation.y = Math.PI / 2;
    const spinCone = new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.018, 12), this.spinRingMat);
    spinCone.position.set(0, -0.025, -0.041);
    spinCone.rotation.x = -0.9;
    this.spinRingGroup.add(spinArc, spinCone);
  }

  _createVolumetricArrow(colorHex, shaftRadius = 0.0045) {
    const grp = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.3,
      metalness: 0.15
    });
    const shaftGeo = new THREE.CylinderGeometry(shaftRadius, shaftRadius, 1, 12);
    shaftGeo.translate(0, 0.5, 0);
    const shaft = new THREE.Mesh(shaftGeo, mat);

    const headGeo = new THREE.ConeGeometry(shaftRadius * 2.9, 0.036, 14);
    headGeo.translate(0, 0.018, 0);
    const head = new THREE.Mesh(headGeo, mat);

    grp.add(shaft, head);
    grp.userData = { shaft, head };
    this.scene.add(grp);
    return grp;
  }

  _setVolumetricArrow(arrowGrp, originVec, dirVec, length) {
    if (length <= 0.01) {
      arrowGrp.visible = false;
      return;
    }
    arrowGrp.visible = true;
    arrowGrp.position.copy(originVec);
    const normDir = dirVec.clone().normalize();
    arrowGrp.quaternion.setFromUnitVectors(UP_VEC, normDir);
    const shaftLen = Math.max(0.02, length - 0.036);
    arrowGrp.userData.shaft.scale.set(1, shaftLen, 1);
    arrowGrp.userData.head.position.set(0, shaftLen, 0);
  }

  _init3DVectors() {
    // 1. Racket Swing Path Vector (Crimson)
    this.swingArrow = this._createVolumetricArrow(0xbe123c, 0.0048);
    // 2. Outgoing Ball Launch Vector (Championship Forest Green)
    this.launchArrow = this._createVolumetricArrow(0x15803d, 0.0055);
    // 3. Incoming Ball Vector (Warm Amber)
    this.incomingArrow = this._createVolumetricArrow(0xd97706, 0.0040);
    // 4. Racket Face Normal Vector (Warm Slate)
    this.normalArrow = this._createVolumetricArrow(0x57534e, 0.0034);
  }

  /**
   * Rebuilds the 3D 16x19 stringbed with a realistic 3D pocket deflection around `(cx, cy)`
   */
  _update3DStringbedPocket(cx, cy, pocketDepth = 0.024) {
    const rx = this.rxHoop - 0.008;
    const ry = this.ryHoop - 0.008;
    const verts = [];

    const pocketZ = (x, y) => {
      const dx = x - cx;
      const dy = y - cy;
      const distSq = dx * dx + dy * dy;
      const rimFactor = Math.max(0, 1 - (x * x) / (rx * rx) - (y * y) / (ry * ry));
      return -pocketDepth * Math.exp(-distSq / 0.0048) * rimFactor;
    };

    // 19 vertical strings across X
    const numV = 19;
    const segs = 12;
    for (let i = 1; i <= numV; i++) {
      const u = -1 + (2 * i) / (numV + 1);
      const x = u * rx;
      const maxY = ry * Math.sqrt(Math.max(0, 1 - u * u));
      for (let s = 0; s < segs; s++) {
        const y0 = -maxY + (s / segs) * (2 * maxY);
        const y1 = -maxY + ((s + 1) / segs) * (2 * maxY);
        verts.push(x, y0, pocketZ(x, y0), x, y1, pocketZ(x, y1));
      }
    }

    // 16 horizontal strings across Y
    const numH = 16;
    for (let j = 1; j <= numH; j++) {
      const v = -1 + (2 * j) / (numH + 1);
      const y = v * ry;
      const maxX = rx * Math.sqrt(Math.max(0, 1 - v * v));
      for (let s = 0; s < segs; s++) {
        const x0 = -maxX + (s / segs) * (2 * maxX);
        const x1 = -maxX + ((s + 1) / segs) * (2 * maxX);
        verts.push(x0, y, pocketZ(x0, y), x1, y, pocketZ(x1, y));
      }
    }

    this.stringGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));

    // Update 3D 'T' Stencil on pocketed stringbed
    const sVerts = [
      0.032, -0.042, pocketZ(0.032, -0.042) + 0.001,
      0.032, 0.042, pocketZ(0.032, 0.042) + 0.001,
      0.032, 0, pocketZ(0.032, 0) + 0.001,
      -0.052, 0, pocketZ(-0.052, 0) + 0.001
    ];
    this.stencilGeo.setAttribute('position', new THREE.Float32BufferAttribute(sVerts, 3));
  }

  /**
   * Sets the 3D camera angle for the Racket Impact Studio ('iso' | 'front' | 'side')
   */
  setViewMode(mode) {
    this.viewMode = mode;
    if (mode === 'front') {
      this.camera.position.set(0.02, 0.03, 0.62);
      this.controls.target.set(-0.02, 0.0, 0.0);
    } else if (mode === 'side') {
      this.camera.position.set(0.62, 0.03, 0.08);
      this.controls.target.set(0.0, 0.0, 0.04);
    } else {
      // 'iso': True 3D Isometric Oblique View showing horizontal stringbed + V-throat + 3D vectors + stringbed pocket
      this.camera.position.set(0.26, 0.14, 0.52);
      this.controls.target.set(-0.02, 0.0, 0.02);
    }
    this.controls.update();
  }

  /**
   * Updates the 3D Racket posture, 3D stringbed pocket, ball impact offset, and 3D vector arrows
   */
  updateFromState(state) {
    this.currentParams = state;
    const deg2rad = Math.PI / 180;
    const {
      swingPathDeg = 25,
      faceAngleDeg = -2,
      aimAngleDeg = 7,
      launchAngleDeg = 8,
      incomingSpeedKmh = 54,
      incomingAngleDeg = -10,
      racketSpeedKmh = 92,
      stringTensionKg = 23,
      hitZ = 1.05
    } = state;

    const isServe = hitZ > 1.95;
    const faceRad = faceAngleDeg * deg2rad;
    const yawRad = THREE.MathUtils.clamp(aimAngleDeg * deg2rad, -0.48, 0.48);
    const swingRad = swingPathDeg * deg2rad;
    const outRad = launchAngleDeg * deg2rad;
    const attackDeg = swingPathDeg - faceAngleDeg;

    // Orient racket: horizontal (0) for groundstrokes, vertical (-PI/2) for overhead serves
    this.racketPostureGroup.rotation.z = isServe ? -Math.PI / 2 : 0;

    // Apply 3D Face Tilt (pitch around X) & Horizontal Aim (yaw around Y)
    this.racketRoot.rotation.set(-faceRad, yawRad, 0, 'YXZ');

    // Compute contact offset on stringbed & 3D pocket depth
    const contactX = THREE.MathUtils.clamp(Math.sin(yawRad) * 0.045, -0.045, 0.045);
    const contactY = THREE.MathUtils.clamp(-attackDeg * 0.0012, -0.042, 0.042);
    const pocketDepth = THREE.MathUtils.clamp(
      0.016 + (racketSpeedKmh / 140) * 0.014 - (stringTensionKg - 23) * 0.0008,
      0.012,
      0.034
    );

    this._update3DStringbedPocket(contactX, contactY, pocketDepth);

    // Place 3D compressed ball inside the pocket
    this.ballPivot.position.set(contactX, contactY, 0.028 - pocketDepth * 0.45);
    this.spinRingGroup.rotation.z = state.topspinRpm >= 0 ? 0 : Math.PI;
    this.spinRingMat.color.setHex(state.topspinRpm >= 0 ? 0xbe123c : 0x0284c7);

    // Update 3D World Vectors
    const ballWorldPos = new THREE.Vector3();
    this.ballPivot.getWorldPosition(ballWorldPos);

    // 1. Face Normal Vector (perpendicular to stringbed +Z in racketRoot frame)
    const normalDir = new THREE.Vector3(0, 0, 1).applyEuler(this.racketRoot.rotation);
    this._setVolumetricArrow(this.normalArrow, new THREE.Vector3(0, 0, 0), normalDir, 0.16);

    // 2. Swing Path Vector (Crimson)
    const swingDir = new THREE.Vector3(
      Math.sin(yawRad) * Math.cos(swingRad),
      Math.sin(swingRad),
      Math.cos(yawRad) * Math.cos(swingRad)
    );
    this._setVolumetricArrow(this.swingArrow, new THREE.Vector3(0, 0, 0), swingDir, 0.21);

    // 3. Outgoing Ball Launch Vector (Championship Green)
    const outDir = new THREE.Vector3(
      Math.sin(yawRad) * Math.cos(outRad),
      Math.sin(outRad),
      Math.cos(yawRad) * Math.cos(outRad)
    );
    this._setVolumetricArrow(this.launchArrow, ballWorldPos, outDir, 0.25);

    // 4. Incoming Ball Vector (Warm Amber, pointing toward the ball)
    if (!isServe && incomingSpeedKmh >= 2) {
      const inRad = incomingAngleDeg * deg2rad;
      const inTravelDir = new THREE.Vector3(0, Math.sin(inRad), -Math.cos(inRad));
      const inStart = ballWorldPos.clone().addScaledVector(inTravelDir, -0.22);
      this._setVolumetricArrow(this.incomingArrow, inStart, inTravelDir, 0.18);
    } else {
      this.incomingArrow.visible = false;
    }
  }

  /**
   * Called each animation frame to spin the 3D ball & render the 3D Racket Impact Studio
   */
  renderStep(dtSec) {
    if (this.currentParams) {
      const rpm = this.currentParams.topspinRpm || 0;
      const visualOmega = (rpm / 550) * Math.PI;
      this.spinPhase += visualOmega * dtSec;
      this.ballMesh.rotation.x = -this.spinPhase;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
