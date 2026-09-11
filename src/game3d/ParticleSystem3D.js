import * as THREE from 'three';

/**
 * Sistem Partikel 3D Prosedural untuk RoboArena
 * Menggunakan THREE.Points dan BufferGeometry tanpa aset tekstur eksternal.
 */
export class ParticleSystem3D {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
  }

  /**
   * Partikel asap tipis untuk status Pincang (Penggerak 1-60%)
   */
  emitSmoke(pos, yaw) {
    const count = 3;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    // Offset di belakang robot
    const backX = pos.x - Math.sin(yaw) * 1.5;
    const backZ = pos.z - Math.cos(yaw) * 1.5;

    for (let i = 0; i < count; i++) {
      positions[i * 3] = backX + (Math.random() - 0.5) * 0.4;
      positions[i * 3 + 1] = pos.y + 0.4 + Math.random() * 0.2;
      positions[i * 3 + 2] = backZ + (Math.random() - 0.5) * 0.4;

      velocities.push({
        x: (Math.random() - 0.5) * 0.3,
        y: 0.6 + Math.random() * 0.4,
        z: (Math.random() - 0.5) * 0.3
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x64748b,
      size: 0.4,
      transparent: true,
      opacity: 0.6,
      depthWrite: false
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.particles.push({
      mesh: points,
      velocities,
      life: 0.7,
      maxLife: 0.7
    });
  }

  /**
   * Percikan petir api untuk status Lumpuh (Penggerak 0%)
   */
  emitSparks(pos) {
    const count = 5;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x + (Math.random() - 0.5) * 1.2;
      positions[i * 3 + 1] = pos.y + 0.3 + Math.random() * 0.5;
      positions[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 1.2;

      velocities.push({
        x: (Math.random() - 0.5) * 2.5,
        y: Math.random() * 2.0,
        z: (Math.random() - 0.5) * 2.5
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xfbbf24,
      size: 0.3,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.particles.push({
      mesh: points,
      velocities,
      life: 0.25,
      maxLife: 0.25
    });
  }

  /**
   * Percikan ledakan benturan peluru
   */
  emitImpactSparks(pos, colorHex = 0xffaa00) {
    const count = 8;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      velocities.push({
        x: (Math.random() - 0.5) * 4.0,
        y: Math.random() * 3.0,
        z: (Math.random() - 0.5) * 4.0
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: colorHex,
      size: 0.35,
      transparent: true,
      opacity: 1.0,
      depthWrite: false
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.particles.push({
      mesh: points,
      velocities,
      life: 0.3,
      maxLife: 0.3
    });
  }

  /**
   * Ledakan besar saat robot hancur total
   */
  emitExplosion(pos) {
    const count = 30;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y + 0.5;
      positions[i * 3 + 2] = pos.z;

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 5.0;
      velocities.push({
        x: Math.cos(angle) * speed,
        y: 1.0 + Math.random() * 4.0,
        z: Math.sin(angle) * speed
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xff3366,
      size: 0.6,
      transparent: true,
      opacity: 1.0,
      depthWrite: false
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.particles.push({
      mesh: points,
      velocities,
      life: 0.7,
      maxLife: 0.7
    });
  }

  /**
   * Percikan benturan tabrakan berat (Body Ramming Melee)
   */
  emitCollisionSparks(pos, count = 24) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y + 0.5;
      positions[i * 3 + 2] = pos.z;

      const angle = Math.random() * Math.PI * 2;
      const speed = 4.0 + Math.random() * 8.0;
      velocities.push({
        x: Math.cos(angle) * speed,
        y: 2.0 + Math.random() * 6.0,
        z: Math.sin(angle) * speed
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xffeedd,
      size: 0.5,
      transparent: true,
      opacity: 1.0,
      depthWrite: false
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.particles.push({
      mesh: points,
      velocities,
      life: 0.4,
      maxLife: 0.4
    });
  }

  /**
   * Cincin gelombang kejut ekspansif di lantai arena (Shockwave Ring)
   */
  emitShockwave(pos, maxRadius = 5.5, colorHex = 0x00f0ff) {
    const ringGeo = new THREE.RingGeometry(0.2, 0.6, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(pos.x, 0.1, pos.z);
    this.scene.add(ring);

    this.particles.push({
      mesh: ring,
      isRing: true,
      currentScale: 1.0,
      maxScale: maxRadius,
      life: 0.45,
      maxLife: 0.45
    });
  }

  /**
   * Kepulan asap hitam kecil dari puing yang terlempar/terbakar
   */
  emitDebrisSmoke(pos) {
    const count = 2;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x + (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 1] = pos.y + 0.2;
      positions[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.3;

      velocities.push({
        x: (Math.random() - 0.5) * 0.4,
        y: 0.8 + Math.random() * 0.5,
        z: (Math.random() - 0.5) * 0.4
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x334155,
      size: 0.5,
      transparent: true,
      opacity: 0.7,
      depthWrite: false
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.particles.push({
      mesh: points,
      velocities,
      life: 0.6,
      maxLife: 0.6
    });
  }

  update(delta) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }

      if (p.isRing) {
        const progress = 1.0 - (p.life / p.maxLife);
        const currentScale = 1.0 + progress * (p.maxScale - 1.0);
        p.mesh.scale.set(currentScale, currentScale, currentScale);
        p.mesh.material.opacity = Math.max(0, p.life / p.maxLife);
        continue;
      }

      // Update posisi partikel
      const positions = p.mesh.geometry.attributes.position.array;
      const count = p.velocities.length;

      for (let j = 0; j < count; j++) {
        positions[j * 3] += p.velocities[j].x * delta;
        positions[j * 3 + 1] += p.velocities[j].y * delta;
        positions[j * 3 + 2] += p.velocities[j].z * delta;
      }

      p.mesh.geometry.attributes.position.needsUpdate = true;
      p.mesh.material.opacity = p.life / p.maxLife;
    }
  }

  clear() {
    this.particles.forEach(p => {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
    });
    this.particles = [];
  }
}
