import { LiteGraph } from 'litegraph.js';

/**
 * Registrasi Custom Nodes LiteGraph untuk RoboArena
 * Seluruh node jarak menggunakan Satuan Arena (Arena Units).
 */

export function registerCustomNodes() {
  // 1. Root Node (Titik Awal Eksekusi)
  function RootNode() {
    this.addOutput('Alur', 'flow');
    this.title = '🚀 MULAI (ROOT)';
    this.color = '#b45309';
    this.bgcolor = '#78350f';
    this.boxcolor = '#f59e0b';
    this.size = [160, 48];
    this.is_root = true;
  }
  RootNode.title = '🚀 Root';
  RootNode.desc = 'Titik awal alur logika robot';
  LiteGraph.registerNodeType('RoboArena/Root', RootNode);

  // Helper untuk Node Kondisi (2 Output: YA & TIDAK)
  function createConditionNodeClass(title, desc, color = '#0284c7', bgcolor = '#0c4a6e', boxcolor = '#38bdf8') {
    function ConditionNode() {
      this.addInput('in', 'flow');
      this.addOutput('YA', 'flow');
      this.addOutput('TIDAK', 'flow');
      this.title = title;
      this.color = color;
      this.bgcolor = bgcolor;
      this.boxcolor = boxcolor;
      this.size = [190, 68];
    }
    ConditionNode.title = title;
    ConditionNode.desc = desc;
    return ConditionNode;
  }

  // Helper untuk Node Aksi (Terminal, Tanpa Output)
  function createActionNodeClass(title, desc, color = '#7e22ce', bgcolor = '#581c87', boxcolor = '#c084fc') {
    function ActionNode() {
      this.addInput('in', 'flow');
      this.title = title;
      this.color = color;
      this.bgcolor = bgcolor;
      this.boxcolor = boxcolor;
      this.size = [170, 48];
    }
    ActionNode.title = title;
    ActionNode.desc = desc;
    return ActionNode;
  }

  // --- CONDITION NODES DASAR ---
  const MusuhTerlihatNode = createConditionNodeClass(
    '👁️ Musuh Terlihat?',
    'Cek apakah ada musuh dalam jangkauan sensor dan LOS bebas'
  );
  LiteGraph.registerNodeType('RoboArena/MusuhTerlihat', MusuhTerlihatNode);

  function JarakMusuhKurangDariNode() {
    this.addInput('in', 'flow');
    this.addOutput('YA', 'flow');
    this.addOutput('TIDAK', 'flow');
    this.title = '📏 Jarak Musuh < X';
    this.color = '#0284c7';
    this.bgcolor = '#0c4a6e';
    this.boxcolor = '#38bdf8';
    this.properties = { jarak: 15 };
    this.addWidget('number', 'Jarak (unit)', 15, val => {
      this.properties.jarak = Number(val);
    }, { min: 2, max: 40, step: 1 });
    this.size = [210, 84];
  }
  LiteGraph.registerNodeType('RoboArena/JarakMusuhKurangDari', JarakMusuhKurangDariNode);

  function HPKurangDariNode() {
    this.addInput('in', 'flow');
    this.addOutput('YA', 'flow');
    this.addOutput('TIDAK', 'flow');
    this.title = '❤️ HP Rangka < %';
    this.color = '#0284c7';
    this.bgcolor = '#0c4a6e';
    this.boxcolor = '#38bdf8';
    this.properties = { persen: 30 };
    this.addWidget('number', 'HP (%)', 30, val => {
      this.properties.persen = Number(val);
    }, { min: 5, max: 95, step: 5 });
    this.size = [200, 84];
  }
  LiteGraph.registerNodeType('RoboArena/HPKurangDari', HPKurangDariNode);

  const AmunisiHabisNode = createConditionNodeClass(
    '🔋 Amunisi Habis?',
    'Cek apakah robot kehabisan peluru'
  );
  LiteGraph.registerNodeType('RoboArena/AmunisiHabis', AmunisiHabisNode);

  function SekutuDekatNode() {
    this.addInput('in', 'flow');
    this.addOutput('YA', 'flow');
    this.addOutput('TIDAK', 'flow');
    this.title = '🤝 Sekutu Dekat?';
    this.color = '#0284c7';
    this.bgcolor = '#0c4a6e';
    this.boxcolor = '#38bdf8';
    this.properties = { jarak: 12 };
    this.addWidget('number', 'Jarak (unit)', 12, val => {
      this.properties.jarak = Number(val);
    }, { min: 2, max: 35, step: 1 });
    this.size = [200, 84];
  }
  LiteGraph.registerNodeType('RoboArena/SekutuDekat', SekutuDekatNode);

  // --- CONDITION NODES MODUL 2 (KERUSAKAN PART) ---
  const SenjataRusakNode = createConditionNodeClass(
    '💥 Senjata Rusak?',
    'Cek apakah senjata robot rusak total (HP = 0)',
    '#b91c1c', '#7f1d1d', '#f87171'
  );
  LiteGraph.registerNodeType('RoboArena/SenjataRusak', SenjataRusakNode);

  const PenggerakRusakNode = createConditionNodeClass(
    '🛑 Penggerak Rusak (Lumpuh)?',
    'Cek apakah kaki/roda robot rusak total (tidak bisa jalan)',
    '#b91c1c', '#7f1d1d', '#f87171'
  );
  LiteGraph.registerNodeType('RoboArena/PenggerakRusak', PenggerakRusakNode);

  const PenggerakPincangNode = createConditionNodeClass(
    '⚠️ Penggerak Pincang?',
    'Cek apakah HP kaki/roda di bawah 60% (jalan melambat 50%)',
    '#d97706', '#92400e', '#fbbf24'
  );
  LiteGraph.registerNodeType('RoboArena/PenggerakPincang', PenggerakPincangNode);

  const SensorRusakNode = createConditionNodeClass(
    '📡 Sensor Rusak?',
    'Cek apakah sensor rusak (radius menyusut drastis)',
    '#d97706', '#92400e', '#fbbf24'
  );
  LiteGraph.registerNodeType('RoboArena/SensorRusak', SensorRusakNode);

  const ArmorHabisNode = createConditionNodeClass(
    '🛡️ Armor Habis?',
    'Cek apakah pelindung armor tambahan sudah hancur total',
    '#475569', '#1e293b', '#94a3b8'
  );
  LiteGraph.registerNodeType('RoboArena/ArmorHabis', ArmorHabisNode);

  // --- CONDITION NODES MODUL 4 (KONDISI TAKTIS) ---
  const MusuhLumpuhNode = createConditionNodeClass(
    '🛑 Musuh Lumpuh?',
    'Cek apakah musuh sedang mogok atau terkena pulsa EMP',
    '#0d9488', '#115e59', '#2dd4bf'
  );
  LiteGraph.registerNodeType('RoboArena/MusuhLumpuh', MusuhLumpuhNode);

  function HPMusuhRendahNode() {
    this.addInput('in', 'flow');
    this.addOutput('YA', 'flow');
    this.addOutput('TIDAK', 'flow');
    this.title = '🎯 HP Musuh < %';
    this.color = '#0d9488';
    this.bgcolor = '#115e59';
    this.boxcolor = '#2dd4bf';
    this.properties = { persen: 30 };
    this.addWidget('number', 'HP (%)', 30, val => {
      this.properties.persen = Number(val);
    }, { min: 5, max: 95, step: 5 });
    this.size = [200, 84];
  }
  LiteGraph.registerNodeType('RoboArena/HPMusuhRendah', HPMusuhRendahNode);

  const TimUntungNode = createConditionNodeClass(
    '⚖️ Tim Untung?',
    'Cek apakah jumlah sekutu hidup lebih banyak dari musuh',
    '#0d9488', '#115e59', '#2dd4bf'
  );
  LiteGraph.registerNodeType('RoboArena/TimUntung', TimUntungNode);

  function WaktuHampirHabisNode() {
    this.addInput('in', 'flow');
    this.addOutput('YA', 'flow');
    this.addOutput('TIDAK', 'flow');
    this.title = '⏳ Waktu < X Detik';
    this.color = '#0d9488';
    this.bgcolor = '#115e59';
    this.boxcolor = '#2dd4bf';
    this.properties = { detik: 30 };
    this.addWidget('number', 'Detik', 30, val => {
      this.properties.detik = Number(val);
    }, { min: 5, max: 90, step: 5 });
    this.size = [200, 84];
  }
  LiteGraph.registerNodeType('RoboArena/WaktuHampirHabis', WaktuHampirHabisNode);

  // --- CONDITION NODES MODUL 5 (OBJEKTIF & KOORDINASI TIM) ---
  const SedangBawaFlagNode = createConditionNodeClass(
    '🚩 Sedang Bawa Flag?',
    'Cek apakah robot sedang membawa bendera musuh (CTF)',
    '#059669', '#064e3b', '#34d399'
  );
  LiteGraph.registerNodeType('RoboArena/SedangBawaFlag', SedangBawaFlagNode);

  const FlagMusuhTerlihatNode = createConditionNodeClass(
    '👁️ Flag Musuh Terlihat?',
    'Cek apakah bendera lawan terlihat dalam jangkauan sensor & LOS',
    '#059669', '#064e3b', '#34d399'
  );
  LiteGraph.registerNodeType('RoboArena/FlagMusuhTerlihat', FlagMusuhTerlihatNode);

  const DiZonaHillNode = createConditionNodeClass(
    '⛰️ Di Zona Hill?',
    'Cek apakah posisi robot berada di dalam zona bukit (KOTH)',
    '#d97706', '#78350f', '#fcd34d'
  );
  LiteGraph.registerNodeType('RoboArena/DiZonaHill', DiZonaHillNode);

  const TimUnggulDiHillNode = createConditionNodeClass(
    '👑 Tim Unggul di Hill?',
    'Cek apakah tim memiliki lebih banyak robot di zona bukit daripada musuh',
    '#d97706', '#78350f', '#fcd34d'
  );
  LiteGraph.registerNodeType('RoboArena/TimUnggulDiHill', TimUnggulDiHillNode);

  function SekutuMintaBantuanNode() {
    this.addInput('in', 'flow');
    this.addOutput('YA', 'flow');
    this.addOutput('TIDAK', 'flow');
    this.title = '🆘 Sekutu Minta Bantuan?';
    this.color = '#e11d48';
    this.bgcolor = '#881337';
    this.boxcolor = '#fb7185';
    this.properties = { radius: 20 };
    this.addWidget('number', 'Radius (unit)', 20, val => {
      this.properties.radius = Number(val);
    }, { min: 5, max: 45, step: 1 });
    this.size = [220, 84];
  }
  LiteGraph.registerNodeType('RoboArena/SekutuMintaBantuan', SekutuMintaBantuanNode);

  const AdaMusuhPrioritasNode = createConditionNodeClass(
    '🎯 Ada Musuh Prioritas?',
    'Cek apakah Komandan menandai musuh prioritas yang masih hidup',
    '#e11d48', '#881337', '#fb7185'
  );
  LiteGraph.registerNodeType('RoboArena/AdaMusuhPrioritas', AdaMusuhPrioritasNode);

  // --- ACTION NODES ---
  const GerakKeMusuhNode = createActionNodeClass(
    '⚔️ Gerak ke Musuh',
    'Maju mendekati posisi musuh terdekat'
  );
  LiteGraph.registerNodeType('RoboArena/GerakKeMusuh', GerakKeMusuhNode);

  const MundurNode = createActionNodeClass(
    '🏃 Mundur dari Musuh',
    'Bergerak menjauhi musuh terdekat untuk menjaga jarak'
  );
  LiteGraph.registerNodeType('RoboArena/Mundur', MundurNode);

  const TembakNode = createActionNodeClass(
    '🎯 Tembak',
    'Tembakkan senjata yang terpasang ke arah musuh terdekat'
  );
  LiteGraph.registerNodeType('RoboArena/Tembak', TembakNode);

  const DiamNode = createActionNodeClass(
    '🛑 Diam / Bertahan',
    'Tahan posisi di tempat, tetap hadapkan turet ke musuh'
  );
  LiteGraph.registerNodeType('RoboArena/Diam', DiamNode);

  function GerakKeTitikNode() {
    this.addInput('in', 'flow');
    this.title = '📍 Gerak ke Titik';
    this.color = '#7e22ce';
    this.bgcolor = '#581c87';
    this.boxcolor = '#c084fc';
    this.properties = { x: 30, y: 20 };
    this.addWidget('number', 'X (unit)', 30, val => {
      this.properties.x = Number(val);
    }, { min: 2, max: 58, step: 1 });
    this.addWidget('number', 'Y (unit)', 20, val => {
      this.properties.y = Number(val);
    }, { min: 2, max: 38, step: 1 });
    this.size = [180, 100];
  }
  LiteGraph.registerNodeType('RoboArena/GerakKeTitik', GerakKeTitikNode);

  const IsiUlangNode = createActionNodeClass(
    '🔄 Isi Ulang Amunisi',
    'Mengisi kembali amunisi saat kosong'
  );
  LiteGraph.registerNodeType('RoboArena/IsiUlang', IsiUlangNode);

  // --- ACTION NODES MODUL 4 ---
  const TabrakNode = createActionNodeClass(
    '💥 Tabrak Musuh',
    'Menabrakkan diri sekuat tenaga ke musuh terdekat',
    '#dc2626', '#991b1b', '#f87171'
  );
  LiteGraph.registerNodeType('RoboArena/Tabrak', TabrakNode);

  const FokusMusuhTerlemahNode = createActionNodeClass(
    '🎯 Fokus Musuh Terlemah',
    'Memburu dan menyerang musuh dengan HP terendah dalam sensor'
  );
  LiteGraph.registerNodeType('RoboArena/FokusMusuhTerlemah', FokusMusuhTerlemahNode);

  const LindungiSekutuNode = createActionNodeClass(
    '🛡️ Lindungi Sekutu',
    'Menjadi tameng di depan teman satu tim yang sekarat atau minta bantuan',
    '#2563eb', '#1e40af', '#60a5fa'
  );
  LiteGraph.registerNodeType('RoboArena/LindungiSekutu', LindungiSekutuNode);

  // --- ACTION NODES MODUL 5 (OBJEKTIF & KOORDINASI TIM) ---
  const SerangMusuhPrioritasNode = createActionNodeClass(
    '⚔️ Serang Musuh Prioritas',
    'Mengejar dan menyerang target prioritas yang ditandai Komandan',
    '#e11d48', '#881337', '#fb7185'
  );
  LiteGraph.registerNodeType('RoboArena/SerangMusuhPrioritas', SerangMusuhPrioritasNode);

  const GerakKeFlagMusuhNode = createActionNodeClass(
    '🚩 Gerak ke Flag Musuh',
    'Menuju ke lokasi bendera tim lawan untuk merebutnya (CTF)',
    '#059669', '#064e3b', '#34d399'
  );
  LiteGraph.registerNodeType('RoboArena/GerakKeFlagMusuh', GerakKeFlagMusuhNode);

  const KembaliKeBaseNode = createActionNodeClass(
    '🏠 Kembali ke Base',
    'Membawa bendera kembali ke pangkalan sendiri untuk mencetak skor (CTF)',
    '#059669', '#064e3b', '#34d399'
  );
  LiteGraph.registerNodeType('RoboArena/KembaliKeBase', KembaliKeBaseNode);

  const KuasaiHillNode = createActionNodeClass(
    '⛰️ Kuasai Zona Hill',
    'Maju dan bertahan di zona bukit tengah (KOTH)',
    '#d97706', '#78350f', '#fcd34d'
  );
  LiteGraph.registerNodeType('RoboArena/KuasaiHill', KuasaiHillNode);
}
