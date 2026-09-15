import { Arena3D } from './Arena3D.js';
import { PRESET_ROBOTS } from '../data/preset_brains/presets.js';

// Use the same arena units, combat and effects as the actual match.
export class QuickTest3D extends Arena3D {
  constructor(containerId, profile) {
    super(containerId, {
      quickTest: true,
      teamA: [profile || PRESET_ROBOTS[0]],
      teamB: [PRESET_ROBOTS[1] || PRESET_ROBOTS[0]],
      arenaMap: { id: 'quick_test', width: 32, height: 24, obstacles: [], zones: [],
        spawnPoints: { teamA: [{ x: 5, y: 12, rotation: 0 }], teamB: [{ x: 27, y: 12, rotation: Math.PI }] } }
    });
  }
  setupUIControls() {}
  setupRaycasting() {}
  endMatch(winningTeam, message) {
    if (this.matchEnded) return;
    this.matchEnded = true;
    this.isMatchRunning = false;
    const banner = document.createElement('div');
    banner.className = 'match-result-banner';
    const title = document.createElement('h2');
    title.textContent = message;
    banner.appendChild(title);
    this.container.appendChild(banner);
  }
}
