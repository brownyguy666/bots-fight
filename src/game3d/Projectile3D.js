import * as THREE from 'three';
import { SFX } from '../audio/sfx.js';


/**
 * Proyektil 3D untuk RoboArena Three.js (Fase 20 & 27)
 * Beroperasi dalam Satuan Arena (Arena Units) dan mendukung collision obstacle serta efek FX spesifik.
 */
export class Projectile3D {
  constructor(scene, startPos2D, angle, weaponData, shooter, toWorldCoord, arenaBounds = { width: 60, height: 40 }, options = {}) {
    this.scene = scene;
    this.shooter = shooter;
    this.weaponData = weaponData;
    this.kind = weaponData.jenis || weaponData.id || 'meriam';
    this.height = options.height ?? 1.4;
    this.particles = options.particles;
    this.trailTimer = 0;
    this.hitTarget = null;
    this.beamResolved = false;
    this.arenaBounds = arenaBounds;

    // Normalisasi kecepatan & jangkauan ke satuan arena jika masih dalam piksel (> 50)
    let spd = weaponData.projectileSpeed || 380;
    if (spd > 50) spd = spd / 16;
    this.speed = spd;

    let rng = weaponData.range || 350;
    if (rng > 60) rng = rng / 16;
    this.range = rng;

    this.damage = weaponData.damage || 15;
    this.distanceTraveled = 0;
    this.isHoming = !!weaponData.homing;
    this.active = true;
    this.toWorldCoord = toWorldCoord;

    // Posisi 2D logika (Arena Units)
    this.x = startPos2D.x;
    this.y = startPos2D.y;
    this.angle = angle;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;

    // Laser instan beam (Modul 6 Fase 27)
    this.isInstantBeam = this.kind === 'laser';
    this.beamLifetime = 0.15; // Detik

    // Buat Mesh 3D sesuai tipe senjata
    this.mesh = this.createMesh(weaponData);
    this.update3DTransform();
    this.scene.add(this.mesh);

    // Audio SFX
    if (this.kind === 'meriam') SFX.playCannon();
    else if (this.kind === 'laser') SFX.playLaser();
    else if (this.kind === 'rudal') SFX.playMissileLaunch();
    else if (this.kind === 'railgun') SFX.playLaser();
    else if (this.kind === 'api') SFX.playCannon();
    else if (this.kind === 'emp') SFX.playLaser();
    else SFX.playGatling();
  }

  createMesh(wData) {
    const group = new THREE.Group();
    const jenis = this.kind;

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
      // Instant beam visual cylinder spanning length
      const beamLength = this.range * 1.5;
      const geo = new THREE.CylinderGeometry(0.12, 0.12, beamLength, 8);
      geo.rotateX(Math.PI / 2);
      geo.translate(0, 0, beamLength / 2);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.9
      });
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
      // Gatling / Beruntun
      const geo = new THREE.CylinderGeometry(0.08, 0.08, 1.0, 6);
      geo.rotateX(Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });
      group.add(new THREE.Mesh(geo, mat));
    }

    return group;
  }

  update(deltaSec, aliveEnemies = [], obstacles = []) {
    if (!this.active || deltaSec <= 0) return;
    if (this.isInstantBeam && this.beamResolved) {
      this.beamLifetime -= deltaSec;
      this.mesh.traverse(c => { if (c.material) c.material.opacity = Math.max(0, this.beamLifetime / 0.15); });
      if (this.beamLifetime <= 0) this.destroy();
      return;
    }
    if (this.isHoming && aliveEnemies.length) {
      const target = [...aliveEnemies].sort((a, b) =>
        Math.hypot(a.robotState.x - this.x, a.robotState.y - this.y) -
        Math.hypot(b.robotState.x - this.x, b.robotState.y - this.y))[0].robotState;
      const diff = Math.atan2(Math.sin(Math.atan2(target.y - this.y, target.x - this.x) - this.angle),
        Math.cos(Math.atan2(target.y - this.y, target.x - this.x) - this.angle));
      this.angle += THREE.MathUtils.clamp(diff, -4 * deltaSec, 4 * deltaSec);
    }
    const travel = this.isInstantBeam ? this.range : Math.min(this.speed * deltaSec, this.range - this.distanceTraveled);
    const dx = Math.cos(this.angle) * travel;
    const dy = Math.sin(this.angle) * travel;
    let nearest = 1;
    let hit = null;
    let blocked = false;
    for (const obstacle of obstacles) {
      const t = segmentBox(this.x, this.y, dx, dy, obstacle);
      if (t !== null && t <= nearest) { nearest = t; blocked = true; }
    }
    // Clip at arena boundaries, using the same segment as collision detection.
    for (const [origin, delta, limit] of [[this.x, dx, this.arenaBounds.width], [this.y, dy, this.arenaBounds.height]]) {
      if (delta === 0) continue;
      const t = ((delta > 0 ? limit : 0) - origin) / delta;
      if (t >= 0 && t <= nearest) { nearest = t; blocked = true; }
    }
    for (const enemy of aliveEnemies) {
      if (enemy.robotState.destroyed) continue;
      const t = segmentCircle(this.x, this.y, dx, dy, enemy.robotState.x, enemy.robotState.y, enemy.radius || 1.4);
      if (t !== null && t < nearest) { nearest = t; hit = enemy; }
    }
    const endX = this.x + dx * nearest;
    const endY = this.y + dy * nearest;
    if (this.isInstantBeam) {
      this.beamResolved = true;
      this.mesh.scale.z = Math.max(0.001, nearest);
      this.hitTarget = hit;
      if (hit || blocked) this.emitImpact(endX, endY);
      return;
    }
    this.x = endX;
    this.y = endY;
    this.distanceTraveled += travel * nearest;
    this.update3DTransform();
    this.trailTimer += deltaSec;
    if (this.trailTimer >= 0.035 && this.particles) {
      this.trailTimer = 0;
      this.particles.emitTrail(this.mesh.position, this.kind, this.weaponData.bulletColor || 0xffb45c);
    }
    if (hit || blocked) {
      this.hitTarget = hit;
      this.emitImpact(endX, endY);
      this.destroy();
    } else if (this.distanceTraveled >= this.range) this.destroy();
  }

  emitImpact(x, y) {
    const world = this.toWorldCoord(x, y);
    this.particles?.emitImpactSparks(new THREE.Vector3(world.x, this.height, world.z), this.weaponData.bulletColor || 0xffb45c);
  }

  update3DTransform() {
    const wPos = this.toWorldCoord(this.x, this.y);
    this.mesh.position.set(wPos.x, this.height, wPos.z);
    this.mesh.rotation.y = Math.PI / 2 - this.angle;
  }

  destroy(impact = false) {
    if (!this.active) return;
    this.active = false;

    this.scene.remove(this.mesh);
    this.mesh.traverse(child => {
      if (child.isMesh) {
        child.geometry.dispose();
        if (child.material) child.material.dispose();
      }
    });
  }
}

// Return the first contact fraction along a segment, or null.
export function segmentCircle(x, y, dx, dy, cx, cy, radius) {
  const ox = x - cx, oy = y - cy;
  const c = ox * ox + oy * oy - radius * radius;
  if (c <= 0) return 0;
  const a = dx * dx + dy * dy;
  if (a < 1e-12) return null;
  const b = ox * dx + oy * dy;
  const d = b * b - a * c;
  if (d < 0) return null;
  const t = (-b - Math.sqrt(d)) / a;
  return t >= 0 && t <= 1 ? t : null;
}
export function segmentBox(x, y, dx, dy, box) {
  let lo = 0, hi = 1;
  for (const [origin, delta, min, max] of [
    [x, dx, box.x - box.w / 2, box.x + box.w / 2],
    [y, dy, box.y - box.h / 2, box.y + box.h / 2]]) {
    if (Math.abs(delta) < 1e-9) { if (origin < min || origin > max) return null; }
    else {
      const a = (min - origin) / delta, b = (max - origin) / delta;
      lo = Math.max(lo, Math.min(a, b)); hi = Math.min(hi, Math.max(a, b));
      if (lo > hi) return null;
    }
  }
  return lo;
}
