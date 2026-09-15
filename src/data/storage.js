import { PRESET_ROBOTS } from './preset_brains/presets.js';

const STORAGE_KEY = 'roboarena_robots_v1';
const ACTIVE_ROBOT_KEY = 'roboarena_active_robot_id';

/**
 * Validasi dan inisialisasi penyimpanan localStorage
 */
export function getAllRobots() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Inisialisasi awal dengan preset bawaan
      localStorage.setItem(STORAGE_KEY, JSON.stringify(PRESET_ROBOTS));
      return [...PRESET_ROBOTS];
    }
    let parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(PRESET_ROBOTS));
      return [...PRESET_ROBOTS];
    }

    // Pastikan semua 8 preset bawaan selalu tersedia dan tersinkronisasi ke versi terbaru
    let updated = false;
    PRESET_ROBOTS.forEach(preset => {
      const idx = parsed.findIndex(r => r.id === preset.id);
      if (idx === -1) {
        parsed.push(JSON.parse(JSON.stringify(preset)));
        updated = true;
      } else {
        // Selalu sinkronkan otak dan loadout preset bawaan ke versi terbaru
        parsed[idx].brain = JSON.parse(JSON.stringify(preset.brain));
        parsed[idx].loadout = JSON.parse(JSON.stringify(preset.loadout));
        updated = true;
      }
    });

    if (updated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }

    return parsed;
  } catch (err) {
    console.error('Gagal membaca localStorage roboarena:', err);
    return [...PRESET_ROBOTS];
  }
}

export function getRobotById(id) {
  const all = getAllRobots();
  return all.find(r => r.id === id) || all[0] || null;
}

export function getActiveRobot() {
  const activeId = localStorage.getItem(ACTIVE_ROBOT_KEY);
  const all = getAllRobots();
  if (activeId) {
    const found = all.find(r => r.id === activeId);
    if (found) return found;
  }
  if (all.length > 0) {
    localStorage.setItem(ACTIVE_ROBOT_KEY, all[0].id);
    return all[0];
  }
  return null;
}

export function setActiveRobotId(id) {
  localStorage.setItem(ACTIVE_ROBOT_KEY, id);
}

export function saveRobot(robot) {
  if (!robot || !robot.namaRobot) {
    throw new Error('Data robot tidak valid: namaRobot wajib diisi.');
  }

  const all = getAllRobots();
  const id = robot.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `robot_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`);

  // Jika robot ini dijadikan Komandan, lepas status komandan dari robot lain (max 1 komandan per tim)
  if (robot.isKomandan) {
    all.forEach(r => {
      if (r.id !== id) r.isKomandan = false;
    });
  }

  const cleanRobot = {
    id,
    namaRobot: robot.namaRobot.trim(),
    isKomandan: !!robot.isKomandan,
    loadout: robot.loadout || {
      rangka: 'sedang',
      penggerak: 'roda',
      senjata: 'meriam',
      sensor: 'kosong',
      armor: 'kosong'
    },
    brain: robot.brain || null,
    createdAt: robot.createdAt || Date.now(),
    updatedAt: Date.now()
  };

  const existingIndex = all.findIndex(r => r.id === id);
  if (existingIndex >= 0) {
    all[existingIndex] = cleanRobot;
  } else {
    all.push(cleanRobot);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  setActiveRobotId(id);
  return cleanRobot;
}

export function createNewRobot(nama = 'Robot Baru') {
  const newRobot = {
    id: `robot_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    namaRobot: nama,
    loadout: {
      rangka: 'sedang',
      penggerak: 'roda',
      senjata: 'meriam',
      sensor: 'kosong',
      armor: 'kosong'
    },
    brain: PRESET_ROBOTS[0].brain,
    updatedAt: Date.now()
  };
  return saveRobot(newRobot);
}

export function duplicateRobot(id) {
  const source = getRobotById(id);
  if (!source) return null;

  const clone = {
    ...JSON.parse(JSON.stringify(source)),
    id: `robot_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    namaRobot: `${source.namaRobot} (Salinan)`,
    updatedAt: Date.now()
  };
  return saveRobot(clone);
}

export function deleteRobot(id) {
  let all = getAllRobots();
  all = all.filter(r => r.id !== id);
  if (all.length === 0) {
    all = [...PRESET_ROBOTS];
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  localStorage.setItem(ACTIVE_ROBOT_KEY, all[0].id);
  return all;
}

/**
 * EKSPOR SKEMA TERPADU:
 * Menghasilkan file JSON dengan skema pembungkus tunggal { namaRobot, loadout, brain }
 */
export function exportRobotJSON(robot) {
  if (!robot) return;

  const payload = {
    namaRobot: robot.namaRobot,
    loadout: robot.loadout || null,
    brain: robot.brain || null,
    exportedAt: new Date().toISOString(),
    version: 1
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = robot.namaRobot.replace(/[^a-zA-Z0-9_-]/g, '_');
  a.href = url;
  a.download = `roboarena_${safeName}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * IMPOR SKEMA TERPADU:
 * Membaca file JSON, memvalidasi skema pembungkus, dan menyimpannya ke storage
 */
export function importRobotJSON(jsonString) {
  try {
    const data = JSON.parse(jsonString);

    // Deteksi jika file adalah skema pembungkus atau brain mentah
    let namaRobot = data.namaRobot || 'Robot Impor';
    let loadout = data.loadout;
    let brain = data.brain;

    // Kompatibilitas jika user mengimpor file LiteGraph mentah (punya nodes & links langsung)
    if (!brain && data.nodes && data.links) {
      brain = data;
    }

    if (!loadout) {
      loadout = {
        rangka: 'sedang',
        penggerak: 'roda',
        senjata: 'meriam',
        sensor: 'kosong',
        armor: 'kosong'
      };
    }

    const importedRobot = {
      id: `robot_import_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      namaRobot,
      loadout,
      brain,
      updatedAt: Date.now()
    };

    saveRobot(importedRobot);
    return importedRobot;
  } catch (err) {
    console.error('Format berkas robot tidak valid:', err);
    throw new Error('Berkas JSON tidak sesuai format RoboArena.');
  }
}

export function getStoredRobots() {
  return getAllRobots();
}

export function saveStoredRobots(robots) {
  if (Array.isArray(robots)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(robots));
  }
}
