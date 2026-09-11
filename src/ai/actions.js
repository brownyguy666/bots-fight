import { BALANCE } from '../data/balance.js';
import { getLocomotionState, isWeaponBroken } from './damage.js';
import { findClosestEnemy } from './sensors.js';

/**
 * Eksekusi Aksi AI untuk Robot
 * Mengatur target kecepatan, rotasi haluan, dan permintaan tembak robot
 */

export function calculateEffectiveSpeed(robotState) {
  const parts = robotState.parts;
  const baseSpeed = BALANCE.ARENA.BASE_ROBOT_SPEED;

  // Modifier part
  const rMod = parts?.rangka?.speedModifier || 0;
  const pMod = parts?.penggerak?.speedModifier || 0;
  const aMod = parts?.armor?.speedModifier || 0;
  let partFactor = 1.0 + rMod + pMod + aMod;
  partFactor = Math.max(0.3, partFactor);

  // Status locomotion (Modul 2 & 4 EMP)
  if (robotState.empLumpuhTimer !== undefined && robotState.empLumpuhTimer > 0) {
    return 0; // Lumpuh sementara akibat sengatan EMP
  }

  const locoState = getLocomotionState(robotState);
  const locoFactor = BALANCE.LOCOMOTION.SPEED_MULTIPLIERS[locoState] !== undefined
    ? BALANCE.LOCOMOTION.SPEED_MULTIPLIERS[locoState]
    : 1.0;

  return baseSpeed * partFactor * locoFactor;
}

export function calculateEffectiveTurnSpeed(robotState) {
  const baseTurn = BALANCE.ARENA.BASE_ROTATION_SPEED;
  const turnMod = robotState.parts?.penggerak?.turnModifier || 1.0;
  return baseTurn * turnMod;
}

export const ACTIONS = {
  // 1. Bergerak Mendekati Musuh Terdekat
  GerakKeMusuh(robotState, gameState) {
    const closest = findClosestEnemy(robotState, gameState);
    if (!closest) {
      robotState.targetSpeed = calculateEffectiveSpeed(robotState) * 0.4;
      return;
    }

    const targetAngle = Math.atan2(closest.dy, closest.dx);
    robotState.targetRotation = targetAngle;
    robotState.targetSpeed = calculateEffectiveSpeed(robotState);
  },

  // 2. Mundur / Menjauh dari Musuh
  Mundur(robotState, gameState) {
    const closest = findClosestEnemy(robotState, gameState);
    if (!closest) {
      robotState.targetSpeed = 0;
      return;
    }

    // Arah berlawanan dari musuh
    const awayAngle = Math.atan2(-closest.dy, -closest.dx);
    robotState.targetRotation = awayAngle;
    robotState.targetSpeed = calculateEffectiveSpeed(robotState);
  },

  // 3. Bergerak ke Titik Tertentu (x, y)
  GerakKeTitik(robotState, gameState, params = {}) {
    const tx = params.x !== undefined ? Number(params.x) : BALANCE.ARENA.WIDTH / 2;
    const ty = params.y !== undefined ? Number(params.y) : BALANCE.ARENA.HEIGHT / 2;
    const dx = tx - robotState.x;
    const dy = ty - robotState.y;

    if (Math.hypot(dx, dy) < 15) {
      robotState.targetSpeed = 0;
      return;
    }

    robotState.targetRotation = Math.atan2(dy, dx);
    robotState.targetSpeed = calculateEffectiveSpeed(robotState);
  },

  // 4. Diam / Bertahan di Tempat
  Diam(robotState, gameState) {
    robotState.targetSpeed = 0;
    // Jika ada musuh terlihat, tetap hadapkan turet ke musuh
    const closest = findClosestEnemy(robotState, gameState);
    if (closest) {
      robotState.targetRotation = Math.atan2(closest.dy, closest.dx);
    }
  },

  // 5. Tembak
  Tembak(robotState, gameState) {
    // Validasi apakah senjata rusak (Modul 2)
    if (isWeaponBroken(robotState)) {
      robotState.brokenWeaponAttempt = true; // Ditangkap oleh RobotHUD
      return;
    }

    // Arahkan ke musuh terdekat sebelum menembak
    const closest = findClosestEnemy(robotState, gameState);
    if (closest) {
      robotState.targetRotation = Math.atan2(closest.dy, closest.dx);
    }

    // Cek cooldown
    if ((robotState.weaponCooldown || 0) <= 0) {
      robotState.fireRequested = true;
      robotState.weaponCooldown = robotState.parts?.senjata?.cooldown || 1.2;
    }
  },

  // 6. Isi Ulang Amunisi
  IsiUlang(robotState) {
    robotState.targetSpeed = 0;
    robotState.isReloading = true;
  },

  // 7. Tabrak Musuh Terdekat (Modul 4)
  Tabrak(robotState, gameState) {
    const closest = findClosestEnemy(robotState, gameState);
    if (!closest) {
      robotState.targetSpeed = calculateEffectiveSpeed(robotState);
      return;
    }
    const targetAngle = Math.atan2(closest.dy, closest.dx);
    robotState.targetRotation = targetAngle;
    robotState.targetSpeed = calculateEffectiveSpeed(robotState) * 1.25;
  },

  // 8. Fokus Musuh Terlemah (Modul 4)
  FokusMusuhTerlemah(robotState, gameState) {
    if (!gameState || !gameState.robots) return;
    const enemies = gameState.robots.filter(r => r.team !== robotState.team && !r.destroyed);
    if (enemies.length === 0) return;

    let weakest = null;
    let minHP = Infinity;
    enemies.forEach(e => {
      const hp = e.parts?.rangka?.hp || 0;
      if (hp < minHP) {
        minHP = hp;
        weakest = e;
      }
    });

    if (weakest) {
      const dx = weakest.x - robotState.x;
      const dy = weakest.y - robotState.y;
      robotState.targetRotation = Math.atan2(dy, dx);
      robotState.targetSpeed = calculateEffectiveSpeed(robotState);

      if (!isWeaponBroken(robotState) && (robotState.weaponCooldown || 0) <= 0) {
        robotState.fireRequested = true;
        robotState.weaponCooldown = robotState.parts?.senjata?.cooldown || 1.2;
      }
    }
  },

  // 9. Lindungi Sekutu (Modul 4)
  LindungiSekutu(robotState, gameState) {
    if (!gameState || !gameState.robots) return;
    const allies = gameState.robots.filter(
      r => r.team === robotState.team && r.id !== robotState.id && !r.destroyed
    );
    if (allies.length === 0) {
      ACTIONS.GerakKeMusuh(robotState, gameState);
      return;
    }

    let weakestAlly = allies[0];
    let minHP = Infinity;
    allies.forEach(a => {
      const hp = a.parts?.rangka?.hp || 0;
      if (hp < minHP) {
        minHP = hp;
        weakestAlly = a;
      }
    });

    const enemies = gameState.robots.filter(r => r.team !== robotState.team && !r.destroyed);
    let nearestEnemyToAlly = null;
    let minEnemyDist = Infinity;
    enemies.forEach(e => {
      const d = Math.hypot(e.x - weakestAlly.x, e.y - weakestAlly.y);
      if (d < minEnemyDist) {
        minEnemyDist = d;
        nearestEnemyToAlly = e;
      }
    });

    if (nearestEnemyToAlly) {
      const midX = (weakestAlly.x + nearestEnemyToAlly.x) / 2;
      const midY = (weakestAlly.y + nearestEnemyToAlly.y) / 2;
      const dx = midX - robotState.x;
      const dy = midY - robotState.y;
      if (Math.hypot(dx, dy) > 20) {
        robotState.targetRotation = Math.atan2(dy, dx);
        robotState.targetSpeed = calculateEffectiveSpeed(robotState);
      } else {
        robotState.targetSpeed = 0;
        robotState.targetRotation = Math.atan2(nearestEnemyToAlly.y - robotState.y, nearestEnemyToAlly.x - robotState.x);
      }
    } else {
      ACTIONS.GerakKeMusuh(robotState, gameState);
    }
  }
};

