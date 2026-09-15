/**
 * RoboArena - Preset Peta Arena (Fase 20)
 * Koordinat dan ukuran dinyatakan dalam Satuan Arena (Arena Units), bukan piksel.
 * Standar dimensi arena: width 60 unit, height 40 unit.
 */

export const ARENA_MAPS = {
  arena_kosong: {
    id: 'arena_kosong',
    nama: 'Arena Terbuka (Kosong)',
    deskripsi: 'Arena datar standar tanpa rintangan. Ideal untuk duel taktik dasar.',
    width: 60,
    height: 40,
    floorColor: 0x1a2234,
    gridColor: 0x2a3b5c,
    obstacles: [],
    zones: [],
    spawnPoints: {
      teamA: [
        { x: 8, y: 20, rotation: 0 },
        { x: 6, y: 13, rotation: 0 },
        { x: 6, y: 27, rotation: 0 },
        { x: 4, y: 7, rotation: 0 },
        { x: 4, y: 33, rotation: 0 }
      ],
      teamB: [
        { x: 52, y: 20, rotation: Math.PI },
        { x: 54, y: 13, rotation: Math.PI },
        { x: 54, y: 27, rotation: Math.PI },
        { x: 56, y: 7, rotation: Math.PI },
        { x: 56, y: 33, rotation: Math.PI }
      ]
    },
    // Posisi Flag (CTF) dan Hill (KOTH)
    flagBaseA: { x: 8, y: 20 },
    flagBaseB: { x: 52, y: 20 },
    hillZone: { x: 30, y: 20, radius: 8 }
  },

  arena_berbatu: {
    id: 'arena_berbatu',
    nama: 'Arena Berbatu (Rintangan)',
    deskripsi: 'Penuh dengan pilar batu dan barikade beton yang memblokir tembakan dan pandangan sensor.',
    width: 60,
    height: 40,
    floorColor: 0x1f2326,
    gridColor: 0x3b4249,
    obstacles: [
      // Pilar tengah & rintangan cover simetris
      { id: 'obs_c1', x: 30, y: 12, w: 6, h: 3, height3D: 3.5, color: 0x5a6577 },
      { id: 'obs_c2', x: 30, y: 28, w: 6, h: 3, height3D: 3.5, color: 0x5a6577 },
      { id: 'obs_l1', x: 20, y: 20, w: 4, h: 6, height3D: 4.0, color: 0x4f5869 },
      { id: 'obs_r1', x: 40, y: 20, w: 4, h: 6, height3D: 4.0, color: 0x4f5869 },
      { id: 'obs_tl', x: 18, y: 9, w: 4, h: 4, height3D: 3.0, color: 0x626e82 },
      { id: 'obs_bl', x: 18, y: 31, w: 4, h: 4, height3D: 3.0, color: 0x626e82 },
      { id: 'obs_tr', x: 42, y: 9, w: 4, h: 4, height3D: 3.0, color: 0x626e82 },
      { id: 'obs_br', x: 42, y: 31, w: 4, h: 4, height3D: 3.0, color: 0x626e82 }
    ],
    zones: [],
    spawnPoints: {
      teamA: [
        { x: 8, y: 20, rotation: 0 },
        { x: 6, y: 13, rotation: 0 },
        { x: 6, y: 27, rotation: 0 },
        { x: 4, y: 7, rotation: 0 },
        { x: 4, y: 33, rotation: 0 }
      ],
      teamB: [
        { x: 52, y: 20, rotation: Math.PI },
        { x: 54, y: 13, rotation: Math.PI },
        { x: 54, y: 27, rotation: Math.PI },
        { x: 56, y: 7, rotation: Math.PI },
        { x: 56, y: 33, rotation: Math.PI }
      ]
    },
    flagBaseA: { x: 8, y: 20 },
    flagBaseB: { x: 52, y: 20 },
    hillZone: { x: 30, y: 20, radius: 7 }
  },

  arena_berpasir: {
    id: 'arena_berpasir',
    nama: 'Gurun Berpasir (Terrain)',
    deskripsi: 'Zona pasir gurun yang memperlambat roda dan kaki mekanik, namun pendorong melayang melewatinya tanpa hambatan.',
    width: 60,
    height: 40,
    floorColor: 0x3d2b15,
    gridColor: 0x614828,
    obstacles: [
      // Bebatuan gurun alami
      { id: 'sand_rock_1', x: 30, y: 6, w: 5, h: 4, height3D: 3.2, color: 0x8a6e4b },
      { id: 'sand_rock_2', x: 30, y: 34, w: 5, h: 4, height3D: 3.2, color: 0x8a6e4b },
      { id: 'sand_rock_3', x: 24, y: 20, w: 3, h: 5, height3D: 3.8, color: 0x8a6e4b },
      { id: 'sand_rock_4', x: 36, y: 20, w: 3, h: 5, height3D: 3.8, color: 0x8a6e4b }
    ],
    zones: [
      // Zona pasir tebal di tengah dan koridor
      {
        id: 'sand_zone_center',
        type: 'pasir',
        nama: 'Zona Pasir Hisap',
        x: 30,
        y: 20,
        w: 24,
        h: 22,
        color: 0xc29b62,
        opacity: 0.35
      }
    ],
    spawnPoints: {
      teamA: [
        { x: 8, y: 20, rotation: 0 },
        { x: 6, y: 13, rotation: 0 },
        { x: 6, y: 27, rotation: 0 },
        { x: 4, y: 7, rotation: 0 },
        { x: 4, y: 33, rotation: 0 }
      ],
      teamB: [
        { x: 52, y: 20, rotation: Math.PI },
        { x: 54, y: 13, rotation: Math.PI },
        { x: 54, y: 27, rotation: Math.PI },
        { x: 56, y: 7, rotation: Math.PI },
        { x: 56, y: 33, rotation: Math.PI }
      ]
    },
    flagBaseA: { x: 8, y: 20 },
    flagBaseB: { x: 52, y: 20 },
    hillZone: { x: 30, y: 20, radius: 7 }
  }
};
