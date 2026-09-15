import { MatchLogManager } from './matchlog.js';
import { getStoredRobots, saveStoredRobots } from '../data/storage.js';
import { getMissionProgress } from '../data/missions.js';
import { createSeededRandom } from '../utils/seededRandom.js';
import { SFX } from '../audio/sfx.js';

/**
 * RoboArena - Dashboard Panitia & Guru (Fase 25)
 * Manajemen turnamen, pencocokan tanding (matchup), leaderboard, timer kelas,
 * cetak kartu robot, dan backup/restore JSON.
 */

export class DashboardPanitia {
  constructor(containerEl) {
    this.container = containerEl;
    this.classTimer = {
      durationSeconds: 15 * 60,
      remainingSeconds: 15 * 60,
      isRunning: false,
      intervalId: null
    };

    this.render();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="panitia-dashboard">
        <!-- Header Sub-Navigasi -->
        <div class="panitia-tabs">
          <button class="tab-btn active" data-sub="leaderboard">🏆 Papan Peringkat</button>
          <button class="tab-btn" data-sub="matchup">🎲 Generator Matchup</button>
          <button class="tab-btn" data-sub="timer">⏱️ Timer Kelas</button>
          <button class="tab-btn" data-sub="cards">🪪 Cetak Kartu Robot</button>
          <button class="tab-btn" data-sub="backup">💾 Backup & Musim</button>
        </div>

        <div class="panitia-content" id="panitia-subcontent">
          <!-- Konten dinamis sub-tab -->
        </div>
      </div>
    `;

    // Pasang listener sub-tab
    const buttons = this.container.querySelectorAll('.panitia-tabs .tab-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.switchSubTab(btn.dataset.sub);
      });
    });

    // Default buka Leaderboard
    this.switchSubTab('leaderboard');
  }

  switchSubTab(subKey) {
    const subContainer = document.getElementById('panitia-subcontent');
    if (!subContainer) return;

    if (subKey === 'leaderboard') this.renderLeaderboard(subContainer);
    else if (subKey === 'matchup') this.renderMatchupGenerator(subContainer);
    else if (subKey === 'timer') this.renderClassTimer(subContainer);
    else if (subKey === 'cards') this.renderRobotCards(subContainer);
    else if (subKey === 'backup') this.renderBackupRestore(subContainer);
  }

  // --- 1. LEADERBOARD ---
  renderLeaderboard(el) {
    const robots = getStoredRobots();
    const stats = MatchLogManager.getLeaderboard(robots);

    el.innerHTML = `
      <div class="panitia-card">
        <div class="panitia-card-header">
          <h3>🏆 Papan Peringkat Turnamen</h3>
          <span class="badge">${stats.length} Robot Bertanding</span>
        </div>
        <p class="desc-text">Statistik agregasi hasil simulasi resmi berdasarkan ID unik robot.</p>

        <div class="table-responsive">
          <table class="panitia-table">
            <thead>
              <tr>
                <th>Peringkat</th>
                <th>Nama Robot</th>
                <th>Tanding</th>
                <th>Menang</th>
                <th>Kalah</th>
                <th>Win Rate</th>
              </tr>
            </thead>
            <tbody>
              ${stats.length === 0 ? '<tr><td colspan="6" class="text-center">Belum ada data pertandingan turnamen.</td></tr>' : ''}
              ${stats.map((s, idx) => `
                <tr class="${idx === 0 && s.won > 0 ? 'rank-gold' : idx === 1 && s.won > 0 ? 'rank-silver' : idx === 2 && s.won > 0 ? 'rank-bronze' : ''}">
                  <td><span class="rank-badge">${idx + 1}</span></td>
                  <td><strong>${s.namaRobot}</strong> <small class="text-muted">(${s.robotId.slice(0, 8)}...)</small></td>
                  <td>${s.played}</td>
                  <td><span class="text-success font-bold">${s.won}</span></td>
                  <td><span class="text-danger">${s.lost}</span></td>
                  <td><span class="badge badge-rate">${s.winRate}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // --- 2. MATCHUP GENERATOR ---
  renderMatchupGenerator(el) {
    const robots = getStoredRobots();

    el.innerHTML = `
      <div class="panitia-card">
        <div class="panitia-card-header">
          <h3>🎲 Generator Bagan Matchup Turnamen</h3>
        </div>
        <p class="desc-text">Pilih peserta turnamen untuk diacak menjadi bagan tanding yang adil. Mendukung BYE otomatis jika jumlah peserta ganjil.</p>

        <div class="matchup-controls">
          <div class="control-row">
            <label>Seed Turnamen (Opsional):</label>
            <input type="text" id="matchup-seed" value="SEMI-FINAL-01" class="input-text">
            <button id="btn-generate-matchup" class="btn btn-primary">⚡ Acak Pertandingan</button>
          </div>
          <div class="robot-selector-box">
            <h4>Pilih Robot Peserta (${robots.length} Tersedia):</h4>
            <div class="robot-checkbox-grid">
              ${robots.map(r => `
                <label class="robot-chk-label">
                  <input type="checkbox" name="matchup-robot" value="${r.id}" checked>
                  ${r.namaRobot}
                </label>
              `).join('')}
            </div>
          </div>
        </div>

        <div id="matchup-results" class="matchup-results-container">
          <!-- Hasil bagan tanding -->
        </div>
      </div>
    `;

    const btn = el.querySelector('#btn-generate-matchup');
    btn.addEventListener('click', () => {
      const seed = el.querySelector('#matchup-seed').value.trim() || 'ROBO-SEED';
      const checkedIds = Array.from(el.querySelectorAll('input[name="matchup-robot"]:checked')).map(c => c.value);
      const selectedBots = robots.filter(r => checkedIds.includes(r.id));
      this.generateMatchups(selectedBots, seed, el.querySelector('#matchup-results'));
    });
  }

  generateMatchups(bots, seed, resultEl) {
    if (bots.length < 2) {
      resultEl.innerHTML = '<p class="text-warning">Pilih minimal 2 robot untuk membuat pertandingan.</p>';
      return;
    }

    const rng = createSeededRandom(seed);
    const shuffled = [...bots];

    // Fisher-Yates shuffle seeded
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = rng.int(0, i);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const pairs = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        pairs.push({ botA: shuffled[i], botB: shuffled[i + 1], bye: false });
      } else {
        pairs.push({ botA: shuffled[i], botB: null, bye: true });
      }
    }

    resultEl.innerHTML = `
      <div class="bracket-list">
        <h4>📋 Bagan Pertandingan (${seed}):</h4>
        <div class="match-pair-grid">
          ${pairs.map((p, idx) => `
            <div class="match-pair-card">
              <div class="match-badge">Match #${idx + 1}</div>
              <div class="pair-row team-a">
                <span class="team-tag tag-blue">Tim Biru</span>
                <span class="bot-name">${p.botA.namaRobot}</span>
              </div>
              <div class="vs-divider">${p.bye ? 'Lolos Otomatis' : 'VS'}</div>
              <div class="pair-row team-b">
                ${p.bye 
                  ? '<span class="text-muted font-italic">🎉 BYE (Langsung ke Ronde Berikutnya)</span>'
                  : `<span class="team-tag tag-red">Tim Merah</span><span class="bot-name">${p.botB.namaRobot}</span>`
                }
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // --- 3. CLASS TIMER ---
  renderClassTimer(el) {
    el.innerHTML = `
      <div class="panitia-card">
        <div class="panitia-card-header">
          <h3>⏱️ Timer Sesi Kelas / Turnamen</h3>
        </div>
        <p class="desc-text">Hitung mundur waktu pembuatan bot atau batas akhir pengumpulan strategi di kelas.</p>

        <div class="timer-display-wrapper" id="timer-fullscreen-target">
          <div class="timer-large-digits" id="class-timer-digits">15:00</div>
          <div class="timer-action-buttons">
            <button id="btn-timer-start" class="btn btn-success">▶️ Mulai</button>
            <button id="btn-timer-pause" class="btn btn-warning">⏸️ Jeda</button>
            <button id="btn-timer-reset" class="btn btn-secondary">🔄 Reset</button>
            <button id="btn-timer-fs" class="btn btn-info">⛶ Layar Penuh</button>
          </div>
          <div class="timer-presets">
            <span>Preset Cepat:</span>
            <button class="btn btn-sm btn-preset" data-min="5">5 Menit</button>
            <button class="btn btn-sm btn-preset" data-min="10">10 Menit</button>
            <button class="btn btn-sm btn-preset" data-min="15">15 Menit</button>
            <button class="btn btn-sm btn-preset" data-min="30">30 Menit</button>
          </div>
        </div>
      </div>
    `;

    const digitsEl = el.querySelector('#class-timer-digits');
    const updateDisplay = () => {
      const m = Math.floor(this.classTimer.remainingSeconds / 60);
      const s = this.classTimer.remainingSeconds % 60;
      digitsEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    el.querySelector('#btn-timer-start').addEventListener('click', () => {
      if (this.classTimer.isRunning) return;
      this.classTimer.isRunning = true;
      this.classTimer.intervalId = setInterval(() => {
        if (this.classTimer.remainingSeconds > 0) {
          this.classTimer.remainingSeconds--;
          updateDisplay();
        } else {
          clearInterval(this.classTimer.intervalId);
          this.classTimer.isRunning = false;
          SFX.playExplosion();
          alert('⏰ WAKTU KELAS TELAH HABIS!');
        }
      }, 1000);
    });

    el.querySelector('#btn-timer-pause').addEventListener('click', () => {
      this.classTimer.isRunning = false;
      clearInterval(this.classTimer.intervalId);
    });

    el.querySelector('#btn-timer-reset').addEventListener('click', () => {
      this.classTimer.isRunning = false;
      clearInterval(this.classTimer.intervalId);
      this.classTimer.remainingSeconds = this.classTimer.durationSeconds;
      updateDisplay();
    });

    el.querySelector('#btn-timer-fs').addEventListener('click', () => {
      const target = el.querySelector('#timer-fullscreen-target');
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        target.requestFullscreen?.();
      }
    });

    el.querySelectorAll('.btn-preset').forEach(b => {
      b.addEventListener('click', () => {
        const mins = parseInt(b.dataset.min, 10);
        this.classTimer.durationSeconds = mins * 60;
        this.classTimer.remainingSeconds = mins * 60;
        updateDisplay();
      });
    });

    updateDisplay();
  }

  // --- 4. ROBOT CARDS (PRINTABLE) ---
  renderRobotCards(el) {
    const robots = getStoredRobots();

    el.innerHTML = `
      <div class="panitia-card">
        <div class="panitia-card-header">
          <h3>🪪 Cetak Kartu Profil Robot</h3>
          <button id="btn-print-cards" class="btn btn-primary">🖨️ Cetak Kartu Sekarang</button>
        </div>
        <p class="desc-text">Kartu spesifikasi fisik dan cuplikan strategi robot untuk arsip kelas atau lembar tanding peserta.</p>

        <div class="cards-preview-grid printable-area">
          ${robots.map(r => `
            <div class="robot-id-card">
              <div class="card-header">
                <span class="bot-badge">${r.isKomandan ? '👑 KOMANDAN' : '🤖 PETARUNG'}</span>
                <span class="bot-card-id">${(r.id || '').slice(0, 8)}</span>
              </div>
              <h4 class="card-title">${r.namaRobot}</h4>
              <div class="card-loadout">
                <div><strong>Rangka:</strong> ${r.loadout?.rangka || '-'}</div>
                <div><strong>Penggerak:</strong> ${r.loadout?.penggerak || '-'}</div>
                <div><strong>Senjata:</strong> ${r.loadout?.senjata || '-'}</div>
                <div><strong>Sensor:</strong> ${r.loadout?.sensor || '-'}</div>
                <div><strong>Armor:</strong> ${r.loadout?.armor || '-'}</div>
              </div>
              <div class="card-brain-summary">
                <strong>Logika:</strong> ${r.brain?.nodes ? `${r.brain.nodes.length} Blok Keputusan` : 'Standar'}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    el.querySelector('#btn-print-cards').addEventListener('click', () => {
      window.print();
    });
  }

  // --- 5. BACKUP & RESTORE & NEW SEASON ---
  renderBackupRestore(el) {
    el.innerHTML = `
      <div class="panitia-card">
        <div class="panitia-card-header">
          <h3>💾 Backup, Pulihkan Data & Musim Baru</h3>
        </div>
        <p class="desc-text">Ekspor seluruh arsip robot, riwayat tanding, dan progres belajar ke dalam satu file JSON resmi.</p>

        <div class="panitia-actions-row">
          <button id="btn-export-backup" class="btn btn-primary">📥 Unduh Backup JSON</button>
          
          <label class="btn btn-secondary">
            📤 Pulihkan dari JSON
            <input type="file" id="input-import-backup" accept=".json" style="display:none;">
          </label>

          <button id="btn-new-season" class="btn btn-danger">⚠️ Mulai Musim Baru (Reset Turnamen)</button>
        </div>

        <div id="backup-status-msg" class="backup-status-area"></div>
      </div>
    `;

    const statusEl = el.querySelector('#backup-status-msg');

    // Export
    el.querySelector('#btn-export-backup').addEventListener('click', () => {
      const backupData = {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        robots: getStoredRobots(),
        matchlog: MatchLogManager.getLogs(),
        missionProgress: getMissionProgress()
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `roboarena-turnamen-${new Date().getFullYear()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      statusEl.innerHTML = '<span class="text-success">✅ File backup turnamen berhasil diunduh.</span>';
    });

    // Import
    el.querySelector('#input-import-backup').addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const parsed = JSON.parse(evt.target.result);
          if (!parsed.schemaVersion || !Array.isArray(parsed.robots)) {
            throw new Error('Format file tidak valid (schemaVersion tidak ditemukan).');
          }

          const confirmed = confirm(
            `Data yang ditemukan:\n` +
            `- ${parsed.robots.length} Robot\n` +
            `- ${parsed.matchlog?.length || 0} Riwayat Pertandingan\n\n` +
            `Apakah Anda yakin ingin memulihkan dan menimpa data saat ini?`
          );

          if (confirmed) {
            saveStoredRobots(parsed.robots);
            if (Array.isArray(parsed.matchlog)) MatchLogManager.saveLogs(parsed.matchlog);
            statusEl.innerHTML = '<span class="text-success">✅ Pemulihan data turnamen berhasil! Silakan muat ulang halaman.</span>';
            setTimeout(() => window.location.reload(), 1200);
          }
        } catch (err) {
          statusEl.innerHTML = `<span class="text-danger">❌ Gagal memulihkan file: ${err.message}</span>`;
        }
      };
      reader.readAsText(file);
    });

    // New Season
    el.querySelector('#btn-new-season').addEventListener('click', () => {
      const confirmText = prompt('Ketik "RESET" untuk mengonfirmasi penghapusan seluruh riwayat turnamen dan memulai musim baru:');
      if (confirmText === 'RESET') {
        MatchLogManager.clearAll();
        statusEl.innerHTML = '<span class="text-warning">🔄 Riwayat turnamen telah direset untuk Musim Baru!</span>';
        setTimeout(() => this.switchSubTab('leaderboard'), 1000);
      }
    });
  }
}
