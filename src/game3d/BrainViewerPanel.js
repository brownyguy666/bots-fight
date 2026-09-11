import { LGraph, LGraphCanvas } from 'litegraph.js';
import 'litegraph.js/css/litegraph.css';
import { registerCustomNodes } from '../editor/nodes.js';

/**
 * Panel Live Visualisasi Otak Robot di Arena Simulasi (Fase 19)
 */
export class BrainViewerPanel {
  constructor(overlayContainer) {
    this.overlayContainer = overlayContainer || document.body;
    this.activeRobot = null;
    this.graph = null;
    this.canvas = null;
    this.isOpen = false;
    this.lastTraceTimestamp = 0;

    registerCustomNodes();
    this.createDOM();
    this.initGraph();
  }

  createDOM() {
    this.panelEl = document.createElement('div');
    this.panelEl.id = 'arena-brain-viewer-panel';
    this.panelEl.className = 'brain-viewer-panel';
    this.panelEl.innerHTML = `
      <div class="bv-header">
        <div class="bv-title-group">
          <span class="bv-badge">🧠 LIVE DECISION TREE</span>
          <span id="bv-robot-name" class="bv-robot-name">Nama Robot</span>
          <span id="bv-action-pill" class="bv-action-pill">MENUNGGU...</span>
        </div>
        <button id="bv-close-btn" class="bv-close-btn" title="Tutup Panel">&times;</button>
      </div>
      <div class="bv-canvas-container" id="bv-canvas-container">
        <canvas id="bv-litegraph-canvas"></canvas>
      </div>
      <div class="bv-footer">
        <span class="bv-live-indicator">● LIVE TRACE 150MS</span>
        <span style="color: var(--text-muted); font-size: 11px;">Alur berpendar menandakan pikiran robot saat ini.</span>
      </div>
    `;

    this.overlayContainer.appendChild(this.panelEl);

    // Event close
    const closeBtn = this.panelEl.querySelector('#bv-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
    }
  }

  initGraph() {
    const canvasEl = this.panelEl.querySelector('#bv-litegraph-canvas');
    const container = this.panelEl.querySelector('#bv-canvas-container');
    if (!canvasEl || !container) return;

    this.graph = new LGraph();
    this.canvas = new LGraphCanvas(canvasEl, this.graph);

    this.canvas.background_color = '#060913';
    this.canvas.clear_background = true;
    this.canvas.render_canvas_border = false;
    this.canvas.round_radius = 6;
    this.canvas.highquality_render = true;

    // Read-only setup: pengguna bisa menggeser/zoom melihat node, tapi tidak mengubah struktur
    this.canvas.allow_interaction = true;
    this.canvas.allow_dragnodes = false;
    this.canvas.allow_searchbox = false;
  }

  open(robotObj) {
    if (!robotObj) return;
    this.activeRobot = robotObj;
    this.isOpen = true;
    this.panelEl.classList.add('open');

    // Update info header
    const nameEl = this.panelEl.querySelector('#bv-robot-name');
    if (nameEl) {
      nameEl.textContent = robotObj.robotState.namaRobot;
      nameEl.className = `bv-robot-name ${robotObj.robotState.team}`;
    }

    // Muat struktur pohon keputusan robot
    if (this.graph && robotObj.robotState.brain) {
      try {
        const brainData = JSON.parse(JSON.stringify(robotObj.robotState.brain));
        this.graph.configure(brainData);
        this.fitGraphView();
      } catch (e) {
        console.warn('Gagal memuat brain ke viewer:', e);
      }
    }

    this.resizeCanvas();
  }

  close() {
    this.isOpen = false;
    this.activeRobot = null;
    this.panelEl.classList.remove('open');
  }

  fitGraphView() {
    if (!this.graph || !this.canvas || !this.graph._nodes || this.graph._nodes.length === 0) return;

    // Hitung bounding box node
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    this.graph._nodes.forEach(n => {
      const x = n.pos[0];
      const y = n.pos[1];
      const w = n.size ? n.size[0] : 160;
      const h = n.size ? n.size[1] : 60;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x + w > maxX) maxX = x + w;
      if (y + h > maxY) maxY = y + h;
    });

    const pad = 40;
    minX -= pad; minY -= pad; maxX += pad; maxY += pad;
    const bboxW = Math.max(200, maxX - minX);
    const bboxH = Math.max(200, maxY - minY);

    const cW = this.canvas.canvas.width || 480;
    const cH = this.canvas.canvas.height || 360;

    const scaleX = cW / bboxW;
    const scaleY = cH / bboxH;
    const scale = Math.max(0.4, Math.min(1.0, Math.min(scaleX, scaleY)));

    this.canvas.ds.scale = scale;
    this.canvas.ds.offset[0] = -minX * scale + (cW - bboxW * scale) / 2;
    this.canvas.ds.offset[1] = -minY * scale + (cH - bboxH * scale) / 2;
    this.canvas.setDirty(true, true);
  }

  resizeCanvas() {
    const container = this.panelEl.querySelector('#bv-canvas-container');
    const canvasEl = this.panelEl.querySelector('#bv-litegraph-canvas');
    if (!container || !canvasEl || !this.canvas) return;

    const rect = container.getBoundingClientRect();
    const w = Math.floor(rect.width) || 480;
    const h = Math.floor(rect.height) || 360;

    if (w > 50 && h > 50) {
      canvasEl.width = w;
      canvasEl.height = h;
      canvasEl.style.width = w + 'px';
      canvasEl.style.height = h + 'px';
      this.canvas.resize(w, h);
      this.canvas.setDirty(true, true);
      this.canvas.draw(true, true);
    }
  }

  update() {
    if (!this.isOpen || !this.activeRobot || !this.graph || !this.canvas) return;

    const state = this.activeRobot.robotState;
    if (state.destroyed) {
      const actionPill = this.panelEl.querySelector('#bv-action-pill');
      if (actionPill) actionPill.textContent = '💀 ROBOT HANCUR';
      return;
    }

    // Update teks aksi aktif
    const actionPill = this.panelEl.querySelector('#bv-action-pill');
    if (actionPill && state.lastExecutedAction) {
      actionPill.textContent = `🎯 ${state.lastExecutedAction}`;
    }

    const trace = state._lastTrace;
    if (!trace) return;

    // Berikan efek pendaran neon pada node & link aktif
    const activeNodeIds = new Set(trace.nodeIds || []);
    const activeLinkIds = new Set(trace.linkIds || []);

    let needsRedraw = false;

    // Highlight Node
    if (this.graph._nodes) {
      this.graph._nodes.forEach(node => {
        if (activeNodeIds.has(node.id)) {
          if (node.boxcolor !== '#00f0ff') {
            node.boxcolor = '#00f0ff';
            needsRedraw = true;
          }
        } else {
          if (node.boxcolor !== null) {
            node.boxcolor = null;
            needsRedraw = true;
          }
        }
      });
    }

    // Highlight Link
    if (this.graph.links) {
      Object.keys(this.graph.links).forEach(k => {
        const link = this.graph.links[k];
        if (!link) return;
        if (activeLinkIds.has(link.id)) {
          if (link.color !== '#00f0ff') {
            link.color = '#00f0ff';
            needsRedraw = true;
          }
        } else {
          if (link.color !== null) {
            link.color = null;
            needsRedraw = true;
          }
        }
      });
    }

    if (needsRedraw) {
      this.canvas.setDirty(true, true);
    }
  }

  destroy() {
    this.close();
    if (this.panelEl && this.panelEl.parentNode) {
      this.panelEl.parentNode.removeChild(this.panelEl);
    }
  }
}
