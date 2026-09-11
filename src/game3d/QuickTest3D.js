import * as THREE from 'three';
import { buildRobotMesh, createRobotDebrisPieces } from './RobotBuilder.js';
import { ParticleSystem3D } from './ParticleSystem3D.js';
import { Projectile3D } from './Projectile3D.js';
import { createPartsState } from '../data/parts.js';
import { applyDamage, isWeaponBroken } from '../ai/damage.js';
import { calculateEffectiveTurnSpeed, calculateEffectiveSpeed } from '../ai/actions.js';
import { evaluateBrain } from '../ai/interpreter.js';
import { BALANCE } from '../data/balance.js';
import { PRESET_ROBOTS } from '../data/preset_brains/presets.js';

export class QuickTest3D {
  constructor(containerId, testRobotProfile) {
    this.container = document.getElementById(containerId);
    this.testRobot = testRobotProfile || PRESET_ROBOTS[0];
    this.robots = [];
    this.projectiles = [];
    this.activeDebris = [];
    this.aiTickTimer = 0;
    this.isMatchRunning = true;

    this.initThree();
    this.spawnBots();

    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
    this.animId = requestAnimationFrame(this.animate);
  }

  toWorldCoord(x2d, y2d) {
    const scale = 0.08;
    return {
      x: (x2d - 320) * scale,
      z: (y2d - 200) * scale
    };
  }

  initThree() {
    this.container.innerHTML = '';
    const w = this.container.clientWidth || 640;
    const h = this.container.clientHeight || 400;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0f1d);

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.5, 200);
    this.camera.position.set(0, 24, 28);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    this.particles = new ParticleSystem3D(this.scene);

    // Pencahayaan
    const amb = new THREE.AmbientLight(0xffffff, 1.5);
    const dir = new THREE.DirectionalLight(0xffffff, 2.0);
    dir.position.set(15, 30, 20);
    dir.castShadow = true;
    this.scene.add(amb, dir);

    // Grid lantai
    const floorGeo = new THREE.PlaneGeometry(60, 40);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x070c18, roughness: 0.8 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const grid = new THREE.GridHelper(60, 30, 0x00f0ff, 0x1e293b);
    grid.position.y = 0.01;
    this.scene.add(grid);
  }

  spawnBots() {
    // 1. Bot yang sedang diuji (User)
    this.spawnSingleBot(120, 200, this.testRobot, 'teamA');

    // 2. Bot lawan
    const rival = PRESET_ROBOTS[1] || PRESET_ROBOTS[0];
    this.spawnSingleBot(520, 200, rival, 'teamB');
  }

  spawnSingleBot(x2d, y2d, profile, team) {
    const wKey = profile.loadout?.senjata || 'meriam';
    const initialAmmo = BALANCE.WEAPON_AMMO[wKey] || 30;

    const robotState = {
      id: profile.id || `bot_${Math.random()}`,
      namaRobot: profile.namaRobot || 'Bot',
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
      brokenWeaponAttempt: false
    };

    const mesh = buildRobotMesh(profile.loadout, team);
    const wPos = this.toWorldCoord(x2d, y2d);
    mesh.position.set(wPos.x, 0, wPos.z);
    mesh.rotation.y = -robotState.rotation;
    this.scene.add(mesh);

    this.robots.push({
      robotState,
      mesh,
      recoilOffset: 0,
      armorGlowTimer: 0,
      lastRamTime: 0,
      radius: 20
    });
  }

  animate(now) {
    this.animId = requestAnimationFrame(this.animate);
    const deltaMs = Math.min(now - this.lastTime, 100);
    this.lastTime = now;
    const deltaSec = deltaMs / 1000;

    if (!this.isMatchRunning) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    // AI Tick
    this.aiTickTimer += deltaMs;
    if (this.aiTickTimer >= BALANCE.ARENA.AI_TICK_MS) {
      this.aiTickTimer = 0;
      const gameState = {
        robots: this.robots.map(r => r.robotState),
        arenaWidth: 640,
        arenaHeight: 400
      };
      this.robots.forEach(r => {
        if (!r.robotState.destroyed && r.robotState.brain) {
          evaluateBrain(r.robotState.brain, r.robotState, gameState);
        }
      });
    }

    // Update robots
    this.robots.forEach(r => {
      const state = r.robotState;
      if (state.destroyed) return;

      if (state.weaponCooldown > 0) state.weaponCooldown -= deltaSec;

      const opposing = this.robots.find(other => other.robotState.team !== state.team && !other.robotState.destroyed);

      // 1. Turet 360° Tracking
      if (opposing) {
        const dx = opposing.robotState.x - state.x;
        const dy = opposing.robotState.y - state.y;
        state.targetTurretRotation = Math.atan2(dy, dx);
      } else {
        state.targetTurretRotation = state.rotation;
      }

      let tDiff = state.targetTurretRotation - state.turretRotation;
      while (tDiff > Math.PI) tDiff -= Math.PI * 2;
      while (tDiff < -Math.PI) tDiff += Math.PI * 2;
      state.turretRotation += Math.max(-7.0 * deltaSec, Math.min(7.0 * deltaSec, tDiff));

      if (r.mesh.turretMesh) {
        r.mesh.turretMesh.rotation.y = -(state.turretRotation - state.rotation);
        if (r.recoilOffset > 0) {
          r.recoilOffset = Math.max(0, r.recoilOffset - deltaSec * 1.8);
          r.mesh.turretMesh.position.z = -r.recoilOffset;
        }
      }

      // 2. Mode Ramming saat amunisi habis / senjata patah
      if ((state.currentAmmo <= 0 || isWeaponBroken(state)) && opposing) {
        state.targetRotation = state.targetTurretRotation;
        state.targetSpeed = calculateEffectiveSpeed(state);
      }

      // Haluan Sasis
      const turnSpeed = calculateEffectiveTurnSpeed(state);
      let diff = state.targetRotation - state.rotation;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      state.rotation += Math.max(-turnSpeed * deltaSec, Math.min(turnSpeed * deltaSec, diff));

      const speed = state.targetSpeed;
      if (speed > 0) {
        state.x += Math.cos(state.rotation) * speed * deltaSec;
        state.y += Math.sin(state.rotation) * speed * deltaSec;
        state.x = Math.max(30, Math.min(610, state.x));
        state.y = Math.max(30, Math.min(370, state.y));
      }

      const wPos = this.toWorldCoord(state.x, state.y);
      r.mesh.position.set(wPos.x, 0, wPos.z);
      r.mesh.rotation.y = -state.rotation;

      // Armor glow decay
      if (r.armorGlowTimer > 0 && r.mesh.armorMaterial) {
        r.armorGlowTimer -= deltaSec;
        r.mesh.armorMaterial.emissiveIntensity = 0.25 + (r.armorGlowTimer / 0.35) * 2.8;
      }

      // Menembak
      if (state.fireRequested) {
        state.fireRequested = false;
        if (!isWeaponBroken(state) && state.currentAmmo > 0) {
          state.currentAmmo--;
          r.recoilOffset = 0.35;

          const m2d = {
            x: state.x + Math.cos(state.turretRotation) * 26,
            y: state.y + Math.sin(state.turretRotation) * 26
          };
          const p = new Projectile3D(
            this.scene,
            m2d,
            state.turretRotation,
            state.parts.senjata,
            r,
            this.toWorldCoord
          );
          this.projectiles.push(p);
        }
      }
    });

    // Cek tabrakan robot vs robot (Ramming)
    if (this.robots.length === 2) {
      const b1 = this.robots[0];
      const b2 = this.robots[1];
      if (!b1.robotState.destroyed && !b2.robotState.destroyed) {
        const dx = b2.robotState.x - b1.robotState.x;
        const dy = b2.robotState.y - b1.robotState.y;
        const dist = Math.hypot(dx, dy);
        const minDist = b1.radius + b2.radius;

        if (dist < minDist && dist > 0.001) {
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;
          b1.robotState.x -= nx * overlap * 0.5;
          b1.robotState.y -= ny * overlap * 0.5;
          b2.robotState.x += nx * overlap * 0.5;
          b2.robotState.y += ny * overlap * 0.5;

          const now = performance.now();
          if (!b1.lastRamTime || now - b1.lastRamTime > 1200) {
            b1.lastRamTime = now;
            b2.lastRamTime = now;
            applyDamage(b2.robotState, 30);
            applyDamage(b1.robotState, 30);

            const mid = {
              x: (b1.mesh.position.x + b2.mesh.position.x) / 2,
              y: 1.0,
              z: (b1.mesh.position.z + b2.mesh.position.z) / 2
            };
            this.particles.emitCollisionSparks(mid, 24);
            this.particles.emitShockwave(mid, 4.5, 0xf59e0b);

            if (b1.robotState.destroyed) this.destroyRobot(b1);
            if (b2.robotState.destroyed) this.destroyRobot(b2);
          }
        }
      }
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.active) {
        this.projectiles.splice(i, 1);
        continue;
      }
      p.update(deltaSec, this.robots.filter(r => r.robotState.team !== p.shooter.robotState.team && !r.robotState.destroyed));

      const enemies = this.robots.filter(r => r.robotState.team !== p.shooter.robotState.team && !r.robotState.destroyed);
      for (let j = 0; j < enemies.length; j++) {
        const e = enemies[j];
        const dist = Math.hypot(p.x - e.robotState.x, p.y - e.robotState.y);
        if (dist <= e.radius + 6) {
          const res = applyDamage(e.robotState, p.damage);
          if (res?.absorbedByArmor > 0 && e.mesh.armorMaterial) {
            e.armorGlowTimer = 0.35;
            e.mesh.armorMaterial.emissiveIntensity = 3.0;
          }
          const wPos = this.toWorldCoord(p.x, p.y);
          this.particles.emitImpactSparks({ x: wPos.x, y: 1.4, z: wPos.z });
          p.destroy(true);

          if (e.robotState.destroyed) {
            this.destroyRobot(e);
          }
          break;
        }
      }
    }

    // Update debris
    for (let i = this.activeDebris.length - 1; i >= 0; i--) {
      const d = this.activeDebris[i];
      d.lifetime -= deltaSec;
      if (d.lifetime <= 0) {
        this.scene.remove(d.mesh);
        this.activeDebris.splice(i, 1);
        continue;
      }
      if (!d.isGrounded) {
        d.vel.y -= 28.0 * deltaSec;
        d.mesh.position.x += d.vel.x * deltaSec;
        d.mesh.position.y += d.vel.y * deltaSec;
        d.mesh.position.z += d.vel.z * deltaSec;
        d.mesh.rotation.x += d.rotVel.x * deltaSec;
        d.mesh.rotation.y += d.rotVel.y * deltaSec;
        d.mesh.rotation.z += d.rotVel.z * deltaSec;

        if (d.mesh.position.y <= 0.25) {
          d.mesh.position.y = 0.25;
          d.isGrounded = true;
          d.vel.set(0, 0, 0);
          d.rotVel.set(0, 0, 0);
        }
      }
    }

    this.particles.update(deltaSec);
    this.renderer.render(this.scene, this.camera);
  }

  destroyRobot(bot) {
    bot.robotState.destroyed = true;
    bot.mesh.visible = false;
    this.particles.emitExplosion(bot.mesh.position);
    this.particles.emitShockwave(bot.mesh.position, 6.0, 0xff3366);

    const debris = createRobotDebrisPieces(bot.robotState.loadout, bot.robotState.team, bot.mesh.position);
    debris.forEach(d => {
      this.scene.add(d.mesh);
      this.activeDebris.push(d);
    });
  }

  destroy() {
    this.isMatchRunning = false;
    cancelAnimationFrame(this.animId);
    this.projectiles.forEach(p => p.destroy());
    this.particles.clear();
    this.activeDebris.forEach(d => this.scene.remove(d.mesh));
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement?.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }
}
