import * as THREE from 'three';

// A shared procedural soft sprite; no downloaded assets or per-particle draw calls.
export class ParticleSystem3D {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    const size = 32;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const radius = Math.hypot((x + 0.5) / size * 2 - 1, (y + 0.5) / size * 2 - 1);
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = 255;
      data[i + 3] = Math.round(Math.pow(Math.max(0, 1 - radius), 2) * 255);
    }
    this.texture = new THREE.DataTexture(data, size, size);
    this.texture.needsUpdate = true;
  }

  add(effect) {
    // Bound burst allocations even in long, crowded matches.
    if (this.particles.length >= 160) this.remove(0);
    this.scene.add(effect.mesh);
    this.particles.push(effect);
  }

  burst(pos, { count = 12, color = 0xffbd69, size = 0.6, life = 0.4,
    speed = 6, gravity = 12, smoke = false, direction = null } = {}) {
    const positions = new Float32Array(count * 3);
    const velocities = [];
    for (let i = 0; i < count; i++) {
      positions.set([pos.x, pos.y, pos.z], i * 3);
      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * speed + (direction?.x || 0) * speed,
        Math.random() * speed * 0.8 + 0.3,
        (Math.random() - 0.5) * speed + (direction?.z || 0) * speed));
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color, size, map: this.texture,
      transparent: true, opacity: smoke ? 0.38 : 1, depthWrite: false,
      blending: smoke ? THREE.NormalBlending : THREE.AdditiveBlending });
    const mesh = new THREE.Points(geometry, material);
    mesh.frustumCulled = false;
    this.add({ mesh, velocities, life, maxLife: life, gravity, smoke, size });
  }

  flash(pos, color = 0xffb45c, size = 2, life = 0.12) {
    const mesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.texture,
      color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    mesh.position.copy(pos);
    mesh.scale.setScalar(size);
    let light;
    if (size >= 2.4 && this.particles.filter(p => p.light).length < 4) {
      light = new THREE.PointLight(color, size * 4, size * 3, 2);
      light.position.copy(pos);
      this.scene.add(light);
    }
    this.add({ mesh, life, maxLife: life, flash: true, size, light });
  }

  emitMuzzleFlash(pos, angle, color = 0xffbb66) {
    this.flash(pos, color, 2.4);
    this.burst(pos, { count: 7, color, size: 0.35, speed: 4, life: 0.13,
      gravity: 0, direction: { x: Math.cos(angle), z: Math.sin(angle) } });
  }
  emitSmoke(pos, yaw = 0) {
    this.burst({ x: pos.x - Math.sin(yaw), y: pos.y + 0.6, z: pos.z - Math.cos(yaw) },
      { count: 3, color: 0x78818d, size: 1.1, speed: 0.7, life: 1.2, gravity: -0.6, smoke: true });
  }
  emitSparks(pos) { this.emitImpactSparks(pos); }
  emitImpactSparks(pos, color = 0xffb45c) {
    this.flash(pos, color, 1.8);
    this.burst(pos, { color, count: 16 });
  }
  emitExplosion(pos) {
    this.flash(pos, 0xffe0a0, 9, 0.24);
    this.burst(pos, { count: 38, color: 0xff7b28, size: 1.1, life: 0.8, speed: 13 });
    this.burst(pos, { count: 14, color: 0x58606b, size: 2.4, life: 1.9, speed: 3, gravity: -0.7, smoke: true });
    this.emitShockwave(pos, 7, 0xffac61);
  }
  emitCollisionSparks(pos, count = 24) {
    this.flash(pos, 0xffdcaa, 3);
    this.burst(pos, { count, speed: 10, life: 0.6 });
  }
  emitDebrisSmoke(pos) {
    this.burst(pos, { count: 2, color: 0x52606c, size: 0.8, life: 0.9, speed: 0.5, gravity: -0.5, smoke: true });
  }
  emitTrail(pos, type, color) {
    this.burst(pos, { count: 2, color: type === 'rudal' ? 0x9a8c81 : color,
      size: type === 'api' ? 1.2 : 0.65, life: type === 'rudal' ? 0.65 : 0.2,
      speed: 0.3, gravity: 0, smoke: type === 'rudal' });
  }
  emitShockwave(pos, radius = 5.5, color = 0x00f0ff) {
    const geometry = new THREE.RingGeometry(0.86, 1, 64);
    geometry.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color,
      transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending }));
    mesh.position.set(pos.x, pos.y + 0.08, pos.z);
    this.add({ mesh, life: 0.55, maxLife: 0.55, ring: true, radius });
  }

  update(dt) {
    if (dt <= 0) return;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { this.remove(i); continue; }
      const age = 1 - p.life / p.maxLife;
      if (p.light) p.light.intensity = p.size * 4 * (1 - age) ** 2;
      p.mesh.material.opacity = (p.smoke ? 0.38 : 1) * (1 - age) ** 2;
      if (p.ring) { p.mesh.scale.setScalar(0.2 + p.radius * (1 - (1 - age) ** 3)); continue; }
      if (p.flash) { p.mesh.scale.setScalar(p.size * (1 + age)); continue; }
      const positions = p.mesh.geometry.attributes.position;
      for (let j = 0; j < p.velocities.length; j++) {
        const v = p.velocities[j];
        v.y -= p.gravity * dt;
        positions.setXYZ(j, positions.getX(j) + v.x * dt,
          Math.max(0.07, positions.getY(j) + v.y * dt), positions.getZ(j) + v.z * dt);
      }
      positions.needsUpdate = true;
      p.mesh.material.size = p.size * (p.smoke ? 1 + age * 2.8 : 1 - age * 0.6);
    }
  }
  remove(index) {
    const p = this.particles[index];
    this.scene.remove(p.mesh);
    if (p.light) { this.scene.remove(p.light); p.light.dispose(); }
    if (!p.mesh.isSprite) p.mesh.geometry.dispose();
    p.mesh.material.dispose();
    this.particles.splice(index, 1);
  }
  clear() { while (this.particles.length) this.remove(this.particles.length - 1); }
  dispose() { this.clear(); this.texture.dispose(); }
}
