/**
 * RoboArena - Mode Pembelajaran Berjenjang (Fase 23)
 * Berisi 8 misi kurikulum bertahap. Verifikasi kemenangan tidak hanya mengecek
 * hasil match, tetapi juga memastikan konsep/node yang dipelajari benar-benar digunakan.
 */

export const MISSIONS = [
  {
    id: 'misi_1_tembak',
    nomor: 1,
    judul: 'Misi 1: Lihat dan Tembak',
    deskripsi: 'Pelajari dasar sistem sensor dan senjata. Buat robot menembak jika ada musuh yang terdeteksi di depannya!',
    arenaPreset: 'arena_kosong',
    mode: 'eliminasi',
    blokDibuka: ['Root', 'MusuhTerlihat', 'Tembak', 'Diam'],
    requiredNodes: ['MusuhTerlihat', 'Tembak'],
    requiredEvents: ['condition_evaluated:MusuhTerlihat', 'action_executed:Tembak'],
    musuhPreset: {
      id: 'bot_target_latih',
      namaRobot: 'Target Dummy',
      loadout: { rangka: 'ringan', penggerak: 'roda', senjata: 'meriam', sensor: 'kosong', armor: 'kosong' },
      brain: {
        nodes: [
          { id: 1, type: 'RoboArena/Root', pos: [50, 100], outputs: [{ name: 'Alur', type: 'flow', links: [1] }] },
          { id: 2, type: 'RoboArena/Diam', pos: [250, 100], inputs: [{ name: 'in', type: 'flow', link: 1 }] }
        ],
        links: [[1, 1, 0, 2, 0, 'flow']]
      }
    }
  },

  {
    id: 'misi_2_mendekat',
    nomor: 2,
    judul: 'Misi 2: Mendekati Sasaran',
    deskripsi: 'Musuh berada di luar jarak jangkau senjata! Gunakan Gerak ke Musuh saat musuh masih jauh, lalu tembak saat sudah dekat.',
    arenaPreset: 'arena_kosong',
    mode: 'eliminasi',
    blokDibuka: ['GerakKeMusuh', 'JarakMusuhKurangDari'],
    requiredNodes: ['GerakKeMusuh', 'JarakMusuhKurangDari'],
    requiredEvents: ['condition_evaluated:JarakMusuhKurangDari', 'action_executed:GerakKeMusuh'],
    musuhPreset: {
      id: 'bot_sniper_statis',
      namaRobot: 'Sniper Menjauh',
      loadout: { rangka: 'ringan', penggerak: 'roda', senjata: 'meriam', sensor: 'jauh', armor: 'ringan' },
      brain: {
        nodes: [
          { id: 1, type: 'RoboArena/Root', pos: [50, 100], outputs: [{ name: 'Alur', type: 'flow', links: [1] }] },
          { id: 2, type: 'RoboArena/Tembak', pos: [250, 100], inputs: [{ name: 'in', type: 'flow', link: 1 }] }
        ],
        links: [[1, 1, 0, 2, 0, 'flow']]
      }
    }
  },

  {
    id: 'misi_3_jaga_jarak',
    nomor: 3,
    judul: 'Misi 3: Jaga Jarak Aman',
    deskripsi: 'Musuh bertipe penabrak sedang melaju kencang ke arahmu! Gunakan Mundur dari Musuh saat ia terlalu dekat agar tidak terkena tabrakan.',
    arenaPreset: 'arena_kosong',
    mode: 'eliminasi',
    blokDibuka: ['Mundur'],
    requiredNodes: ['Mundur'],
    requiredEvents: ['action_executed:Mundur'],
    musuhPreset: {
      id: 'bot_rammer',
      namaRobot: 'Banteng Tabrak',
      loadout: { rangka: 'berat', penggerak: 'roda', senjata: 'meriam', sensor: 'pendek', armor: 'sedang' },
      brain: {
        nodes: [
          { id: 1, type: 'RoboArena/Root', pos: [50, 100], outputs: [{ name: 'Alur', type: 'flow', links: [1] }] },
          { id: 2, type: 'RoboArena/GerakKeMusuh', pos: [250, 100], inputs: [{ name: 'in', type: 'flow', link: 1 }] }
        ],
        links: [[1, 1, 0, 2, 0, 'flow']]
      }
    }
  },

  {
    id: 'misi_4_bertahan',
    nomor: 4,
    judul: 'Misi 4: Bertahan Hidup',
    deskripsi: 'Ketahui batas kekuatan robotmu. Manfaatkan kondisi HP Rangka < % atau Armor Habis untuk beralih ke mode bertahan atau mencari perlindungan.',
    arenaPreset: 'arena_berbatu',
    mode: 'eliminasi',
    blokDibuka: ['HPKurangDari', 'ArmorHabis'],
    requiredNodes: ['HPKurangDari'],
    requiredEvents: ['condition_true:HPKurangDari'],
    musuhPreset: {
      id: 'bot_petarung',
      namaRobot: 'Penembak Agresif',
      loadout: { rangka: 'sedang', penggerak: 'kaki', senjata: 'meriam', sensor: 'pendek', armor: 'ringan' },
      brain: {
        nodes: [
          { id: 1, type: 'RoboArena/Root', pos: [50, 100], outputs: [{ name: 'Alur', type: 'flow', links: [1] }] },
          { id: 2, type: 'RoboArena/MusuhTerlihat', pos: [240, 100], inputs: [{ name: 'in', type: 'flow', link: 1 }], outputs: [{ name: 'YA', type: 'flow', links: [2] }, { name: 'TIDAK', type: 'flow', links: [3] }] },
          { id: 3, type: 'RoboArena/Tembak', pos: [480, 70], inputs: [{ name: 'in', type: 'flow', link: 2 }] },
          { id: 4, type: 'RoboArena/GerakKeMusuh', pos: [480, 140], inputs: [{ name: 'in', type: 'flow', link: 3 }] }
        ],
        links: [[1, 1, 0, 2, 0, 'flow'], [2, 2, 0, 3, 0, 'flow'], [3, 2, 1, 4, 0, 'flow']]
      }
    }
  },

  {
    id: 'misi_5_kerusakan',
    nomor: 5,
    judul: 'Misi 5: Respon Kerusakan Part',
    deskripsi: 'Musuh memiliki senjata peluru perusak. Gunakan Senjata Rusak atau Penggerak Lumpuh untuk beralih ke serangan tabrakan saat senjata hancur!',
    arenaPreset: 'arena_berbatu',
    mode: 'eliminasi',
    blokDibuka: ['SenjataRusak', 'PenggerakRusak', 'PenggerakPincang', 'SensorRusak', 'Tabrak', 'IsiUlang'],
    requiredNodes: ['SenjataRusak', 'Tabrak'],
    requiredEvents: ['condition_evaluated:SenjataRusak'],
    musuhPreset: {
      id: 'bot_flamethrower',
      namaRobot: 'Penyembur Api',
      loadout: { rangka: 'sedang', penggerak: 'omni', senjata: 'api', sensor: '360', armor: 'ringan' },
      brain: {
        nodes: [
          { id: 1, type: 'RoboArena/Root', pos: [50, 100], outputs: [{ name: 'Alur', type: 'flow', links: [1] }] },
          { id: 2, type: 'RoboArena/GerakKeMusuh', pos: [250, 100], inputs: [{ name: 'in', type: 'flow', link: 1 }] }
        ],
        links: [[1, 1, 0, 2, 0, 'flow']]
      }
    }
  },

  {
    id: 'misi_6_kerjasama',
    nomor: 6,
    judul: 'Misi 6: Kerja Sama & Sinyal Bantuan',
    deskripsi: 'Pertarungan 2 lawan 2! Pasang logika Sekutu Minta Bantuan atau Lindungi Sekutu agar kawan yang terluka tidak dihabisi sendirian.',
    arenaPreset: 'arena_berpasir',
    mode: 'eliminasi',
    blokDibuka: ['SekutuDekat', 'SekutuMintaBantuan', 'LindungiSekutu', 'FokusMusuhTerlemah', 'TimUntung'],
    requiredNodes: ['SekutuMintaBantuan', 'LindungiSekutu'],
    requiredEvents: ['action_executed:LindungiSekutu'],
    musuhPreset: {
      id: 'bot_duo_musuh',
      namaRobot: 'Pasukan Gurun',
      loadout: { rangka: 'ringan', penggerak: 'melayang', senjata: 'laser', sensor: 'termal', armor: 'ringan' },
      brain: {
        nodes: [
          { id: 1, type: 'RoboArena/Root', pos: [50, 100], outputs: [{ name: 'Alur', type: 'flow', links: [1] }] },
          { id: 2, type: 'RoboArena/Tembak', pos: [250, 100], inputs: [{ name: 'in', type: 'flow', link: 1 }] }
        ],
        links: [[1, 1, 0, 2, 0, 'flow']]
      }
    }
  },

  {
    id: 'misi_7_objektif',
    nomor: 7,
    judul: 'Misi 7: Kuasai Bukit (KOTH)',
    deskripsi: 'Bukan sekadar baku tembak! Kuasai area bukit tengah menggunakan Di Zona Hill dan Kuasai Hill untuk memenangkan skor waktu kontrol.',
    arenaPreset: 'arena_berbatu',
    mode: 'koth',
    blokDibuka: ['DiZonaHill', 'TimUnggulDiHill', 'KuasaiHill', 'SedangBawaFlag', 'FlagMusuhTerlihat', 'GerakKeFlagMusuh', 'KembaliKeBase'],
    requiredNodes: ['DiZonaHill', 'KuasaiHill'],
    requiredEvents: ['condition_true:DiZonaHill', 'action_executed:KuasaiHill'],
    musuhPreset: {
      id: 'bot_penjaga_hill',
      namaRobot: 'Penjaga Bukit',
      loadout: { rangka: 'berat', penggerak: 'rantai', senjata: 'meriam', sensor: '360', armor: 'berat' },
      brain: {
        nodes: [
          { id: 1, type: 'RoboArena/Root', pos: [50, 100], outputs: [{ name: 'Alur', type: 'flow', links: [1] }] },
          { id: 2, type: 'RoboArena/KuasaiHill', pos: [250, 100], inputs: [{ name: 'in', type: 'flow', link: 1 }] }
        ],
        links: [[1, 1, 0, 2, 0, 'flow']]
      }
    }
  },

  {
    id: 'misi_8_debugging',
    nomor: 8,
    judul: 'Misi 8: Ujian Debugging (Tantangan)',
    deskripsi: 'Robot ini memiliki kesalahan logika fatal! Gunakan tombol JEDA dan TICK BERIKUTNYA untuk memeriksa alur keputusan, perbaiki brain-nya, dan kalahkan musuh.',
    arenaPreset: 'arena_berbatu',
    mode: 'eliminasi',
    blokDibuka: ['Root', 'MusuhTerlihat', 'JarakMusuhKurangDari', 'HPKurangDari', 'GerakKeMusuh', 'Mundur', 'Tembak', 'Diam', 'Tabrak'],
    requiredNodes: ['MusuhTerlihat', 'Tembak', 'GerakKeMusuh'],
    requiredEvents: ['action_executed:Tembak', 'action_executed:GerakKeMusuh'],
    buggyInitialBrain: {
      // Brain salah: jika MusuhTerlihat malah Mundur, jika Tidak Terlihat malah Tembak ke dinding
      nodes: [
        { id: 1, type: 'RoboArena/Root', pos: [50, 150], outputs: [{ name: 'Alur', type: 'flow', links: [1] }] },
        { id: 2, type: 'RoboArena/MusuhTerlihat', pos: [240, 130], inputs: [{ name: 'in', type: 'flow', link: 1 }], outputs: [{ name: 'YA', type: 'flow', links: [2] }, { name: 'TIDAK', type: 'flow', links: [3] }] },
        { id: 3, type: 'RoboArena/Mundur', pos: [480, 90], inputs: [{ name: 'in', type: 'flow', link: 2 }] },
        { id: 4, type: 'RoboArena/Tembak', pos: [480, 180], inputs: [{ name: 'in', type: 'flow', link: 3 }] }
      ],
      links: [
        [1, 1, 0, 2, 0, 'flow'],
        [2, 2, 0, 3, 0, 'flow'],
        [3, 2, 1, 4, 0, 'flow']
      ]
    },
    musuhPreset: {
      id: 'bot_patroli_batu',
      namaRobot: 'Patroli Reruntuhan',
      loadout: { rangka: 'sedang', penggerak: 'kaki', senjata: 'meriam', sensor: 'pendek', armor: 'ringan' },
      brain: {
        nodes: [
          { id: 1, type: 'RoboArena/Root', pos: [50, 100], outputs: [{ name: 'Alur', type: 'flow', links: [1] }] },
          { id: 2, type: 'RoboArena/MusuhTerlihat', pos: [240, 100], inputs: [{ name: 'in', type: 'flow', link: 1 }], outputs: [{ name: 'YA', type: 'flow', links: [2] }, { name: 'TIDAK', type: 'flow', links: [3] }] },
          { id: 3, type: 'RoboArena/Tembak', pos: [480, 70], inputs: [{ name: 'in', type: 'flow', link: 2 }] },
          { id: 4, type: 'RoboArena/GerakKeMusuh', pos: [480, 150], inputs: [{ name: 'in', type: 'flow', link: 3 }] }
        ],
        links: [[1, 1, 0, 2, 0, 'flow'], [2, 2, 0, 3, 0, 'flow'], [3, 2, 1, 4, 0, 'flow']]
      }
    }
  }
];

const STORAGE_KEY = 'roboarena_misi_progress';

/**
 * Membaca data progres misi tersimpan
 */
export function getMissionProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && data.version === 1 && Array.isArray(data.completedMissionIds)) {
        return data;
      }
    }
  } catch (e) {
    console.error('Gagal membaca data progres misi:', e);
  }

  return {
    version: 1,
    completedMissionIds: []
  };
}

/**
 * Menyimpan data progres misi yang berhasil diselesaikan
 */
export function markMissionCompleted(missionId) {
  const progress = getMissionProgress();
  if (!progress.completedMissionIds.includes(missionId)) {
    progress.completedMissionIds.push(missionId);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
      console.error('Gagal menyimpan progres misi:', e);
    }
  }
  return progress;
}

/**
 * Evaluasi hasil match mode misi
 * Memastikan tim pemain menang DAN seluruh kriteria konsep terpenuhi.
 * 
 * @param {Object} mission - Objek misi dari MISSIONS
 * @param {Object} robotBrain - Brain robot pemain yang diuji
 * @param {Set|Array} matchEvents - Catatan event selama match (misal ['condition_evaluated:MusuhTerlihat', ...])
 * @param {string} winningTeam - 'A' atau 'B' (Tim pemain selalu 'A')
 * @returns {Object} { passed: boolean, reason: string }
 */
export function evaluateMissionMatch(mission, robotBrain, matchEvents, winningTeam) {
  if (winningTeam !== 'A') {
    return {
      passed: false,
      reason: 'Robotmu kalah dalam pertempuran. Periksa kembali taktik atau rancangan komponen!'
    };
  }

  // 1. Verifikasi apakah node wajib ada di dalam brain
  if (mission.requiredNodes && robotBrain && robotBrain.nodes) {
    const brainTypes = robotBrain.nodes.map(n => n.type ? n.type.replace('RoboArena/', '') : '');
    for (const reqNode of mission.requiredNodes) {
      if (!brainTypes.includes(reqNode)) {
        return {
          passed: false,
          reason: `Konsep belum diterapkan: Pohon keputusanmu belum memuat blok [${reqNode}]!`
        };
      }
    }
  }

  // 2. Verifikasi apakah event wajib terjadi selama jalannya match
  const eventSet = new Set(matchEvents || []);
  if (mission.requiredEvents) {
    for (const reqEvt of mission.requiredEvents) {
      if (!eventSet.has(reqEvt)) {
        return {
          passed: false,
          reason: `Blok logika terpasang tetapi belum terpicu dalam simulasi (${reqEvt}). Pastikan kondisi logika dapat terpenuhi!`
        };
      }
    }
  }

  return {
    passed: true,
    reason: `Selamat! Misi ${mission.judul} berhasil diselesaikan dengan konsep yang tepat!`
  };
}

/**
 * Mengembalikan daftar semua blok yang sudah terbuka berdasarkan progres misi saat ini
 */
export function getAllowedBlocksForMission(missionIndex) {
  const allowed = new Set(['Root', 'MusuhTerlihat', 'Tembak', 'Diam']);
  for (let i = 0; i <= missionIndex && i < MISSIONS.length; i++) {
    const m = MISSIONS[i];
    if (m.blokDibuka) {
      m.blokDibuka.forEach(b => allowed.add(b));
    }
  }
  return Array.from(allowed);
}
