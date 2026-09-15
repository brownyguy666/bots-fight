/**
 * RoboArena - Anti-Stuck & Tangent Obstacle Avoidance (Fase 20)
 * Menangani deteksi robot yang macet di obstacle dan mengarahkan ke tangent kiri/kanan
 * secara otomatis tanpa membebani logic pohon keputusan pemain.
 */

export class NavigationSystem {
  constructor() {
    // Menyimpan state navigasi per robotId
    this.robotNavStates = new Map();
  }

  /**
   * Mendapatkan atau membuat state navigasi untuk robot
   * @param {string} robotId 
   * @param {number} x 
   * @param {number} y 
   */
  getOrCreateState(robotId, x, y) {
    if (!this.robotNavStates.has(robotId)) {
      this.robotNavStates.set(robotId, {
        stuckTicks: 0,
        avoidanceDirection: 0, // -1: kiri, 1: kanan, 0: normal
        avoidanceTimer: 0,
        lastPosition: { x, y }
      });
    }
    return this.robotNavStates.get(robotId);
  }

  /**
   * Membersihkan state saat robot hancur atau ronde reset
   */
  clear() {
    this.robotNavStates.clear();
  }

  /**
   * Memperbarui status perpindahan robot setiap AI / simulation tick
   * @param {Object} robotState 
   * @param {boolean} isTryingToMove - Apakah robot sedang mencoba bergerak maju/mundur
   */
  updateTick(robotState, isTryingToMove) {
    const nav = this.getOrCreateState(robotState.id, robotState.x, robotState.y);

    if (robotState.destroyed) {
      this.robotNavStates.delete(robotState.id);
      return;
    }

    if (isTryingToMove) {
      const dx = robotState.x - nav.lastPosition.x;
      const dy = robotState.y - nav.lastPosition.y;
      const distMoved = Math.hypot(dx, dy);

      // Jika mencoba bergerak tetapi perpindahan sangat minim (< 0.15 unit)
      if (distMoved < 0.15) {
        nav.stuckTicks += 1;
      } else {
        nav.stuckTicks = Math.max(0, nav.stuckTicks - 1);
        if (nav.avoidanceTimer > 0) {
          nav.avoidanceTimer -= 1;
          if (nav.avoidanceTimer <= 0) {
            nav.avoidanceDirection = 0;
          }
        }
      }

      // Jika sudah macet selama >= 3 tick, aktifkan tangent avoidance
      if (nav.stuckTicks >= 3) {
        if (nav.avoidanceDirection === 0) {
          // Bergantian coba kiri (-1) atau kanan (+1)
          nav.avoidanceDirection = Math.random() < 0.5 ? -1 : 1;
        } else {
          // Jika masih macet setelah mencoba satu arah, balikkan arah
          nav.avoidanceDirection = -nav.avoidanceDirection;
        }
        nav.avoidanceTimer = 6; // Bertahan selama 6 tick (~900ms) untuk meloloskan diri
        nav.stuckTicks = 0;
      }
    } else {
      nav.stuckTicks = 0;
      nav.avoidanceDirection = 0;
      nav.avoidanceTimer = 0;
    }

    nav.lastPosition.x = robotState.x;
    nav.lastPosition.y = robotState.y;
  }

  /**
   * Menyesuaikan arah heading robot jika dalam mode avoidance
   * @param {string} robotId 
   * @param {number} desiredAngle - Sudut target asli (rad)
   * @returns {number} Sudut yang disesuaikan
   */
  adjustHeading(robotId, desiredAngle) {
    const nav = this.robotNavStates.get(robotId);
    if (!nav || nav.avoidanceDirection === 0) {
      return desiredAngle;
    }

    // Belokkan sudut target sebesar 65 derajat ke kiri atau ke kanan
    const offset = nav.avoidanceDirection * (65 * Math.PI / 180);
    return desiredAngle + offset;
  }
}
