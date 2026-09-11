export const PRESET_PEMBURU = {
  id: 'preset_pemburu',
  namaRobot: 'Pemburu Lincah',
  loadout: {
    rangka: 'ringan',
    penggerak: 'omni',
    senjata: 'api',
    sensor: 'termal',
    armor: 'ringan'
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
        type: 'RoboArena/HPMusuhRendah',
        pos: [270, 160],
        size: [190, 70],
        properties: { ambang: 40 },
        widgets_values: [40],
        inputs: [{ name: 'in', type: 'flow', link: 1 }],
        outputs: [
          { name: 'YA', type: 'flow', links: [2] },
          { name: 'TIDAK', type: 'flow', links: [3] }
        ]
      },
      {
        id: 3,
        type: 'RoboArena/FokusMusuhTerlemah',
        pos: [520, 100],
        size: [190, 50],
        inputs: [{ name: 'in', type: 'flow', link: 2 }]
      },
      {
        id: 4,
        type: 'RoboArena/MusuhLumpuh',
        pos: [520, 220],
        size: [180, 70],
        inputs: [{ name: 'in', type: 'flow', link: 3 }],
        outputs: [
          { name: 'YA', type: 'flow', links: [4] },
          { name: 'TIDAK', type: 'flow', links: [5] }
        ]
      },
      {
        id: 5,
        type: 'RoboArena/GerakKeMusuh',
        pos: [770, 180],
        size: [170, 50],
        inputs: [{ name: 'in', type: 'flow', link: 4 }]
      },
      {
        id: 6,
        type: 'RoboArena/JarakMusuhKurangDari',
        pos: [770, 280],
        size: [210, 80],
        properties: { jarak: 150 },
        widgets_values: [150],
        inputs: [{ name: 'in', type: 'flow', link: 5 }],
        outputs: [
          { name: 'YA', type: 'flow', links: [6] },
          { name: 'TIDAK', type: 'flow', links: [7] }
        ]
      },
      {
        id: 7,
        type: 'RoboArena/Tembak',
        pos: [1040, 250],
        size: [160, 50],
        inputs: [{ name: 'in', type: 'flow', link: 6 }]
      },
      {
        id: 8,
        type: 'RoboArena/GerakKeMusuh',
        pos: [1040, 330],
        size: [170, 50],
        inputs: [{ name: 'in', type: 'flow', link: 7 }]
      }
    ],
    links: [
      [1, 1, 0, 2, 0, 'flow'],
      [2, 2, 0, 3, 0, 'flow'],
      [3, 2, 1, 4, 0, 'flow'],
      [4, 4, 0, 5, 0, 'flow'],
      [5, 4, 1, 6, 0, 'flow'],
      [6, 6, 0, 7, 0, 'flow'],
      [7, 6, 1, 8, 0, 'flow']
    ]
  }
};
