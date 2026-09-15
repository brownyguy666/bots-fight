/**
 * SimulationClock - Fixed Tick Deterministic Clock untuk RoboArena (Modul 5 Fase 24)
 * Menjamin seluruh timer gameplay (cooldown, status effect, signal, flag, KOTH)
 * berjalan deterministik dan dapat di-pause / di-step satu per satu tick.
 */

export const SIM_TICK_MS = 150;

export class SimulationClock {
  constructor(tickMs = SIM_TICK_MS) {
    this.tickMs = tickMs;
    this.tick = 0;
    this.timeMs = 0;
    this.isPaused = false;
    this.accumulatedMs = 0;
    this.listeners = [];
  }

  reset() {
    this.tick = 0;
    this.timeMs = 0;
    this.accumulatedMs = 0;
    this.isPaused = false;
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  /**
   * Langkah manual 1 tick (dipanggil oleh tombol "Tick Berikutnya" saat pause)
   */
  stepSingleTick() {
    this.tick += 1;
    this.timeMs += this.tickMs;
    return this.tick;
  }

  /**
   * Akumulasi delta waktu real-time browser dan kembalikan jumlah fixed tick yang harus diproses.
   * @param {number} deltaMs - Milidetik dari frame terakhir
   * @param {number} timeScale - Skala kecepatan (0.5x, 1x, 2x, dll)
   * @returns {number} Jumlah tick yang siap diproses
   */
  update(deltaMs, timeScale = 1.0) {
    if (this.isPaused) {
      return { ticksToExecute: 0, tick: this.tick, timeMs: this.timeMs, valueOf() { return 0; } };
    }

    this.accumulatedMs += deltaMs * timeScale;
    let ticksToProcess = 0;

    // Maksimal 5 tick per frame untuk mencegah spiral of death jika lag
    const maxTicksPerFrame = 5;
    while (this.accumulatedMs >= this.tickMs && ticksToProcess < maxTicksPerFrame) {
      this.accumulatedMs -= this.tickMs;
      this.tick += 1;
      this.timeMs += this.tickMs;
      ticksToProcess += 1;
    }

    if (ticksToProcess >= maxTicksPerFrame) {
      this.accumulatedMs = 0; // Buang sisa jika terlalu jauh tertinggal
    }

    return {
      ticksToExecute: ticksToProcess,
      tick: this.tick,
      timeMs: this.timeMs,
      valueOf() { return ticksToProcess; }
    };
  }

  getTimeSeconds() {
    return (this.timeMs / 1000).toFixed(2);
  }

  formatTime() {
    const totalSec = Math.floor(this.timeMs / 1000);
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    const frac = Math.floor((this.timeMs % 1000) / 10).toString().padStart(2, '0');
    return `${m}:${s}.${frac}`;
  }
}
