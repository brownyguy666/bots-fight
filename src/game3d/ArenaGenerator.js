import { createSeededRandom } from '../utils/seededRandom.js';
import { checkLineBlockedByObstacles } from './obstacles.js';

/**
 * RoboArena - Procedural Arena Generator & Fairness Validation (Fase 29)
 * Menghasilkan arena dengan obstacle prosedural, 2D heightmap, dan zona terrain
 * yang deterministik berdasarkan seed serta adil (simetris) untuk mode turnamen.
 */

export class ArenaGenerator {
  /**
   * Menghasilkan peta arena prosedural
   * @param {string} seed 
   * @param {number} robotsPerTeam 
   * @param {string} mode - 'tournament' | 'casual'
   * @returns {Object} arenaMap
   */
  static generate(seed = 'ROBO-DEFAULT', robotsPerTeam = 3, mode = 'tournament') {
    let attempt = 0;
    const maxAttempts = 5;

    while (attempt < maxAttempts) {
      const currentSeed = attempt === 0 ? seed : `${seed}:retry:${attempt}`;
      const arena = this._generateInternal(currentSeed, robotsPerTeam, mode);
      
      const validation = this.validateArena(arena);
      if (validation.passed) {
        arena.seed = seed;
        arena.subSeed = currentSeed;
        return arena;
      }
      attempt++;
    }

    // Fallback jika 5x generate gagal memenuhi standar kompetitif
    console.warn(`Procedural generation gagal mencapai kriteria turnamen setelah ${maxAttempts} percobaan. Memakai fallback terverifikasi.`);
    return this._generateSafeFallback(seed, robotsPerTeam);
  }

  static _generateInternal(seed, robotsPerTeam, mode) {
    const rng = createSeededRandom(seed);

    // 1. Tentukan ukuran arena berdasarkan jumlah robot
    let width = 48;
    let height = 36;
    if (robotsPerTeam <= 2) {
      width = 44;
      height = 32;
    } else if (robotsPerTeam >= 5) {
      width = 64;
      height = 44;
    }

    const halfW = width / 2;
    const halfH = height / 2;

    // 2. Buat Heightmap menggunakan kombinasi sinus 2D deterministik
    const f1 = rng.range(0.04, 0.08);
    const f2 = rng.range(0.06, 0.12);
    const amp = rng.range(0.8, 1.8);
    const phaseX = rng.range(0, Math.PI * 2);
    const phaseY = rng.range(0, Math.PI * 2);

    const sampleHeight = (x, y) => {
      // Spawn safety: ratakan tanah di dekat pangkalan spawn tim A dan B
      const distToSpawnA = Math.hypot(x - 8, y - halfH);
      const distToSpawnB = Math.hypot(x - (width - 8), y - halfH);
      let spawnDampen = 1.0;
      if (distToSpawnA < 8) spawnDampen = Math.min(spawnDampen, distToSpawnA / 8);
      if (distToSpawnB < 8) spawnDampen = Math.min(spawnDampen, distToSpawnB / 8);

      const h = (Math.sin(x * f1 + phaseX) * Math.cos(y * f2 + phaseY) +
                 Math.sin((x + y) * 0.05) * 0.5) * amp * spawnDampen;
      return h;
    };

    const sampleGradient = (x, y) => {
      const eps = 0.5;
      const hL = sampleHeight(x - eps, y);
      const hR = sampleHeight(x + eps, y);
      const hU = sampleHeight(x, y - eps);
      const hD = sampleHeight(x, y + eps);
      return {
        gx: (hR - hL) / (2 * eps),
        gy: (hD - hU) / (2 * eps)
      };
    };

    // 3. Distribusi Obstacle
    const obstacles = [];
    const numObstacles = Math.min(14, Math.floor(width * height / 160));
    const isTournament = mode === 'tournament';

    // Area spawn aman
    const isInsideSafeZone = (x, y, r = 7) => {
      const dSpawnA = Math.hypot(x - 8, y - halfH);
      const dSpawnB = Math.hypot(x - (width - 8), y - halfH);
      const dCenter = Math.hypot(x - halfW, y - halfH);
      return dSpawnA < r || dSpawnB < r || dCenter < 4.5;
    };

    let obsId = 1;
    const placedBoxes = [];

    for (let i = 0; i < numObstacles; i++) {
      let ox, oy, ow, oh;

      if (isTournament) {
        // Tournament: generate di paruh kiri, lalu mirror 180 derajat ke paruh kanan
        ox = rng.range(14, halfW - 3);
        oy = rng.range(6, height - 6);
        ow = rng.int(3, 5);
        oh = rng.int(3, 5);

        if (isInsideSafeZone(ox, oy, 6)) continue;

        const obs1 = {
          id: `p_obs_${obsId++}`,
          x: Math.round(ox),
          y: Math.round(oy),
          w: ow,
          h: oh,
          height3D: rng.range(2.8, 4.2),
          color: 0x5a6577
        };
        placedBoxes.push(obs1);

        // Rotational 180° symmetry
        const symX = width - obs1.x;
        const symY = height - obs1.y;
        const obs2 = {
          id: `p_obs_${obsId++}`,
          x: Math.round(symX),
          y: Math.round(symY),
          w: ow,
          h: oh,
          height3D: obs1.height3D,
          color: 0x5a6577
        };
        placedBoxes.push(obs2);
      } else {
        // Casual: penempatan organik
        ox = rng.range(12, width - 12);
        oy = rng.range(6, height - 6);
        ow = rng.int(3, 6);
        oh = rng.int(3, 6);

        if (isInsideSafeZone(ox, oy, 6)) continue;

        placedBoxes.push({
          id: `p_obs_${obsId++}`,
          x: Math.round(ox),
          y: Math.round(oy),
          w: ow,
          h: oh,
          height3D: rng.range(2.5, 4.5),
          color: 0x64748b
        });
      }
    }

    // 4. Titik Spawn
    const spawnPoints = {
      teamA: [
        { x: 7, y: halfH, rotation: 0 },
        { x: 5, y: halfH - 6, rotation: 0 },
        { x: 5, y: halfH + 6, rotation: 0 },
        { x: 3, y: halfH - 12, rotation: 0 },
        { x: 3, y: halfH + 12, rotation: 0 }
      ],
      teamB: [
        { x: width - 7, y: halfH, rotation: Math.PI },
        { x: width - 5, y: halfH - 6, rotation: Math.PI },
        { x: width - 5, y: halfH + 6, rotation: Math.PI },
        { x: width - 3, y: halfH - 12, rotation: Math.PI },
        { x: width - 3, y: halfH + 12, rotation: Math.PI }
      ]
    };

    return {
      id: `procedural_${seed}`,
      nama: `Prosedural: ${seed}`,
      deskripsi: `Arena ${mode === 'tournament' ? 'Turnamen Simetris' : 'Organik Kasual'} dihasilkan dari seed ${seed}.`,
      isProcedural: true,
      mode,
      width,
      height,
      floorColor: mode === 'tournament' ? 0x18202f : 0x22272b,
      gridColor: mode === 'tournament' ? 0x2d3e58 : 0x3d4752,
      obstacles: placedBoxes,
      zones: [],
      spawnPoints,
      flagBaseA: { x: 7, y: halfH },
      flagBaseB: { x: width - 7, y: halfH },
      hillZone: { x: halfW, y: halfH, radius: Math.min(8, width * 0.14) },
      sampleHeight,
      sampleGradient
    };
  }

  /**
   * Evaluasi fairness dan validitas arena
   */
  static validateArena(arena) {
    const { obstacles, spawnPoints, flagBaseA, flagBaseB, hillZone } = arena;

    // 1. Validasi spawn bebas obstacle
    for (const sp of [...spawnPoints.teamA, ...spawnPoints.teamB]) {
      for (const obs of obstacles) {
        const dx = Math.abs(sp.x - obs.x);
        const dy = Math.abs(sp.y - obs.y);
        if (dx < obs.w / 2 + 2.0 && dy < obs.h / 2 + 2.0) {
          return { passed: false, reason: 'Spawn point tertutup obstacle' };
        }
      }
    }

    // 2. Validasi objective tidak terkunci di dalam obstacle
    if (hillZone) {
      for (const obs of obstacles) {
        if (Math.hypot(hillZone.x - obs.x, hillZone.y - obs.y) < 3.5) {
          return { passed: false, reason: 'Hill zone tengah tertutup obstacle' };
        }
      }
    }

    return { passed: true };
  }

  static _generateSafeFallback(seed, robotsPerTeam) {
    const width = robotsPerTeam >= 5 ? 60 : 48;
    const height = robotsPerTeam >= 5 ? 40 : 36;
    const halfW = width / 2;
    const halfH = height / 2;

    return {
      id: `fallback_${seed}`,
      nama: `Simetris Bersih: ${seed}`,
      deskripsi: 'Arena fallback turnamen standar dengan koridor aman dan dua pilar cover simetris.',
      isProcedural: true,
      width,
      height,
      floorColor: 0x161d2a,
      gridColor: 0x2e3f5a,
      obstacles: [
        { id: 'fb_l', x: halfW - 8, y: halfH, w: 4, h: 6, height3D: 3.5, color: 0x5a6577 },
        { id: 'fb_r', x: halfW + 8, y: halfH, w: 4, h: 6, height3D: 3.5, color: 0x5a6577 }
      ],
      zones: [],
      spawnPoints: {
        teamA: [{ x: 7, y: halfH, rotation: 0 }, { x: 5, y: halfH - 6, rotation: 0 }, { x: 5, y: halfH + 6, rotation: 0 }],
        teamB: [{ x: width - 7, y: halfH, rotation: Math.PI }, { x: width - 5, y: halfH - 6, rotation: Math.PI }, { x: width - 5, y: halfH + 6, rotation: Math.PI }]
      },
      flagBaseA: { x: 7, y: halfH },
      flagBaseB: { x: width - 7, y: halfH },
      hillZone: { x: halfW, y: halfH, radius: 7 },
      sampleHeight: () => 0,
      sampleGradient: () => ({ gx: 0, gy: 0 })
    };
  }

  /**
   * Mengecek apakah LOS terrain terhalang oleh gundukan bukit (Fase 29)
   * @param {Object} posA - { x, y }
   * @param {Object} posB - { x, y }
   * @param {Function} sampleHeight - Fungsi elevasi terrain
   * @returns {boolean} True jika terhalang bukit
   */
  static checkTerrainLOS(posA, posB, sampleHeight) {
    if (!sampleHeight) return false;

    const eyeA = sampleHeight(posA.x, posA.y) + 1.2; // Tinggi mata sensor robot
    const eyeB = sampleHeight(posB.x, posB.y) + 1.0; // Tinggi body target

    const dist = Math.hypot(posB.x - posA.x, posB.y - posA.y);
    const steps = Math.max(3, Math.floor(dist / 2));

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const sx = posA.x + (posB.x - posA.x) * t;
      const sy = posA.y + (posB.y - posA.y) * t;
      const lineHeight = eyeA + (eyeB - eyeA) * t;
      const terrainH = sampleHeight(sx, sy);

      if (terrainH > lineHeight + 0.1) {
        return true; // Pandangan tertutup gundukan tanah
      }
    }

    return false;
  }
}
