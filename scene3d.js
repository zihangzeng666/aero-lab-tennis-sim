/**
 * High-End 3D Tennis Stadium, Dual Articulated Players (Turn-Based Rally A vs B),
 * Zero-Clipping Biomechanical IK Rig, Pro Tour Racket & Hawk-Eye Visualizer
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ITF_COURT, COURT_SURFACES, getNetHeightAtY } from './physics.js?v=6';

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
    this.scene.fog = new THREE.FogExp2(0xe6dfd1, 0.0052);

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
    const floorGeo = new THREE.PlaneGeometry(90, 64);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.92,
      metalness: 0.02
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = -0.014;
    floorMesh.receiveShadow = true;
    this.courtGroup.add(floorMesh);

    // Tournament Run-Off Apron (36.6m x 18.3m official ITF Grand Slam enclosure)
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

    // Subtle calibration grid outside the apron
    const grid = new THREE.GridHelper(38, 38, 0x64748b, 0x94a3b8);
    grid.position.y = -0.003;
    grid.material.transparent = true;
    grid.material.opacity = 0.16;
    this.courtGroup.add(grid);

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
      color: 0x0f172a,
      roughness: 0.45,
      metalness: 0.25
    });
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
    const sctx = signCanvas.getContext('2d');
    sctx.fillStyle = '#0f291e';
    sctx.fillRect(0, 0, 1024, 128);
    sctx.strokeStyle = '#c5a876';
    sctx.lineWidth = 4;
    sctx.strokeRect(8, 8, 1008, 112);
    sctx.fillStyle = '#f5efe2';
    sctx.font = '700 40px "JetBrains Mono", "Inter", sans-serif';
    sctx.textAlign = 'center';
    sctx.textBaseline = 'middle';
    sctx.fillText('AERO-LAB  ·  MADE BY JASON ZENG  ·  ATP TOUR', 512, 64);

    const signTex = new THREE.CanvasTexture(signCanvas);
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

    // Hawk-Eye Optical Tracking Sensor Pods on the 4 corners
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
    const stickH = getNetHeightAtY(stickY);
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
      const h = getNetHeightAtY(y);
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
      const h = getNetHeightAtY(y) - 0.052;
      wirePoints.push(new THREE.Vector3(0, 0, -y), new THREE.Vector3(0, h, -y));
    }
    for (let r = 1; r <= 7; r++) {
      const rFrac = r / 8;
      for (let i = 0; i < segments; i++) {
        const y0 = -postY + (i / segments) * (2 * postY);
        const y1 = -postY + ((i + 1) / segments) * (2 * postY);
        const h0 = (getNetHeightAtY(y0) - 0.052) * rFrac;
        const h1 = (getNetHeightAtY(y1) - 0.052) * rFrac;
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
      const h = getNetHeightAtY(y);
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

  setCourtSurface(surfaceKey) {
    this.courtMat.map = this._createCourtTexture(surfaceKey, true);
    this.courtMat.needsUpdate = true;
    this.surroundMat.map = this._createCourtTexture(surfaceKey, false);
    this.surroundMat.needsUpdate = true;
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

  /**
   * Evaluates the Zero-Clipping 3D Biomechanical Racket Pose at time `tau` (tau = 0 is impact).
   *
   * Key Anti-Clipping Guarantees:
   * - During follow-through (`s > 0`), `rotY` sweeps smoothly to `-2.05 rad (-117°)` while `rotX` stays negative (`-0.25 -> -0.60`),
   *   so the racket head extends FORWARD across the body first (`x > +0.18m`), and as the hand finishes outside the left shoulder,
   *   the racket head points BACKWARD (`-X`), UPWARD (`+Y`), and OUTWARD-LEFT (`-Z`), NEVER crossing back across the player's neck or face!
   */
  _evaluateSwingPoseAtTime(tau, swingPathDeg, faceAngleDeg, hitZ) {
    const deg2rad = Math.PI / 180;
    const swingRad = swingPathDeg * deg2rad;
    const faceRad = faceAngleDeg * deg2rad;
    const isOverhead = hitZ > 1.95;

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
      // MODERN ATP TOPSPIN FOREHAND (Zero-Clipping Circular Wrap Over Left Shoulder)
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

    const euler = new THREE.Euler(rotX, rotY, rotZ, 'ZYX');
    const quat = new THREE.Quaternion().setFromEuler(euler);
    return { pos, quat };
  }

  _rebuildSwingTrailRibbon(rig, swingPathDeg, faceAngleDeg, hitZ) {
    while (rig.swingTrailGroup.children.length > 0) {
      const c = rig.swingTrailGroup.children[0];
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
      rig.swingTrailGroup.remove(c);
    }

    const samples = 44;
    const centerPts = [];
    const ribbonPositions = [];
    const ribbonColors = [];
    const ribbonIndices = [];

    for (let i = 0; i <= samples; i++) {
      const tau = -0.34 + (i / samples) * (0.34 + 0.38);
      const pose = this._evaluateSwingPoseAtTime(tau, swingPathDeg, faceAngleDeg, hitZ);
      centerPts.push(pose.pos.clone());

      const topOffset = new THREE.Vector3(0, 0.11, 0).applyQuaternion(pose.quat);
      const botOffset = new THREE.Vector3(0, -0.11, 0).applyQuaternion(pose.quat);
      const pTop = pose.pos.clone().add(topOffset);
      const pBot = pose.pos.clone().add(botOffset);

      ribbonPositions.push(pBot.x, pBot.y, pBot.z, pTop.x, pTop.y, pTop.z);

      const distFromImpact = Math.abs(tau);
      const c = new THREE.Color().lerpColors(
        new THREE.Color(0x84cc16),
        new THREE.Color(0xe11d48),
        Math.min(1, distFromImpact * 3.8)
      );
      ribbonColors.push(c.r, c.g, c.b, c.r, c.g, c.b);
    }

    for (let i = 0; i < samples; i++) {
      const b0 = 2 * i;
      const t0 = 2 * i + 1;
      const b1 = 2 * (i + 1);
      const t1 = 2 * (i + 1) + 1;
      ribbonIndices.push(b0, t0, b1, t0, t1, b1);
    }

    const ribGeo = new THREE.BufferGeometry();
    ribGeo.setAttribute('position', new THREE.Float32BufferAttribute(ribbonPositions, 3));
    ribGeo.setAttribute('color', new THREE.Float32BufferAttribute(ribbonColors, 3));
    ribGeo.setIndex(ribbonIndices);
    ribGeo.computeVertexNormals();

    const ribMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.22,
      depthWrite: false
    });
    rig.swingTrailGroup.add(new THREE.Mesh(ribGeo, ribMat));

    const lineGeo = new THREE.BufferGeometry().setFromPoints(centerPts);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xe11d48, transparent: true, opacity: 0.85 });
    rig.swingTrailGroup.add(new THREE.Line(lineGeo, lineMat));
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
  _updateSinglePlayerPose(rig, localParams, tau, showTrail = true, runningStridePhase = 0) {
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
    const isOverhead = hitZ > 1.95;

    rig.swingTrailGroup.visible = showTrail;
    rig.impactPlaneIndicator.visible = showTrail;
    rig.contactDropLine.visible = showTrail;
    rig.contactFloorRing.visible = showTrail;
    rig.faceNormalArrow.visible = showTrail && this.showVectors;

    if (showTrail) {
      const trailKey = `${swingPathDeg.toFixed(1)}_${faceAngleDeg.toFixed(1)}_${isOverhead}`;
      if (rig._lastTrailKey !== trailKey) {
        rig._lastTrailKey = trailKey;
        this._rebuildSwingTrailRibbon(rig, swingPathDeg, faceAngleDeg, hitZ);
      }
    }

    rig.contactPivot.position.copy(contactPos);
    rig.contactPivot.rotation.set(0, aimRad, 0);

    const impactPose0 = this._evaluateSwingPoseAtTime(0, swingPathDeg, faceAngleDeg, hitZ);
    rig.impactPlaneIndicator.quaternion.copy(impactPose0.quat);

    const flashAlpha = showTrail ? Math.max(0, 1 - Math.abs(tau) * 18) : 0;
    rig.impactFlashMat.opacity = flashAlpha * 0.75;
    rig.impactFlashRing.scale.setScalar(0.7 + (1 - flashAlpha) * 0.9);

    const swingPose = this._evaluateSwingPoseAtTime(tau, swingPathDeg, faceAngleDeg, hitZ);
    rig.racketGroup.position.copy(swingPose.pos);
    rig.racketGroup.quaternion.copy(swingPose.quat);

    // Kinetic Chain Uncoiling Progress: coilPhase in [-1 (takeback), 0 (impact), +1 (follow-through)]
    const s = THREE.MathUtils.clamp(tau, -0.35, 0.42);
    const coilPhase = s < 0 ? s / 0.35 : s / 0.42;

    const fwdDir = new THREE.Vector3(Math.cos(aimRad), 0, -Math.sin(aimRad));
    const rightDir = new THREE.Vector3(Math.sin(aimRad), 0, Math.cos(aimRad));

    const stanceBackOffset = isOverhead ? -0.22 : -0.26;
    const stanceSideOffset = isOverhead ? -0.25 : -0.64;
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

    // Full biomechanical torso rotation: -83° at takeback -> +14° at impact -> +73° at follow-through
    // This rotates the Right Shoulder forward toward the net and clears the Left Shoulder backward!
    const totalYawRel =
      coilPhase < 0
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

    let gripRoot = toRootLocal(rig.gripPointLocal, rig.racketGroup);
    let sweetRoot = toRootLocal(new THREE.Vector3(0, 0, 0), rig.racketGroup);

    // Anti-Clipping Step 1: Ensure gripRoot never enters torso or head sphere
    this._pushOutOfTorsoAndHead(gripRoot, pelvisPos, headRoot, fwdDir, rightDir, 0.23, 0.24);

    // Anti-Clipping Step 2: Clamp gripRoot to maxArmReach from rightShoulderRoot (moving racket with hand, NEVER pulling torso into racket!)
    const L = this.rigLengths;
    const maxArmReach = L.upperArm + L.forearm - 0.012;
    const shToGrip = new THREE.Vector3().subVectors(gripRoot, rightShoulderRoot);
    if (shToGrip.length() > maxArmReach && Math.abs(tau) > 0.01) {
      const clampedGrip = rightShoulderRoot.clone().add(shToGrip.setLength(maxArmReach));
      const deltaGrip = new THREE.Vector3().subVectors(clampedGrip, gripRoot);
      const deltaPivotLocal = deltaGrip.clone().applyAxisAngle(UP_VEC, -aimRad);
      rig.racketGroup.position.add(deltaPivotLocal);
      rig.root.updateMatrixWorld(true);
      gripRoot = toRootLocal(rig.gripPointLocal, rig.racketGroup);
      sweetRoot = toRootLocal(new THREE.Vector3(0, 0, 0), rig.racketGroup);
    }

    const throatRoot = toRootLocal(rig.throatPointLocal, rig.racketGroup);

    // Right Arm Two-Bone IK (with elevated forward elbow pole during follow-through)
    const followFactor = Math.max(0, coilPhase);
    const rightElbowPole = rightDir
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

    // Left Balance / Catch Arm Two-Bone IK (stays strictly outside chest cylinder!)
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
    this._pushOutOfTorsoAndHead(leftHandTarget, pelvisPos, headRoot, fwdDir, rightDir, 0.25, 0.24);

    const leftElbowPole = chestLeftRoot
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

    const leftAnkleTarget = stanceGroundCenter
      .clone()
      .addScaledVector(fwdDir, 0.20 + strideSwing)
      .addScaledVector(rightDir, -0.17)
      .setY(0.068 + airborneLift + strideLiftL);

    const rightAnkleTarget = stanceGroundCenter
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
    const desiredWorldYaw = aimRad - 0.10 * Math.max(0, 1 - coilPhase);
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
   * Updates BOTH Player A (Near -X) and Player B (Far +X) at time `currentTime`!
   * - Active Hitter executes the biomechanical wind-up, impact (`t = 0`), follow-through (`t > 0`), and split-step recovery (`t > 0.45s`).
   * - Receiving Opponent on the opposite side of the net dynamically runs from their baseline ready position to intercept the ball at `simResult.interceptPoint`!
   */
  updatePlayerAndRacket(params, currentTime = 0, simResult = null) {
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

    if (simResult.interceptPoint && simResult.firstBounce && simResult.firstBounce.isIn) {
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
    if (presetName === 'broadcast') {
      this.camera.position.set(sign * -19.5, 6.2, sign * 3.5);
      this.controls.target.set(sign * -0.5, 0.8, 0);
    } else if (presetName === 'player_closeup') {
      this.camera.position.set(p.x - sign * 1.65, Math.max(1.35, p.y + 0.35), p.z + sign * 1.85);
      this.controls.target.set(p.x - sign * 0.1, Math.max(0.95, p.y - 0.05), p.z - sign * 0.35);
    } else if (presetName === 'side') {
      this.camera.position.set(0, 2.8, 18.0);
      this.controls.target.set(0, 1.1, 0);
    } else if (presetName === 'player_pov') {
      this.camera.position.set(p.x - sign * 3.2, p.y + 0.75, p.z + sign * 0.85);
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
