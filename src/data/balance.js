/**
 * RoboArena - Centralized Game Balance Configuration
 * Semua konstanta balancing, modifier statistik, dan ambang batas
 * dikumpulkan di sini untuk memudahkan penyesuaian saat playtest & turnamen.
 */

export const BALANCE = {
  // Arena
  ARENA: {
    WIDTH: 960,
    HEIGHT: 640,
    MATCH_DURATION_SECONDS: 120, // 2 menit
    AI_TICK_MS: 150, // Evaluasi pohon keputusan tiap 150ms
    BASE_ROBOT_SPEED: 110, // Kecepatan dasar (px/s)
    BASE_ROTATION_SPEED: 3.5, // Kecepatan putar dasar (rad/s)
    ROBOT_RADIUS: 22,
    DEFAULT_SENSOR_RADIUS: 280, // Radius sensor bawaan jika slot kosong
    SENSOR_BROKEN_RATIO: 0.15 // Radius menyusut jadi 15% jika sensor rusak (HP = 0)
  },

  // Modul 2 - Damage Model & Anti-RNG
  DAMAGE: {
    MAX_DAMAGE_RATIO_PER_HIT: 0.35, // Cap anti-RNG: max 35% dari HP MAKSIMAL part target
    PART_DISTRIBUTION_WEIGHTS: {
      rangka: 0.50,    // 50% ke Rangka
      senjata: 0.20,   // 20% ke Senjata
      penggerak: 0.20, // 20% ke Penggerak
      sensor: 0.10     // 10% ke Sensor
    }
  },

  // Modul 2 - Ambang Batas & Efek Penggerak (Locomotion)
  LOCOMOTION: {
    LIMP_HP_THRESHOLD: 0.60, // HP <= 60% masuk status Pincang
    SPEED_MULTIPLIERS: {
      normal: 1.0,
      pincang: 0.5,
      lumpuh: 0.0
    }
  },

  // Modul 2 & 4 - Persentase Reduksi Kerusakan Armor
  ARMOR_REDUCTION: {
    ringan: 0.20, // 20% reduksi per hit
    sedang: 0.35, // 35% reduksi per hit
    berat: 0.50,  // 50% reduksi per hit
    reaktif: 0.15 // 15% reduksi per hit (dengan regenerasi berkala)
  },

  // Modul 3 & 4 - Amunisi Terbatas per Tipe Senjata
  WEAPON_AMMO: {
    meriam: 24,
    laser: 36,
    rudal: 10,
    beruntun: 96,
    railgun: 12,
    api: 160,
    emp: 16
  },

  // Modul 3 & 4 - Serangan Tabrakan (Body Ramming Melee Attack)
  RAMMING: {
    DAMAGE: {
      kompak: 18,
      ringan: 22,
      sedang: 32,
      berat: 45,
      lapis_baja: 58
    },
    COOLDOWN: 1.2,
    KNOCKBACK_FORCE: 20
  },

  // Kecepatan Simulasi yang Tersedia
  SIMULATION_SPEEDS: [0.5, 1.0, 2.0, 4.0]
};

