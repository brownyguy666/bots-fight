export const PRESET_PENOPANG = {
  id: 'preset_penopang',
  namaRobot: 'Penopang Sniper',
  loadout: {
    rangka: 'kompak',
    penggerak: 'melayang',
    senjata: 'railgun',
    sensor: 'jauh',
    armor: 'reaktif'
  },
  brain: {
    last_node_id: 8,
    last_link_id: 7,
    nodes: [
      {
        id: 1,
        type: 'RoboArena/Root',
        pos: [60, 200],
        size: [150, 46],
        outputs: [{ name: 'Alur', type: 'flow', links: [1] }]
      },
      {
        id: 2,
        type: 'RoboArena/MusuhTerlihat',
        pos: [270, 160],
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
        properties: { jarak: 220 },
        widgets_values: [220],
        inputs: [{ name: 'in', type: 'flow', link: 2 }],
        outputs: [
          { name: 'YA', type: 'flow', links: [4] },
          { name: 'TIDAK', type: 'flow', links: [5] }
        ]
      },
      {
        id: 4,
        type: 'RoboArena/Mundur',
        pos: [780, 80],
        size: [160, 50],
        inputs: [{ name: 'in', type: 'flow', link: 4 }]
      },
      {
        id: 5,
        type: 'RoboArena/Tembak',
        pos: [780, 160],
        size: [160, 50],
        inputs: [{ name: 'in', type: 'flow', link: 5 }]
      },
      {
        id: 6,
        type: 'RoboArena/SekutuDekat',
        pos: [510, 270],
        size: [190, 70],
        properties: { jarak: 260 },
        widgets_values: [260],
        inputs: [{ name: 'in', type: 'flow', link: 3 }],
        outputs: [
          { name: 'YA', type: 'flow', links: [6] },
          { name: 'TIDAK', type: 'flow', links: [7] }
        ]
      },
      {
        id: 7,
        type: 'RoboArena/LindungiSekutu',
        pos: [780, 250],
        size: [170, 50],
        inputs: [{ name: 'in', type: 'flow', link: 6 }]
      },
      {
        id: 8,
        type: 'RoboArena/GerakKeMusuh',
        pos: [780, 330],
        size: [170, 50],
        inputs: [{ name: 'in', type: 'flow', link: 7 }]
      }
    ],
    links: [
      [1, 1, 0, 2, 0, 'flow'],
      [2, 2, 0, 3, 0, 'flow'],
      [3, 2, 1, 6, 0, 'flow'],
      [4, 3, 0, 4, 0, 'flow'],
      [5, 3, 1, 5, 0, 'flow'],
      [6, 6, 0, 7, 0, 'flow'],
      [7, 6, 1, 8, 0, 'flow']
    ]
  }
};
