import { PARTS, calculateTotalStats } from '../data/parts.js';
import {
  getAllRobots,
  getActiveRobot,
  saveRobot,
  createNewRobot,
  duplicateRobot,
  deleteRobot,
  setActiveRobotId
} from '../data/storage.js';
import { RobotPreview3D } from './preview3d.js';
import { SFX } from '../audio/sfx.js';

let preview = null;
let currentRobot = null;
let onRobotChangedCallback = null;

export function initBengkel({ onRobotChanged } = {}) {
  onRobotChangedCallback = onRobotChanged;

  const previewWrapper = document.getElementById('bengkel-preview-wrapper');
  if (previewWrapper) {
    preview = new RobotPreview3D(previewWrapper);
  }

  currentRobot = getActiveRobot();
  setupRobotSelector();
  renderSlots();
  updateStats();
  setupActionButtons();
}

export function refreshBengkel() {
  currentRobot = getActiveRobot();
  setupRobotSelector();
  renderSlots();
  updateStats();
}

function setupRobotSelector() {
  const selectEl = document.getElementById('bengkel-select-robot');
  if (!selectEl) return;

  const all = getAllRobots();
  selectEl.innerHTML = all.map(r => `
    <option value="${r.id}" ${currentRobot && currentRobot.id === r.id ? 'selected' : ''}>
      ${r.namaRobot}
    </option>
  `).join('');

  selectEl.onchange = (e) => {
    SFX.playClick();
    const id = e.target.value;
    setActiveRobotId(id);
    currentRobot = getActiveRobot();
    renderSlots();
    updateStats();
    if (onRobotChangedCallback) onRobotChangedCallback(currentRobot);
  };

  const nameInput = document.getElementById('bengkel-robot-name-input');
  if (nameInput && currentRobot) {
    nameInput.value = currentRobot.namaRobot;
    nameInput.oninput = (e) => {
      if (currentRobot) {
        currentRobot.namaRobot = e.target.value || 'Robot';
      }
    };
  }
}

function renderSlots() {
  if (!currentRobot) return;
  const loadout = currentRobot.loadout || {};

  const slots = [
    { key: 'rangka', title: '1. Rangka (Chassis)', icon: '🛡️', wajib: true },
    { key: 'penggerak', title: '2. Penggerak', icon: '⚙️', wajib: true },
    { key: 'senjata', title: '3. Senjata', icon: '🎯', wajib: true },
    { key: 'sensor', title: '4. Sensor Radar', icon: '📡', wajib: false },
    { key: 'armor', title: '5. Armor Tambahan', icon: '🔰', wajib: false }
  ];

  const container = document.getElementById('bengkel-slots-container');
  if (!container) return;

  let html = '';
  slots.forEach(slot => {
    const currentVal = loadout[slot.key] || (slot.wajib ? Object.keys(PARTS[slot.key])[0] : 'kosong');
    const partOptions = PARTS[slot.key];
    const currentPart = partOptions[currentVal] || partOptions[Object.keys(partOptions)[0]];

    html += `
      <div class="slot-card" data-slot="${slot.key}">
        <div class="slot-card-header">
          <span class="slot-card-title">${slot.icon} ${slot.title}</span>
          ${slot.wajib ? '<span class="badge-wajib">Wajib</span>' : '<span class="badge-opsi">Opsional</span>'}
        </div>
        <div class="slot-current-name">${currentPart.nama}</div>
        <div class="slot-current-desc">${currentPart.deskripsi}</div>
        <div class="slot-options-row">
          ${Object.values(partOptions).map(opt => `
            <button class="btn-slot-option ${opt.id === currentVal ? 'selected' : ''}" 
                    data-slot="${slot.key}" data-id="${opt.id}">
              ${opt.label || opt.nama.replace(/^(Rangka|Penggerak|Senjata|Sensor|Armor)\s+/i, '')}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  // Event listener tombol opsi part
  container.querySelectorAll('.btn-slot-option').forEach(btn => {
    btn.addEventListener('click', () => {
      SFX.playClick();
      const slotKey = btn.getAttribute('data-slot');
      const partId = btn.getAttribute('data-id');

      if (!currentRobot.loadout) currentRobot.loadout = {};
      currentRobot.loadout[slotKey] = partId;

      renderSlots();
      updateStats();
    });
  });

  // Perbarui preview 2D
  if (preview) {
    preview.setLoadout(currentRobot.loadout);
  }
}

function updateStats() {
  if (!currentRobot) return;
  const stats = calculateTotalStats(currentRobot.loadout);

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setVal('stat-total-hp', stats.totalHP);
  setVal('stat-speed', `${stats.effectiveSpeed} px/s`);
  setVal('stat-sensor', `${stats.sensorRange} px`);
  setVal('stat-weapon', `${stats.weaponDamage} (${stats.weaponType})`);
  setVal('stat-armor', `${stats.armorAbsorption}% Absorpsi`);

  // Update progress bars jika ada
  const setBar = (id, percent) => {
    const el = document.getElementById(id);
    if (el) el.style.width = `${Math.min(100, percent)}%`;
  };

  setBar('bar-hp', (stats.totalHP / 500) * 100);
  setBar('bar-speed', (stats.effectiveSpeed / 180) * 100);
  setBar('bar-sensor', (stats.sensorRange / 500) * 100);
  setBar('bar-armor', stats.armorAbsorption * 2);

  if (preview) {
    preview.setLoadout(currentRobot.loadout);
  }
}

function setupActionButtons() {
  const btnSave = document.getElementById('bengkel-btn-save');
  const btnNew = document.getElementById('bengkel-btn-new');
  const btnDup = document.getElementById('bengkel-btn-dup');
  const btnDel = document.getElementById('bengkel-btn-del');

  if (btnSave) {
    btnSave.addEventListener('click', () => {
      SFX.playClick();
      if (!currentRobot) return;
      saveRobot(currentRobot);
      setupRobotSelector();
      showToast(`Konfigurasi "${currentRobot.namaRobot}" tersimpan!`);
      if (onRobotChangedCallback) onRobotChangedCallback(currentRobot);
    });
  }

  if (btnNew) {
    btnNew.addEventListener('click', () => {
      SFX.playClick();
      const nama = prompt('Nama robot baru:', `Mech ${Date.now().toString().slice(-4)}`);
      if (nama && nama.trim()) {
        const created = createNewRobot(nama.trim());
        currentRobot = created;
        setupRobotSelector();
        renderSlots();
        updateStats();
        if (onRobotChangedCallback) onRobotChangedCallback(currentRobot);
      }
    });
  }

  if (btnDup) {
    btnDup.addEventListener('click', () => {
      SFX.playClick();
      if (!currentRobot) return;
      const dup = duplicateRobot(currentRobot.id);
      if (dup) {
        currentRobot = dup;
        setupRobotSelector();
        renderSlots();
        updateStats();
        if (onRobotChangedCallback) onRobotChangedCallback(currentRobot);
      }
    });
  }

  if (btnDel) {
    btnDel.addEventListener('click', () => {
      SFX.playClick();
      if (!currentRobot) return;
      if (confirm(`Yakin ingin menghapus robot "${currentRobot.namaRobot}"?`)) {
        deleteRobot(currentRobot.id);
        currentRobot = getActiveRobot();
        setupRobotSelector();
        renderSlots();
        updateStats();
        if (onRobotChangedCallback) onRobotChangedCallback(currentRobot);
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
