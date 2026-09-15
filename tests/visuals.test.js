import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import * as THREE from 'three';
import { Projectile3D } from '../src/game3d/Projectile3D.js';
import { ParticleSystem3D } from '../src/game3d/ParticleSystem3D.js';
import { buildRobotMesh, createRobotDebrisPieces, updatePartDamageVisual } from '../src/game3d/RobotBuilder.js';
import { animateRobot, disposeScene } from '../src/game3d/visuals.js';
import { PARTS } from '../src/data/parts.js';
import { SFX } from '../src/audio/sfx.js';
// Arena imports the editor's stylesheet; CSS has no role in these headless tests.
registerHooks({ load(url, context, next) {
  return url.endsWith('.css') ? { format: 'module', source: '', shortCircuit: true } : next(url, context);
} });
const { Arena3D } = await import('../src/game3d/Arena3D.js');
for (const key of ['playCannon', 'playLaser', 'playMissileLaunch', 'playGatling']) SFX[key] = () => {};
const world = (x, y) => ({ x: x * 1.5, z: y * 1.5 });
const enemy = (x) => ({ radius: 1.4, robotState: { x, y: 10, team: 'teamB', destroyed: false } });
const shot = (kind = 'railgun') => new Projectile3D(new THREE.Scene(), { x: 2, y: 10 }, 0,
  PARTS.senjata[kind], { team: 'teamA' }, world);

test('all weapon IDs select their own visual, and laser resolves only once', () => {
  for (const kind of Object.keys(PARTS.senjata)) {
    const p = shot(kind);
    assert.equal(p.kind, kind);
    assert.equal(p.isInstantBeam, kind === 'laser');
    p.destroy();
  }
  const p = shot('laser'), target = enemy(12);
  p.update(1 / 60, [target]);
  assert.equal(p.hitTarget, target);
  assert.ok(p.mesh.scale.z < 1);
  p.hitTarget = null;
  p.update(1 / 60, [target]);
  assert.equal(p.hitTarget, null);
  p.update(0.2, [target]);
  assert.equal(p.active, false);
});

test('fast projectiles hit crossed enemies and respect the nearest obstacle', () => {
  const p = shot(), target = enemy(8);
  p.update(0.1, [target]);
  assert.equal(p.hitTarget, target);
  assert.ok(Math.abs(p.x - 6.6) < 1e-6);
  const q = shot();
  q.update(0.1, [target], [{ x: 5, y: 10, w: 1, h: 5 }]);
  assert.equal(q.hitTarget, null);
  assert.equal(q.active, false);
  assert.equal(q.x, 4.5);
  const laser = shot('laser');
  laser.update(0.016, [target], [{ x: 5, y: 10, w: 1, h: 5 }]);
  assert.equal(laser.hitTarget, null);
  assert.ok(laser.mesh.scale.z < 0.1);
  laser.destroy();
});

test('robot muzzle and projectile share the movement heading at cardinal angles', () => {
  const robot = buildRobotMesh();
  for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    robot.rotation.y = Math.PI / 2 - angle;
    robot.updateMatrixWorld(true);
    const muzzle = robot.muzzleTip.getWorldPosition(new THREE.Vector3());
    assert.ok(Math.abs(Math.atan2(muzzle.z, muzzle.x) - angle) < 1e-6);
    const p = shot(); p.angle = angle; p.update3DTransform();
    const direction = new THREE.Vector3(0, 0, 1).applyEuler(p.mesh.rotation);
    assert.ok(direction.distanceTo(new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle))) < 1e-6);
    p.destroy();
  }
  disposeScene(robot);
});

test('locomotion articulates, recoil follows turret, and pause freezes visuals', () => {
  for (const kind of ['roda', 'rantai', 'omni', 'kaki', 'melayang']) {
    const mesh = buildRobotMesh({ penggerak: kind });
    const r = { mesh, robotState: { loadout: { penggerak: kind } }, recoilOffset: 0.35 };
    mesh.turretMesh.rotation.y = Math.PI / 2;
    animateRobot(r, 0.016, 3, 0.5);
    assert.ok(mesh.turretMesh.position.x < 0);
    if (mesh.userData.wheels.length) assert.notEqual(mesh.userData.wheels[0].rotation.x, 0);
    if (kind === 'kaki') assert.notEqual(mesh.userData.legs[0].rotation.x, 0);
    const before = mesh.position.clone();
    const phase = r.walkPhase;
    animateRobot(r, 0, 10, 4);
    assert.deepEqual(mesh.position, before);
    assert.equal(r.walkPhase, phase);
    disposeScene(mesh);
  }
});

test('particle bursts are bounded, pause-safe, and fully cleaned up', () => {
  const scene = new THREE.Scene(), fx = new ParticleSystem3D(scene);
  const pos = new THREE.Vector3(0, 1, 0);
  fx.emitMuzzleFlash(pos, 0); fx.emitExplosion(pos); fx.emitSmoke(pos);
  const life = fx.particles[0].life;
  fx.update(0);
  assert.equal(fx.particles[0].life, life);
  for (let i = 0; i < 200; i++) fx.emitImpactSparks(pos);
  assert.ok(fx.particles.length <= 160);
  fx.update(3);
  assert.equal(scene.children.length, 0);
  fx.dispose();
});

test('debris uses finite velocities, bounces on the ground and expires', () => {
  const arena = Object.create(Arena3D.prototype);
  arena.scene = new THREE.Scene(); arena.arenaMap = {}; arena.arenaWidth = 60; arena.arenaHeight = 40;
  arena.particles = new ParticleSystem3D(arena.scene);
  arena.activeDebris = createRobotDebrisPieces({}, 'teamA', { x: 20, y: 1, z: 10 });
  const pieces = [...arena.activeDebris];
  pieces.forEach(d => arena.scene.add(d.mesh));
  for (let i = 0; i < 360; i++) arena.updateDebris(1 / 60);
  for (const d of pieces) {
    assert.ok(d.mesh.position.toArray().every(Number.isFinite));
    assert.ok(d.bounceCount > 0);
    assert.ok(d.mesh.position.y >= 0.25);
  }
  arena.updateDebris(16);
  assert.equal(arena.activeDebris.length, 0);
  arena.particles.dispose();
});

test('damage does not flatten healthy materials and repair restores original materials', () => {
  const mesh = buildRobotMesh({ armor: 'berat' });
  const part = mesh.partsMeshes.senjata.children[0], original = part.material;
  updatePartDamageVisual(mesh, 'senjata', false);
  assert.equal(part.material, original);
  updatePartDamageVisual(mesh, 'senjata', true);
  assert.notEqual(part.material, original);
  updatePartDamageVisual(mesh, 'senjata', false);
  assert.equal(part.material, original);
  disposeScene(mesh);
});
