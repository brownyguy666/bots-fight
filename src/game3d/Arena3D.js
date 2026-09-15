import { animateRobot, setupRendering, disposeScene } from './visuals.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  buildRobotMesh,
  updatePartDamageVisual,
  createBillboardText,
  createRobotDebrisPieces
} from './RobotBuilder.js';
import { ParticleSystem3D } from './ParticleSystem3D.js';
import { Projectile3D } from './Projectile3D.js';
import { createPartsState, PARTS } from '../data/parts.js';
import { applyDamage, getLocomotionState, isWeaponBroken } from '../ai/damage.js';
import { calculateEffectiveTurnSpeed, calculateEffectiveSpeed } from '../ai/actions.js';
import { evaluateBrain } from '../ai/interpreter.js';
import { BALANCE } from '../data/balance.js';
import { PRESET_ROBOTS } from '../data/preset_brains/presets.js';
import { SFX } from '../audio/sfx.js';
import { BrainViewerPanel } from './BrainViewerPanel.js';
import { ARENA_MAPS } from '../data/arena_maps.js';
import { getTerrainSpeedMultiplier } from '../data/terrain_modifiers.js';
import { createObstaclesGroup, resolveRobotObstacleCollisions, checkLineBlockedByObstacles } from './obstacles.js';
import { NavigationSystem } from '../simulation/navigation.js';
import { SimulationClock } from '../simulation/SimulationClock.js';
import { SignalBus } from '../ai/signals.js';
import { ArenaGenerator } from './ArenaGenerator.js';
import { MatchLogManager } from '../panitia/matchlog.js';

export class Arena3D {
  constructor(containerId, matchConfig = {}, onFinish) {
    this.container = document.getElementById(containerId);
    this.matchConfig = matchConfig;
    this.onFinish = onFinish;

    // Quality preset: 'low' | 'medium' | 'high' (Fase 26)
    this.quality = matchConfig.quality || 'high';

    // Mode permainan: 'eliminasi' | 'ctf' | 'koth' (Fase 21)
    this.gameMode = matchConfig.mode || 'eliminasi';

    // Setup Peta Arena (Fase 20 & 29)
    if (matchConfig.arenaMap) {
      this.arenaMap = matchConfig.arenaMap;
    } else if (matchConfig.arenaId && ARENA_MAPS[matchConfig.arenaId]) {
      this.arenaMap = ARENA_MAPS[matchConfig.arenaId];
    } else if (matchConfig.procedural) {
      this.arenaMap = ArenaGenerator.generate(
        matchConfig.seed || 'ROBO-TURNAMEN',
        (matchConfig.teamA?.length || 2),
        matchConfig.proceduralMode || 'tournament'
      );
    } else {
      this.arenaMap = ARENA_MAPS.arena_kosong;
    }

    this.arenaWidth = this.arenaMap.width || 60;
    this.arenaHeight = this.arenaMap.height || 40;

    // Simulation Clock deterministik (Fase 24)
    this.simClock = new SimulationClock();
    this.simSpeed = 1.0;
    this.matchTime = BALANCE.ARENA.MATCH_DURATION_SECONDS;
    this.isMatchRunning = false;
    this.matchEnded = false;
    this.aiTickAccumulator = 0;

    // Sistem Navigasi Anti-Stuck & Signal Bus (Fase 20 & 22)
    this.navigationSystem = new NavigationSystem();
    this.signalBus = new SignalBus();

    // Objektif Game Mode State (Fase 21)
    this.flags = []; // Untuk CTF
    this.hillZone = this.arenaMap.hillZone || { x: this.arenaWidth / 2, y: this.arenaHeight / 2, radius: 7 };
    this.hillControlMs = { teamA: 0, teamB: 0 };
    this.hillTargetMs = 30000; // 30 detik untuk menang KOTH

    // Sistem Kamera & State Machine (Fase 28)
    this.cameraMode = 'cinematic'; // 'cinematic' | 'thirdPerson' | 'firstPerson'
    this.cameraState = 'AUTO';     // 'AUTO' | 'USER_CONTROL' | 'RETURNING'
    this.selectedRobotId = null;
    this.cinematicAngle = 0;
    this.cameraShakeIntensity = 0;
    this.shakeOffset = new THREE.Vector3();
    this.userControlTimer = 0;
    this.defaultCameraTarget = new THREE.Vector3(0, 0, 0);

    // Entity lists
    this.robots = [];
    this.projectiles = [];
    this.activeDebris = [];
    this.recordedEvents = new Set(); // Telemetry edukasi mode misi (Fase 23)

    // Diagnostics (Fase 30)
    this.stats = { fps: 60, frameCount: 0, lastFpsTime: performance.now(), drawCalls: 0, triangles: 0 };

    this.initThree();
    this.setupArenaEnvironment();
    this.setupObjectives();
    this.spawnTeams();
    this.setupUIControls();

    // Raycaster untuk pemilihan robot & BrainViewerPanel
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.brainViewer = matchConfig.quickTest ? null : new BrainViewerPanel(document.body);
    this.setupRaycasting();

    this.isMatchRunning = true;
    this.lastFrameTime = performance.now();
    this.animate = this.animate.bind(this);
    this.animId = requestAnimationFrame(this.animate);
  }

  // Konversi satuan arena (0..width, 0..height) ke koordinat 3D Three.js
  toWorldCoord(xUnit, yUnit) {
    const scale = 1.5;
    return {
      x: (xUnit - this.arenaWidth / 2) * scale,
      z: (yUnit - this.arenaHeight / 2) * scale
    };
  }

  initThree() {
    this.container.innerHTML = '';

    const w = this.container.clientWidth || 960;
    const h = this.container.clientHeight || 640;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060913);
    this.scene.fog = new THREE.FogExp2(0x060913, 0.012);

    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.5, 300);
    this.camera.position.set(0, 42, 50);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: this.quality !== 'low' });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    if (this.quality !== 'low') {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
    }

    this.environmentTarget = setupRendering(this.renderer, this.scene);
    this.container.appendChild(this.renderer.domElement);

    // OrbitControls untuk Third Person & Cinematic (Fase 28)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2.05; // Cegah tembus lantai
    this.controls.minDistance = 6;
    this.controls.maxDistance = 120;

    this.controls.addEventListener('end', () => { this.userControlTimer = 4; });
    this.controls.addEventListener('start', () => {
      if (this.cameraMode !== 'firstPerson') {
        this.cameraState = 'USER_CONTROL';
        this.userControlTimer = 4.0; // 4 detik idle sebelum returning
      }
    });

    this.particles = new ParticleSystem3D(this.scene);

    // Resize listener
    this.onResize = () => {
      if (!this.container) return;
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      if (width > 50 && height > 50) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
      }
    };
    window.addEventListener('resize', this.onResize);

    // Overlay HUD
    this.overlayContainer = document.createElement('div');
    this.overlayContainer.className = 'arena-3d-overlay';
    this.container.style.position = 'relative';
    this.container.appendChild(this.overlayContainer);
  }

  setupArenaEnvironment() {
    // 1. Pencahayaan Efisien (Fase 26): HemisphereLight + DirectionalLight utama
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 1.3);
    this.scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
    sunLight.position.set(30, 48, 24);
    if (this.quality !== 'low') {
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = this.quality === 'high' ? 2048 : 1024;
      sunLight.shadow.mapSize.height = this.quality === 'high' ? 2048 : 1024;
      sunLight.shadow.camera.left = -50;
      sunLight.shadow.camera.right = 50;
      sunLight.shadow.camera.top = 40;
      sunLight.shadow.camera.bottom = -40;
    }
    sunLight.shadow.normalBias = 0.035;
    this.scene.add(sunLight);
    const rim = new THREE.DirectionalLight(0x75bfff, 1.7);
    rim.position.set(-25, 18, -30);
    this.scene.add(rim);

    // 2. Lantai Arena (Mesh dengan Heightmap jika tersedia) (Fase 26 & 29)
    const wWorld = this.arenaWidth * 1.5;
    const hWorld = this.arenaHeight * 1.5;
    const segX = this.arenaMap.sampleHeight ? 48 : 1;
    const segY = this.arenaMap.sampleHeight ? 36 : 1;

    const floorGeo = new THREE.PlaneGeometry(wWorld, hWorld, segX, segY);
    floorGeo.rotateX(-Math.PI / 2);

    if (this.arenaMap.sampleHeight) {
      const posAttr = floorGeo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const x3D = posAttr.getX(i);
        const z3D = posAttr.getZ(i);
        // Konversi balik ke unit arena
        const uX = x3D / 1.5 + this.arenaWidth / 2;
        const uY = z3D / 1.5 + this.arenaHeight / 2;
        posAttr.setY(i, this.arenaMap.sampleHeight(uX, uY));
      }
      floorGeo.computeVertexNormals();
    }

    const floorMat = new THREE.MeshStandardMaterial({
      color: this.arenaMap.floorColor || 0x090d16,
      roughness: 0.8,
      metalness: 0.25,
      flatShading: !!this.arenaMap.sampleHeight
    });

    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.receiveShadow = (this.quality !== 'low');
    this.scene.add(floor);

    // Garis Grid Prosedural
    const gridHelper = new THREE.GridHelper(Math.max(wWorld, hWorld), Math.round(this.arenaWidth / 2), this.arenaMap.gridColor || 0x00f0ff, 0x1e293b);
    gridHelper.position.y = 0.05;
    this.scene.add(gridHelper);

    // Garis Tengah Lapangan
    const centerLineGeo = new THREE.PlaneGeometry(0.3, hWorld * 0.96);
    const centerLineMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.6 });
    const centerLine = new THREE.Mesh(centerLineGeo, centerLineMat);
    centerLine.rotation.x = -Math.PI / 2;
    centerLine.position.y = 0.06;
    this.scene.add(centerLine);

    // 3. Dinding Pembatas Semi-Transparan (Forcefield)
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.22,
      roughness: 0.1,
      metalness: 0.9
    });

    const createWall = (w, h, d, x, z) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.position.set(x, h / 2, z);
      this.scene.add(mesh);
    };

    createWall(wWorld, 2.5, 0.8, 0, -hWorld / 2);
    createWall(wWorld, 2.5, 0.8, 0, hWorld / 2);
    createWall(0.8, 2.5, hWorld, -wWorld / 2, 0);
    createWall(0.8, 2.5, hWorld, wWorld / 2, 0);

    // 4. Render Rintangan (Obstacles) (Fase 20)
    if (this.arenaMap.obstacles && this.arenaMap.obstacles.length > 0) {
      const obsGroup = createObstaclesGroup(this.arenaMap.obstacles, this.toWorldCoord.bind(this));
      this.scene.add(obsGroup);
    }
  }

  // Setup Visual Objektif Mode Permainan (CTF & KOTH) (Fase 21)
  setupObjectives() {
    if (this.gameMode === 'ctf') {
      const baseA = this.arenaMap.flagBaseA || { x: 8, y: this.arenaHeight / 2 };
      const baseB = this.arenaMap.flagBaseB || { x: this.arenaWidth - 8, y: this.arenaHeight / 2 };

      const createFlagMesh = (colorHex) => {
        const flagGroup = new THREE.Group();
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.12, 4.5, 8),
          new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 })
        );
        pole.position.y = 2.25;

        const banner = new THREE.Mesh(
          new THREE.BoxGeometry(1.6, 1.0, 0.08),
          new THREE.MeshStandardMaterial({ color: colorHex, emissive: colorHex, emissiveIntensity: 0.4 })
        );
        banner.position.set(0.8, 3.8, 0);

        flagGroup.add(pole, banner);
        return flagGroup;
      };

      const flagMeshA = createFlagMesh(0x00f0ff);
      const flagMeshB = createFlagMesh(0xff3366);
      this.scene.add(flagMeshA, flagMeshB);

      this.flags = [
        {
          teamId: 'teamA',
          homePosition: { ...baseA },
          currentPosition: { ...baseA },
          carrierRobotId: null,
          droppedAtTick: null,
          state: 'HOME',
          mesh: flagMeshA
        },
        {
          teamId: 'teamB',
          homePosition: { ...baseB },
          currentPosition: { ...baseB },
          carrierRobotId: null,
          droppedAtTick: null,
          state: 'HOME',
          mesh: flagMeshB
        }
      ];

      this.updateFlagPositions();

    } else if (this.gameMode === 'koth') {
      // Zona Hill Lingkaran Tengah
      const hz = this.hillZone;
      const hzWorld = this.toWorldCoord(hz.x, hz.y);
      const rWorld = (hz.radius || 7) * 1.5;

      const hillGeo = new THREE.CylinderGeometry(rWorld, rWorld, 0.2, 32);
      const hillMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0.4
      });
      const hillMesh = new THREE.Mesh(hillGeo, hillMat);
      hillMesh.position.set(hzWorld.x, 0.1, hzWorld.z);
      this.scene.add(hillMesh);
      this.hillMesh = hillMesh;
    }
  }

  spawnTeams() {
    const { teamA = [], teamB = [] } = this.matchConfig;
    const defaultBots = PRESET_ROBOTS;

    const listA = teamA.length > 0 ? teamA : [defaultBots[0]];
    const listB = teamB.length > 0 ? teamB : [defaultBots[1] || defaultBots[0]];

    const spawns = this.arenaMap.spawnPoints || {
      teamA: [{ x: 8, y: this.arenaHeight / 2, rotation: 0 }],
      teamB: [{ x: this.arenaWidth - 8, y: this.arenaHeight / 2, rotation: Math.PI }]
    };

    listA.forEach((botProfile, i) => {
      const sp = spawns.teamA[i % spawns.teamA.length] || { x: 8, y: 15 + i * 5, rotation: 0 };
      this.spawnRobot(sp.x, sp.y, botProfile, 'teamA', sp.rotation || 0);
    });

    listB.forEach((botProfile, i) => {
      const sp = spawns.teamB[i % spawns.teamB.length] || { x: this.arenaWidth - 8, y: 15 + i * 5, rotation: Math.PI };
      this.spawnRobot(sp.x, sp.y, botProfile, 'teamB', sp.rotation !== undefined ? sp.rotation : Math.PI);
    });

    if (this.robots.length > 0) {
      this.selectedRobotId = this.robots[0].robotState.id;
    }
  }

  spawnRobot(xUnit, yUnit, profile, team, initRot = 0) {
    const wKey = profile.loadout?.senjata || 'meriam';
    const initialAmmo = BALANCE.WEAPON_AMMO[wKey] || 30;

    const robotState = {
      id: profile.id || `bot_${Math.random()}`,
      namaRobot: profile.namaRobot || 'Mech',
      team: team,
      loadout: profile.loadout,
      brain: profile.brain,
      isKomandan: !!profile.isKomandan,
      parts: createPartsState(profile.loadout),
      x: xUnit,
      y: yUnit,
      rotation: initRot,
      targetRotation: initRot,
      turretRotation: initRot,
      targetTurretRotation: initRot,
      targetSpeed: 0,
      actualSpeed: 0,
      weaponCooldown: 0,
      currentAmmo: initialAmmo,
      maxAmmo: initialAmmo,
      destroyed: false,
      fireRequested: false,
      brokenWeaponAttempt: false,
      empLumpuhTimer: 0,
      terrainSpeedModifier: 1.0,
      slopeSpeedModifier: 1.0
    };

    // Bangun mesh 3D robot dengan material standard
    const mesh = buildRobotMesh(profile.loadout, team);
    const wPos = this.toWorldCoord(xUnit, yUnit);
    const baseY = this.arenaMap.sampleHeight ? this.arenaMap.sampleHeight(xUnit, yUnit) : 0;
    mesh.position.set(wPos.x, baseY, wPos.z);
    mesh.rotation.y = Math.PI / 2 - robotState.rotation;
    this.scene.add(mesh);

    // Mahkota Komandan (Fase 22)
    if (robotState.isKomandan) {
      const crown = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.45, 0.25, 6),
        new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffa500, metalness: 0.9, roughness: 0.2 })
      );
      crown.position.y = 3.2;
      mesh.add(crown);
    }

    // Buat HTML HUD Overlay
    const hudEl = document.createElement('div');
    hudEl.className = 'robot-3d-hud';
    hudEl.innerHTML = `
      <div class="hud-name ${team}">${robotState.isKomandan ? '👑 ' : ''}${robotState.namaRobot}</div>
      <div class="hud-hp-bg"><div class="hud-hp-bar"></div></div>
      <div class="hud-ammo-row">⚡ <span class="hud-ammo-text">${initialAmmo}/${initialAmmo}</span></div>
      <div class="hud-leds-row">
        <span class="hud-led s" title="Senjata"></span>
        <span class="hud-led p" title="Penggerak"></span>
        <span class="hud-led r" title="Radar/Sensor"></span>
        <span class="hud-led a" title="Armor"></span>
      </div>
    `;
    this.overlayContainer.appendChild(hudEl);

    this.robots.push({
      robotState,
      mesh,
      hudEl,
      recoilOffset: 0,
      armorGlowTimer: 0,
      deathVisualTimer: null, // Timer animasi kehancuran 0.8s (Fase 27)
      lastRamTime: 0,
      radius: 1.4, // Satuan arena
      smokeTimer: 0,
      sparkTimer: 0,
      walkPhase: Math.random() * Math.PI * 2
    });
  }

  // Setup UI Panel: Pause, Single Tick, Tick/Time Indicator, Tablet Controls (Fase 24 & 28)
  setupUIControls() {
    this.uiControlBar = document.createElement('div');
    this.uiControlBar.className = 'arena-sim-controls-bar';
    this.uiControlBar.innerHTML = `
      <div class="sim-clock-group">
        <button id="btn-sim-pause" class="btn btn-sm btn-warning">⏸️ Jeda</button>
        <button id="btn-sim-step" class="btn btn-sm btn-info" disabled>⏭️ Tick Berikutnya</button>
        <span class="sim-badge" id="sim-tick-indicator">Tick: 0</span>
        <span class="sim-badge" id="sim-time-indicator">Waktu: 00:00</span>
      </div>
      <div class="sim-objective-group" id="sim-objective-hud">
        ${this.getObjectiveHUDHTML()}
      </div>
      <div class="sim-camera-group">
        <button id="btn-cam-reset" class="btn btn-sm btn-secondary" title="Reset Kamera">🎯 Reset</button>
        <button id="btn-cam-zoomin" class="btn btn-sm btn-secondary" title="Perbesar">+</button>
        <button id="btn-cam-zoomout" class="btn btn-sm btn-secondary" title="Perkecil">-</button>
      </div>
    `;
    this.container.appendChild(this.uiControlBar);

    // Diagnostics overlay (Fase 30)
    this.diagEl = document.createElement('div');
    this.diagEl.className = 'arena-diag-overlay';
    this.diagEl.innerHTML = `FPS: 60 | Triangles: 0 | Meshes: 0`;
    this.container.appendChild(this.diagEl);

    // Listener tombol
    const btnPause = this.uiControlBar.querySelector('#btn-sim-pause');
    const btnStep = this.uiControlBar.querySelector('#btn-sim-step');

    btnPause.addEventListener('click', () => {
      const isPaused = this.simClock.togglePause();
      btnPause.textContent = isPaused ? '▶️ Lanjut' : '⏸️ Jeda';
      btnPause.className = isPaused ? 'btn btn-sm btn-success' : 'btn btn-sm btn-warning';
      btnStep.disabled = !isPaused;
    });

    btnStep.addEventListener('click', () => {
      if (this.simClock.isPaused) {
        this.stepSingleTick();
      }
    });

    // Tombol sentuh kamera tablet (Fase 28)
    this.uiControlBar.querySelector('#btn-cam-reset').addEventListener('click', () => {
      this.cameraMode = 'cinematic';
      this.cameraState = 'AUTO';
      this.camera.position.set(0, 42, 50);
      this.controls.target.set(0, 0, 0);
    });

    this.uiControlBar.querySelector('#btn-cam-zoomin').addEventListener('click', () => {
      this.camera.position.sub(this.controls.target).multiplyScalar(0.85).add(this.controls.target);
      this.cameraState = 'USER_CONTROL';
      this.userControlTimer = 4;
    });

    this.uiControlBar.querySelector('#btn-cam-zoomout').addEventListener('click', () => {
      this.camera.position.sub(this.controls.target).multiplyScalar(1.15).add(this.controls.target);
      this.cameraState = 'USER_CONTROL';
      this.userControlTimer = 4;
    });
  }

  getObjectiveHUDHTML() {
    if (this.gameMode === 'ctf') {
      return `🚩 Mode CTF: Rebut Bendera Lawan & Bawa Pulang!`;
    } else if (this.gameMode === 'koth') {
      return `⛰️ Hill: <span class="text-blue">B: 0.0s</span> | <span class="text-red">M: 0.0s</span> (Target: 30s)`;
    }
    return `⚔️ Mode Eliminasi`;
  }

  setupRaycasting() {
    this.onCanvasClick = (e) => {
      if (!this.container || !this.camera) return;
      const rect = this.container.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const meshes = this.robots.filter(r => !r.robotState.destroyed).map(r => r.mesh);
      const intersects = this.raycaster.intersectObjects(meshes, true);

      if (intersects.length > 0) {
        const hitObj = intersects[0].object;
        const hitRobot = this.robots.find(r => {
          let cur = hitObj;
          while (cur) {
            if (cur === r.mesh) return true;
            cur = cur.parent;
          }
          return false;
        });

        if (hitRobot) {
          SFX.playClick();
          this.selectedRobotId = hitRobot.robotState.id;
          if (this.brainViewer) {
            this.brainViewer.open(hitRobot);
          }
        }
      }
    };
    this.container.addEventListener('click', this.onCanvasClick);
  }

  setSpeed(speed) {
    this.simSpeed = speed;
  }

  setCameraMode(mode, targetId = null) {
    this.cameraMode = mode;
    if (targetId) this.selectedRobotId = targetId;
    if (mode === 'firstPerson') {
      this.controls.enabled = false;
    } else {
      this.controls.enabled = true;
    }
  }

  // --- LOOP UTAMA (ANIMASI & SIMULASI) ---
  animate(now) {
    this.animId = requestAnimationFrame(this.animate);
    const deltaMs = Math.min(now - this.lastFrameTime, 100);
    this.lastFrameTime = now;

    // Update FPS & Diagnostics (Fase 30)
    this.stats.frameCount++;
    if (now - this.stats.lastFpsTime >= 1000) {
      this.stats.fps = Math.round((this.stats.frameCount * 1000) / (now - this.stats.lastFpsTime));
      this.stats.frameCount = 0;
      this.stats.lastFpsTime = now;
      if (this.diagEl) {
        this.diagEl.textContent = `FPS: ${this.stats.fps} | Mesh: ${this.scene.children.length} | Peluru: ${this.projectiles.length}`;
      }
    }

    if (!this.isMatchRunning || this.matchEnded) {
      this.updateDebris(deltaMs / 1000);
      this.particles.update(deltaMs / 1000);
      this.updateDeathVisuals(deltaMs / 1000);
      this.updateCamera(deltaMs / 1000);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    // 1. Simulation Clock Update (Fase 24)
    const clockResult = this.simClock.update(deltaMs * this.simSpeed);
    const ticksToRun = typeof clockResult === 'number' ? clockResult : (clockResult?.ticksToExecute || 0);

    // Update indikator UI waktu & tick
    const tickEl = document.getElementById('sim-tick-indicator');
    const timeEl = document.getElementById('sim-time-indicator');
    if (tickEl) tickEl.textContent = `Tick: ${this.simClock.tick}`;
    if (timeEl) timeEl.textContent = `Waktu: ${this.simClock.formatTime()}`;

    // Jalankan satu atau lebih simulation tick jika clock berdetik
    if (ticksToRun > 0) {
      for (let t = 0; t < ticksToRun; t++) {
        this.runSimulationTick();
      }
    }

    const scaledDeltaSec = this.simClock.isPaused ? 0 : (deltaMs * this.simSpeed) / 1000;

    // 2. Update Fisika & Visual Robot (Kecepatan, Animasi Roda/Kaki, Turet 360)
    this.updateRobotsVisual(scaledDeltaSec);

    // 3. Update Proyektil
    this.updateProjectiles(scaledDeltaSec);

    // 4. Update Debris Puing & Partikel
    this.updateDebris(scaledDeltaSec);
    this.particles.update(scaledDeltaSec);

    // 5. Animasi Objektif (Bendera & Hill)
    this.updateObjectivesVisual(scaledDeltaSec);

    // 6. Update Kamera & State Machine (Fase 28)
    this.updateCamera(deltaMs / 1000);

    // 7. Update HUD HTML Posisi
    this.updateHUDPositions();

    // 8. Cek Kemenangan
    this.checkWinCondition();

    // 9. Update Live Brain Viewer
    if (this.brainViewer) {
      this.brainViewer.update();
    }

    this.renderer.render(this.scene, this.camera);
  }

  // --- SATU FULL SIMULATION TICK (150ms DETERMINISTIK) (Fase 24) ---
  runSimulationTick() {
    // Kurangi waktu match
    this.matchTime -= 0.15;
    if (this.matchTime <= 0) {
      this.matchTime = 0;
      this.resolveMatchTimeout();
      return;
    }

    // Update expiry signal bus (Fase 22)
    this.signalBus.updateTick(this.simClock.tick);

    // 1. Cek Sinyal Otomatis Minta Bantuan (Fase 22)
    this.robots.forEach(r => {
      const state = r.robotState;
      if (state.destroyed) return;

      const hpPercent = (state.parts?.rangka?.hp / state.parts?.rangka?.hpMax) * 100;
      const isLumpuh = getLocomotionState(state) === 'lumpuh';
      const isWpBroken = isWeaponBroken(state);

      if (hpPercent < 30 || isLumpuh || isWpBroken) {
        this.signalBus.broadcastHelp(state.team, state.id, { x: state.x, y: state.y }, this.simClock.tick);
      }
    });

    // 2. Evaluasi Pohon Keputusan (AI Interpreter)
    const gameState = {
      robots: this.robots.filter(r => !r.robotState.destroyed).map(r => r.robotState),
      arenaWidth: this.arenaWidth,
      arenaHeight: this.arenaHeight,
      arenaMap: this.arenaMap,
      obstacles: this.arenaMap.obstacles || [],
      flags: this.flags,
      hillZone: this.hillZone,
      signalBus: this.signalBus,
      matchTime: this.matchTime
    };

    this.robots.forEach(r => {
      const state = r.robotState;
      if (!state.destroyed && state.brain) {
        evaluateBrain(state.brain, state, gameState);

        // Catat telemetry event edukasi (Misi Fase 23)
        if (state.team === 'teamA' && state.lastExecutedAction) {
          this.recordedEvents.add(`action_executed:${state.lastExecutedAction}`);
        }
      }
    });

    // 3. Terapkan Aksi Komandan (Broadcast Sasaran Prioritas) (Fase 22)
    this.robots.forEach(r => {
      const state = r.robotState;
      if (!state.destroyed && state.isKomandan) {
        const opposingAlive = this.robots.filter(
          other => other.robotState.team !== state.team && !other.robotState.destroyed
        );
        if (opposingAlive.length > 0) {
          // Cari musuh terdekat dari komandan
          let target = opposingAlive[0];
          let minDist = Infinity;
          opposingAlive.forEach(e => {
            const d = Math.hypot(e.robotState.x - state.x, e.robotState.y - state.y);
            if (d < minDist) { minDist = d; target = e; }
          });
          this.signalBus.broadcastPriorityTarget(state.team, state.id, target.robotState.id, this.simClock.tick);
        }
      }
    });

    // 4. Update Logika Objektif Mode Permainan (Fase 21)
    this.tickObjectives();
  }

  // Debug satu tick manual (Fase 24)
  stepSingleTick() {
    this.simClock.tick += 1;
    this.simClock.timeMs += this.simClock.tickMs;
    this.runSimulationTick();
    this.updateRobotsVisual(0.15);
    this.updateProjectiles(0.15);
    this.updateDebris(0.15);
    this.particles.update(0.15);
    this.updateHUDPositions();
    if (this.brainViewer) this.brainViewer.update();
  }

  // --- LOGIKA OBJEKTIF (CTF & KOTH) (Fase 21) ---
  tickObjectives() {
    // 1. Capture The Flag
    if (this.gameMode === 'ctf') {
      this.flags.forEach(flag => {
        // Jika sedang dibawa robot (CARRIED)
        if (flag.state === 'CARRIED') {
          const carrier = this.robots.find(r => r.robotState.id === flag.carrierRobotId);
          if (carrier && !carrier.robotState.destroyed) {
            flag.currentPosition.x = carrier.robotState.x;
            flag.currentPosition.y = carrier.robotState.y;

            // Cek apakah pembawa kembali ke pangkalan timnya sendiri
            const ownBase = carrier.robotState.team === 'teamA'
              ? this.arenaMap.flagBaseA
              : this.arenaMap.flagBaseB;

            if (Math.hypot(carrier.robotState.x - ownBase.x, carrier.robotState.y - ownBase.y) < 3.0) {
              // Menang CTF!
              this.endMatch(carrier.robotState.team, `🏆 ${carrier.robotState.team === 'teamA' ? 'Tim Biru' : 'Tim Merah'} berhasil membawa pulang bendera musuh!`);
            }
          } else {
            // Carrier hancur -> flag jatuh di tempat (DROPPED)
            flag.state = 'DROPPED';
            flag.carrierRobotId = null;
            flag.droppedAtTick = this.simClock.tick;
          }
        } else if (flag.state === 'DROPPED') {
          // Jika tidak diambil selama 20 tick (3000ms simulasi), flag kembali HOME
          if (this.simClock.tick - flag.droppedAtTick >= 20) {
            flag.state = 'HOME';
            flag.currentPosition = { ...flag.homePosition };
            flag.droppedAtTick = null;
            SFX.playClick();
          }
        }

        // Cek apakah robot lawan overlap flag untuk mengambilnya
        if (flag.state === 'HOME' || flag.state === 'DROPPED') {
          const overlappingBot = this.robots.find(r => {
            if (r.robotState.destroyed || r.robotState.team === flag.teamId) return false;
            return Math.hypot(r.robotState.x - flag.currentPosition.x, r.robotState.y - flag.currentPosition.y) < 2.2;
          });

          if (overlappingBot) {
            flag.state = 'CARRIED';
            flag.carrierRobotId = overlappingBot.robotState.id;
            SFX.playClick();
          }
        }
      });

      this.updateFlagPositions();
    }

    // 2. King of the Hill
    if (this.gameMode === 'koth') {
      const hz = this.hillZone;
      const rZone = hz.radius || 7;

      const livingA = this.robots.filter(
        r => r.robotState.team === 'teamA' && !r.robotState.destroyed &&
        Math.hypot(r.robotState.x - hz.x, r.robotState.y - hz.y) <= rZone
      ).length;

      const livingB = this.robots.filter(
        r => r.robotState.team === 'teamB' && !r.robotState.destroyed &&
        Math.hypot(r.robotState.x - hz.x, r.robotState.y - hz.y) <= rZone
      ).length;

      if (livingA > livingB) {
        this.hillControlMs.teamA += 150;
      } else if (livingB > livingA) {
        this.hillControlMs.teamB += 150;
      }

      // Update HUD teks KOTH
      const hudObj = document.getElementById('sim-objective-hud');
      if (hudObj) {
        const sA = (this.hillControlMs.teamA / 1000).toFixed(1);
        const sB = (this.hillControlMs.teamB / 1000).toFixed(1);
        hudObj.innerHTML = `⛰️ Hill: <span class="text-blue">B: ${sA}s</span> | <span class="text-red">M: ${sB}s</span> (Target: 30s)`;
      }

      // Kemenangan skor kontrol
      if (this.hillControlMs.teamA >= this.hillTargetMs) {
        this.endMatch('teamA', '🏆 Tim Biru memenangkan King of the Hill dengan waktu kontrol penuh!');
      } else if (this.hillControlMs.teamB >= this.hillTargetMs) {
        this.endMatch('teamB', '🏆 Tim Merah memenangkan King of the Hill dengan waktu kontrol penuh!');
      }
    }
  }

  updateFlagPositions() {
    this.flags.forEach(flag => {
      if (flag.mesh) {
        const wPos = this.toWorldCoord(flag.currentPosition.x, flag.currentPosition.y);
        const baseY = this.arenaMap.sampleHeight ? this.arenaMap.sampleHeight(flag.currentPosition.x, flag.currentPosition.y) : 0;
        flag.mesh.position.set(wPos.x, baseY, wPos.z);
      }
    });
  }

  updateObjectivesVisual(deltaSec) {
    if (this.gameMode === 'koth' && this.hillMesh) {
      this.hillMesh.rotation.y += deltaSec * 0.5;
    }
  }

  // --- UPDATE VISUAL ROBOT & FISIKA (Fase 20, 26, 27) ---
  updateRobotsVisual(deltaSec) {
    if (deltaSec <= 0) return;
    this.updateDeathVisuals(deltaSec);
    this.robots.forEach(r => {
      const state = r.robotState;

      if (state.destroyed) return;

      if (state.weaponCooldown > 0) state.weaponCooldown -= deltaSec;

      // 1. Terrain Modifier (Fase 20)
      state.terrainSpeedModifier = getTerrainSpeedMultiplier(state, this.arenaMap.zones);

      // 2. Slope Modifier (Fase 29)
      if (this.arenaMap.sampleGradient) {
        const grad = this.arenaMap.sampleGradient(state.x, state.y);
        const moveDirX = Math.cos(state.rotation);
        const moveDirY = Math.sin(state.rotation);
        const slopeDot = grad.gx * moveDirX + grad.gy * moveDirY;
        if (slopeDot > 0.1) state.slopeSpeedModifier = 0.85;       // Tanjakan
        else if (slopeDot < -0.1) state.slopeSpeedModifier = 1.08; // Turunan
        else state.slopeSpeedModifier = 1.0;
      } else {
        state.slopeSpeedModifier = 1.0;
      }

      // 3. Rotasi Sasis Menuju Target Rotation
      let rDiff = state.targetRotation - state.rotation;
      while (rDiff > Math.PI) rDiff -= Math.PI * 2;
      while (rDiff < -Math.PI) rDiff += Math.PI * 2;
      const turnSpeed = calculateEffectiveTurnSpeed(state) * deltaSec;
      const turnDelta = Math.max(-turnSpeed, Math.min(turnSpeed, rDiff));
      state.rotation += turnDelta;

      // Anti-Stuck heading adjustment (Fase 20)
      const adjustedRot = this.navigationSystem.adjustHeading(state.id, state.rotation);

      // 4. Pergerakan Maju
      const isTryingToMove = (state.targetSpeed || 0) > 0.1;
      const desiredSpeed = Math.min(state.targetSpeed || 0, calculateEffectiveSpeed(state));
      const oldSpeed = state.actualSpeed || 0;
      const acceleration = desiredSpeed > oldSpeed ? 12 : 20;
      const currentSpeed = oldSpeed + THREE.MathUtils.clamp(desiredSpeed - oldSpeed, -acceleration * deltaSec, acceleration * deltaSec);
      state.actualSpeed = currentSpeed;

      const prevX = state.x;
      const prevY = state.y;

      state.x += Math.cos(adjustedRot) * currentSpeed * deltaSec;
      state.y += Math.sin(adjustedRot) * currentSpeed * deltaSec;

      // Batasi dalam arena
      state.x = Math.max(1.4, Math.min(this.arenaWidth - 1.4, state.x));
      state.y = Math.max(1.4, Math.min(this.arenaHeight - 1.4, state.y));

      // 5. Collision Sliding dengan Rintangan (Fase 20)
      if (this.arenaMap.obstacles && this.arenaMap.obstacles.length > 0) {
        resolveRobotObstacleCollisions(state, 1.4, this.arenaMap.obstacles);
      }

      // Update tracker anti-stuck
      this.navigationSystem.updateTick(state, isTryingToMove);

      // 6. Update Transform Three.js Mesh
      const wPos = this.toWorldCoord(state.x, state.y);
      let yElev = this.arenaMap.sampleHeight ? this.arenaMap.sampleHeight(state.x, state.y) : 0;

      r.mesh.position.set(wPos.x, yElev, wPos.z);
      r.mesh.rotation.y = Math.PI / 2 - state.rotation;
      const visibleSpeed = Math.hypot(state.x - prevX, state.y - prevY) / deltaSec;
      animateRobot(r, deltaSec, visibleSpeed, turnDelta / deltaSec, yElev);
      r.smokeTimer -= deltaSec;
      const locomotion = getLocomotionState(state);
      if (locomotion !== 'normal' && r.smokeTimer <= 0) {
        r.smokeTimer = locomotion === 'lumpuh' ? 0.24 : 0.14;
        if (locomotion === 'lumpuh') this.particles.emitSparks(r.mesh.position);
        else this.particles.emitSmoke(r.mesh.position, r.mesh.rotation.y);
      }

      // 7. Turet 360 Derajat
      const opposingAlive = this.robots.filter(
        other => other.robotState.team !== state.team && !other.robotState.destroyed
      );
      let nearestEnemy = null;
      let minDistance = Infinity;
      opposingAlive.forEach(enemy => {
        const d = Math.hypot(enemy.robotState.x - state.x, enemy.robotState.y - state.y);
        if (d < minDistance) { minDistance = d; nearestEnemy = enemy; }
      });

      if (nearestEnemy) {
        const dx = nearestEnemy.robotState.x - state.x;
        const dy = nearestEnemy.robotState.y - state.y;
        state.targetTurretRotation = Math.atan2(dy, dx);
      } else {
        state.targetTurretRotation = state.rotation;
      }

      let tDiff = state.targetTurretRotation - state.turretRotation;
      while (tDiff > Math.PI) tDiff -= Math.PI * 2;
      while (tDiff < -Math.PI) tDiff += Math.PI * 2;
      const maxTurretTurn = 7.0 * deltaSec;
      state.turretRotation += Math.max(-maxTurretTurn, Math.min(maxTurretTurn, tDiff));

      if (r.mesh.turretMesh) {
        r.mesh.turretMesh.rotation.y = -(state.turretRotation - state.rotation);

      }

      // 8. Tembak Peluru jika Diminta
      if (state.fireRequested) {
        state.fireRequested = false;
        this.fireProjectile(r);
      }
    });

    // Deteksi Benturan Tabrakan Robot vs Robot (Ramming Melee)
    this.checkRobotCollisions(deltaSec);
  }

  fireProjectile(robotWrapper) {
    const state = robotWrapper.robotState;
    if (state.currentAmmo <= 0 || isWeaponBroken(state)) return;

    state.currentAmmo -= 1;
    robotWrapper.recoilOffset = 0.35;

    const wData = PARTS.senjata[state.loadout?.senjata || 'meriam'];
    robotWrapper.mesh.updateMatrixWorld(true);
    const muzzle = robotWrapper.mesh.muzzleTip.getWorldPosition(new THREE.Vector3());
    const muzzle2D = { x: muzzle.x / 1.5 + this.arenaWidth / 2, y: muzzle.z / 1.5 + this.arenaHeight / 2 };
    const p = new Projectile3D(
      this.scene,
      muzzle2D,
      state.turretRotation,
      wData,
      state,
      this.toWorldCoord.bind(this),
      { width: this.arenaWidth, height: this.arenaHeight },
      { height: muzzle.y, particles: this.particles }
    );
    this.projectiles.push(p);

    // Muzzle flash particle
    this.particles.emitMuzzleFlash(muzzle, state.turretRotation, wData.bulletColor);
  }

  // --- UPDATE PROYEKTIL & DAMAGE (Fase 20 & 27) ---
  updateProjectiles(deltaSec) {
    if (deltaSec <= 0) return;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const enemies = this.robots.filter(r => !r.robotState.destroyed && r.robotState.team !== p.shooter.team);
      p.update(deltaSec, enemies, this.arenaMap.obstacles || []);
      if (p.hitTarget) {
        this.applyProjectileDamage(p.hitTarget, p.damage, p.shooter);
        p.hitTarget = null;
      }
      if (!p.active) this.projectiles.splice(i, 1);
    }
  }

  applyProjectileDamage(targetWrapper, damageAmount, shooterState) {
    if (targetWrapper.robotState.destroyed) return;
    const res = applyDamage(targetWrapper.robotState, damageAmount);
    SFX.playHit();
    targetWrapper.armorGlowTimer = 0.35;

    // Visual efek kena tembak
    const wPos = this.toWorldCoord(targetWrapper.robotState.x, targetWrapper.robotState.y);
    this.particles.emitImpactSparks(new THREE.Vector3(wPos.x, targetWrapper.mesh.position.y + 1.2, wPos.z));
    this.cameraShakeIntensity = Math.max(this.cameraShakeIntensity, 0.08);

    // Update LED visual kerusakan
    ['senjata', 'penggerak', 'sensor', 'armor'].forEach(pKey => {
      const part = targetWrapper.robotState.parts[pKey];
      if (part && part.hpMax > 0) {
        updatePartDamageVisual(targetWrapper.mesh, pKey, part.hp <= 0);
      }
    });

    // Cek Kematian Robot (Pemisahan Death Logic vs Death Visual) (Fase 27)
    if (res.isDestroyed) {
      this.handleRobotDestruction(targetWrapper);
    }
  }

  handleRobotDestruction(robotWrapper) {
    const state = robotWrapper.robotState;
    state.destroyed = true;
    state.targetSpeed = 0;

    // Lepas flag jika sedang membawa (CTF)
    const heldFlag = this.flags.find(f => f.carrierRobotId === state.id);
    if (heldFlag) {
      heldFlag.state = 'DROPPED';
      heldFlag.carrierRobotId = null;
      heldFlag.droppedAtTick = this.simClock.tick;
    }

    SFX.playExplosion();
    const wPos = this.toWorldCoord(state.x, state.y);
    this.particles.emitExplosion(robotWrapper.mesh.position);
    this.cameraShakeIntensity = 0.4;

    // Buat puing debris berserakan
    const debrisList = createRobotDebrisPieces(state.loadout, state.team, robotWrapper.mesh.position);
    debrisList.forEach(d => {
      this.scene.add(d.mesh);
      this.activeDebris.push(d);
    });

    // Mulai animasi kehancuran 0.8s sebelum mesh dihapus total (Fase 27)
    robotWrapper.deathVisualTimer = 0.8;
  }

  // --- COLLISION MELEE RAMMING (Modul 4) ---
  checkRobotCollisions(deltaSec) {
    for (let i = 0; i < this.robots.length; i++) {
      for (let j = i + 1; j < this.robots.length; j++) {
        const rA = this.robots[i];
        const rB = this.robots[j];
        if (rA.robotState.destroyed || rB.robotState.destroyed) continue;

        const dx = rB.robotState.x - rA.robotState.x;
        const dy = rB.robotState.y - rA.robotState.y;
        const dist = Math.hypot(dx, dy);
        const minDist = 2.4;

        if (dist < minDist) {
          // Tabrakan fisik: dorong saling menjauh
          const overlap = minDist - dist;
          const nx = dx / (dist || 1);
          const ny = dy / (dist || 1);
          rA.robotState.x -= nx * overlap * 0.5;
          rA.robotState.y -= ny * overlap * 0.5;
          rB.robotState.x += nx * overlap * 0.5;
          rB.robotState.y += ny * overlap * 0.5;

          // Damage tabrakan jika berbeda tim
          if (rA.robotState.team !== rB.robotState.team) {
            const now = performance.now();
            if (now - rA.lastRamTime > 1200) {
              rA.lastRamTime = now;
              const ramDmg = BALANCE.RAMMING.DAMAGE[rA.robotState.loadout?.rangka || 'sedang'] || 25;
              this.applyProjectileDamage(rB, ramDmg, rA.robotState);
            }
          }
        }
      }
    }
  }

  updateDeathVisuals(dt) {
    for (const r of this.robots) {
      if (!r.robotState.destroyed || r.deathVisualTimer === null) continue;
      r.deathVisualTimer -= dt;
      r.mesh.rotation.z += dt * 0.8;
      if (r.deathVisualTimer <= 0) {
        r.mesh.visible = false;
        r.deathVisualTimer = null;
      }
    }
  }

  updateDebris(dt) {
    if (dt <= 0) return;
    for (let i = this.activeDebris.length - 1; i >= 0; i--) {
      const d = this.activeDebris[i];
      d.lifetime -= dt;
      if (d.lifetime <= 0) {
        this.scene.remove(d.mesh);
        d.mesh.geometry.dispose();
        d.mesh.material.dispose();
        this.activeDebris.splice(i, 1);
        continue;
      }
      if (d.isGrounded) continue;
      d.vel.y -= 18 * dt;
      d.mesh.position.addScaledVector(d.vel, dt);
      d.mesh.rotation.x += d.rotVel.x * dt;
      d.mesh.rotation.y += d.rotVel.y * dt;
      d.mesh.rotation.z += d.rotVel.z * dt;
      const x = d.mesh.position.x / 1.5 + this.arenaWidth / 2;
      const y = d.mesh.position.z / 1.5 + this.arenaHeight / 2;
      const ground = (this.arenaMap.sampleHeight?.(x, y) || 0) + 0.25;
      if (d.mesh.position.y <= ground) {
        d.mesh.position.y = ground;
        d.vel.y = Math.abs(d.vel.y) * 0.3;
        d.vel.x *= 0.6; d.vel.z *= 0.6;
        d.bounceCount++;
        if (d.bounceCount > 2 || d.vel.y < 0.5) d.isGrounded = true;
      }
      d.smokeTimer -= dt;
      if (d.smokeTimer <= 0 && d.lifetime > 13) {
        d.smokeTimer = 0.12;
        this.particles.emitDebrisSmoke(d.mesh.position);
      }
    }
  }

  // --- SISTEM KAMERA & STATE MACHINE (Fase 28) ---
  updateCamera(dt) {
    this.camera.position.sub(this.shakeOffset);
    this.shakeOffset.set(0, 0, 0);
    const alive = this.robots.filter(r => !r.robotState.destroyed);
    const selected = alive.find(r => r.robotState.id === this.selectedRobotId) || alive[0];
    const blend = 1 - Math.exp(-2.5 * dt);
    if (this.cameraMode === 'firstPerson' && selected) {
      const pos = selected.mesh.position;
      this.camera.position.set(pos.x, pos.y + 2.6, pos.z);
      this.camera.lookAt(pos.x + Math.cos(selected.robotState.turretRotation) * 15, pos.y + 2.1,
        pos.z + Math.sin(selected.robotState.turretRotation) * 15);
      return;
    }
    if (this.cameraState === 'USER_CONTROL') {
      this.userControlTimer -= dt;
      if (this.userControlTimer <= 0) this.cameraState = 'RETURNING';
      this.controls.update(dt);
      return;
    }
    const focus = new THREE.Vector3();
    let radius = 12;
    if (this.cameraMode === 'thirdPerson' && selected) {
      focus.copy(selected.mesh.position); focus.y += 1;
      const angle = selected.robotState.rotation;
      this.camera.position.lerp(new THREE.Vector3(focus.x - Math.cos(angle) * 13, focus.y + 9,
        focus.z - Math.sin(angle) * 13), blend);
    } else {
      for (const r of alive) focus.add(r.mesh.position);
      if (alive.length) focus.divideScalar(alive.length);
      for (const r of alive) radius = Math.max(radius, r.mesh.position.distanceTo(focus) + 5);
      this.cinematicAngle += dt * 0.035;
      const verticalFov = THREE.MathUtils.degToRad(this.camera.fov);
      const fitFov = Math.min(verticalFov, 2 * Math.atan(Math.tan(verticalFov / 2) * this.camera.aspect));
      const distance = Math.min(115, radius / Math.sin(fitFov / 2));
      this.camera.position.lerp(new THREE.Vector3(focus.x + Math.cos(this.cinematicAngle) * distance * 0.7,
        focus.y + distance * 0.7, focus.z + Math.sin(this.cinematicAngle) * distance * 0.7), blend);
    }
    this.controls.target.lerp(focus, blend);
    this.controls.update(dt);
    this.cameraState = 'AUTO';
    this.cameraShakeIntensity *= Math.exp(-9 * dt);
    if (!this.simClock.isPaused && this.cameraShakeIntensity > 0.001) {
      const t = performance.now() / 1000;
      this.shakeOffset.set(Math.sin(t * 73), Math.cos(t * 89), 0).multiplyScalar(this.cameraShakeIntensity);
      this.camera.position.add(this.shakeOffset);
    }
  }

  updateHUDPositions() {
    const rect = this.container.getBoundingClientRect();
    const halfW = rect.width / 2;
    const halfH = rect.height / 2;

    this.robots.forEach(r => {
      const state = r.robotState;
      if (state.destroyed) {
        r.hudEl.style.display = 'none';
        return;
      }

      r.hudEl.style.display = 'block';

      // Proyeksikan posisi 3D ke 2D viewport
      const tempVec = new THREE.Vector3();
      r.mesh.getWorldPosition(tempVec);
      tempVec.y += 3.5;
      tempVec.project(this.camera);

      const x = (tempVec.x * halfW) + halfW;
      const y = -(tempVec.y * halfH) + halfH;

      r.hudEl.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;

      // Update isi HUD
      const rangka = state.parts.rangka;
      const hpPct = Math.max(0, Math.min(100, (rangka.hp / rangka.hpMax) * 100));
      const hpBar = r.hudEl.querySelector('.hud-hp-bar');
      if (hpBar) hpBar.style.width = `${hpPct}%`;

      const ammoText = r.hudEl.querySelector('.hud-ammo-text');
      if (ammoText) ammoText.textContent = `${state.currentAmmo}/${state.maxAmmo}`;

      // Update LED status
      ['senjata', 'penggerak', 'sensor', 'armor'].forEach((pKey, i) => {
        const led = r.hudEl.querySelectorAll('.hud-led')[i];
        if (led) {
          const p = state.parts[pKey];
          const isBroken = p && p.hpMax > 0 ? p.hp <= 0 : false;
          led.className = `hud-led ${pKey[0]} ${isBroken ? 'broken' : 'ok'}`;
        }
      });
    });
  }

  // --- KONDISI AKHIR MATCH (Fase 21 & 25) ---
  checkWinCondition() {
    if (this.gameMode === 'ctf' || this.gameMode === 'koth') {
      // Menunggu kondisi khusus objektif selesai
      return;
    }

    // Eliminasi standar
    const livingA = this.robots.filter(r => r.robotState.team === 'teamA' && !r.robotState.destroyed).length;
    const livingB = this.robots.filter(r => r.robotState.team === 'teamB' && !r.robotState.destroyed).length;

    if (livingA === 0 && livingB === 0) {
      this.endMatch('draw', 'Pertandingan Berakhir Seri!');
    } else if (livingA === 0) {
      this.endMatch('teamB', '🏆 Tim Merah Menang!');
    } else if (livingB === 0) {
      this.endMatch('teamA', '🏆 Tim Biru Menang!');
    }
  }

  resolveMatchTimeout() {
    if (this.gameMode === 'koth') {
      if (this.hillControlMs.teamA > this.hillControlMs.teamB) {
        this.endMatch('teamA', '🏆 Tim Biru Menang Waktu Kontrol Bukit!');
      } else if (this.hillControlMs.teamB > this.hillControlMs.teamA) {
        this.endMatch('teamB', '🏆 Tim Merah Menang Waktu Kontrol Bukit!');
      } else {
        this.endMatch('draw', 'Pertandingan Seri!');
      }
      return;
    }

    // Eliminasi: total HP terbanyak menang
    let hpA = 0, hpB = 0;
    this.robots.forEach(r => {
      if (!r.robotState.destroyed) {
        const hp = r.robotState.parts.rangka.hp;
        if (r.robotState.team === 'teamA') hpA += hp;
        else hpB += hp;
      }
    });

    if (hpA > hpB) this.endMatch('teamA', '🏆 Tim Biru Menang berdasarkan sisa HP!');
    else if (hpB > hpA) this.endMatch('teamB', '🏆 Tim Merah Menang berdasarkan sisa HP!');
    else this.endMatch('draw', 'Pertandingan Berakhir Seri!');
  }

  endMatch(winningTeam, message) {
    if (this.matchEnded) return;
    this.matchEnded = true;
    this.isMatchRunning = false;

    // Catat log match resmi ke MatchLogManager (Fase 25)
    try {
      const botsA = this.robots.filter(r => r.robotState.team === 'teamA').map(r => r.robotState);
      const botsB = this.robots.filter(r => r.robotState.team === 'teamB').map(r => r.robotState);

      MatchLogManager.addMatch({
        teamAIds: botsA.map(b => b.id),
        teamBIds: botsB.map(b => b.id),
        robotAId: botsA[0]?.id || 'unknown_a',
        robotAName: botsA[0]?.namaRobot || 'Tim Biru',
        robotBId: botsB[0]?.id || 'unknown_b',
        robotBName: botsB[0]?.namaRobot || 'Tim Merah',
        winnerTeamId: winningTeam === 'teamA' ? 'A' : winningTeam === 'teamB' ? 'B' : 'DRAW',
        mode: this.gameMode,
        arenaId: this.arenaMap.id || 'arena_custom',
        arenaSeed: this.arenaMap.seed || null,
        hillControlMs: this.hillControlMs
      });
    } catch (e) {
      console.error('Gagal mencatat log pertandingan:', e);
    }

    // Tampilkan banner hasil
    const banner = document.createElement('div');
    banner.className = 'match-result-banner';
    banner.innerHTML = `
      <h2>${message}</h2>
      <p>Simulasi Selesai (${this.simClock.tick} Tick)</p>
      <button id="btn-close-match" class="btn btn-primary">Tutup & Kembali</button>
    `;
    this.container.appendChild(banner);

    banner.querySelector('#btn-close-match').addEventListener('click', () => {
      this.destroy();
      if (this.onFinish) {
        this.onFinish({
          winningTeam: winningTeam === 'teamA' ? 'A' : winningTeam === 'teamB' ? 'B' : 'DRAW',
          recordedEvents: Array.from(this.recordedEvents),
          ticks: this.simClock.tick
        });
      }
    });
  }

  destroy() {
    this.isMatchRunning = false;
    this.matchEnded = true;
    if (this.animId) cancelAnimationFrame(this.animId);
    window.removeEventListener('resize', this.onResize);
    this.container.removeEventListener('click', this.onCanvasClick);
    if (this.controls) this.controls.dispose();
    if (this.brainViewer) this.brainViewer.close();
    this.projectiles.forEach(p => p.destroy());
    this.particles.dispose();
    disposeScene(this.scene);
    this.environmentTarget?.dispose();
    this.renderer.dispose();
    this.container.innerHTML = '';
  }
}
