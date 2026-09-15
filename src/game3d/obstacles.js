import * as THREE from 'three';

/**
 * RoboArena - Obstacles 3D & Collision System (Fase 20)
 * Menangani pembuatan mesh 3D rintangan, collision circle-vs-box dengan tangent sliding,
 * dan raycasting ray-vs-box untuk Line-of-Sight (LOS) dan proyektil.
 */

/**
 * Membuat grup mesh Three.js untuk semua obstacle di arena
 * @param {Array} obstacles - List data obstacle [{ id, x, y, w, h, height3D, color }]
 * @param {Function} toWorldCoord - Fungsi konversi arena unit ke Three.js world coord
 * @returns {THREE.Group}
 */
export function createObstaclesGroup(obstacles = [], toWorldCoord) {
  const group = new THREE.Group();
  group.name = 'ObstaclesGroup';

  obstacles.forEach(obs => {
    const wWorld = obs.w * 1.5;
    const hWorld = obs.h * 1.5;
    const height3D = (obs.height3D || 3.0) * 1.5;

    const geom = new THREE.BoxGeometry(wWorld, height3D, hWorld);
    const mat = new THREE.MeshStandardMaterial({
      color: obs.color || 0x5a6577,
      roughness: 0.65,
      metalness: 0.35,
      flatShading: false
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const worldPos = toWorldCoord(obs.x, obs.y);
    mesh.position.set(worldPos.x, height3D / 2, worldPos.z);

    // Tambahkan trim/aksen atas untuk visual premium
    const trimGeom = new THREE.BoxGeometry(wWorld + 0.1, 0.2, hWorld + 0.1);
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.3,
      metalness: 0.8,
      emissive: 0x1e3a8a,
      emissiveIntensity: 0.3
    });
    const trimMesh = new THREE.Mesh(trimGeom, trimMat);
    trimMesh.position.y = height3D / 2;
    mesh.add(trimMesh);

    group.add(mesh);
  });

  return group;
}

/**
 * Circle-vs-Box collision detection & sliding resolution
 * Menyelesaikan tabrakan robot dengan obstacle dan menggeser (slide) posisi robot
 * di sepanjang sisi obstacle.
 * 
 * @param {Object} pos - Posisi robot { x, y } (akan dimodifikasi jika overlap)
 * @param {number} radius - Radius collider robot (misal 1.4 unit)
 * @param {Array} obstacles - Daftar obstacle arena
 * @returns {boolean} True jika terjadi tabrakan/penyesuaian posisi
 */
export function resolveRobotObstacleCollisions(pos, radius, obstacles = []) {
  let collided = false;

  for (const obs of obstacles) {
    const hw = obs.w / 2;
    const hh = obs.h / 2;
    const minX = obs.x - hw;
    const maxX = obs.x + hw;
    const minY = obs.y - hh;
    const maxY = obs.y + hh;

    // Titik terdekat pada kotak AABB terhadap pusat robot
    const closestX = Math.max(minX, Math.min(maxX, pos.x));
    const closestY = Math.max(minY, Math.min(maxY, pos.y));

    const dx = pos.x - closestX;
    const dy = pos.y - closestY;
    const distSq = dx * dx + dy * dy;

    if (distSq < radius * radius) {
      collided = true;
      const dist = Math.sqrt(distSq);

      if (dist > 0.0001) {
        // Normal dari obstacle ke robot
        const nx = dx / dist;
        const ny = dy / dist;
        const penetration = radius - dist;

        // Dorong robot keluar (sliding along edge)
        pos.x += nx * penetration;
        pos.y += ny * penetration;
      } else {
        // Robot berada tepat di dalam kotak, dorong ke tepi terdekat
        const dLeft = pos.x - minX;
        const dRight = maxX - pos.x;
        const dTop = pos.y - minY;
        const dBottom = maxY - pos.y;
        const minEdge = Math.min(dLeft, dRight, dTop, dBottom);

        if (minEdge === dLeft) pos.x = minX - radius;
        else if (minEdge === dRight) pos.x = maxX + radius;
        else if (minEdge === dTop) pos.y = minY - radius;
        else pos.y = maxY + radius;
      }
    }
  }

  return collided;
}

/**
 * Memeriksa apakah segmen garis (Line of Sight / lintasan peluru)
 * terpotong oleh salah satu obstacle (AABB).
 * Menggunakan algoritma Liang-Barsky / Slab method.
 * 
 * @param {number} x1 - Posisi awal garis
 * @param {number} y1
 * @param {number} x2 - Posisi tujuan garis
 * @param {number} y2
 * @param {Array} obstacles - Daftar obstacle arena
 * @returns {boolean} True jika terhalang obstacle
 */
export function checkLineBlockedByObstacles(x1, y1, x2, y2, obstacles = []) {
  if (!obstacles || obstacles.length === 0) return false;

  const dx = x2 - x1;
  const dy = y2 - y1;

  for (const obs of obstacles) {
    const hw = obs.w / 2;
    const hh = obs.h / 2;
    const minX = obs.x - hw;
    const maxX = obs.x + hw;
    const minY = obs.y - hh;
    const maxY = obs.y + hh;

    let tMin = 0;
    let tMax = 1;

    // Sumbu X
    if (Math.abs(dx) < 1e-6) {
      if (x1 < minX || x1 > maxX) continue; // Garis sejajar di luar kotak
    } else {
      let t1 = (minX - x1) / dx;
      let t2 = (maxX - x1) / dx;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) continue;
    }

    // Sumbu Y
    if (Math.abs(dy) < 1e-6) {
      if (y1 < minY || y1 > maxY) continue; // Garis sejajar di luar kotak
    } else {
      let t1 = (minY - y1) / dy;
      let t2 = (maxY - y1) / dy;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) continue;
    }

    // Jika tMin <= tMax dan rentang t berpotongan dengan [0, 1]
    if (tMin <= tMax && tMax >= 0 && tMin <= 1) {
      return true; // Terhalang oleh obstacle ini
    }
  }

  return false;
}
