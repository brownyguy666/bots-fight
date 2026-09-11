import { BALANCE } from '../data/balance.js';

/**
 * Logika Pengurangan HP & Kerusakan Part (Modul 2)
 */

export function getLocomotionState(robotState) {
  const p = robotState.parts?.penggerak;
  if (!p || p.hp <= 0) return 'lumpuh';
  const ratio = p.hp / p.hpMax;
  if (ratio <= BALANCE.LOCOMOTION.LIMP_HP_THRESHOLD) return 'pincang';
  return 'normal';
}

export function isWeaponBroken(robotState) {
  const s = robotState.parts?.senjata;
  return !s || s.hp <= 0;
}

export function isSensorBroken(robotState) {
  const sens = robotState.parts?.sensor;
  if (!sens || sens.hpMax <= 0) return false;
  return sens.hp <= 0;
}

export function isArmorDepleted(robotState) {
  const a = robotState.parts?.armor;
  if (!a || a.hpMax <= 0) return true;
  return a.hp <= 0;
}

export function getEffectiveSensorRadius(robotState) {
  const sens = robotState.parts?.sensor;
  const baseRadius = sens?.radius || BALANCE.ARENA.DEFAULT_SENSOR_RADIUS;
  if (sens && sens.hpMax > 0 && sens.hp <= 0) {
    return Math.max(40, Math.round(baseRadius * BALANCE.ARENA.SENSOR_BROKEN_RATIO));
  }
  return baseRadius;
}

/**
 * Terapkan kerusakan pada robot sesuai aturan Modul 2
 */
export function applyDamage(robotState, amount) {
  if (robotState.destroyed) return null;

  const parts = robotState.parts;
  let sisaDamage = amount;
  let absorbedByArmor = 0;

  // 1. Serapan Armor (jika ada dan masih aktif)
  if (parts.armor && parts.armor.hp > 0 && parts.armor.reduction > 0) {
    const diserap = amount * parts.armor.reduction;
    absorbedByArmor = Math.min(diserap, parts.armor.hp);
    parts.armor.hp = Math.max(0, parts.armor.hp - diserap);
    sisaDamage = amount - diserap;
  }

  // 2. Pilih target part berdasarkan bobot probabilitas terpusat
  const weights = BALANCE.DAMAGE.PART_DISTRIBUTION_WEIGHTS;
  const rand = Math.random();
  let targetKey = 'rangka';

  if (rand < weights.sensor) {
    targetKey = 'sensor';
  } else if (rand < weights.sensor + weights.penggerak) {
    targetKey = 'penggerak';
  } else if (rand < weights.sensor + weights.penggerak + weights.senjata) {
    targetKey = 'senjata';
  } else {
    targetKey = 'rangka';
  }

  let targetPart = parts[targetKey];
  // Jika part target kosong atau tidak punya HP (misal sensor kosong), alihkan ke rangka
  if (!targetPart || targetPart.hpMax <= 0) {
    targetKey = 'rangka';
    targetPart = parts.rangka;
  }

  // 3. Anti-RNG Cap: maksimal 35% dari HP MAKSIMAL part target
  const maxHitAllowed = targetPart.hpMax * BALANCE.DAMAGE.MAX_DAMAGE_RATIO_PER_HIT;
  const damageFinal = Math.max(1, Math.min(Math.round(sisaDamage), Math.round(maxHitAllowed)));

  targetPart.hp = Math.max(0, targetPart.hp - damageFinal);

  // 4. Jika Rangka mencapai 0, robot hancur total
  if (parts.rangka.hp <= 0) {
    robotState.destroyed = true;
  }

  return {
    targetKey,
    damageFinal,
    absorbedByArmor,
    isDestroyed: robotState.destroyed
  };
}
