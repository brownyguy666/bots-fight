import {
  getEffectiveSensorRadius,
  getLocomotionState,
  isWeaponBroken,
  isSensorBroken,
  isArmorDepleted
} from './damage.js';
import { checkLineBlockedByObstacles } from '../game3d/obstacles.js';

/**
 * Evaluasi Sensor untuk Kondisi Pohon Keputusan (AI)
 * Setiap fungsi mengembalikan boolean (true = YA, false = TIDAK)
 * Seluruh jarak dievaluasi dalam satuan arena (Arena Units).
 */

export function findClosestEnemy(robotState, gameState) {
  if (!gameState || !gameState.robots) return null;
  const enemies = gameState.robots.filter(
    r => r.team !== robotState.team && !r.destroyed
  );
  if (enemies.length === 0) return null;

  let closest = null;
  let minDist = Infinity;

  enemies.forEach(enemy => {
    const dx = enemy.x - robotState.x;
    const dy = enemy.y - robotState.y;
    const dist = Math.hypot(dx, dy);
    if (dist < minDist) {
      minDist = dist;
      closest = { enemy, dist, dx, dy };
    }
  });

  return closest;
}

export const SENSORS = {
  // 1. Musuh Terlihat dalam radius efektif sensor DAN Line of Sight (LOS) tidak terhalang obstacle
  MusuhTerlihat(robotState, gameState) {
    const closest = findClosestEnemy(robotState, gameState);
    if (!closest) return false;

    // Jika sensor termal: mendeteksi musuh lumpuh/terbakar di jarak berapapun!
    if (robotState.parts?.sensor?.termal && gameState?.robots) {
      const anyLumpuh = gameState.robots.some(
        r => r.team !== robotState.team && !r.destroyed && (getLocomotionState(r) === 'lumpuh' || (r.empLumpuhTimer && r.empLumpuhTimer > 0))
      );
      if (anyLumpuh) return true;
    }

    const effectiveRadius = getEffectiveSensorRadius(robotState);
    if (closest.dist > effectiveRadius) return false;

    // Cek Line of Sight (LOS) terhadap rintangan (Fase 20)
    if (gameState?.obstacles && gameState.obstacles.length > 0) {
      if (checkLineBlockedByObstacles(robotState.x, robotState.y, closest.enemy.x, closest.enemy.y, gameState.obstacles)) {
        return false; // Pandangan terhalang obstacle
      }
    }

    // Jika sensor 360, bisa melihat dari segala penjuru
    if (robotState.parts?.sensor?.omnidirectional) {
      return true;
    }

    // Untuk sensor biasa: deteksi busur depan 220 derajat (-110 s/d +110)
    const angleToEnemy = Math.atan2(closest.dy, closest.dx);
    let diff = angleToEnemy - robotState.rotation;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const fovLimit = (110 * Math.PI) / 180;
    return Math.abs(diff) <= fovLimit;
  },

  // 2. Jarak Musuh Kurang Dari X (Satuan Arena)
  JarakMusuhKurangDari(robotState, gameState, params = {}) {
    let targetDist = params.jarak !== undefined ? Number(params.jarak) : 15;
    // Kompatibilitas mundur: jika nilai tersimpan masih skala piksel lama (> 50), konversi ke unit arena (/ 16)
    if (targetDist > 50) {
      targetDist = targetDist / 16;
    }

    const closest = findClosestEnemy(robotState, gameState);
    if (!closest) return false;
    return closest.dist < targetDist;
  },

  // 3. HP Rangka Kurang Dari X persen
  HPKurangDari(robotState, gameState, params = {}) {
    const threshold = params.persen !== undefined ? Number(params.persen) : 30;
    const rangka = robotState.parts?.rangka;
    if (!rangka || rangka.hpMax <= 0) return false;
    const hpPercent = (rangka.hp / rangka.hpMax) * 100;
    return hpPercent < threshold;
  },

  // 4. Amunisi Habis
  AmunisiHabis(robotState) {
    return robotState.ammo !== undefined && robotState.ammo <= 0;
  },

  // 5. Sekutu Dekat (Satuan Arena)
  SekutuDekat(robotState, gameState, params = {}) {
    if (!gameState || !gameState.robots) return false;
    let targetDist = params.jarak !== undefined ? Number(params.jarak) : 12;
    if (targetDist > 50) targetDist = targetDist / 16;

    const allies = gameState.robots.filter(
      r => r.team === robotState.team && r.id !== robotState.id && !r.destroyed
    );

    return allies.some(ally => {
      const dist = Math.hypot(ally.x - robotState.x, ally.y - robotState.y);
      return dist <= targetDist;
    });
  },

  // 6. Senjata Rusak
  SenjataRusak(robotState) {
    return isWeaponBroken(robotState);
  },

  // 7. Penggerak Rusak (Lumpuh, HP = 0)
  PenggerakRusak(robotState) {
    return getLocomotionState(robotState) === 'lumpuh';
  },

  // 8. Penggerak Pincang (HP 1–60%)
  PenggerakPincang(robotState) {
    return getLocomotionState(robotState) === 'pincang';
  },

  // 9. Sensor Rusak
  SensorRusak(robotState) {
    return isSensorBroken(robotState);
  },

  // 10. Armor Habis
  ArmorHabis(robotState) {
    return isArmorDepleted(robotState);
  },

  // 11. Musuh Lumpuh (Penggerak hancur atau terkena efek EMP)
  MusuhLumpuh(robotState, gameState) {
    const closest = findClosestEnemy(robotState, gameState);
    if (!closest) return false;
    const enemy = closest.enemy;
    const isLimpuh = getLocomotionState(enemy) === 'lumpuh';
    const isEmpLumpuh = enemy.empLumpuhTimer !== undefined && enemy.empLumpuhTimer > 0;
    return isLimpuh || isEmpLumpuh;
  },

  // 12. HP Musuh Rendah (% HP rangka musuh di bawah ambang)
  HPMusuhRendah(robotState, gameState, params = {}) {
    const threshold = params.persen !== undefined ? Number(params.persen) : 30;
    const closest = findClosestEnemy(robotState, gameState);
    if (!closest) return false;
    const r = closest.enemy.parts?.rangka;
    if (!r || r.hpMax <= 0) return false;
    const hpPercent = (r.hp / r.hpMax) * 100;
    return hpPercent < threshold;
  },

  // 13. Tim Untung (Jumlah sekutu hidup > jumlah musuh hidup)
  TimUntung(robotState, gameState) {
    if (!gameState || !gameState.robots) return false;
    const allies = gameState.robots.filter(r => r.team === robotState.team && !r.destroyed).length;
    const enemies = gameState.robots.filter(r => r.team !== robotState.team && !r.destroyed).length;
    return allies > enemies;
  },

  // 14. Waktu Hampir Habis
  WaktuHampirHabis(robotState, gameState, params = {}) {
    const threshold = params.detik !== undefined ? Number(params.detik) : 30;
    const timeLeft = gameState.matchTime !== undefined ? gameState.matchTime : 120;
    return timeLeft <= threshold;
  },

  // --- KONDISI MODE PERMAINAN (Fase 21) ---

  // 15. Sedang Membawa Bendera Musuh (CTF)
  SedangBawaFlag(robotState, gameState) {
    if (!gameState?.flags) return false;
    return gameState.flags.some(f => f.carrierRobotId === robotState.id);
  },

  // 16. Bendera Musuh Terlihat dalam Jangkauan Sensor & LOS
  FlagMusuhTerlihat(robotState, gameState) {
    if (!gameState?.flags) return false;
    const enemyFlag = gameState.flags.find(f => f.teamId !== robotState.team);
    if (!enemyFlag) return false;

    const dist = Math.hypot(enemyFlag.currentPosition.x - robotState.x, enemyFlag.currentPosition.y - robotState.y);
    const radius = getEffectiveSensorRadius(robotState);
    if (dist > radius) return false;

    if (gameState?.obstacles && gameState.obstacles.length > 0) {
      if (checkLineBlockedByObstacles(robotState.x, robotState.y, enemyFlag.currentPosition.x, enemyFlag.currentPosition.y, gameState.obstacles)) {
        return false;
      }
    }
    return true;
  },

  // 17. Di Zona Hill (King of the Hill)
  DiZonaHill(robotState, gameState) {
    if (!gameState?.hillZone) return false;
    const dist = Math.hypot(robotState.x - gameState.hillZone.x, robotState.y - gameState.hillZone.y);
    return dist <= (gameState.hillZone.radius || 7);
  },

  // 18. Tim Sedang Unggul Menguasai Hill
  TimUnggulDiHill(robotState, gameState) {
    if (!gameState?.hillZone || !gameState.robots) return false;
    const hz = gameState.hillZone;
    const rZone = hz.radius || 7;

    const alliesInHill = gameState.robots.filter(
      r => r.team === robotState.team && !r.destroyed && Math.hypot(r.x - hz.x, r.y - hz.y) <= rZone
    ).length;

    const enemiesInHill = gameState.robots.filter(
      r => r.team !== robotState.team && !r.destroyed && Math.hypot(r.x - hz.x, r.y - hz.y) <= rZone
    ).length;

    return alliesInHill > enemiesInHill;
  },

  // --- KONDISI KOORDINASI TIM & SIGNAL (Fase 22) ---

  // 19. Sekutu Minta Bantuan dalam radius tertentu
  SekutuMintaBantuan(robotState, gameState, params = {}) {
    if (!gameState?.signalBus) return false;
    let radius = params.radius !== undefined ? Number(params.radius) : 20;
    if (radius > 50) radius = radius / 16;

    const signal = gameState.signalBus.findHelpSignal(
      robotState.team,
      robotState.id,
      { x: robotState.x, y: robotState.y },
      radius
    );
    return signal !== null;
  },

  // 20. Ada Musuh Prioritas dari Komandan
  AdaMusuhPrioritas(robotState, gameState) {
    if (!gameState?.signalBus) return false;
    const signal = gameState.signalBus.getPriorityTarget(robotState.team);
    if (!signal) return false;

    // Pastikan target masih hidup
    const target = gameState.robots?.find(r => r.id === signal.targetRobotId);
    return target && !target.destroyed;
  }
};
