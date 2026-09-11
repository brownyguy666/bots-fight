import {
  getEffectiveSensorRadius,
  getLocomotionState,
  isWeaponBroken,
  isSensorBroken,
  isArmorDepleted
} from './damage.js';

/**
 * Evaluasi Sensor untuk Kondisi Pohon Keputusan (AI)
 * Setiap fungsi mengembalikan boolean (true = YA, false = TIDAK)
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
  // 1. Musuh Terlihat dalam radius efektif sensor
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

    // Jika sensor 360, bisa melihat dari segala penjuru
    if (robotState.parts?.sensor?.omnidirectional) {
      return true;
    }

    // Untuk sensor biasa: deteksi busur depan 220 derajat (-110 s/d +110)
    const angleToEnemy = Math.atan2(closest.dy, closest.dx);
    let diff = angleToEnemy - robotState.rotation;
    // Normalisasi sudut ke -PI s/d PI
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const fovLimit = (110 * Math.PI) / 180;
    return Math.abs(diff) <= fovLimit;
  },

  // 2. Jarak Musuh Kurang Dari X piksel
  JarakMusuhKurangDari(robotState, gameState, params = {}) {
    const targetDist = params.jarak !== undefined ? Number(params.jarak) : 200;
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

  // 5. Sekutu Dekat
  SekutuDekat(robotState, gameState, params = {}) {
    if (!gameState || !gameState.robots) return false;
    const targetDist = params.jarak !== undefined ? Number(params.jarak) : 180;
    const allies = gameState.robots.filter(
      r => r.team === robotState.team && r.id !== robotState.id && !r.destroyed
    );

    return allies.some(ally => {
      const dist = Math.hypot(ally.x - robotState.x, ally.y - robotState.y);
      return dist <= targetDist;
    });
  },

  // --- Kondisi Spesifik Modul 2 ---

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

  // --- Kondisi Taktis (Modul 4) ---

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

  // 14. Waktu Hampir Habis (Sisa waktu match di bawah X detik)
  WaktuHampirHabis(robotState, gameState, params = {}) {
    const threshold = params.detik !== undefined ? Number(params.detik) : 30;
    const timeLeft = gameState.matchTime !== undefined ? gameState.matchTime : 120;
    return timeLeft <= threshold;
  }
};

