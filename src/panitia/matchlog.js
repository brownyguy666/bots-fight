/**
 * RoboArena - Match Log & Leaderboard Aggregator (Fase 25)
 * Menyimpan riwayat pertandingan turnamen dengan robotId permanen dan seed.
 */

const STORAGE_KEY = 'roboarena_matchlog_v1';

export class MatchLogManager {
  static getLogs() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Gagal memuat matchlog:', e);
    }
    return [];
  }

  static saveLogs(logs) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    } catch (e) {
      console.error('Gagal menyimpan matchlog:', e);
    }
  }

  static addMatch(matchRecord) {
    const logs = this.getLogs();
    const fullRecord = {
      id: `match_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      ...matchRecord
    };
    logs.unshift(fullRecord);
    // Batasi maksimum 100 match terakhir
    if (logs.length > 100) logs.pop();
    this.saveLogs(logs);
    return fullRecord;
  }

  static clearAll() {
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Menghasilkan agregasi leaderboard berdasarkan robotId
   * @param {Array} registeredRobots - Daftar robot dari storage [{ id, namaRobot, ... }]
   * @returns {Array} Leaderboard disortir dari kemenangan terbanyak
   */
  static getLeaderboard(registeredRobots = []) {
    const logs = this.getLogs();
    const statsMap = new Map();

    // Inisialisasi setiap robot terdaftar
    registeredRobots.forEach(bot => {
      statsMap.set(bot.id, {
        robotId: bot.id,
        namaRobot: bot.namaRobot,
        played: 0,
        won: 0,
        lost: 0,
        winRate: '0%'
      });
    });

    // Proses tiap log pertandingan
    logs.forEach(match => {
      const pA = match.teamAIds || (match.robotAId ? [match.robotAId] : []);
      const pB = match.teamBIds || (match.robotBId ? [match.robotBId] : []);
      const winnerTeam = match.winnerTeamId; // 'A' atau 'B'

      pA.forEach(id => {
        if (!statsMap.has(id)) {
          statsMap.set(id, { robotId: id, namaRobot: match.robotAName || id, played: 0, won: 0, lost: 0, winRate: '0%' });
        }
        const s = statsMap.get(id);
        s.played += 1;
        if (winnerTeam === 'A') s.won += 1;
        else if (winnerTeam === 'B') s.lost += 1;
      });

      pB.forEach(id => {
        if (!statsMap.has(id)) {
          statsMap.set(id, { robotId: id, namaRobot: match.robotBName || id, played: 0, won: 0, lost: 0, winRate: '0%' });
        }
        const s = statsMap.get(id);
        s.played += 1;
        if (winnerTeam === 'B') s.won += 1;
        else if (winnerTeam === 'A') s.lost += 1;
      });
    });

    const list = Array.from(statsMap.values()).map(s => {
      const rate = s.played > 0 ? ((s.won / s.played) * 100).toFixed(1) : '0.0';
      return { ...s, winRate: `${rate}%`, rawRate: parseFloat(rate) };
    });

    // Sort: Kemenangan terbanyak -> Win rate tertinggi -> Total match
    list.sort((a, b) => {
      if (b.won !== a.won) return b.won - a.won;
      if (b.rawRate !== a.rawRate) return b.rawRate - a.rawRate;
      return b.played - a.played;
    });

    return list;
  }
}
