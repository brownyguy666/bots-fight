import { BALANCE } from '../data/balance.js';
import { getLocomotionState, isWeaponBroken } from './damage.js';
import { findClosestEnemy } from './sensors.js';

/**
 * Eksekusi Aksi AI untuk Robot
 * Mengatur target kecepatan, rotasi haluan, dan permintaan tembak robot
 * Beroperasi sepenuhnya dalam satuan arena (Arena Units).
 */

export function calculateEffectiveSpeed(robotState) {
  const parts = robotState.parts;
  let baseSpeed = BALANCE.ARENA.BASE_ROBOT_SPEED;
  if (baseSpeed > 20) {
    baseSpeed = baseSpeed / 16;
  }

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

  // Modifier terrain arena (Fase 20)
  const terrainFactor = robotState.terrainSpeedModifier !== undefined ? robotState.terrainSpeedModifier : 1.0;

  // Modifier kemiringan tanjakan/turunan (Fase 29)
  const slopeFactor = robotState.slopeSpeedModifier !== undefined ? robotState.slopeSpeedModifier : 1.0;

  return baseSpeed * partFactor * locoFactor * terrainFactor * slopeFactor;
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

  // 3. Bergerak ke Titik Tertentu (x, y) dalam Satuan Arena
  GerakKeTitik(robotState, gameState, params = {}) {
    let tx = params.x !== undefined ? Number(params.x) : BALANCE.ARENA.WIDTH / 2;
    let ty = params.y !== undefined ? Number(params.y) : BALANCE.ARENA.HEIGHT / 2;
    if (tx > 60) tx = tx / 16;
    if (ty > 40) ty = ty / 16;

    const dx = tx - robotState.x;
    const dy = ty - robotState.y;

    if (Math.hypot(dx, dy) < 1.5) {
      robotState.targetSpeed = 0;
      return;
    }

    robotState.targetRotation = Math.atan2(dy, dx);
    robotState.targetSpeed = calculateEffectiveSpeed(robotState);
  },

  // 4. Diam / Bertahan di Tempat
  Diam(robotState, gameState) {
    robotState.targetSpeed = 0;
    // Jika ada musuh terlihat, tetap hadapkan turet/senjata ke musuh
    const closest = findClosestEnemy(robotState, gameState);
    if (closest) {
      robotState.targetRotation = Math.atan2(closest.dy, closest.dx);
    }
  },

  // 5. Tembak
  Tembak(robotState, gameState) {
    if (isWeaponBroken(robotState) || robotState.currentAmmo <= 0) {
      robotState.brokenWeaponAttempt = true;
      // Jika senjata rusak atau amunisi habis, gunakan body ramming!
      ACTIONS.Tabrak(robotState, gameState);
      return;
    }

    const closest = findClosestEnemy(robotState, gameState);
    if (closest) {
      robotState.targetRotation = Math.atan2(closest.dy, closest.dx);
      // Jika jarak musuh lebih jauh dari jangkauan efektif senjata, maju mendekat sambil menembak
      let weaponRange = robotState.parts?.senjata?.range || 350;
      if (weaponRange > 60) weaponRange = weaponRange / 16;
      if (closest.dist > weaponRange * 0.8) {
        robotState.targetSpeed = calculateEffectiveSpeed(robotState) * 0.85;
      } else {
        // Dalam jangkauan tembak: tetap bergerak taktis agar tidak statis
        robotState.targetSpeed = calculateEffectiveSpeed(robotState) * 0.3;
      }
    } else {
      robotState.targetSpeed = calculateEffectiveSpeed(robotState) * 0.5;
    }

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

  // 7. Tabrak Musuh Terdekat (Body Ramming)
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

  // 8. Fokus Musuh Terlemah
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

  // 9. Lindungi Sekutu (Membela sekutu yang sekarat atau minta bantuan signal)
  LindungiSekutu(robotState, gameState) {
    if (!gameState || !gameState.robots) return;
    const allies = gameState.robots.filter(
      r => r.team === robotState.team && r.id !== robotState.id && !r.destroyed
    );
    if (allies.length === 0) {
      ACTIONS.GerakKeMusuh(robotState, gameState);
      return;
    }

    // Prioritas sekutu yang mengirimkan signal minta bantuan
    let targetAlly = null;
    if (gameState.signalBus) {
      const helpSig = gameState.signalBus.findHelpSignal(
        robotState.team,
        robotState.id,
        { x: robotState.x, y: robotState.y },
        30
      );
      if (helpSig) {
        targetAlly = allies.find(a => a.id === helpSig.sourceRobotId);
      }
    }

    // Jika tidak ada signal bantuan, cari sekutu dengan HP terendah
    if (!targetAlly) {
      let minHP = Infinity;
      allies.forEach(a => {
        const hp = a.parts?.rangka?.hp || 0;
        if (hp < minHP) {
          minHP = hp;
          targetAlly = a;
        }
      });
    }

    if (!targetAlly) {
      ACTIONS.GerakKeMusuh(robotState, gameState);
      return;
    }

    const enemies = gameState.robots.filter(r => r.team !== robotState.team && !r.destroyed);
    let nearestEnemyToAlly = null;
    let minEnemyDist = Infinity;
    enemies.forEach(e => {
      const d = Math.hypot(e.x - targetAlly.x, e.y - targetAlly.y);
      if (d < minEnemyDist) {
        minEnemyDist = d;
        nearestEnemyToAlly = e;
      }
    });

    if (nearestEnemyToAlly) {
      // Posisikan diri di antara sekutu dan musuh
      const midX = (targetAlly.x + nearestEnemyToAlly.x) / 2;
      const midY = (targetAlly.y + nearestEnemyToAlly.y) / 2;
      const dx = midX - robotState.x;
      const dy = midY - robotState.y;
      if (Math.hypot(dx, dy) > 2.0) {
        robotState.targetRotation = Math.atan2(dy, dx);
        robotState.targetSpeed = calculateEffectiveSpeed(robotState);
      } else {
        robotState.targetSpeed = 0;
        robotState.targetRotation = Math.atan2(nearestEnemyToAlly.y - robotState.y, nearestEnemyToAlly.x - robotState.x);
      }
    } else {
      ACTIONS.GerakKeMusuh(robotState, gameState);
    }
  },

  // 10. Serang Musuh Prioritas (Fase 22)
  SerangMusuhPrioritas(robotState, gameState) {
    if (!gameState?.signalBus) {
      ACTIONS.GerakKeMusuh(robotState, gameState);
      return;
    }

    const signal = gameState.signalBus.getPriorityTarget(robotState.team);
    if (!signal) {
      ACTIONS.GerakKeMusuh(robotState, gameState);
      return;
    }

    const target = gameState.robots?.find(r => r.id === signal.targetRobotId && !r.destroyed);
    if (!target) {
      ACTIONS.GerakKeMusuh(robotState, gameState);
      return;
    }

    const dx = target.x - robotState.x;
    const dy = target.y - robotState.y;
    robotState.targetRotation = Math.atan2(dy, dx);
    robotState.targetSpeed = calculateEffectiveSpeed(robotState);

    if (!isWeaponBroken(robotState) && (robotState.weaponCooldown || 0) <= 0) {
      robotState.fireRequested = true;
      robotState.weaponCooldown = robotState.parts?.senjata?.cooldown || 1.2;
    }
  },

  // 11. Bergerak ke Bendera Musuh (Fase 21 CTF)
  GerakKeFlagMusuh(robotState, gameState) {
    if (!gameState?.flags) {
      ACTIONS.GerakKeMusuh(robotState, gameState);
      return;
    }
    const enemyFlag = gameState.flags.find(f => f.teamId !== robotState.team);
    if (!enemyFlag) {
      ACTIONS.GerakKeMusuh(robotState, gameState);
      return;
    }

    const targetPos = enemyFlag.carrierRobotId
      ? gameState.robots?.find(r => r.id === enemyFlag.carrierRobotId) || enemyFlag.currentPosition
      : enemyFlag.currentPosition;

    const dx = targetPos.x - robotState.x;
    const dy = targetPos.y - robotState.y;
    robotState.targetRotation = Math.atan2(dy, dx);
    robotState.targetSpeed = calculateEffectiveSpeed(robotState);
  },

  // 12. Kembali ke Base Sendiri (Fase 21 CTF)
  KembaliKeBase(robotState, gameState) {
    if (!gameState?.arenaMap?.spawnPoints) {
      robotState.targetSpeed = 0;
      return;
    }
    const spawns = robotState.team === 'A'
      ? gameState.arenaMap.spawnPoints.teamA
      : gameState.arenaMap.spawnPoints.teamB;

    const home = spawns && spawns[0] ? spawns[0] : { x: robotState.team === 'A' ? 8 : 52, y: 20 };
    const dx = home.x - robotState.x;
    const dy = home.y - robotState.y;
    if (Math.hypot(dx, dy) < 2.0) {
      robotState.targetSpeed = 0;
      return;
    }
    robotState.targetRotation = Math.atan2(dy, dx);
    robotState.targetSpeed = calculateEffectiveSpeed(robotState);
  },

  // 13. Kuasai Zona Hill (Fase 21 KOTH)
  KuasaiHill(robotState, gameState) {
    if (!gameState?.hillZone) {
      ACTIONS.GerakKeMusuh(robotState, gameState);
      return;
    }
    const hz = gameState.hillZone;
    const dx = hz.x - robotState.x;
    const dy = hz.y - robotState.y;
    const dist = Math.hypot(dx, dy);

    if (dist < (hz.radius || 7) * 0.5) {
      // Sudah nyaman di dalam hill, jaga posisi dan hadap ke musuh terdekat
      robotState.targetSpeed = 0;
      const closest = findClosestEnemy(robotState, gameState);
      if (closest) {
        robotState.targetRotation = Math.atan2(closest.dy, closest.dx);
      }
    } else {
      robotState.targetRotation = Math.atan2(dy, dx);
      robotState.targetSpeed = calculateEffectiveSpeed(robotState);
    }
  }
};
