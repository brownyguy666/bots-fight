/**
 * RoboArena - Terrain Modifiers (Fase 20)
 * Tabel pengali kecepatan berdasarkan kombinasi tipe terrain dan tipe penggerak (locomotion).
 */

export const TERRAIN_MODIFIERS = {
  // Terrain default/normal (tanpa penalti)
  normal: {
    roda: 1.0,
    rantai: 1.0,
    kaki: 1.0,
    omni: 1.0,
    melayang: 1.0
  },

  // Berpasir (Sand): Roda tergelincir parah, kaki agak melambat, pendorong melayang bebas
  pasir: {
    roda: 0.50,
    rantai: 0.80,
    kaki: 0.85,
    omni: 0.60,
    melayang: 1.00
  },

  // Bebatuan / Reruntuhan (Rubble): Roda berguncang, rantai & kaki kokoh
  bebatuan: {
    roda: 0.65,
    rantai: 0.95,
    kaki: 1.00,
    omni: 0.70,
    melayang: 1.00
  },

  // Oli / Licin (Oil Slick): Traksi rendah untuk roda & omni
  oli: {
    roda: 0.60,
    rantai: 0.75,
    kaki: 0.80,
    omni: 0.40,
    melayang: 1.00
  }
};

/**
 * Menghitung pengali kecepatan terrain untuk robot pada posisi (x, y)
 * @param {Object} robotState - State robot saat ini
 * @param {Array} zones - Daftar zona terrain arena [{ x, y, w, h, type }]
 * @returns {number} Pengali kecepatan (1.0 jika di tanah normal)
 */
export function getTerrainSpeedMultiplier(robotState, zones = []) {
  if (!zones || zones.length === 0) return 1.0;

  const penggerakId = robotState.parts?.penggerak?.id || 'roda';
  const rx = robotState.x;
  const ry = robotState.y;

  // Cek apakah robot berada di dalam salah satu zona
  for (const zone of zones) {
    const halfW = zone.w / 2;
    const halfH = zone.h / 2;
    if (
      rx >= zone.x - halfW &&
      rx <= zone.x + halfW &&
      ry >= zone.y - halfH &&
      ry <= zone.y + halfH
    ) {
      const terrainType = zone.type || 'normal';
      const modTable = TERRAIN_MODIFIERS[terrainType] || TERRAIN_MODIFIERS.normal;
      return modTable[penggerakId] !== undefined ? modTable[penggerakId] : 1.0;
    }
  }

  return 1.0;
}
