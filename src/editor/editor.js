import { LGraph, LGraphCanvas, LiteGraph } from 'litegraph.js';
import 'litegraph.js/css/litegraph.css';
import { registerCustomNodes } from './nodes.js';
import {
  getActiveRobot,
  saveRobot,
  exportRobotJSON,
  importRobotJSON,
  getAllRobots,
  setActiveRobotId
} from '../data/storage.js';
import { PRESET_ROBOTS } from '../data/preset_brains/presets.js';
import { SFX } from '../audio/sfx.js';
import { BLOCK_DESCRIPTIONS } from '../data/block_descriptions.js';

let graph = null;
let canvas = null;
let onQuickTestCallback = null;

export function resizeEditorCanvas() {
  const container = document.getElementById('editor-canvas-container');
  const canvasEl = document.getElementById('litegraph-canvas');
  if (!container || !canvasEl || !canvas) return;

  const rect = container.getBoundingClientRect();
  const width = Math.floor(rect.width);
  const height = Math.floor(rect.height);

  if (width > 50 && height > 50) {
    if (canvasEl.width !== width || canvasEl.height !== height) {
      canvasEl.width = width;
      canvasEl.height = height;
      canvasEl.style.width = width + 'px';
      canvasEl.style.height = height + 'px';
      canvas.resize(width, height);
      canvas.setDirty(true, true);
      canvas.draw(true, true);
    }
  }
}

export function initEditor({ onQuickTest } = {}) {
  onQuickTestCallback = onQuickTest;
  registerCustomNodes();

  const container = document.getElementById('editor-canvas-container');
  if (!container) return;

  const canvasEl = document.getElementById('litegraph-canvas');
  if (!canvasEl) return;

  const rect = container.getBoundingClientRect();
  const initW = Math.floor(rect.width) || 1100;
  const initH = Math.floor(rect.height) || 680;
  canvasEl.width = initW;
  canvasEl.height = initH;
  canvasEl.style.width = initW + 'px';
  canvasEl.style.height = initH + 'px';

  graph = new LGraph();
  canvas = new LGraphCanvas(canvasEl, graph);

  // Styling tema dark neon untuk LiteGraph Canvas
  canvas.background_color = '#090d16';
  canvas.clear_background = true;
  canvas.render_canvas_border = false;
  canvas.round_radius = 8;
  canvas.highquality_render = true;

  // ResizeObserver untuk mendeteksi perubahan ukuran wadah secara live (termasuk saat tab berpindah)
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => {
      resizeEditorCanvas();
    });
    ro.observe(container);
  }

  window.addEventListener('resize', () => {
    resizeEditorCanvas();
  });

  setupPalette();
  setupToolbar();
  loadCurrentRobotBrain();

  setTimeout(() => {
    resizeEditorCanvas();
  }, 120);
}

export function getGraphSerialized() {
  if (!graph) return null;
  return graph.serialize();
}

/**
 * Muat pohon keputusan dari profil robot yang aktif saat ini
 */
export function loadCurrentRobotBrain() {
  if (!graph) return;
  const active = getActiveRobot();
  if (!active) return;

  // Perbarui indikator robot aktif di toolbar editor
  const nameEl = document.getElementById('editor-active-robot-name');
  if (nameEl) nameEl.textContent = active.namaRobot;

  if (active.brain && active.brain.nodes && active.brain.nodes.length > 0) {
    graph.configure(active.brain);
  } else {
    // Muat default root jika kosong
    graph.clear();
    const root = LiteGraph.createNode('RoboArena/Root');
    root.pos = [80, 200];
    graph.add(root);
  }

  // Pastikan selalu ada node Root
  ensureRootNode();
  canvas.draw(true, true);
}

function ensureRootNode() {
  if (!graph) return;
  const hasRoot = graph._nodes.some(n => n.type === 'RoboArena/Root');
  if (!hasRoot) {
    const root = LiteGraph.createNode('RoboArena/Root');
    root.pos = [80, 200];
    graph.add(root);
  }
}

/**
 * Setup daftar palet node yang dapat di-klik atau di-drag
 */
function setupPalette() {
  const paletteEl = document.getElementById('editor-palette-list');
  if (!paletteEl) return;

  const categories = [
    {
      title: 'Mulai Di Sini',
      nodes: [
        { type: 'RoboArena/Root', label: '🚩 Titik Awal (Root)', locked: true }
      ]
    },
    {
      title: 'Kondisi Taktis (Modul 4)',
      nodes: [
        { type: 'RoboArena/MusuhLumpuh', label: '⚡ Musuh Lumpuh?' },
        { type: 'RoboArena/HPMusuhRendah', label: '🩸 HP Musuh Rendah?' },
        { type: 'RoboArena/TimUntung', label: '⚖️ Tim Unggul?' },
        { type: 'RoboArena/WaktuHampirHabis', label: '⏳ Waktu Kritis?' }
      ]
    },
    {
      title: 'Kondisi Dasar',
      nodes: [
        { type: 'RoboArena/MusuhTerlihat', label: '👁️ Musuh Terlihat?' },
        { type: 'RoboArena/JarakMusuhKurangDari', label: '📏 Jarak Musuh < X' },
        { type: 'RoboArena/HPKurangDari', label: '❤️ HP Rangka < %' },
        { type: 'RoboArena/AmunisiHabis', label: '🔋 Amunisi Habis?' },
        { type: 'RoboArena/SekutuDekat', label: '🤝 Sekutu Dekat?' }
      ]
    },
    {
      title: 'Kondisi Part Rusak (Modul 2)',
      nodes: [
        { type: 'RoboArena/SenjataRusak', label: '💥 Senjata Rusak?' },
        { type: 'RoboArena/PenggerakRusak', label: '🛑 Penggerak Lumpuh?' },
        { type: 'RoboArena/PenggerakPincang', label: '⚠️ Penggerak Pincang?' },
        { type: 'RoboArena/SensorRusak', label: '📡 Sensor Rusak?' },
        { type: 'RoboArena/ArmorHabis', label: '🛡️ Armor Habis?' }
      ]
    },
    {
      title: 'Aksi Tempur',
      nodes: [
        { type: 'RoboArena/GerakKeMusuh', label: '⚔️ Gerak ke Musuh' },
        { type: 'RoboArena/Mundur', label: '🏃 Mundur dari Musuh' },
        { type: 'RoboArena/Tembak', label: '🎯 Tembak' },
        { type: 'RoboArena/Diam', label: '🛑 Diam / Bertahan' },
        { type: 'RoboArena/GerakKeTitik', label: '📍 Gerak ke Titik' },
        { type: 'RoboArena/IsiUlang', label: '🔄 Isi Ulang' },
        { type: 'RoboArena/Tabrak', label: '💥 Tabrak Musuh' },
        { type: 'RoboArena/FokusMusuhTerlemah', label: '🎯 Fokus Musuh Terlemah' },
        { type: 'RoboArena/LindungiSekutu', label: '🛡️ Lindungi Sekutu' }
      ]
    }
  ];

  let html = '';
  categories.forEach(cat => {
    html += `<div class="palette-category">
      <div class="palette-category-title">${cat.title}</div>
      <div class="palette-items">`;
    cat.nodes.forEach(node => {
      const lockedClass = node.locked ? ' locked-root' : '';
      const lockIcon = node.locked ? ' 🔒' : '';
      html += `<button class="palette-item-btn${lockedClass}" data-type="${node.type}" ${node.locked ? 'data-locked="true"' : ''}>
        ${node.label}${lockIcon}
      </button>`;
    });
    html += `</div></div>`;
  });

  paletteEl.innerHTML = html;

  // Tooltip element melayang
  let tooltipEl = document.getElementById('palette-tooltip');
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'palette-tooltip';
    document.body.appendChild(tooltipEl);
  }

  function positionTooltip(e) {
    const x = e.clientX + 16;
    const y = e.clientY - 10;
    const rect = tooltipEl.getBoundingClientRect();
    const maxX = window.innerWidth - (rect.width || 270) - 16;
    const maxY = window.innerHeight - (rect.height || 120) - 16;
    tooltipEl.style.left = `${Math.min(x, maxX)}px`;
    tooltipEl.style.top = `${Math.max(10, Math.min(y, maxY))}px`;
  }

  // Event handler tambah node & tooltip
  paletteEl.querySelectorAll('.palette-item-btn').forEach(btn => {
    const type = btn.getAttribute('data-type');
    const isLocked = btn.getAttribute('data-locked') === 'true';

    btn.addEventListener('click', () => {
      SFX.playClick();
      if (isLocked) {
        showToast('Node Titik Awal (Root) sudah ada di kanvas dan tidak bisa dihapus atau ditambah lagi! 🔒');
        if (graph && canvas) {
          const root = graph._nodes.find(n => n.type === 'RoboArena/Root');
          if (root) {
            canvas.selectNode(root);
            canvas.ds.offset[0] = -root.pos[0] + canvas.canvas.width / 3;
            canvas.ds.offset[1] = -root.pos[1] + canvas.canvas.height / 2;
            canvas.setDirty(true, true);
          }
        }
        return;
      }
      addNodeToCanvas(type);
    });

    btn.addEventListener('mouseenter', (e) => {
      const desc = BLOCK_DESCRIPTIONS[type];
      if (!desc) return;
      tooltipEl.innerHTML = `
        <div class="tooltip-title">${desc.name}</div>
        <div class="tooltip-desc">${desc.desc}</div>
        <div class="tooltip-example"><strong>💡 Contoh:</strong> ${desc.example}</div>
      `;
      tooltipEl.classList.add('show');
      positionTooltip(e);
    });

    btn.addEventListener('mousemove', (e) => {
      positionTooltip(e);
    });

    btn.addEventListener('mouseleave', () => {
      tooltipEl.classList.remove('show');
    });
  });
}

function addNodeToCanvas(type) {
  if (!graph || !canvas) return;
  const node = LiteGraph.createNode(type);
  if (!node) return;

  // Letakkan di sekitar tengah area pandang saat ini
  const center = canvas.convertCanvasToOffset([canvas.canvas.width / 2, canvas.canvas.height / 2]);
  node.pos = [
    center[0] - 80 + (Math.random() * 40 - 20),
    center[1] - 40 + (Math.random() * 40 - 20)
  ];

  graph.add(node);
  canvas.selectNode(node);
  canvas.draw(true, true);
}

/**
 * Setup toolbar action buttons
 */
function setupToolbar() {
  const btnSave = document.getElementById('btn-save-brain');
  const btnExport = document.getElementById('btn-export-robot');
  const btnImport = document.getElementById('btn-import-robot');
  const fileImportInput = document.getElementById('file-import-robot');
  const btnQuickTest = document.getElementById('btn-quick-test');
  const selectPreset = document.getElementById('select-preset-brain');
  const btnClear = document.getElementById('btn-clear-brain');

  // 1. Simpan Otak ke Profil Robot Aktif
  if (btnSave) {
    btnSave.addEventListener('click', () => {
      SFX.playClick();
      const active = getActiveRobot();
      if (!active) return;

      active.brain = graph.serialize();
      saveRobot(active);
      showToast(`Otak robot "${active.namaRobot}" berhasil disimpan!`);
    });
  }

  // 2. EKSPOR SKEMA TERPADU (Wajib melalui storage.js)
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      SFX.playClick();
      const active = getActiveRobot();
      if (!active) return;

      // Update brain terbaru sebelum diekspor
      active.brain = graph.serialize();
      saveRobot(active);

      // Ekspor via storage.js yang menyertakan { namaRobot, loadout, brain }
      exportRobotJSON(active);
      showToast(`Mengunduh file robot "${active.namaRobot}"...`);
    });
  }

  // 3. IMPOR SKEMA TERPADU (Wajib melalui storage.js)
  if (btnImport && fileImportInput) {
    btnImport.addEventListener('click', () => {
      SFX.playClick();
      fileImportInput.value = '';
      fileImportInput.click();
    });

    fileImportInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedRobot = importRobotJSON(event.target.result);
          loadCurrentRobotBrain();
          showToast(`Berhasil mengimpor robot "${importedRobot.namaRobot}"!`);
        } catch (err) {
          alert('Gagal mengimpor file: ' + err.message);
        }
      };
      reader.readAsText(file);
    });
  }

  // 4. Muat Preset Cepat
  if (selectPreset) {
    selectPreset.innerHTML = '<option value="">-- Muat Preset Contoh --</option>' +
      PRESET_ROBOTS.map(p => `<option value="${p.id}">${p.namaRobot}</option>`).join('');

    selectPreset.addEventListener('change', (e) => {
      const presetId = e.target.value;
      if (!presetId) return;

      SFX.playClick();
      const found = PRESET_ROBOTS.find(p => p.id === presetId);
      if (found && confirm(`Muat logika otak dari preset "${found.namaRobot}"?`)) {
        graph.configure(JSON.parse(JSON.stringify(found.brain)));
        ensureRootNode();
        canvas.draw(true, true);
        showToast(`Preset "${found.namaRobot}" berhasil dimuat!`);
      }
      e.target.value = '';
    });
  }

  // 5. Bersihkan Kanvas (Sisakan Root)
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      SFX.playClick();
      if (confirm('Bersihkan semua node di kanvas?')) {
        graph.clear();
        ensureRootNode();
        canvas.draw(true, true);
      }
    });
  }

  // 6. Tes Cepat (Quick Test)
  if (btnQuickTest) {
    btnQuickTest.addEventListener('click', () => {
      SFX.playClick();
      const active = getActiveRobot();
      if (active) {
        active.brain = graph.serialize();
        saveRobot(active);
      }
      if (onQuickTestCallback) {
        onQuickTestCallback(active);
      }
    });
  }
}

function showToast(msg) {
  let toast = document.getElementById('robo-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'robo-toast';
    toast.className = 'robo-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}
