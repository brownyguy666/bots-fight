import { initBengkel, refreshBengkel } from './bengkel/bengkel.js';
import { initEditor, loadCurrentRobotBrain, resizeEditorCanvas } from './editor/editor.js';
import { initTutorial } from './editor/tutorial.js';
import { TournamentManager } from './turnamen/bracket.js';
import { Arena3D } from './game3d/Arena3D.js';
import { QuickTest3D } from './game3d/QuickTest3D.js';
import { getAllRobots, getActiveRobot, getRobotById } from './data/storage.js';
import { SFX } from './audio/sfx.js';

// State global aplikasi
let activeTab = 'bengkel';
let arenaGame = null;
let quickTestGame = null;
let tournamentManager = null;
let currentTournamentMatchCallback = null;
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
        // Alihkan ke tab Arena dan jalankan match turnamen
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

function switchTab(target) {
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
  } else if (target === 'arena') {
    if (!arenaGame) {
      renderArenaTeamSetup();
    }
  } else if (target === 'turnamen') {
    if (tournamentManager) tournamentManager.init();
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

  // Sistem Kamera 3D (Fase 12)
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
      if (arenaGame) arenaGame.debugBreakFirstBotWeapon();
    };
  }

  const dbgLimp = document.getElementById('dbg-limp');
  if (dbgLimp) {
    dbgLimp.onclick = () => {
      if (arenaGame) arenaGame.debugLimpFirstBot();
    };
  }

  const dbgParalyze = document.getElementById('dbg-paralyze');
  if (dbgParalyze) {
    dbgParalyze.onclick = () => {
      if (arenaGame) arenaGame.debugParalyzeFirstBot();
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

function launchArenaMatch(teamA, teamB, isTournament = false) {
  document.getElementById('arena-setup-panel').style.display = 'none';
  document.getElementById('arena-active-panel').style.display = 'flex';

  if (arenaGame) {
    arenaGame.destroy();
    arenaGame = null;
  }

  arenaGame = new Arena3D('arena-three-container', { teamA, teamB }, (data) => {
    showMatchResultModal(data, isTournament);
    if (currentTournamentMatchCallback) {
      const cb = currentTournamentMatchCallback;
      currentTournamentMatchCallback = null;
      setTimeout(() => cb(data), 1500);
    }
  });

  // Isi dropdown pilihan target kamera
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

  // Timer countdown HUD
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

  titleEl.textContent = data.title;
  titleEl.style.color = data.title.includes('Biru') ? '#00f0ff' : '#ff3366';
  reasonEl.textContent = data.reason;

  statsList.innerHTML = data.robots.map(r => `
    <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.06);">
      <span style="color:${r.team === 'teamA' ? '#38bdf8' : '#fb7185'}; font-weight:700;">
        ${r.nama} (${r.team === 'teamA' ? 'Tim Biru' : 'Tim Merah'})
      </span>
      <span>${r.destroyed ? '💥 HANCUR' : `❤️ Sisa HP: ${Math.round(r.hpRangka)}`}</span>
    </div>
  `).join('');

  modal.classList.add('active');
}
