import * as THREE from 'three';
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

export class Arena3D {
  constructor(containerId, matchConfig, onFinish) {
    this.container = document.getElementById(containerId);
    this.matchConfig = matchConfig || {};
    this.onFinish = onFinish;

    this.simSpeed = 1.0;
    this.matchTime = BALANCE.ARENA.MATCH_DURATION_SECONDS;
    this.isMatchRunning = false;
    this.matchEnded = false;
    this.aiTickTimer = 0;

    // Sistem Kamera: 'cinematic' | 'thirdPerson' | 'firstPerson'
    this.cameraMode = 'cinematic';
    this.selectedRobotId = null;
    this.cinematicAngle = 0;
    this.cameraShakeIntensity = 0;

    // Entity lists
    this.robots = [];
    this.projectiles = [];
    this.activeDebris = [];

    this.initThree();
    this.setupArenaEnvironment();
    this.spawnTeams();

    // Raycaster untuk pemilihan robot & BrainViewerPanel (Modul 4 Fase 19)
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.brainViewer = new BrainViewerPanel(document.body);
    this.setupRaycasting();

    this.isMatchRunning = true;
    this.lastFrameTime = performance.now();
    this.animate = this.animate.bind(this);
    this.animId = requestAnimationFrame(this.animate);
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

  // Konversi koordinat 2D (0..960, 0..640) ke ruang 3D (-43..+43, -28..+28)
  toWorldCoord(x2d, y2d) {
    const scale = 0.09;
    return {
      x: (x2d - 480) * scale,
      z: (y2d - 320) * scale
    };
  }

  initThree() {
    this.container.innerHTML = '';

    const w = this.container.clientWidth || 960;
    const h = this.container.clientHeight || 640;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060913);
    this.scene.fog = new THREE.FogExp2(0x060913, 0.015);

    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.5, 300);
    this.camera.position.set(0, 38, 48);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    this.particles = new ParticleSystem3D(this.scene);

    // Window resize
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

    // Buat HTML overlay untuk bilah HP, amunisi, & 4-LED status
    this.overlayContainer = document.createElement('div');
    this.overlayContainer.className = 'arena-3d-overlay';
    this.container.style.position = 'relative';
    this.container.appendChild(this.overlayContainer);
  }

  setupArenaEnvironment() {
    // 1. Pencahayaan
    const ambientLight = new THREE.AmbientLight(0x1e293b, 1.8);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
    sunLight.position.set(25, 45, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 120;
    sunLight.shadow.camera.left = -50;
    sunLight.shadow.camera.right = 50;
    sunLight.shadow.camera.top = 40;
    sunLight.shadow.camera.bottom = -40;
    this.scene.add(sunLight);

    // Lampu Aksen Neon Sudut
    const blueSpot = new THREE.PointLight(0x00f0ff, 3.5, 80);
    blueSpot.position.set(-40, 10, -25);
    const redSpot = new THREE.PointLight(0xff3366, 3.5, 80);
    redSpot.position.set(40, 10, 25);
    this.scene.add(blueSpot, redSpot);

    // 2. Lantai Arena (Grid Neon Gelap Futuristik)
    const floorGeo = new THREE.PlaneGeometry(90, 60);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.8,
      metalness: 0.3
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Garis Grid Neon
    const gridHelper = new THREE.GridHelper(90, 30, 0x00f0ff, 0x1e293b);
    gridHelper.position.y = 0.05;
    this.scene.add(gridHelper);

    // Garis Tengah Arena
    const centerLineGeo = new THREE.PlaneGeometry(0.4, 58);
    const centerLineMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.7
    });
    const centerLine = new THREE.Mesh(centerLineGeo, centerLineMat);
    centerLine.rotation.x = -Math.PI / 2;
    centerLine.position.y = 0.06;
    this.scene.add(centerLine);

    // 3. Dinding Pembatas Semi-Transparan (Forcefield)
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.25,
      roughness: 0.1,
      metalness: 0.9
    });

    const createWall = (w, h, d, x, z) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.position.set(x, h / 2, z);
      this.scene.add(mesh);
    };

    createWall(90, 2.5, 0.8, 0, -29);
    createWall(90, 2.5, 0.8, 0, 29);
    createWall(0.8, 2.5, 60, -44, 0);
    createWall(0.8, 2.5, 60, 44, 0);
  }

  spawnTeams() {
    const { teamA = [], teamB = [] } = this.matchConfig;
    const defaultBots = PRESET_ROBOTS;

    const listA = teamA.length > 0 ? teamA : [defaultBots[0]];
    const listB = teamB.length > 0 ? teamB : [defaultBots[1] || defaultBots[0]];

    const countA = listA.length;
    const countB = listB.length;

    // Formasi spawn grid teratur (staggered 2 kolom jika > 3 robot)
    const getSpawnCoords = (index, totalCount, isTeamA) => {
      if (totalCount <= 3) {
        const ySpacing = 480 / (totalCount + 1);
        const x = isTeamA ? 160 : 800;
        const y = 80 + (index + 1) * ySpacing;
        return { x, y };
      }
      const col = index % 2; // 0: belakang, 1: depan
      const row = Math.floor(index / 2);
      const rowsCount = Math.ceil(totalCount / 2);
      const ySpacing = 480 / (rowsCount + 1);
      const y = 80 + (row + 1) * ySpacing + (col === 1 ? 14 : -14);
      let x;
      if (isTeamA) {
        x = col === 0 ? 90 : 180;
      } else {
        x = col === 0 ? 870 : 780;
      }
      return { x, y };
    };

    listA.forEach((botProfile, i) => {
      const pos = getSpawnCoords(i, countA, true);
      this.spawnRobot(pos.x, pos.y, botProfile, 'teamA');
    });

    listB.forEach((botProfile, i) => {
      const pos = getSpawnCoords(i, countB, false);
      this.spawnRobot(pos.x, pos.y, botProfile, 'teamB');
    });

    // Default target robot kamera
    if (this.robots.length > 0) {
      this.selectedRobotId = this.robots[0].robotState.id;
    }
  }

  spawnRobot(x2d, y2d, profile, team) {
    const wKey = profile.loadout?.senjata || 'meriam';
    const initialAmmo = BALANCE.WEAPON_AMMO[wKey] || 30;

    const robotState = {
      id: profile.id || `bot_${Math.random()}`,
      namaRobot: profile.namaRobot || 'Mech',
      team: team,
      loadout: profile.loadout,
      brain: profile.brain,
      parts: createPartsState(profile.loadout),
      x: x2d,
      y: y2d,
      rotation: team === 'teamA' ? 0 : Math.PI,
      targetRotation: team === 'teamA' ? 0 : Math.PI,
      turretRotation: team === 'teamA' ? 0 : Math.PI,
      targetTurretRotation: team === 'teamA' ? 0 : Math.PI,
      targetSpeed: 0,
      weaponCooldown: 0,
      currentAmmo: initialAmmo,
      maxAmmo: initialAmmo,
      destroyed: false,
      fireRequested: false,
      brokenWeaponAttempt: false,
      empLumpuhTimer: 0
    };

    const mesh = buildRobotMesh(profile.loadout, team);
    const wPos = this.toWorldCoord(x2d, y2d);
    mesh.position.set(wPos.x, 0, wPos.z);
    mesh.rotation.y = -robotState.rotation;
    this.scene.add(mesh);

    // Buat elemen HUD HTML di atas robot
    const hudEl = document.createElement('div');
    hudEl.className = 'robot-3d-hud';
    hudEl.innerHTML = `
      <div class="hud-name ${team}">${robotState.namaRobot}</div>
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
      lastRamTime: 0,
      lastHitTime: 0,
      radius: 22,
      lastWarningTime: 0,
      smokeTimer: 0,
      sparkTimer: 0
    });
  }

  setSpeed(speed) {
    this.simSpeed = speed;
  }

  setCameraMode(mode, targetId = null) {
    this.cameraMode = mode;
    if (targetId) this.selectedRobotId = targetId;
  }

  animate(now) {
    this.animId = requestAnimationFrame(this.animate);
    const deltaMs = Math.min(now - this.lastFrameTime, 100);
    this.lastFrameTime = now;

    if (!this.isMatchRunning || this.matchEnded) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    const scaledDeltaSec = (deltaMs * this.simSpeed) / 1000;

    // 1. Kurangi sisa waktu
    this.matchTime -= scaledDeltaSec;
    if (this.matchTime <= 0) {
      this.matchTime = 0;
      this.resolveMatchByHP();
      return;
    }

    // 2. Evaluasi AI Tick (Tiap 150ms)
    this.aiTickTimer += deltaMs * this.simSpeed;
    if (this.aiTickTimer >= BALANCE.ARENA.AI_TICK_MS) {
      this.aiTickTimer = 0;
      this.runAITick();
    }

    // 3. Update Robot (Fisika, Rotasi Sasis, Turet 360°, Visual Kerusakan)
    this.updateRobots(scaledDeltaSec);

    // 4. Deteksi Benturan Tabrakan Robot vs Robot (Ramming Melee)
    this.checkRobotCollisions(scaledDeltaSec);

    // 5. Update Proyektil & Tabrakan Manual 2D
    this.updateProjectiles(scaledDeltaSec);

    // 6. Update Puing Fisika Ledakan Robot
    this.updateDebris(scaledDeltaSec);

    // 7. Update Partikel 3D
    this.particles.update(scaledDeltaSec);

    // 8. Update Kamera & Screen Shake
    this.updateCamera(scaledDeltaSec);

    // 9. Update HUD HTML 2D Overlay
    this.updateHUDPositions();

    // 10. Cek Kondisi Kemenangan
    this.checkWinCondition();

    // 11. Update Live Brain Viewer (Modul 4 Fase 19)
    if (this.brainViewer) {
      this.brainViewer.update();
    }

    this.renderer.render(this.scene, this.camera);
  }

  runAITick() {
    const gameState = {
      robots: this.robots.map(r => r.robotState),
      arenaWidth: 960,
      arenaHeight: 640
    };

    this.robots.forEach(r => {
      if (!r.robotState.destroyed && r.robotState.brain) {
        evaluateBrain(r.robotState.brain, r.robotState, gameState);
      }
    });
  }

  updateRobots(deltaSec) {
    this.robots.forEach(r => {
      const state = r.robotState;
      if (state.destroyed) return;

      if (state.weaponCooldown > 0) {
        state.weaponCooldown -= deltaSec;
      }

      // Cari musuh hidup terdekat untuk pelacakan Turet 360° & Mode Ramming
      const opposingAlive = this.robots.filter(
        other => other.robotState.team !== state.team && !other.robotState.destroyed
      );

      let nearestEnemy = null;
      let minDistance = Infinity;
      opposingAlive.forEach(enemy => {
        const d = Math.hypot(enemy.robotState.x - state.x, enemy.robotState.y - state.y);
        if (d < minDistance) {
          minDistance = d;
          nearestEnemy = enemy;
        }
      });

      // 1. TURET 360 DERAJAT INDEPENDEN
      if (nearestEnemy) {
        const dx = nearestEnemy.robotState.x - state.x;
        const dy = nearestEnemy.robotState.y - state.y;
        state.targetTurretRotation = Math.atan2(dy, dx);
      } else {
        state.targetTurretRotation = state.rotation;
      }

      // Rotasi halus turet menuju target 360°
      let tDiff = state.targetTurretRotation - state.turretRotation;
      while (tDiff > Math.PI) tDiff -= Math.PI * 2;
      while (tDiff < -Math.PI) tDiff += Math.PI * 2;
      const maxTurretTurn = 7.0 * deltaSec;
      state.turretRotation += Math.max(-maxTurretTurn, Math.min(maxTurretTurn, tDiff));

      // Putar mesh turet pada sasis robot (sudut lokal turet)
      if (r.mesh.turretMesh) {
        r.mesh.turretMesh.rotation.y = -(state.turretRotation - state.rotation);

        // Animasi tolak balik laras (Recoil spring back)
        if (r.recoilOffset > 0) {
          r.recoilOffset = Math.max(0, r.recoilOffset - deltaSec * 1.8);
          r.mesh.turretMesh.position.z = -r.recoilOffset;
        }
      }

      // Animasi putar laras gatling jika sedang nembak / cooldown
      const gatlingCluster = r.mesh.getObjectByName('gatling_cluster');
      if (gatlingCluster && state.weaponCooldown > 0) {
        gatlingCluster.rotation.z += deltaSec * 24;
      }

      // Peluruhan kilatan cahaya armor (Armor flash glow decay)
      if (r.armorGlowTimer > 0 && r.mesh.armorMaterial) {
        r.armorGlowTimer -= deltaSec;
        const glowRatio = Math.max(0, r.armorGlowTimer / 0.35);
        r.mesh.armorMaterial.emissiveIntensity = 0.25 + glowRatio * 2.8;
      }

      // 2. MODE RAMMING: Jika amunisi habis atau senjata hancur, tabrak musuh!
      if (state.currentAmmo <= 0 || isWeaponBroken(state)) {
        if (nearestEnemy) {
          state.targetRotation = state.targetTurretRotation;
          state.targetSpeed = calculateEffectiveSpeed(state) * 1.15; // Dorongan lari kencang
        }
      }

      // EMP Status countdown
      if (state.empLumpuhTimer > 0) {
        state.empLumpuhTimer -= deltaSec;
        state.targetSpeed = 0;
        if (Math.random() < 0.25) {
          this.particles.emitSparks(r.mesh.position);
        }
      }

      // Regenerasi Armor Reaktif jika tidak diserang selama 3.5 detik
      if (state.loadout?.armor === 'reaktif' && state.parts.armor) {
        const now = performance.now();
        if (now - (r.lastHitTime || 0) > 3500) {
          const arm = state.parts.armor;
          if (arm.hp < arm.hpMax) {
            arm.hp = Math.min(arm.hpMax, arm.hp + (PARTS.armor.reaktif?.regenRate || 8) * deltaSec);
          }
        }
      }

      // 3. Rotasi Haluan Sasis
      const turnSpeed = calculateEffectiveTurnSpeed(state);
      let diff = state.targetRotation - state.rotation;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;

      const maxTurn = turnSpeed * deltaSec;
      state.rotation += Math.max(-maxTurn, Math.min(maxTurn, diff));

      // 4. Kecepatan Gerak
      const speed = state.targetSpeed;
      if (speed > 0) {
        state.x += Math.cos(state.rotation) * speed * deltaSec;
        state.y += Math.sin(state.rotation) * speed * deltaSec;

        // Batasi di dalam arena
        state.x = Math.max(35, Math.min(925, state.x));
        state.y = Math.max(35, Math.min(605, state.y));
      }

      // Update Transform 3D Mesh
      const wPos = this.toWorldCoord(state.x, state.y);
      r.mesh.position.set(wPos.x, 0, wPos.z);
      r.mesh.rotation.y = -state.rotation;

      // 5. Tangkap Request Tembak
      if (state.fireRequested) {
        state.fireRequested = false;
        this.fireWeapon(r);
      }

      // 6. Efek Visual Pincang & Lumpuh (Fase 14)
      const loco = getLocomotionState(state);
      if (loco === 'pincang' && state.targetSpeed > 0) {
        r.smokeTimer += deltaSec;
        if (r.smokeTimer >= 0.14) {
          r.smokeTimer = 0;
          this.particles.emitSmoke(r.mesh.position, -state.rotation);
        }
      } else if (loco === 'lumpuh') {
        r.sparkTimer += deltaSec;
        if (r.sparkTimer >= 0.18) {
          r.sparkTimer = 0;
          this.particles.emitSparks(r.mesh.position);
        }
      }

      // 7. Peringatan Senjata Rusak (Billboard Sprite 3D)
      if (state.brokenWeaponAttempt) {
        state.brokenWeaponAttempt = false;
        const now = Date.now();
        if (now - r.lastWarningTime > 1500) {
          r.lastWarningTime = now;
          this.showBillboardWarning(r.mesh.position, 'SENJATA RUSAK! ❌', '#ef4444');
        }
      }
    });
  }

  checkRobotCollisions(deltaSec) {
    const aliveBots = this.robots.filter(r => !r.robotState.destroyed);
    const now = performance.now();

    for (let i = 0; i < aliveBots.length; i++) {
      for (let j = i + 1; j < aliveBots.length; j++) {
        const b1 = aliveBots[i];
        const b2 = aliveBots[j];

        const dx = b2.robotState.x - b1.robotState.x;
        const dy = b2.robotState.y - b1.robotState.y;
        const dist = Math.hypot(dx, dy);
        const minDist = b1.radius + b2.radius;

        if (dist < minDist && dist > 0.001) {
          // Tabrakan Fisik Terjadi!
          const isOpposing = b1.robotState.team !== b2.robotState.team;

          // Pisahkan posisi kedua robot agar tidak saling menembus
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;

          b1.robotState.x -= nx * (overlap * 0.5);
          b1.robotState.y -= ny * (overlap * 0.5);
          b2.robotState.x += nx * (overlap * 0.5);
          b2.robotState.y += ny * (overlap * 0.5);

          // Jika tim lawan, berikan efek benturan (Ramming Damage)
          if (isOpposing) {
            const canRam1 = !b1.lastRamTime || (now - b1.lastRamTime) > (BALANCE.RAMMING.COOLDOWN * 1000);
            const canRam2 = !b2.lastRamTime || (now - b2.lastRamTime) > (BALANCE.RAMMING.COOLDOWN * 1000);

            if (canRam1 || canRam2) {
              b1.lastRamTime = now;
              b2.lastRamTime = now;

              const rk1 = b1.robotState.loadout?.rangka || 'sedang';
              const rk2 = b2.robotState.loadout?.rangka || 'sedang';
              const dmg1 = BALANCE.RAMMING.DAMAGE[rk1] || 32;
              const dmg2 = BALANCE.RAMMING.DAMAGE[rk2] || 32;

              this.applyDamageToRobot(b2, dmg1);
              this.applyDamageToRobot(b1, dmg2);

              SFX.playHit();

              const midX = (b1.mesh.position.x + b2.mesh.position.x) / 2;
              const midZ = (b1.mesh.position.z + b2.mesh.position.z) / 2;
              const impactPos = { x: midX, y: 1.0, z: midZ };

              this.particles.emitCollisionSparks(impactPos, 28);
              this.particles.emitShockwave(impactPos, 5.5, 0xf59e0b);
              this.cameraShakeIntensity = 0.9;

              this.showBillboardWarning(impactPos, `💥 TABRAKAN! -${Math.round(dmg1)} HP`, '#f59e0b');

              // Efek tolak balik impuls (Knockback)
              const force = BALANCE.RAMMING.KNOCKBACK_FORCE;
              b1.robotState.x -= nx * force;
              b1.robotState.y -= ny * force;
              b2.robotState.x += nx * force;
              b2.robotState.y += ny * force;
            }
          }
        }
      }
    }
  }

  fireWeapon(r) {
    const state = r.robotState;
    if (isWeaponBroken(state)) {
      state.brokenWeaponAttempt = true;
      return;
    }

    if (state.currentAmmo <= 0) {
      // Amunisi habis! Munculkan peringatan billboard
      const now = Date.now();
      if (now - r.lastWarningTime > 1500) {
        r.lastWarningTime = now;
        this.showBillboardWarning(r.mesh.position, 'AMUNISI HABIS! ⚠️ TABRAK MUSUH!', '#f59e0b');
      }
      return;
    }

    state.currentAmmo--;

    const sData = state.parts.senjata;

    // Posisi moncong proyektil 2D presisi menghadap arah turet 360°
    const muzzle2D = {
      x: state.x + Math.cos(state.turretRotation) * 28,
      y: state.y + Math.sin(state.turretRotation) * 28
    };

    // Sentakan mekanis laras mundur (Mechanical Recoil)
    r.recoilOffset = 0.35;

    if (sData.burstCount > 1) {
      for (let i = 0; i < sData.burstCount; i++) {
        setTimeout(() => {
          if (!state.destroyed && this.isMatchRunning) {
            const spread = (Math.random() - 0.5) * 0.08;
            const p = new Projectile3D(
              this.scene,
              muzzle2D,
              state.turretRotation + spread,
              sData,
              r,
              this.toWorldCoord
            );
            this.projectiles.push(p);
          }
        }, i * (sData.burstInterval * 1000));
      }
    } else {
      const p = new Projectile3D(
        this.scene,
        muzzle2D,
        state.turretRotation,
        sData,
        r,
        this.toWorldCoord
      );
      this.projectiles.push(p);
    }
  }

  updateProjectiles(deltaSec) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.active) {
        this.projectiles.splice(i, 1);
        continue;
      }

      const aliveEnemies = this.robots.filter(
        r => r.robotState.team !== p.shooter.robotState.team && !r.robotState.destroyed
      );

      p.update(deltaSec, aliveEnemies);

      // Deteksi tabrakan 2D murni (Circle Overlap)
      for (let j = 0; j < aliveEnemies.length; j++) {
        const enemy = aliveEnemies[j];
        const dx = p.x - enemy.robotState.x;
        const dy = p.y - enemy.robotState.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= enemy.radius + 6) {
          this.applyDamageToRobot(enemy, p.damage);
          const wPos = this.toWorldCoord(p.x, p.y);
          this.particles.emitImpactSparks({ x: wPos.x, y: 1.4, z: wPos.z }, p.weaponData.bulletColor || 0xffaa00);

          // Efek EMP (Modul 4)
          if (p.weaponData.jenis === 'emp' || p.weaponData.isEmp) {
            enemy.robotState.empLumpuhTimer = 3.0;
            enemy.robotState.targetSpeed = 0;
            this.showBillboardWarning({ x: wPos.x, y: 1.4, z: wPos.z }, 'LUMPUH EMP! ⚡', '#00f0ff');
          }

          p.destroy(true);
          break;
        }
      }
    }
  }

  applyDamageToRobot(target, amount) {
    target.lastHitTime = performance.now();
    const result = applyDamage(target.robotState, amount);
    if (!result) return;

    if (result.absorbedByArmor > 0) {
      SFX.playShieldDeflect();

      // Kilatan cahaya reaktif armor saat menyerap damage
      if (target.mesh && target.mesh.armorMaterial) {
        target.armorGlowTimer = 0.35;
        target.mesh.armorMaterial.emissiveIntensity = 3.2;
      }
    }
    SFX.playHit();

    // Perbarui material part 3D jika ada part yang rusak (Fase 14)
    const parts = target.robotState.parts;
    Object.keys(parts).forEach(key => {
      if (parts[key] && parts[key].hpMax > 0 && parts[key].hp <= 0) {
        updatePartDamageVisual(target.mesh, key, true);
      }
    });

    if (result.isDestroyed) {
      this.onRobotDestroyed(target);
    }
  }

  onRobotDestroyed(target) {
    target.robotState.destroyed = true;
    SFX.playExplosion();

    const deathPos = {
      x: target.mesh.position.x,
      y: target.mesh.position.y + 0.8,
      z: target.mesh.position.z
    };

    // Ledakan besar & shockwave ring lantai
    this.particles.emitExplosion(deathPos);
    this.particles.emitShockwave(deathPos, 7.5, 0xff3366);
    this.cameraShakeIntensity = 1.2;

    // Sembunyikan mesh utuh & HUD
    target.mesh.visible = false;
    target.hudEl.style.display = 'none';

    // Munculkan puing-puing fisik 3D berhamburan!
    const debris = createRobotDebrisPieces(
      target.robotState.loadout,
      target.robotState.team,
      deathPos
    );
    debris.forEach(d => {
      this.scene.add(d.mesh);
      this.activeDebris.push(d);
    });

    // Jika robot ini sedang difollow kamera, alihkan otomatis
    if (this.selectedRobotId === target.robotState.id) {
      const aliveSameTeam = this.robots.find(r => r.robotState.team === target.robotState.team && !r.robotState.destroyed);
      if (aliveSameTeam) {
        this.selectedRobotId = aliveSameTeam.robotState.id;
      } else {
        const anyAlive = this.robots.find(r => !r.robotState.destroyed);
        if (anyAlive) this.selectedRobotId = anyAlive.robotState.id;
      }
    }
  }

  updateDebris(deltaSec) {
    const gravity = 28.0;

    for (let i = this.activeDebris.length - 1; i >= 0; i--) {
      const d = this.activeDebris[i];
      d.lifetime -= deltaSec;

      if (d.lifetime <= 0) {
        this.scene.remove(d.mesh);
        d.mesh.geometry?.dispose();
        d.mesh.material?.dispose();
        this.activeDebris.splice(i, 1);
        continue;
      }

      if (!d.isGrounded) {
        // Gravitasi
        d.vel.y -= gravity * deltaSec;

        // Gerak translasi
        d.mesh.position.x += d.vel.x * deltaSec;
        d.mesh.position.y += d.vel.y * deltaSec;
        d.mesh.position.z += d.vel.z * deltaSec;

        // Rotasi angular
        d.mesh.rotation.x += d.rotVel.x * deltaSec;
        d.mesh.rotation.y += d.rotVel.y * deltaSec;
        d.mesh.rotation.z += d.rotVel.z * deltaSec;

        // Jejak asap puing saat terbang
        d.smokeTimer += deltaSec;
        if (d.smokeTimer >= 0.12) {
          d.smokeTimer = 0;
          this.particles.emitDebrisSmoke(d.mesh.position);
        }

        // Pantulan di lantai arena (y = 0.25)
        if (d.mesh.position.y <= 0.25) {
          d.mesh.position.y = 0.25;
          d.bounceCount++;

          if (d.bounceCount >= 3 || Math.abs(d.vel.y) < 2.0) {
            d.isGrounded = true;
            d.vel.set(0, 0, 0);
            d.rotVel.set(0, 0, 0);
          } else {
            d.vel.y = -d.vel.y * 0.45;
            d.vel.x *= 0.6;
            d.vel.z *= 0.6;
            d.rotVel.multiplyScalar(0.6);
          }
        }
      }
    }
  }

  showBillboardWarning(worldPos, text, color = '#ef4444') {
    const sprite = createBillboardText(text, color);
    sprite.position.set(worldPos.x, worldPos.y + 3.2, worldPos.z);
    this.scene.add(sprite);

    // Animasi melayang naik dan menghilang
    let elapsed = 0;
    const dur = 1.0;
    const anim = () => {
      elapsed += 0.03;
      sprite.position.y += 0.05;
      sprite.material.opacity = 1 - elapsed / dur;
      if (elapsed < dur) {
        requestAnimationFrame(anim);
      } else {
        this.scene.remove(sprite);
        sprite.material.dispose();
      }
    };
    anim();
  }

  updateCamera(deltaSec) {
    let targetBot = this.robots.find(r => r.robotState.id === this.selectedRobotId && !r.robotState.destroyed);
    if (!targetBot) {
      targetBot = this.robots.find(r => !r.robotState.destroyed);
      if (targetBot) this.selectedRobotId = targetBot.robotState.id;
    }

    if (this.cameraMode === 'firstPerson' && targetBot) {
      // First Person: di kokpit robot menghadap searah turet/senjata robot
      const pos = targetBot.mesh.position;
      const tYaw = -targetBot.robotState.turretRotation;

      this.camera.position.set(pos.x, pos.y + 1.9, pos.z);
      const lookDist = 18;
      this.camera.lookAt(
        pos.x + Math.sin(tYaw) * lookDist,
        pos.y + 1.7,
        pos.z + Math.cos(tYaw) * lookDist
      );
    } else if (this.cameraMode === 'thirdPerson' && targetBot) {
      // Third Person: di belakang-atas robot dengan lerp halus
      const pos = targetBot.mesh.position;
      const yaw = targetBot.mesh.rotation.y;
      const dist = 10;
      const height = 5.5;

      const targetCamX = pos.x - Math.sin(yaw) * dist;
      const targetCamY = pos.y + height;
      const targetCamZ = pos.z - Math.cos(yaw) * dist;

      this.camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), 0.08);
      this.camera.lookAt(pos.x, pos.y + 1.2, pos.z);
    } else {
      // Cinematic: Orbit titik tengah secara perlahan
      this.cinematicAngle += deltaSec * 0.16;
      const radius = 54;
      const camX = Math.cos(this.cinematicAngle) * radius;
      const camZ = Math.sin(this.cinematicAngle) * radius;

      this.camera.position.lerp(new THREE.Vector3(camX, 28, camZ), 0.04);
      this.camera.lookAt(0, 1.0, 0);
    }

    // Efek getaran kamera (Screen Shake) saat benturan atau ledakan
    if (this.cameraShakeIntensity > 0) {
      const shake = this.cameraShakeIntensity;
      this.camera.position.x += (Math.random() - 0.5) * shake;
      this.camera.position.y += (Math.random() - 0.5) * shake;
      this.camera.position.z += (Math.random() - 0.5) * shake;
      this.cameraShakeIntensity = Math.max(0, this.cameraShakeIntensity - deltaSec * 3.0);
    }
  }

  updateHUDPositions() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    this.robots.forEach(r => {
      const state = r.robotState;
      if (state.destroyed) {
        r.hudEl.style.display = 'none';
        return;
      }
      r.hudEl.style.display = 'block';

      // Proyeksikan posisi 3D robot ke koordinat layar 2D
      const pos3d = r.mesh.position.clone();
      pos3d.y += 3.2; // Di atas kepala robot
      pos3d.project(this.camera);

      // Sembunyikan jika di belakang kamera
      if (pos3d.z > 1) {
        r.hudEl.style.display = 'none';
        return;
      }

      const xScreen = ((pos3d.x + 1) * w) / 2;
      const yScreen = ((-pos3d.y + 1) * h) / 2;

      r.hudEl.style.transform = `translate(-50%, -100%) translate(${xScreen}px, ${yScreen}px) ${this.robots.length > 10 ? 'scale(0.82)' : ''}`;

      // Update bilah HP
      const rangka = state.parts.rangka;
      const hpRatio = Math.max(0, Math.min(1, rangka.hp / rangka.hpMax));
      const bar = r.hudEl.querySelector('.hud-hp-bar');
      if (bar) {
        bar.style.width = `${hpRatio * 100}%`;
        if (hpRatio <= 0.3) bar.style.background = '#ef4444';
        else if (hpRatio <= 0.6) bar.style.background = '#f59e0b';
        else bar.style.background = '#10b981';
      }

      // Update teks amunisi
      const ammoEl = r.hudEl.querySelector('.hud-ammo-text');
      if (ammoEl) {
        if (state.currentAmmo <= 0) {
          ammoEl.innerHTML = '<span style="color:#f59e0b; font-weight:800;">HABIS (RAM!)</span>';
        } else {
          ammoEl.textContent = `${state.currentAmmo}/${state.maxAmmo}`;
        }
      }

      // Update 4-LED part
      const updateLed = (className, part) => {
        const led = r.hudEl.querySelector(className);
        if (!led) return;
        if (!part || part.hpMax <= 0) {
          led.style.display = 'none';
          return;
        }
        led.style.display = 'inline-block';
        if (part.hp <= 0) led.style.background = '#ef4444';
        else if (part.hp / part.hpMax <= BALANCE.LOCOMOTION.LIMP_HP_THRESHOLD) led.style.background = '#f59e0b';
        else led.style.background = '#10b981';
      };

      updateLed('.hud-led.s', state.parts.senjata);
      updateLed('.hud-led.p', state.parts.penggerak);
      updateLed('.hud-led.r', state.parts.sensor);
      updateLed('.hud-led.a', state.parts.armor);
    });
  }

  checkWinCondition() {
    const teamAAlive = this.robots.some(r => r.robotState.team === 'teamA' && !r.robotState.destroyed);
    const teamBAlive = this.robots.some(r => r.robotState.team === 'teamB' && !r.robotState.destroyed);

    if (!teamAAlive && !teamBAlive) {
      this.endMatch('SERI', 'Kedua tim hancur bersamaan!');
    } else if (!teamAAlive) {
      this.endMatch('Tim Merah Menang!', 'Semua robot Tim Biru hancur.');
    } else if (!teamBAlive) {
      this.endMatch('Tim Biru Menang!', 'Semua robot Tim Merah hancur.');
    }
  }

  resolveMatchByHP() {
    let hpA = 0;
    let hpB = 0;

    this.robots.forEach(r => {
      if (!r.robotState.destroyed) {
        const hp = r.robotState.parts.rangka.hp;
        if (r.robotState.team === 'teamA') hpA += hp;
        else hpB += hp;
      }
    });

    if (hpA > hpB) {
      this.endMatch('Tim Biru Menang!', `Waktu Habis! Total HP Biru (${Math.round(hpA)}) > Merah (${Math.round(hpB)}).`);
    } else if (hpB > hpA) {
      this.endMatch('Tim Merah Menang!', `Waktu Habis! Total HP Merah (${Math.round(hpB)}) > Biru (${Math.round(hpA)}).`);
    } else {
      this.endMatch('SERI!', 'Waktu Habis! Total HP kedua tim sama.');
    }
  }

  endMatch(title, reason) {
    if (this.matchEnded) return;
    this.matchEnded = true;
    this.isMatchRunning = false;

    if (this.onFinish) {
      this.onFinish({
        title,
        reason,
        robots: this.robots.map(r => ({
          nama: r.robotState.namaRobot,
          team: r.robotState.team,
          destroyed: r.robotState.destroyed,
          hpRangka: r.robotState.parts.rangka.hp,
          hpMax: r.robotState.parts.rangka.hpMax
        }))
      });
    }
  }

  // --- DEBUG METHODS MODUL 2 ---
  debugBreakFirstBotWeapon() {
    const bot = this.robots.find(r => !r.robotState.destroyed);
    if (bot) {
      bot.robotState.parts.senjata.hp = 0;
      updatePartDamageVisual(bot.mesh, 'senjata', true);
      this.showBillboardWarning(bot.mesh.position, 'SENJATA RUSAK! ❌');
    }
  }

  debugLimpFirstBot() {
    const bot = this.robots.find(r => !r.robotState.destroyed);
    if (bot) {
      const p = bot.robotState.parts.penggerak;
      p.hp = Math.round(p.hpMax * 0.4);
      updatePartDamageVisual(bot.mesh, 'penggerak', true);
      this.showBillboardWarning(bot.mesh.position, 'PINCANG 40%! ⚠️');
    }
  }

  debugParalyzeFirstBot() {
    const bot = this.robots.find(r => !r.robotState.destroyed);
    if (bot) {
      bot.robotState.parts.penggerak.hp = 0;
      updatePartDamageVisual(bot.mesh, 'penggerak', true);
      this.showBillboardWarning(bot.mesh.position, 'LUMPUH 0%! 🛑');
    }
  }

  destroy() {
    cancelAnimationFrame(this.animId);
    window.removeEventListener('resize', this.onResize);

    this.projectiles.forEach(p => p.destroy());
    this.projectiles = [];

    this.activeDebris.forEach(d => {
      this.scene.remove(d.mesh);
      d.mesh.geometry?.dispose();
      d.mesh.material?.dispose();
    });
    this.activeDebris = [];

    this.particles.clear();

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }

    if (this.onCanvasClick && this.container) {
      this.container.removeEventListener('click', this.onCanvasClick);
    }

    if (this.brainViewer) {
      this.brainViewer.destroy();
    }

    if (this.overlayContainer && this.overlayContainer.parentNode) {
      this.overlayContainer.parentNode.removeChild(this.overlayContainer);
    }
  }
}
