import { PRESET_PENOPANG } from './penopang.js';
import { PRESET_PEMBURU } from './pemburu.js';
import { PRESET_KAMIKAZE } from './kamikaze.js';
import { PRESET_PENJAGA_FORMASI } from './penjaga_formasi.js';

export const PRESET_ROBOTS = [
  PRESET_PENOPANG,
  PRESET_PEMBURU,
  PRESET_KAMIKAZE,
  PRESET_PENJAGA_FORMASI,
  {
    id: 'preset_striker',
    namaRobot: 'Striker Meriam',
    loadout: {
      rangka: 'sedang',
      penggerak: 'roda',
      senjata: 'meriam',
      sensor: 'jauh',
      armor: 'sedang'
    },
    brain: {
      last_node_id: 6,
      last_link_id: 5,
      nodes: [
        {
          id: 1,
          type: 'RoboArena/Root',
          pos: [60, 180],
          size: [150, 46],
          outputs: [{ name: 'Alur', type: 'flow', links: [1] }]
        },
        {
          id: 2,
          type: 'RoboArena/MusuhTerlihat',
          pos: [270, 150],
          size: [180, 70],
          inputs: [{ name: 'in', type: 'flow', link: 1 }],
          outputs: [
            { name: 'YA', type: 'flow', links: [2] },
            { name: 'TIDAK', type: 'flow', links: [3] }
          ]
        },
        {
          id: 3,
          type: 'RoboArena/JarakMusuhKurangDari',
          pos: [510, 110],
          size: [210, 80],
          properties: { jarak: 180 },
          widgets_values: [180],
          inputs: [{ name: 'in', type: 'flow', link: 2 }],
          outputs: [
            { name: 'YA', type: 'flow', links: [4] },
            { name: 'TIDAK', type: 'flow', links: [5] }
          ]
        },
        {
          id: 4,
          type: 'RoboArena/GerakKeMusuh',
          pos: [510, 270],
          size: [170, 50],
          inputs: [{ name: 'in', type: 'flow', link: 3 }]
        },
        {
          id: 5,
          type: 'RoboArena/Mundur',
          pos: [780, 80],
          size: [160, 50],
          inputs: [{ name: 'in', type: 'flow', link: 4 }]
        },
        {
          id: 6,
          type: 'RoboArena/Tembak',
          pos: [780, 170],
          size: [160, 50],
          inputs: [{ name: 'in', type: 'flow', link: 5 }]
        }
      ],
      links: [
        [1, 1, 0, 2, 0, 'flow'],
        [2, 2, 0, 3, 0, 'flow'],
        [3, 2, 1, 4, 0, 'flow'],
        [4, 3, 0, 5, 0, 'flow'],
        [5, 3, 1, 6, 0, 'flow']
      ]
    }
  },
  {
    id: 'preset_sniper',
    namaRobot: 'Laser Sniper',
    loadout: {
      rangka: 'ringan',
      penggerak: 'roda',
      senjata: 'laser',
      sensor: 'jauh',
      armor: 'ringan'
    },
    brain: {
      last_node_id: 5,
      last_link_id: 4,
      nodes: [
        {
          id: 1,
          type: 'RoboArena/Root',
          pos: [60, 180],
          size: [150, 46],
          outputs: [{ name: 'Alur', type: 'flow', links: [1] }]
        },
        {
          id: 2,
          type: 'RoboArena/MusuhTerlihat',
          pos: [270, 150],
          size: [180, 70],
          inputs: [{ name: 'in', type: 'flow', link: 1 }],
          outputs: [
            { name: 'YA', type: 'flow', links: [2] },
            { name: 'TIDAK', type: 'flow', links: [3] }
          ]
        },
        {
          id: 3,
          type: 'RoboArena/Tembak',
          pos: [520, 120],
          size: [160, 50],
          inputs: [{ name: 'in', type: 'flow', link: 2 }]
        },
        {
          id: 4,
          type: 'RoboArena/Diam',
          pos: [520, 240],
          size: [160, 50],
          inputs: [{ name: 'in', type: 'flow', link: 3 }]
        }
      ],
      links: [
        [1, 1, 0, 2, 0, 'flow'],
        [2, 2, 0, 3, 0, 'flow'],
        [3, 2, 1, 4, 0, 'flow']
      ]
    }
  },
  {
    id: 'preset_rusher',
    namaRobot: 'Penyerbu Gatling',
    loadout: {
      rangka: 'ringan',
      penggerak: 'kaki',
      senjata: 'beruntun',
      sensor: 'pendek',
      armor: 'sedang'
    },
    brain: {
      last_node_id: 6,
      last_link_id: 5,
      nodes: [
        {
          id: 1,
          type: 'RoboArena/Root',
          pos: [60, 180],
          size: [150, 46],
          outputs: [{ name: 'Alur', type: 'flow', links: [1] }]
        },
        {
          id: 2,
          type: 'RoboArena/SenjataRusak',
          pos: [260, 130],
          size: [180, 70],
          inputs: [{ name: 'in', type: 'flow', link: 1 }],
          outputs: [
            { name: 'YA', type: 'flow', links: [2] },
            { name: 'TIDAK', type: 'flow', links: [3] }
          ]
        },
        {
          id: 3,
          type: 'RoboArena/Mundur',
          pos: [510, 80],
          size: [160, 50],
          inputs: [{ name: 'in', type: 'flow', link: 2 }]
        },
        {
          id: 4,
          type: 'RoboArena/JarakMusuhKurangDari',
          pos: [510, 200],
          size: [210, 80],
          properties: { jarak: 220 },
          widgets_values: [220],
          inputs: [{ name: 'in', type: 'flow', link: 3 }],
          outputs: [
            { name: 'YA', type: 'flow', links: [4] },
            { name: 'TIDAK', type: 'flow', links: [5] }
          ]
        },
        {
          id: 5,
          type: 'RoboArena/Tembak',
          pos: [780, 160],
          size: [160, 50],
          inputs: [{ name: 'in', type: 'flow', link: 4 }]
        },
        {
          id: 6,
          type: 'RoboArena/GerakKeMusuh',
          pos: [780, 260],
          size: [170, 50],
          inputs: [{ name: 'in', type: 'flow', link: 5 }]
        }
      ],
      links: [
        [1, 1, 0, 2, 0, 'flow'],
        [2, 2, 0, 3, 0, 'flow'],
        [3, 2, 1, 4, 0, 'flow'],
        [4, 4, 0, 5, 0, 'flow'],
        [5, 4, 1, 6, 0, 'flow']
      ]
    }
  },
  {
    id: 'preset_guardian',
    namaRobot: 'Benteng Rudal',
    loadout: {
      rangka: 'berat',
      penggerak: 'rantai',
      senjata: 'rudal',
      sensor: '360',
      armor: 'berat'
    },
    brain: {
      last_node_id: 5,
      last_link_id: 4,
      nodes: [
        {
          id: 1,
          type: 'RoboArena/Root',
          pos: [60, 180],
          size: [150, 46],
          outputs: [{ name: 'Alur', type: 'flow', links: [1] }]
        },
        {
          id: 2,
          type: 'RoboArena/MusuhTerlihat',
          pos: [270, 150],
          size: [180, 70],
          inputs: [{ name: 'in', type: 'flow', link: 1 }],
          outputs: [
            { name: 'YA', type: 'flow', links: [2] },
            { name: 'TIDAK', type: 'flow', links: [3] }
          ]
        },
        {
          id: 3,
          type: 'RoboArena/Tembak',
          pos: [520, 110],
          size: [160, 50],
          inputs: [{ name: 'in', type: 'flow', link: 2 }]
        },
        {
          id: 4,
          type: 'RoboArena/Diam',
          pos: [520, 230],
          size: [160, 50],
          inputs: [{ name: 'in', type: 'flow', link: 3 }]
        }
      ],
      links: [
        [1, 1, 0, 2, 0, 'flow'],
        [2, 2, 0, 3, 0, 'flow'],
        [3, 2, 1, 4, 0, 'flow']
      ]
    }
  }
];
