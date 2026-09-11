import * as THREE from 'three';
import { buildRobotMesh } from '../game3d/RobotBuilder.js';

/**
 * RobotPreview3D - Tampilan 3D Interaktif di Bengkel Robot
 * Menampilkan robot yang dirakit secara 3D dengan kontrol rotasi mouse bebas.
 */
export class RobotPreview3D {
  constructor(canvasContainer) {
    this.container = canvasContainer;
    this.currentMesh = null;
    this.loadout = {
      rangka: 'sedang',
      penggerak: 'roda',
      senjata: 'meriam',
      sensor: 'kosong',
      armor: 'kosong'
    };
    this.team = 'teamA';

    this.isDragging = false;
    this.prevMousePos = { x: 0, y: 0 };
    this.rotationY = 0;
    this.rotationX = 0.2;

    this.initThree();
    this.setupEvents();
    this.rebuildMesh();

    this.animate = this.animate.bind(this);
    this.animId = requestAnimationFrame(this.animate);
  }

  initThree() {
    this.container.innerHTML = '';
    const w = this.container.clientWidth || 340;
    const h = this.container.clientHeight || 280;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060913);

    this.camera = new THREE.PerspectiveCamera(40, w / h, 0.5, 100);
    this.camera.position.set(0, 5, 8.5);
    this.camera.lookAt(0, 1.2, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    // Pencahayaan showcase studio
    const amb = new THREE.AmbientLight(0x1e293b, 2.5);
    this.scene.add(amb);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
    dirLight.position.set(5, 10, 8);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    const rimLight = new THREE.PointLight(0x00f0ff, 3.0, 15);
    rimLight.position.set(-4, 3, -4);
    this.scene.add(rimLight);

    // Pedestal panggung bulat
    const pedestalGeo = new THREE.CylinderGeometry(3.5, 3.8, 0.4, 32);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.8,
      roughness: 0.3
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = -0.2;
    pedestal.receiveShadow = true;
    this.scene.add(pedestal);

    // Cincin neon di tepi pedestal
    const ringGeo = new THREE.TorusGeometry(3.6, 0.06, 12, 48);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.01;
    this.scene.add(ring);
  }

  setupEvents() {
    const el = this.renderer.domElement;
    el.style.cursor = 'grab';

    el.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.prevMousePos = { x: e.clientX, y: e.clientY };
      el.style.cursor = 'grabbing';
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      if (this.renderer?.domElement) {
        this.renderer.domElement.style.cursor = 'grab';
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.prevMousePos.x;
      const dy = e.clientY - this.prevMousePos.y;

      this.rotationY += dx * 0.012;
      this.rotationX += dy * 0.008;
      this.rotationX = Math.max(-0.2, Math.min(0.8, this.rotationX));

      this.prevMousePos = { x: e.clientX, y: e.clientY };
    });
  }

  setLoadout(loadout, team = 'teamA') {
    this.loadout = { ...this.loadout, ...(loadout || {}) };
    this.team = team;
    this.rebuildMesh();
  }

  rebuildMesh() {
    if (this.currentMesh) {
      this.scene.remove(this.currentMesh);
      this.currentMesh.traverse(child => {
        if (child.isMesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      });
      this.currentMesh = null;
    }

    this.currentMesh = buildRobotMesh(this.loadout, this.team);
    this.scene.add(this.currentMesh);
  }

  animate() {
    this.animId = requestAnimationFrame(this.animate);

    if (this.currentMesh) {
      if (!this.isDragging) {
        // Putaran turntable otomatis lambat saat tidak di-drag
        this.rotationY += 0.006;
      }

      this.currentMesh.rotation.y = this.rotationY;
      this.currentMesh.rotation.x = this.rotationX;
    }

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    cancelAnimationFrame(this.animId);
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement?.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }
}
