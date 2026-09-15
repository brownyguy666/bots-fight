/**
 * RoboArena - Signal Bus & Koordinasi Tim (Fase 22)
 * Mengelola signal antar robot dalam satu tim dengan masa aktif berbasis simulationTick.
 * Semua entitas dirujuk dengan ID (bukan reference object) agar aman dari siklus dan memory leak.
 */

export class SignalBus {
  constructor() {
    this.signals = [];
    this.nextSignalId = 1;
    // Throttle tracker per robot { [robotId]: lastBroadcastTick }
    this.helpThrottle = new Map();
  }

  /**
   * Reset seluruh signal
   */
  clear() {
    this.signals = [];
    this.helpThrottle.clear();
  }

  /**
   * Menghapus signal yang sudah kadaluwarsa berdasarkan tick simulasi
   * @param {number} currentTick 
   */
  updateTick(currentTick) {
    this.signals = this.signals.filter(s => s.expiresTick > currentTick);
  }

  /**
   * Broadcast signal minta bantuan (butuh_bantuan)
   * Masa aktif default 20 tick (3000ms)
   */
  broadcastHelp(teamId, sourceRobotId, position, currentTick, durationTicks = 20) {
    // Throttle: minimal jeda 15 tick (~2.25 detik simulasi) antar broadcast bantuan dari robot yang sama
    const lastTick = this.helpThrottle.get(sourceRobotId) || -999;
    if (currentTick - lastTick < 15) {
      return null;
    }
    this.helpThrottle.set(sourceRobotId, currentTick);

    // Hapus signal bantuan lama dari robot yang sama
    this.signals = this.signals.filter(
      s => !(s.type === 'butuh_bantuan' && s.sourceRobotId === sourceRobotId)
    );

    const signal = {
      id: `sig_${this.nextSignalId++}`,
      type: 'butuh_bantuan',
      teamId,
      sourceRobotId,
      position: { x: position.x, y: position.y },
      createdTick: currentTick,
      expiresTick: currentTick + durationTicks
    };

    this.signals.push(signal);
    return signal;
  }

  /**
   * Broadcast signal musuh prioritas dari komandan
   * Masa aktif default 25 tick (~3.75 detik simulasi)
   */
  broadcastPriorityTarget(teamId, sourceRobotId, targetRobotId, currentTick, durationTicks = 25) {
    // Tim hanya memiliki satu musuh prioritas aktif sekaligus dari komandan
    this.signals = this.signals.filter(
      s => !(s.type === 'musuh_prioritas' && s.teamId === teamId)
    );

    const signal = {
      id: `sig_${this.nextSignalId++}`,
      type: 'musuh_prioritas',
      teamId,
      sourceRobotId,
      targetRobotId,
      createdTick: currentTick,
      expiresTick: currentTick + durationTicks
    };

    this.signals.push(signal);
    return signal;
  }

  /**
   * Mencari signal bantuan dari sekutu dalam radius tertentu
   */
  findHelpSignal(teamId, currentRobotId, currentPos, maxRadius) {
    for (const sig of this.signals) {
      if (sig.type === 'butuh_bantuan' && sig.teamId === teamId && sig.sourceRobotId !== currentRobotId) {
        const dist = Math.hypot(sig.position.x - currentPos.x, sig.position.y - currentPos.y);
        if (dist <= maxRadius) {
          return sig;
        }
      }
    }
    return null;
  }

  /**
   * Mendapatkan musuh prioritas aktif untuk tim tertentu
   */
  getPriorityTarget(teamId) {
    return this.signals.find(s => s.type === 'musuh_prioritas' && s.teamId === teamId) || null;
  }
}
