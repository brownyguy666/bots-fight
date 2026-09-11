import { getAllRobots, importRobotJSON } from '../data/storage.js';
import { SFX } from '../audio/sfx.js';

/**
 * Pengelola Mode Turnamen & Bagan Bracket (Ajang IT Nobar Mode)
 */

export class TournamentManager {
  constructor(containerEl, { onStartMatch }) {
    this.container = containerEl;
    this.onStartMatch = onStartMatch;
    this.participants = [];
    this.bracket = null; // Struktur babak: rounds: [ [matches], [matches], ... ]
    this.currentMatch = null;
    this.champion = null;
  }

  init() {
    this.loadParticipantsFromStorage();
    this.renderSetup();
  }

  loadParticipantsFromStorage() {
    const all = getAllRobots();
    this.participants = all.slice(0, 8);
    // Jika kurang dari 4, lengkapi dengan duplikat preset
    while (this.participants.length < 4 && all.length > 0) {
      this.participants.push({ ...all[0], id: `${all[0].id}_${Math.random()}`, namaRobot: `${all[0].namaRobot} #${this.participants.length + 1}` });
    }
  }

  renderSetup() {
    this.container.innerHTML = `
      <div class="tournament-setup-view">
        <div class="tournament-header-banner">
          <h2 class="tournament-title">🏆 ARENA TURNAMEN AJANG IT</h2>
          <p class="tournament-subtitle">Mode Bagan Sistem Gugur (Single Elimination) — Tampilan Nobar Layar Proyektor</p>
        </div>

        <div class="tournament-roster-section">
          <div class="roster-header">
            <h3>Daftar Peserta Turnamen (Pilih 4 atau 8 Robot)</h3>
            <div class="roster-actions">
              <button class="btn-secondary" id="tour-upload-files-btn">📂 Unggah Berkas Robot (.json)</button>
              <input type="file" id="tour-multi-file-input" multiple accept=".json" style="display:none;" />
              <button class="btn-primary" id="tour-generate-bracket-btn">🚀 Bentuk Bagan Bracket</button>
            </div>
          </div>

          <div class="roster-grid" id="tour-roster-grid">
            <!-- Diisi lewat JS -->
          </div>
        </div>
      </div>
    `;

    this.renderRosterSelection();
    this.bindSetupEvents();
  }

  renderRosterSelection() {
    const allRobots = getAllRobots();
    const grid = document.getElementById('tour-roster-grid');
    if (!grid) return;

    grid.innerHTML = allRobots.map(r => {
      const isSelected = this.participants.some(p => p.id === r.id);
      return `
        <div class="roster-card ${isSelected ? 'selected' : ''}" data-id="${r.id}">
          <div class="roster-card-header">
            <span class="roster-card-name">${r.namaRobot}</span>
            <input type="checkbox" class="roster-checkbox" ${isSelected ? 'checked' : ''} />
          </div>
          <div class="roster-card-specs">
            <span>Rangka: ${r.loadout?.rangka || 'sedang'}</span> • 
            <span>Senjata: ${r.loadout?.senjata || 'meriam'}</span>
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.roster-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.tagName === 'INPUT') return;
        const cb = card.querySelector('.roster-checkbox');
        cb.checked = !cb.checked;
        this.toggleParticipant(card.getAttribute('data-id'), cb.checked);
      });

      const cb = card.querySelector('.roster-checkbox');
      cb.addEventListener('change', () => {
        this.toggleParticipant(card.getAttribute('data-id'), cb.checked);
      });
    });
  }

  toggleParticipant(id, isSelected) {
    SFX.playClick();
    const all = getAllRobots();
    const found = all.find(r => r.id === id);
    if (!found) return;

    if (isSelected) {
      if (this.participants.length >= 8) {
        alert('Maksimal 8 peserta untuk turnamen saat ini.');
        this.renderRosterSelection();
        return;
      }
      if (!this.participants.some(p => p.id === id)) {
        this.participants.push(found);
      }
    } else {
      this.participants = this.participants.filter(p => p.id !== id);
    }
    this.renderRosterSelection();
  }

  bindSetupEvents() {
    const btnUpload = document.getElementById('tour-upload-files-btn');
    const inputFiles = document.getElementById('tour-multi-file-input');
    const btnGenerate = document.getElementById('tour-generate-bracket-btn');

    if (btnUpload && inputFiles) {
      btnUpload.onclick = () => inputFiles.click();
      inputFiles.onchange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        let loadedCount = 0;
        files.forEach(file => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            try {
              const imported = importRobotJSON(ev.target.result);
              this.participants.push(imported);
              loadedCount++;
              if (loadedCount === files.length) {
                this.renderRosterSelection();
              }
            } catch (err) {
              console.error(err);
            }
          };
          reader.readAsText(file);
        });
      };
    }

    if (btnGenerate) {
      btnGenerate.onclick = () => {
        SFX.playClick();
        if (this.participants.length !== 4 && this.participants.length !== 8) {
          alert(`Pilih tepat 4 atau 8 peserta. Saat ini terpilih: ${this.participants.length} peserta.`);
          return;
        }
        this.generateBracket();
        this.renderBracketView();
      };
    }
  }

  generateBracket() {
    // Acak peserta untuk keadilan bagan
    const shuffled = [...this.participants].sort(() => Math.random() - 0.5);
    const count = shuffled.length;
    const rounds = [];

    // Round 1
    const round1 = [];
    for (let i = 0; i < count; i += 2) {
      round1.push({
        id: `m_r1_${i / 2}`,
        botA: shuffled[i],
        botB: shuffled[i + 1],
        winner: null,
        roundIndex: 0
      });
    }
    rounds.push(round1);

    // Round 2 (Semifinal atau Final)
    const round2 = [];
    for (let i = 0; i < round1.length / 2; i++) {
      round2.push({
        id: `m_r2_${i}`,
        botA: null,
        botB: null,
        winner: null,
        roundIndex: 1
      });
    }
    rounds.push(round2);

    // Jika 8 peserta, tambah Round 3 (Grand Final)
    if (count === 8) {
      rounds.push([{
        id: 'm_final',
        botA: null,
        botB: null,
        winner: null,
        roundIndex: 2
      }]);
    }

    this.bracket = {
      totalParticipants: count,
      rounds: rounds
    };
  }

  renderBracketView() {
    const rounds = this.bracket.rounds;
    const roundNames = rounds.length === 2 
      ? ['BABAK SEMIFINAL', 'GRAND FINAL'] 
      : ['BABAK PEREMPAT FINAL', 'BABAK SEMIFINAL', 'GRAND FINAL'];

    this.container.innerHTML = `
      <div class="tournament-bracket-view">
        <div class="tournament-top-bar">
          <button class="btn-secondary" id="tour-back-btn">⬅️ Kembali ke Roster</button>
          <div class="tour-title-badge">BAGAN PERTANDINGAN AJANG IT</div>
          <button class="btn-primary" id="tour-play-next-btn">⚡ Mainkan Pertandingan Selanjutnya</button>
        </div>

        <div class="bracket-tree-container">
          ${rounds.map((round, rIdx) => `
            <div class="bracket-round-col">
              <div class="bracket-round-title">${roundNames[rIdx]}</div>
              <div class="bracket-matches-list">
                ${round.map(m => `
                  <div class="bracket-match-card ${m.winner ? 'completed' : ''}" data-mid="${m.id}">
                    <div class="bracket-slot ${m.winner && m.winner.id === m.botA?.id ? 'winner' : ''}">
                      <span class="slot-team-dot team-a"></span>
                      <span class="slot-name">${m.botA ? m.botA.namaRobot : 'Menunggu...'}</span>
                    </div>
                    <div class="bracket-slot-vs">VS</div>
                    <div class="bracket-slot ${m.winner && m.winner.id === m.botB?.id ? 'winner' : ''}">
                      <span class="slot-team-dot team-b"></span>
                      <span class="slot-name">${m.botB ? m.botB.namaRobot : 'Menunggu...'}</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>

        <div id="tour-champion-podium" class="tour-champion-podium ${this.champion ? 'active' : ''}">
          ${this.champion ? `
            <div class="podium-content">
              <div class="podium-trophy">🏆</div>
              <div class="podium-label">JUARA TURNAMEN ROBOARENA</div>
              <div class="podium-name">${this.champion.namaRobot}</div>
              <button class="btn-primary" id="tour-restart-btn">Mulai Turnamen Baru</button>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    document.getElementById('tour-back-btn').onclick = () => {
      SFX.playClick();
      this.renderSetup();
    };

    const nextBtn = document.getElementById('tour-play-next-btn');
    if (nextBtn) {
      nextBtn.onclick = () => {
        SFX.playClick();
        this.playNextMatch();
      };
    }

    const restartBtn = document.getElementById('tour-restart-btn');
    if (restartBtn) {
      restartBtn.onclick = () => {
        SFX.playClick();
        this.champion = null;
        this.renderSetup();
      };
    }
  }

  playNextMatch() {
    // Cari match pertama yang kedua botnya sudah siap dan belum ada pemenang
    let targetMatch = null;
    let targetRoundIdx = -1;

    for (let r = 0; r < this.bracket.rounds.length; r++) {
      const round = this.bracket.rounds[r];
      for (let m = 0; m < round.length; m++) {
        const match = round[m];
        if (match.botA && match.botB && !match.winner) {
          targetMatch = match;
          targetRoundIdx = r;
          break;
        }
      }
      if (targetMatch) break;
    }

    if (!targetMatch) {
      if (!this.champion) {
        alert('Semua pertandingan telah selesai!');
      }
      return;
    }

    this.currentMatch = targetMatch;

    // Picu pertarungan di scene Arena
    if (this.onStartMatch) {
      this.onStartMatch({
        teamA: [targetMatch.botA],
        teamB: [targetMatch.botB],
        onFinished: (result) => {
          this.handleMatchResult(result);
        }
      });
    }
  }

  handleMatchResult(result) {
    if (!this.currentMatch) return;

    // Tentukan bot pemenang berdasarkan hasil
    let winner = null;
    if (result.title.includes('Biru')) {
      winner = this.currentMatch.botA;
    } else if (result.title.includes('Merah')) {
      winner = this.currentMatch.botB;
    } else {
      // Jika seri, pilih acak
      winner = Math.random() < 0.5 ? this.currentMatch.botA : this.currentMatch.botB;
    }

    this.currentMatch.winner = winner;

    // Majukan pemenang ke babak berikutnya
    const currentRoundIdx = this.currentMatch.roundIndex;
    const nextRound = this.bracket.rounds[currentRoundIdx + 1];

    if (nextRound) {
      const currentMatchIdx = this.bracket.rounds[currentRoundIdx].findIndex(m => m.id === this.currentMatch.id);
      const nextMatchIdx = Math.floor(currentMatchIdx / 2);
      const nextMatch = nextRound[nextMatchIdx];

      if (currentMatchIdx % 2 === 0) {
        nextMatch.botA = winner;
      } else {
        nextMatch.botB = winner;
      }
    } else {
      // Ini adalah match terakhir (Grand Final) -> Pemenang adalah Juara!
      this.champion = winner;
    }

    this.renderBracketView();
  }
}
