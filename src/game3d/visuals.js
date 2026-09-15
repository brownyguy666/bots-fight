import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export function setupRendering(renderer, scene) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.45;
  room.dispose();
  pmrem.dispose();
  return environment;
}

export function animateRobot(wrapper, dt, speed, turn, elevation = 0) {
  if (dt <= 0) return;
  const mesh = wrapper.mesh;
  const state = wrapper.robotState;
  const type = state.loadout?.penggerak || 'roda';
  wrapper.visualTime = (wrapper.visualTime || 0) + dt;
  wrapper.walkPhase = (wrapper.walkPhase || 0) + speed * dt * 2.5;
  const blend = 1 - Math.exp(-10 * dt);
  const acceleration = (speed - (wrapper.previousVisualSpeed ?? speed)) / dt;
  wrapper.previousVisualSpeed = speed;
  mesh.rotation.x += (THREE.MathUtils.clamp(acceleration * 0.008, -0.07, 0.07) - mesh.rotation.x) * blend;
  mesh.rotation.z += (THREE.MathUtils.clamp(-turn * speed * 0.015, -0.1, 0.1) - mesh.rotation.z) * blend;
  mesh.position.y = elevation + (type === 'melayang'
    ? 0.15 + Math.sin(wrapper.visualTime * 3) * 0.09
    : type === 'kaki' ? Math.abs(Math.sin(wrapper.walkPhase)) * Math.min(speed * 0.025, 0.09) : 0);
  for (const wheel of mesh.userData.wheels || []) {
    wheel.rotation.x += (speed * 1.5 - turn * Math.sign(wheel.userData.side || wheel.position.x)) * dt / 0.52;
  }
  for (const [index, leg] of (mesh.userData.legs || []).entries()) {
    const phase = wrapper.walkPhase + ([0, 3].includes(index) ? 0 : Math.PI);
    const stride = Math.min(1, speed / 2);
    leg.rotation.x += (Math.sin(phase) * 0.28 * stride - leg.rotation.x) * blend;
    leg.position.y = 0.8 + Math.max(0, Math.cos(phase)) * 0.12 * stride;
  }
  wrapper.recoilOffset = (wrapper.recoilOffset || 0) * Math.exp(-16 * dt);
  const turret = mesh.turretMesh;
  turret.position.x = -Math.sin(turret.rotation.y) * wrapper.recoilOffset;
  turret.position.z = -Math.cos(turret.rotation.y) * wrapper.recoilOffset;
  wrapper.armorGlowTimer = Math.max(0, (wrapper.armorGlowTimer || 0) - dt);
  if (mesh.armorMaterial) {
    mesh.armorMaterial.emissiveIntensity = (mesh.userData.armorGlow || 0) + wrapper.armorGlowTimer * 5;
  }
}

export function disposeScene(scene) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  scene.traverse(object => {
    if (object.geometry && !object.isSprite) geometries.add(object.geometry);
    if (object.userData.originalMaterial) materials.add(object.userData.originalMaterial);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!material) continue;
      materials.add(material);
      if (material.map) textures.add(material.map);
    }
  });
  geometries.forEach(item => item.dispose());
  materials.forEach(item => item.dispose());
  textures.forEach(item => item.dispose());
}
