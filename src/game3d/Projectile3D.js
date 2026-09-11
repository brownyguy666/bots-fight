import * as THREE from 'three';
import { SFX } from '../audio/sfx.js';

/**
 * Proyektil 3D untuk RoboArena Three.js
 */
export class Projectile3D {
  constructor(scene, startPos2D, angle, weaponData, shooter, toWorldCoord) {
    this.scene = scene;
    this.shooter = shooter;
    this.weaponData = weaponData;
    this.speed = weaponData.projectileSpeed || 380;
    this.damage = weaponData.damage || 15;
    this.range = weaponData.range || 400;
    this.distanceTraveled = 0;
    this.isHoming = !!weaponData.homing;
    this.active = true;
    this.toWorldCoord = toWorldCoord;

    // Posisi 2D logika
    this.x = startPos2D.x;
    this.y = startPos2D.y;
    this.angle = angle;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;

    // Buat Mesh 3D sesuai tipe senjata
    this.mesh = this.createMesh(weaponData);
    this.update3DTransform();
    this.scene.add(this.mesh);

    // Audio SFX
    if (weaponData.jenis === 'meriam') SFX.playCannon();
    else if (weaponData.jenis === 'laser') SFX.playLaser();
    else if (weaponData.jenis === 'rudal') SFX.playMissileLaunch();
    else if (weaponData.jenis === 'railgun') SFX.playLaser();
    else if (weaponData.jenis === 'api') SFX.playCannon();
    else if (weaponData.jenis === 'emp') SFX.playLaser();
    else SFX.playGatling();
  }

  createMesh(wData) {
    const group = new THREE.Group();
    const jenis = wData.jenis;

    if (jenis === 'meriam') {
      const geo = new THREE.SphereGeometry(0.35, 12, 12);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffaa00,
        emissive: 0xff8800,
        emissiveIntensity: 1.0,
        roughness: 0.2
      });
      group.add(new THREE.Mesh(geo, mat));
    } else if (jenis === 'laser') {
      const geo = new THREE.CylinderGeometry(0.1, 0.1, 2.4, 8);
      geo.rotateX(Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      group.add(new THREE.Mesh(geo, mat));
    } else if (jenis === 'rudal') {
      const bodyGeo = new THREE.CylinderGeometry(0.18, 0.18, 1.2, 8);
      bodyGeo.rotateX(Math.PI / 2);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
      const body = new THREE.Mesh(bodyGeo, bodyMat);

      const tipGeo = new THREE.ConeGeometry(0.2, 0.4, 8);
      tipGeo.rotateX(Math.PI / 2);
      const tipMat = new THREE.MeshBasicMaterial({ color: 0xff3366 });
      const tip = new THREE.Mesh(tipGeo, tipMat);
      tip.position.z = 0.7;

      group.add(body, tip);
    } else if (jenis === 'railgun') {
      const geo = new THREE.CylinderGeometry(0.09, 0.09, 3.2, 8);
      geo.rotateX(Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      group.add(new THREE.Mesh(geo, mat));
    } else if (jenis === 'api') {
      const geo = new THREE.SphereGeometry(0.48, 8, 8);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xff4500,
        emissive: 0xff2200,
        emissiveIntensity: 2.0,
        roughness: 0.3
      });
      group.add(new THREE.Mesh(geo, mat));
    } else if (jenis === 'emp') {
      const geo = new THREE.SphereGeometry(0.42, 10, 10);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0xa855f7,
        emissiveIntensity: 2.5,
        roughness: 0.1
      });
      const ringGeo = new THREE.TorusGeometry(0.55, 0.05, 6, 16);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      group.add(new THREE.Mesh(geo, mat), ring);
    } else {
      // Gatling
      const geo = new THREE.CylinderGeometry(0.08, 0.08, 1.0, 6);
      geo.rotateX(Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });
      group.add(new THREE.Mesh(geo, mat));
    }

    return group;
  }

  update(deltaSec, aliveEnemies = []) {
    if (!this.active) return;

    // Homing Steering untuk Rudal
    if (this.isHoming && aliveEnemies.length > 0) {
      let closest = null;
      let minDist = Infinity;
      aliveEnemies.forEach(e => {
        const dx = e.robotState.x - this.x;
        const dy = e.robotState.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < minDist) {
          minDist = dist;
          closest = { e, dx, dy };
        }
      });

      if (closest) {
        const targetAngle = Math.atan2(closest.dy, closest.dx);
        let diff = targetAngle - this.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        const turnStep = 4.0 * deltaSec;
        this.angle += Math.max(-turnStep, Math.min(turnStep, diff));
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
      }
    }

    // Pergerakan 2D
    const stepDist = this.speed * deltaSec;
    this.x += this.vx * deltaSec;
    this.y += this.vy * deltaSec;
    this.distanceTraveled += stepDist;

    this.update3DTransform();

    // Cek batas jangkauan
    if (this.distanceTraveled >= this.range) {
      this.destroy(false);
      return;
    }

    // Cek batas arena (10 - 950, 10 - 630)
    if (this.x < 10 || this.x > 950 || this.y < 10 || this.y > 630) {
      this.destroy(true);
    }
  }

  update3DTransform() {
    const wPos = this.toWorldCoord(this.x, this.y);
    this.mesh.position.set(wPos.x, 1.4, wPos.z);
    this.mesh.rotation.y = -this.angle;
  }

  destroy(impact = false) {
    if (!this.active) return;
    this.active = false;

    this.scene.remove(this.mesh);
    this.mesh.traverse(child => {
      if (child.isMesh) {
        child.geometry.dispose();
        child.material.dispose();
      }
    });
  }
}
