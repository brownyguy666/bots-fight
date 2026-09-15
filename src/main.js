import { initBengkel, refreshBengkel } from './bengkel/bengkel.js';
import { initEditor, loadCurrentRobotBrain, resizeEditorCanvas, filterPaletteForMission, loadCustomBrain } from './editor/editor.js';
import { initTutorial } from './editor/tutorial.js';
import { TournamentManager } from './turnamen/bracket.js';
import { Arena3D } from './game3d/Arena3D.js';
import { QuickTest3D } from './game3d/QuickTest3D.js';
import { getAllRobots, getActiveRobot, getRobotById } from './data/storage.js';
import { SFX } from './audio/sfx.js';
import { MISSIONS, getMissionProgress, markMissionCompleted, evaluateMissionMatch, getAllowedBlocksForMission } from './data/missions.js';
import { DashboardPanitia } from './panitia/dashboard.js';

// State global aplikasi
let activeTab = 'bengkel';
let arenaGame = null;
let quickTestGame = null;
let tournamentManager = null;
let panitiaDashboard = null;
let currentTournamentMatchCallback = null;
let activeMission = null;
let matchTimerInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupAudioAndTutorial();

  // Inisialisasi Modul Bengkel & Editor
  initBengkel({
    onRobotChanged: (bot) => {
      updateActiveBotPill(bot);
      loadCurrentRobotBrain();
    }
  });

  initEditor({
    onQuickTest: (bot) => {
      openQuickTestDrawer(bot);
    }
  });

  // Inisialisasi Turnamen
  const tourContainer = document.getElementById('tournament-container');
  if (tourContainer) {
    tournamentManager = new TournamentManager(tourContainer, {
      onStartMatch: (config) => {
        currentTournamentMatchCallback = config.onFinished;
        switchTab('arena');
        launchArenaMatch(config.teamA, config.teamB, true);
      }
    });
  }

  setupArenaControls();
  updateActiveBotPill(getActiveRobot());

  // Tampilkan panduan pemula jika pertama kali buka
  setTimeout(() => initTutorial(false), 800);
});

function updateActiveBotPill(bot) {
  const pill = document.getElementById('header-active-bot-name');
  if (pill && bot) pill.textContent = bot.namaRobot;
}

/**
 * Setup Navigasi Tab
 */
function setupNavigation() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      SFX.playClick();
      const target = btn.getAttribute('data-tab');
      switchTab(target);
    });
  });
}

export function switchTab(target) {
  activeTab = target;

  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-tab') === target);
  });

  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.toggle('active', p.id === `panel-${target}`);
  });

  if (target === 'bengkel') {
    refreshBengkel();
  } else if (target === 'editor') {
    loadCurrentRobotBrain();
    requestAnimationFrame(() => {
      resizeEditorCanvas();
    });
    setTimeout(resizeEditorCanvas, 100);
  } else if (target === 'misi') {
    renderMissionUI();
  } else if (target === 'arena') {
    if (!arenaGame) {
      renderArenaTeamSetup();
    }
  } else if (target === 'turnamen') {
    if (tournamentManager) tournamentManager.init();
  } else if (target === 'panitia') {
    const panitiaCont = document.getElementById('panitia-dashboard-container');
    if (panitiaCont) {
      panitiaDashboard = new DashboardPanitia(panitiaCont);
    }
  }
}

/**
 * Setup Audio & Tutorial Header Buttons
 */
function setupAudioAndTutorial() {
  const btnSound = document.getElementById('btn-sound-toggle');
  if (btnSound) {
    btnSound.addEventListener('click', () => {
      const isMuted = SFX.toggleMute();
      btnSound.textContent = isMuted ? '🔇' : '🔊';
    });
  }

  const btnTut = document.getElementById('btn-tutorial-trigger');
  if (btnTut) {
    btnTut.addEventListener('click', () => {
      SFX.playClick();
      initTutorial(true);
    });
  }

  // Quick test drawer close
  const btnCloseQuick = document.getElementById('btn-close-quick-test');
  if (btnCloseQuick) {
    btnCloseQuick.addEventListener('click', closeQuickTestDrawer);
  }

  // Match result modal close
  const btnCloseResult = document.getElementById('btn-close-result-modal');
  if (btnCloseResult) {
    btnCloseResult.addEventListener('click', () => {
      SFX.playClick();
      document.getElementById('match-result-modal').classList.remove('active');
    });
  }
}

/**
 * Laci Quick Test
 */
function openQuickTestDrawer(bot) {
  const drawer = document.getElementById('quick-test-drawer');
  if (!drawer) return;
  drawer.classList.add('open');
  if (quickTestGame) {
    quickTestGame.destroy();
  }
  quickTestGame = new QuickTest3D('quick-test-three-container', bot);
}

function closeQuickTestDrawer() {
  const drawer = document.getElementById('quick-test-drawer');
  if (!drawer) return;
  drawer.classList.remove('open');
  if (quickTestGame) {
    quickTestGame.destroy();
    quickTestGame = null;
  }
}

/**
 * Kontrol & Setup Arena Simulasi
 */
function setupArenaControls() {
  const matchSizeSelect = document.getElementById('arena-match-size');
  if (matchSizeSelect) {
    matchSizeSelect.addEventListener('change', () => {
      SFX.playClick();
      renderArenaTeamSetup();
    });
  }

  const btnStartMatch = document.getElementById('btn-start-arena-match');
  if (btnStartMatch) {
    btnStartMatch.addEventListener('click', () => {
      SFX.playClick();
      const teamA = getSelectedTeamRobots('team-a');
      const teamB = getSelectedTeamRobots('team-b');
      launchArenaMatch(teamA, teamB, false);
    });
  }

  const btnStop = document.getElementById('btn-arena-stop');
  if (btnStop) {
    btnStop.addEventListener('click', () => {
      SFX.playClick();
      stopArenaMatch();
    });
  }

  // Speed controls
  document.querySelectorAll('.btn-speed').forEach(btn => {
    btn.addEventListener('click', () => {
      SFX.playClick();
      document.querySelectorAll('.btn-speed').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const speed = parseFloat(btn.getAttribute('data-speed'));
      if (arenaGame) {
        arenaGame.setSpeed(speed);
      }
    });
  });

  // Sistem Kamera 3D (Fase 12 & 28)
  const camModeSelect = document.getElementById('arena-camera-mode-select');
  const camTargetSelect = document.getElementById('arena-camera-target-select');

  if (camModeSelect && camTargetSelect) {
    camModeSelect.addEventListener('change', () => {
      SFX.playClick();
      const mode = camModeSelect.value;
      camTargetSelect.style.display = mode === 'cinematic' ? 'none' : 'inline-block';
      if (arenaGame) {
        arenaGame.setCameraMode(mode, camTargetSelect.value || null);
      }
    });

    camTargetSelect.addEventListener('change', () => {
      SFX.playClick();
      if (arenaGame) {
        arenaGame.setCameraMode(camModeSelect.value, camTargetSelect.value);
      }
    });
  }

  // Debug Buttons Modul 2
  const dbgWeapon = document.getElementById('dbg-break-weapon');
  if (dbgWeapon) {
    dbgWeapon.onclick = () => {
      if (arenaGame && arenaGame.robots[0]) {
        arenaGame.robots[0].robotState.parts.senjata.hp = 0;
        SFX.playExplosion();
      }
    };
  }

  const dbgLimp = document.getElementById('dbg-limp');
  if (dbgLimp) {
    dbgLimp.onclick = () => {
      if (arenaGame && arenaGame.robots[0]) {
        const p = arenaGame.robots[0].robotState.parts.penggerak;
        p.hp = p.hpMax * 0.4;
        SFX.playHit();
      }
    };
  }

  const dbgParalyze = document.getElementById('dbg-paralyze');
  if (dbgParalyze) {
    dbgParalyze.onclick = () => {
      if (arenaGame && arenaGame.robots[0]) {
        arenaGame.robots[0].robotState.parts.penggerak.hp = 0;
        SFX.playExplosion();
      }
    };
  }
}

function renderArenaTeamSetup() {
  const sizeSelect = document.getElementById('arena-match-size');
  const count = sizeSelect ? parseInt(sizeSelect.value) : 3;
  const allRobots = getAllRobots();

  const renderSlots = (containerId, prefix) => {
    const el = document.getElementById(containerId);
    if (!el) return;
    let html = '';
    for (let i = 0; i < count; i++) {
      html += `
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:12px; color:var(--text-muted); width:50px;">Slot ${i + 1}:</span>
          <select class="team-robot-select" data-slot="${prefix}_${i}">
            ${allRobots.map((r, idx) => `
              <option value="${r.id}" ${idx % allRobots.length === i % allRobots.length ? 'selected' : ''}>
                ${r.namaRobot} (${r.loadout?.senjata || 'meriam'})
              </option>
            `).join('')}
          </select>
        </div>
      `;
    }
    el.innerHTML = html;
  };

  renderSlots('team-a-slots', 'a');
  renderSlots('team-b-slots', 'b');
}

function getSelectedTeamRobots(containerId) {
  const container = document.getElementById(`${containerId}-slots`);
  if (!container) return [];
  const selects = container.querySelectorAll('select');
  const robots = [];
  selects.forEach(sel => {
    const r = getRobotById(sel.value);
    if (r) robots.push(JSON.parse(JSON.stringify(r)));
  });
  return robots;
}

function launchArenaMatch(teamA, teamB, isTournament = false, missionConfig = null) {
  document.getElementById('arena-setup-panel').style.display = 'none';
  document.getElementById('arena-active-panel').style.display = 'flex';

  if (arenaGame) {
    arenaGame.destroy();
    arenaGame = null;
  }

  // Baca opsi arena, mode, kualitas, seed
  const mapSelect = document.getElementById('arena-map-select');
  const modeSelect = document.getElementById('arena-mode-select');
  const qualitySelect = document.getElementById('arena-quality-select');
  const seedInput = document.getElementById('arena-seed-input');

  const selectedMapVal = missionConfig?.arenaPreset || (mapSelect ? mapSelect.value : 'arena_kosong');
  const selectedMode = missionConfig?.mode || (modeSelect ? modeSelect.value : 'eliminasi');
  const selectedQuality = qualitySelect ? qualitySelect.value : 'high';
  const seed = seedInput ? seedInput.value.trim() : 'ROBO-TURNAMEN-01';

  const matchConfig = {
    teamA,
    teamB,
    mode: selectedMode,
    quality: selectedQuality,
    seed
  };

  if (selectedMapVal.startsWith('procedural_')) {
    matchConfig.procedural = true;
    matchConfig.proceduralMode = selectedMapVal === 'procedural_tournament' ? 'tournament' : 'casual';
  } else {
    matchConfig.arenaId = selectedMapVal;
  }

  arenaGame = new Arena3D('arena-three-container', matchConfig, (resultData) => {
    if (activeMission) {
      // Evaluasi hasil misi (Fase 23)
      const currentBot = teamA[0];
      const evalResult = evaluateMissionMatch(activeMission, currentBot.brain, resultData.recordedEvents, resultData.winningTeam);
      if (evalResult.passed) {
        markMissionCompleted(activeMission.id);
        SFX.playVictory();
        alert(`🎉 LULUS MISI!\n${evalResult.reason}`);
      } else {
        alert(`⚠️ MISI BELUM LULUS:\n${evalResult.reason}`);
      }
      activeMission = null;
      filterPaletteForMission(null); // Buka kembali seluruh palet
    }

    showMatchResultModal(resultData, isTournament);
    if (currentTournamentMatchCallback) {
      const cb = currentTournamentMatchCallback;
      currentTournamentMatchCallback = null;
      setTimeout(() => cb(resultData), 1500);
    }
  });

  // Pilihan kamera
  const camTargetSelect = document.getElementById('arena-camera-target-select');
  const camModeSelect = document.getElementById('arena-camera-mode-select');
  if (camTargetSelect && arenaGame.robots) {
    camTargetSelect.innerHTML = arenaGame.robots.map(r => `
      <option value="${r.robotState.id}">
        ${r.robotState.team === 'teamA' ? '🔵' : '🔴'} ${r.robotState.namaRobot}
      </option>
    `).join('');
    if (arenaGame.robots.length > 0) {
      arenaGame.selectedRobotId = arenaGame.robots[0].robotState.id;
    }
  }

  if (camModeSelect && camTargetSelect) {
    arenaGame.setCameraMode(camModeSelect.value, camTargetSelect.value || null);
    camTargetSelect.style.display = camModeSelect.value === 'cinematic' ? 'none' : 'inline-block';
  }

  startMatchTimerDisplay();
}

function startMatchTimerDisplay() {
  clearInterval(matchTimerInterval);
  const timerEl = document.getElementById('arena-match-timer');
  let timeLeft = 120;

  matchTimerInterval = setInterval(() => {
    if (!arenaGame) {
      clearInterval(matchTimerInterval);
      return;
    }
    if (arenaGame.matchTime !== undefined) {
      timeLeft = Math.max(0, Math.ceil(arenaGame.matchTime));
    } else {
      timeLeft = Math.max(0, timeLeft - 1);
    }

    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    if (timerEl) {
      timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    if (timeLeft <= 0 || arenaGame.matchEnded) {
      clearInterval(matchTimerInterval);
    }
  }, 500);
}

function stopArenaMatch() {
  clearInterval(matchTimerInterval);
  if (arenaGame) {
    arenaGame.destroy();
    arenaGame = null;
  }
  document.getElementById('arena-active-panel').style.display = 'none';
  document.getElementById('arena-setup-panel').style.display = 'block';
  renderArenaTeamSetup();
}

function showMatchResultModal(data, isTournament) {
  const modal = document.getElementById('match-result-modal');
  const titleEl = document.getElementById('result-title');
  const reasonEl = document.getElementById('result-reason');
  const statsList = document.getElementById('result-stats-list');

  const winA = data.winningTeam === 'A';
  const isDraw = data.winningTeam === 'DRAW';

  titleEl.textContent = isDraw ? 'HASIL PERTANDINGAN SERI!' : (winA ? 'TIM BIRU MENANG!' : 'TIM MERAH MENANG!');
  titleEl.style.color = isDraw ? '#f59e0b' : (winA ? '#00f0ff' : '#ff3366');
  reasonEl.textContent = `Pertandingan berakhir pada tick ${data.ticks || 0}`;

  statsList.innerHTML = `
    <div style="font-size:13px; color:var(--text-muted); line-height:1.6;">
      <p>Simulasi berjalan deterministik berbasis Clock 150ms.</p>
      <p>Hasil resmi telah disimpan ke Papan Peringkat Turnamen.</p>
    </div>
  `;

  modal.classList.add('active');
}

/**
 * Mode Belajar Berjenjang (Fase 23)
 */
function renderMissionUI() {
  const container = document.getElementById('misi-grid-container');
  const summaryEl = document.getElementById('misi-progress-summary');
  if (!container) return;

  const progress = getMissionProgress();
  const completedCount = progress.completedMissionIds.length;
  if (summaryEl) summaryEl.textContent = `${completedCount} / ${MISSIONS.length} Misi Selesai`;

  container.innerHTML = MISSIONS.map((m, idx) => {
    const isCompleted = progress.completedMissionIds.includes(m.id);
    const isUnlocked = idx === 0 || progress.completedMissionIds.includes(MISSIONS[idx - 1].id);

    return `
      <div class="misi-card ${isCompleted ? 'completed' : isUnlocked ? 'unlocked' : 'locked'}">
        <div class="misi-card-header">
          <span class="misi-number">Misi #${m.nomor}</span>
          <span class="misi-status-badge">
            ${isCompleted ? '✅ Selesai' : isUnlocked ? '🔓 Terbuka' : '🔒 Terkunci'}
          </span>
        </div>
        <h3 class="misi-title">${m.judul}</h3>
        <p class="misi-desc">${m.deskripsi}</p>
        
        <div class="misi-reqs">
          <strong>Konsep Utama:</strong>
          <span class="misi-tags">${(m.requiredNodes || []).join(', ')}</span>
        </div>

        <div class="misi-actions">
          ${isUnlocked ? `
            <button class="btn btn-primary btn-start-mission" data-mission-id="${m.id}" style="width:100%;">
              ${m.buggyInitialBrain ? '🛠️ Mulai Tantangan Debug' : '🚀 Kerjakan Misi Ini'}
            </button>
          ` : `
            <button class="btn btn-secondary" disabled style="width:100%;">Selesaikan Misi Sebelumnya</button>
          `}
        </div>
      </div>
    `;
  }).join('');

  // Pasang listener tombol mulai misi
  container.querySelectorAll('.btn-start-mission').forEach(btn => {
    btn.addEventListener('click', () => {
      const mId = btn.dataset.missionId;
      const mission = MISSIONS.find(m => m.id === mId);
      if (!mission) return;

      activeMission = mission;
      const mIdx = MISSIONS.indexOf(mission);
      const allowedBlocks = getAllowedBlocksForMission(mIdx);

      // Batasi palet editor
      filterPaletteForMission(allowedBlocks);

      // Jika ada buggy initial brain (Misi 8 Debugging)
      if (mission.buggyInitialBrain) {
        loadCustomBrain(mission.buggyInitialBrain);
      }

      // Beri opsi: Langsung simulasi atau rancang di editor dulu
      const goToEditor = confirm(`Misi "${mission.judul}" diaktifkan!\n\nApakah kamu ingin merancang pohon keputusan di Editor terlebih dahulu?\n(Pilih Batal untuk langsung menguji pertempuran di Arena)`);

      if (goToEditor) {
        switchTab('editor');
      } else {
        switchTab('arena');
        const playerBot = getActiveRobot();
        launchArenaMatch([playerBot], [mission.musuhPreset], false, mission);
      }
    });
  });
}
