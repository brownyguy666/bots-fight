export const PRESET_PENJAGA_FORMASI = {
  id: 'preset_penjaga_formasi',
  namaRobot: 'Penjaga Formasi',
  loadout: {
    rangka: 'berat',
    penggerak: 'kaki',
    senjata: 'emp',
    sensor: '360',
    armor: 'berat'
  },
  brain: {
    last_node_id: 6,
    last_link_id: 5,
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
        type: 'RoboArena/SekutuDekat',
        pos: [270, 160],
        size: [190, 70],
        properties: { jarak: 220 },
        widgets_values: [220],
        inputs: [{ name: 'in', type: 'flow', link: 1 }],
        outputs: [
          { name: 'YA', type: 'flow', links: [2] },
          { name: 'TIDAK', type: 'flow', links: [3] }
        ]
      },
      {
        id: 3,
        type: 'RoboArena/MusuhTerlihat',
        pos: [520, 110],
        size: [180, 70],
        inputs: [{ name: 'in', type: 'flow', link: 2 }],
        outputs: [
          { name: 'YA', type: 'flow', links: [4] },
          { name: 'TIDAK', type: 'flow', links: [5] }
        ]
      },
      {
        id: 4,
        type: 'RoboArena/LindungiSekutu',
        pos: [520, 240],
        size: [170, 50],
        inputs: [{ name: 'in', type: 'flow', link: 3 }]
      },
      {
        id: 5,
        type: 'RoboArena/Tembak',
        pos: [770, 80],
        size: [160, 50],
        inputs: [{ name: 'in', type: 'flow', link: 4 }]
      },
      {
        id: 6,
        type: 'RoboArena/GerakKeMusuh',
        pos: [770, 160],
        size: [170, 50],
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
};
