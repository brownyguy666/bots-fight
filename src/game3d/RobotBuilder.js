import * as THREE from 'three';

/**
 * RobotBuilder - Generator Mesh 3D Prosedural Berkualitas Tinggi untuk RoboArena
 * Menggunakan geometri primitif Three.js (Box, Cylinder, Sphere, Torus, Cone).
 * Menghasilkan model robot modular berdetail tinggi tanpa aset eksternal .glb.
 * Mendukung ekspansi Modul 4 (Kompak, Lapis Baja, Omni, Melayang, Railgun, Api, EMP, Termal, Reaktif).
 */

export function buildRobotMesh(loadout = {}, team = 'teamA') {
  const group = new THREE.Group();
  group.name = 'robot_root';

  const isTeamA = team === 'teamA';
  const teamColorHex = isTeamA ? 0x00f0ff : 0xff3366;
  const teamDarkColorHex = isTeamA ? 0x0369a1 : 0xbe123c;
  const baseDarkHex = 0x0f172a;
  const metalGreyHex = 0x334155;
  const steelHex = 0x1e293b;

  const l = loadout || {};
  const rangkaKey = l.rangka || 'sedang';
  const penggerakKey = l.penggerak || 'roda';
  const senjataKey = l.senjata || 'meriam';
  const sensorKey = l.sensor || 'kosong';
  const armorKey = l.armor || 'kosong';

  // Tempat menyimpan referensi sub-mesh per part untuk visual kerusakan & interaksi
  const partsMeshes = {
    rangka: null,
    penggerak: null,
    senjata: null,
    sensor: null,
    armor: null
  };

  const originalMaterials = new Map();

  // ==========================================
  // 1. RANGKA (CHASSIS) BERDETAIL
  // ==========================================
  const rangkaGroup = new THREE.Group();

  const chassisMat = new THREE.MeshStandardMaterial({
    color: teamDarkColorHex,
    roughness: 0.35,
    metalness: 0.7,
    emissive: teamColorHex,
    emissiveIntensity: 0.18
  });

  const darkPlateMat = new THREE.MeshStandardMaterial({
    color: steelHex,
    roughness: 0.6,
    metalness: 0.8
  });

  let chassisW = 2.8, chassisH = 1.1, chassisL = 2.8;
  if (rangkaKey === 'ringan') {
    chassisW = 2.2; chassisH = 0.8; chassisL = 3.2;
  } else if (rangkaKey === 'berat') {
    chassisW = 3.6; chassisH = 1.5; chassisL = 3.6;
  } else if (rangkaKey === 'kompak') {
    // Modul 4: Kompak (Kecil, Ramping, Gesit)
    chassisW = 1.8; chassisH = 0.65; chassisL = 2.3;
  } else if (rangkaKey === 'lapis_baja') {
    // Modul 4: Lapis Baja (Besar, Tebal, Kokoh)
    chassisW = 4.0; chassisH = 1.65; chassisL = 4.0;
  }

  // Badan Utama
  const chassisGeo = new THREE.BoxGeometry(chassisW, chassisH, chassisL);
  const chassisMesh = new THREE.Mesh(chassisGeo, chassisMat);
  chassisMesh.position.y = 1.0;
  chassisMesh.castShadow = true;
  chassisMesh.receiveShadow = true;
  rangkaGroup.add(chassisMesh);

  // Pelat Miring Depan (Sloped Glacis Plate)
  const glacisGeo = new THREE.BoxGeometry(chassisW * 0.9, chassisH * 0.45, 0.8);
  const glacisMesh = new THREE.Mesh(glacisGeo, darkPlateMat);
  glacisMesh.position.set(0, 1.0 + chassisH * 0.2, chassisL * 0.45);
  glacisMesh.rotation.x = -Math.PI / 6;
  glacisMesh.castShadow = true;
  rangkaGroup.add(glacisMesh);

  // Visor Sensor Kokpit Depan (Glowing Slit)
  const visorGeo = new THREE.BoxGeometry(chassisW * 0.5, 0.12, 0.1);
  const visorMat = new THREE.MeshBasicMaterial({ color: teamColorHex });
  const visorMesh = new THREE.Mesh(visorGeo, visorMat);
  visorMesh.position.set(0, 1.0 + chassisH * 0.3, chassisL * 0.51);
  rangkaGroup.add(visorMesh);

  // Detail Khusus Kompak vs Lapis Baja
  if (rangkaKey === 'kompak') {
    // Hidung kerucut bersudut tajam
    const noseGeo = new THREE.ConeGeometry(0.6, 0.8, 4);
    noseGeo.rotateX(Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, chassisMat);
    nose.position.set(0, 0.95, chassisL * 0.5 + 0.35);
    rangkaGroup.add(nose);
  } else if (rangkaKey === 'lapis_baja') {
    // Bemper tanduk baja super tebal di depan
    const bumperGeo = new THREE.BoxGeometry(chassisW * 1.05, 0.45, 0.5);
    const bumper = new THREE.Mesh(bumperGeo, darkPlateMat);
    bumper.position.set(0, 0.8, chassisL * 0.52);
    rangkaGroup.add(bumper);
  }

  // Knalpot / Ventilasi Belakang Ganda
  const exhaustGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.6, 12);
  const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9 });
  const exL = new THREE.Mesh(exhaustGeo, exhaustMat);
  exL.rotation.x = Math.PI / 4;
  exL.position.set(-chassisW * 0.35, 1.0 + chassisH * 0.3, -chassisL * 0.5);

  const exR = new THREE.Mesh(exhaustGeo, exhaustMat);
  exR.rotation.x = Math.PI / 4;
  exR.position.set(chassisW * 0.35, 1.0 + chassisH * 0.3, -chassisL * 0.5);

  const heatGeo = new THREE.SphereGeometry(0.08, 8, 8);
  const heatMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
  const heatL = new THREE.Mesh(heatGeo, heatMat);
  heatL.position.set(0, 0.25, 0);
  exL.add(heatL);
  const heatR = new THREE.Mesh(heatGeo, heatMat);
  heatR.position.set(0, 0.25, 0);
  exR.add(heatR);

  rangkaGroup.add(exL, exR);

  partsMeshes.rangka = chassisMesh;
  originalMaterials.set('rangka', chassisMat);
  group.add(rangkaGroup);

  // ==========================================
  // 2. PENGGERAK (LOCOMOTION) BERDETAIL
  // ==========================================
  const penggerakGroup = new THREE.Group();
  const rubberMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.85,
    metalness: 0.2
  });
  const metalHubMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.4,
    metalness: 0.8
  });
  const rimGlowMat = new THREE.MeshBasicMaterial({ color: teamColorHex });

  if (penggerakKey === 'rantai') {
    // Rantai Tank Berdetail
    const createTreadAssembly = (side) => {
      const treadAssembly = new THREE.Group();
      const xPos = side * (chassisW * 0.55 + 0.25);
      const treadWidth = 0.55;
      const treadLength = chassisL * 1.15;
      const treadHeight = 0.75;

      const beltGeo = new THREE.BoxGeometry(treadWidth, treadHeight, treadLength);
      const beltMesh = new THREE.Mesh(beltGeo, rubberMat);
      beltMesh.position.set(0, 0.45, 0);
      beltMesh.castShadow = true;
      treadAssembly.add(beltMesh);

      const fenderGeo = new THREE.BoxGeometry(treadWidth * 1.15, 0.12, treadLength * 1.05);
      const fenderMesh = new THREE.Mesh(fenderGeo, darkPlateMat);
      fenderMesh.position.set(0, 0.45 + treadHeight * 0.5 + 0.05, 0);
      fenderMesh.castShadow = true;
      treadAssembly.add(fenderMesh);

      const sprocketGeo = new THREE.CylinderGeometry(0.38, 0.38, treadWidth * 0.9, 16);
      sprocketGeo.rotateZ(Math.PI / 2);
      const sprocket = new THREE.Mesh(sprocketGeo, metalHubMat);
      sprocket.position.set(0, 0.5, treadLength * 0.4);
      sprocket.castShadow = true;
      treadAssembly.add(sprocket);

      const idlerGeo = new THREE.CylinderGeometry(0.35, 0.35, treadWidth * 0.9, 16);
      idlerGeo.rotateZ(Math.PI / 2);
      const idler = new THREE.Mesh(idlerGeo, metalHubMat);
      idler.position.set(0, 0.5, -treadLength * 0.4);
      idler.castShadow = true;
      treadAssembly.add(idler);

      const wheelZOffsets = [-0.9, -0.3, 0.3, 0.9];
      wheelZOffsets.forEach(zOff => {
        const rwGeo = new THREE.CylinderGeometry(0.32, 0.32, treadWidth * 0.85, 14);
        rwGeo.rotateZ(Math.PI / 2);
        const rw = new THREE.Mesh(rwGeo, metalHubMat);
        rw.position.set(0, 0.36, zOff);
        rw.castShadow = true;
        treadAssembly.add(rw);
      });

      treadAssembly.position.x = xPos;
      return treadAssembly;
    };

    penggerakGroup.add(createTreadAssembly(-1));
    penggerakGroup.add(createTreadAssembly(1));

  } else if (penggerakKey === 'kaki') {
    // 4 Kaki Mekanik Berdetail
    const corners = [
      [-chassisW * 0.55, chassisL * 0.4],
      [chassisW * 0.55, chassisL * 0.4],
      [-chassisW * 0.55, -chassisL * 0.4],
      [chassisW * 0.55, -chassisL * 0.4]
    ];

    corners.forEach(([cx, cz]) => {
      const legAssembly = new THREE.Group();
      legAssembly.position.set(cx, 0.8, cz);

      const jointGeo = new THREE.SphereGeometry(0.24, 12, 12);
      const joint = new THREE.Mesh(jointGeo, metalHubMat);
      legAssembly.add(joint);

      const thighGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.7, 8);
      const thigh = new THREE.Mesh(thighGeo, darkPlateMat);
      thigh.position.set(cx > 0 ? 0.25 : -0.25, -0.2, 0);
      thigh.rotation.z = cx > 0 ? -Math.PI / 5 : Math.PI / 5;
      legAssembly.add(thigh);

      const footGeo = new THREE.BoxGeometry(0.5, 0.16, 0.65);
      const foot = new THREE.Mesh(footGeo, rubberMat);
      foot.position.set(cx > 0 ? 0.45 : -0.45, -0.72, 0);
      foot.castShadow = true;
      legAssembly.add(foot);

      penggerakGroup.add(legAssembly);
    });

  } else if (penggerakKey === 'omni') {
    // Modul 4: Roda Omni (4 Roda Multi-Roller Spherical 45 derajat)
    const omniPositions = [
      [-chassisW * 0.52, 0.45, chassisL * 0.35],
      [chassisW * 0.52, 0.45, chassisL * 0.35],
      [-chassisW * 0.52, 0.45, -chassisL * 0.35],
      [chassisW * 0.52, 0.45, -chassisL * 0.35]
    ];

    omniPositions.forEach(([wx, wy, wz]) => {
      const oGroup = new THREE.Group();
      oGroup.position.set(wx, wy, wz);

      const sphereGeo = new THREE.SphereGeometry(0.46, 16, 12);
      const sphereMesh = new THREE.Mesh(sphereGeo, rubberMat);
      sphereMesh.castShadow = true;
      oGroup.add(sphereMesh);

      // Cincin roller omni diagonal
      const ringGeo = new THREE.TorusGeometry(0.48, 0.06, 8, 20);
      ringGeo.rotateY(Math.PI / 4);
      const ringMesh = new THREE.Mesh(ringGeo, rimGlowMat);
      oGroup.add(ringMesh);

      penggerakGroup.add(oGroup);
    });

  } else if (penggerakKey === 'melayang') {
    // Modul 4: Pendorong Melayang (4 Hover Repulsor Pods dengan Cincin Plasma)
    const hoverPositions = [
      [-chassisW * 0.42, 0.35, chassisL * 0.35],
      [chassisW * 0.42, 0.35, chassisL * 0.35],
      [-chassisW * 0.42, 0.35, -chassisL * 0.35],
      [chassisW * 0.42, 0.35, -chassisL * 0.35]
    ];

    hoverPositions.forEach(([hx, hy, hz]) => {
      const hGroup = new THREE.Group();
      hGroup.position.set(hx, hy, hz);

      const podGeo = new THREE.CylinderGeometry(0.46, 0.36, 0.32, 16);
      const podMesh = new THREE.Mesh(podGeo, metalHubMat);
      podMesh.castShadow = true;
      hGroup.add(podMesh);

      // Cincin plasma hover menyala terang
      const plasmaGeo = new THREE.TorusGeometry(0.38, 0.08, 8, 24);
      plasmaGeo.rotateX(Math.PI / 2);
      const plasmaMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      const plasmaMesh = new THREE.Mesh(plasmaGeo, plasmaMat);
      plasmaMesh.position.y = -0.16;
      hGroup.add(plasmaMesh);

      penggerakGroup.add(hGroup);
    });

  } else {
    // Roda Cepat Berdetail
    const wheelPositions = [
      [-chassisW * 0.55, 0.5, chassisL * 0.35],
      [chassisW * 0.55, 0.5, chassisL * 0.35],
      [-chassisW * 0.55, 0.5, -chassisL * 0.35],
      [chassisW * 0.55, 0.5, -chassisL * 0.35]
    ];

    wheelPositions.forEach(([wx, wy, wz]) => {
      const wheelAssembly = new THREE.Group();
      wheelAssembly.position.set(wx, wy, wz);

      const tireGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.38, 18);
      tireGeo.rotateZ(Math.PI / 2);
      const tire = new THREE.Mesh(tireGeo, rubberMat);
      tire.castShadow = true;
      wheelAssembly.add(tire);

      const rimGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.4, 14);
      rimGeo.rotateZ(Math.PI / 2);
      const rim = new THREE.Mesh(rimGeo, metalHubMat);
      wheelAssembly.add(rim);

      penggerakGroup.add(wheelAssembly);
    });
  }

  partsMeshes.penggerak = penggerakGroup;
  originalMaterials.set('penggerak', rubberMat);
  group.add(penggerakGroup);

  // ==========================================
  // 3. SENJATA & TURET INDEPENDEN 360°
  // ==========================================
  const turretGroup = new THREE.Group();
  turretGroup.position.y = 1.0 + chassisH * 0.5;
  turretGroup.name = 'turret_pivot';

  const turretBaseGeo = new THREE.CylinderGeometry(0.9, 1.0, 0.35, 20);
  const turretBaseMat = new THREE.MeshStandardMaterial({
    color: baseDarkHex,
    roughness: 0.3,
    metalness: 0.85
  });
  const turretBase = new THREE.Mesh(turretBaseGeo, turretBaseMat);
  turretBase.position.y = 0.18;
  turretGroup.add(turretBase);

  const turretRingGeo = new THREE.TorusGeometry(0.92, 0.04, 8, 24);
  turretRingGeo.rotateX(Math.PI / 2);
  const turretRing = new THREE.Mesh(turretRingGeo, rimGlowMat);
  turretRing.position.y = 0.18;
  turretGroup.add(turretRing);

  const muzzleTip = new THREE.Object3D();
  muzzleTip.name = 'muzzle_tip';

  let weaponMat;

  if (senjataKey === 'meriam') {
    // Meriam Berat
    weaponMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.25,
      metalness: 0.9
    });

    const barrelGeo = new THREE.CylinderGeometry(0.24, 0.3, 2.7, 18);
    barrelGeo.rotateX(Math.PI / 2);
    const barrel = new THREE.Mesh(barrelGeo, weaponMat);
    barrel.position.set(0, 0.3, 1.6);
    barrel.castShadow = true;
    turretGroup.add(barrel);

    const mbGeo = new THREE.BoxGeometry(0.7, 0.45, 0.6);
    const mbMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.95 });
    const muzzleBrake = new THREE.Mesh(mbGeo, mbMat);
    muzzleBrake.position.set(0, 0.3, 2.9);
    turretGroup.add(muzzleBrake);

    muzzleTip.position.set(0, 0.3, 3.25);
    turretGroup.add(muzzleTip);

  } else if (senjataKey === 'laser') {
    // Laser Presisi
    weaponMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x00f0ff,
      emissiveIntensity: 1.4,
      roughness: 0.15
    });

    const tubeGeo = new THREE.CylinderGeometry(0.16, 0.2, 2.8, 16);
    tubeGeo.rotateX(Math.PI / 2);
    const tube = new THREE.Mesh(tubeGeo, weaponMat);
    tube.position.set(0, 0.28, 1.5);
    turretGroup.add(tube);

    [0.7, 1.4, 2.2].forEach(zPos => {
      const ringGeo = new THREE.TorusGeometry(0.3, 0.05, 8, 20);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(0, 0.28, zPos);
      turretGroup.add(ring);
    });

    muzzleTip.position.set(0, 0.28, 2.95);
    turretGroup.add(muzzleTip);

  } else if (senjataKey === 'rudal') {
    // Rudal Pengejar
    weaponMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.4,
      metalness: 0.75
    });

    const podGeo = new THREE.BoxGeometry(0.9, 0.65, 1.6);
    const podL = new THREE.Mesh(podGeo, weaponMat);
    podL.position.set(-0.95, 0.35, 0.5);
    const podR = new THREE.Mesh(podGeo, weaponMat);
    podR.position.set(0.95, 0.35, 0.5);
    turretGroup.add(podL, podR);

    const tipGeo = new THREE.ConeGeometry(0.14, 0.35, 12);
    tipGeo.rotateX(Math.PI / 2);
    const tipMat = new THREE.MeshBasicMaterial({ color: 0xff3366 });
    [
      [-1.12, 0.48], [-0.78, 0.48], [-1.12, 0.22], [-0.78, 0.22],
      [0.78, 0.48], [1.12, 0.48], [0.78, 0.22], [1.12, 0.22]
    ].forEach(([tx, ty]) => {
      const tip = new THREE.Mesh(tipGeo, tipMat);
      tip.position.set(tx, ty, 1.35);
      turretGroup.add(tip);
    });

    muzzleTip.position.set(0, 0.35, 1.6);
    turretGroup.add(muzzleTip);

  } else if (senjataKey === 'railgun') {
    // Modul 4: Railgun Presisi (Rel Magnetik Kembar & Cincin Kapasitor Plasma)
    weaponMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.2,
      metalness: 0.95
    });

    const railGeo = new THREE.BoxGeometry(0.12, 0.28, 3.8);
    const railL = new THREE.Mesh(railGeo, weaponMat);
    railL.position.set(-0.24, 0.3, 1.9);
    const railR = new THREE.Mesh(railGeo, weaponMat);
    railR.position.set(0.24, 0.3, 1.9);
    turretGroup.add(railL, railR);

    // 4 Cincin Kapasitor Energi Plasma Biru
    [0.6, 1.4, 2.2, 3.1].forEach(zPos => {
      const cGeo = new THREE.BoxGeometry(0.68, 0.38, 0.14);
      const cMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const cMesh = new THREE.Mesh(cGeo, cMat);
      cMesh.position.set(0, 0.3, zPos);
      turretGroup.add(cMesh);
    });

    muzzleTip.position.set(0, 0.3, 3.85);
    turretGroup.add(muzzleTip);

  } else if (senjataKey === 'api') {
    // Modul 4: Semburan Api (Flamethrower Ganda & Tabung Bahan Bakar)
    weaponMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.4,
      metalness: 0.8
    });

    const fGeo = new THREE.CylinderGeometry(0.14, 0.18, 1.7, 12);
    fGeo.rotateX(Math.PI / 2);
    const fL = new THREE.Mesh(fGeo, weaponMat);
    fL.position.set(-0.28, 0.26, 0.9);
    const fR = new THREE.Mesh(fGeo, weaponMat);
    fR.position.set(0.28, 0.26, 0.9);
    turretGroup.add(fL, fR);

    // Pilot flame ignition tip
    const ignGeo = new THREE.SphereGeometry(0.14, 8, 8);
    const ignMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
    const ign = new THREE.Mesh(ignGeo, ignMat);
    ign.position.set(0, 0.26, 1.78);
    turretGroup.add(ign);

    // Tabung bahan bakar belakang turet
    const tankGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.9, 12);
    const tankMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, metalness: 0.7 });
    const tankL = new THREE.Mesh(tankGeo, tankMat);
    tankL.position.set(-0.55, 0.4, -0.6);
    const tankR = new THREE.Mesh(tankGeo, tankMat);
    tankR.position.set(0.55, 0.4, -0.6);
    turretGroup.add(tankL, tankR);

    muzzleTip.position.set(0, 0.26, 1.9);
    turretGroup.add(muzzleTip);

  } else if (senjataKey === 'emp') {
    // Modul 4: Pulsa EMP (Bola Tesla Coil & Cincin Orbit Listrik)
    weaponMat = new THREE.MeshStandardMaterial({
      color: 0x4c1d95,
      emissive: 0xa855f7,
      emissiveIntensity: 1.2,
      roughness: 0.2
    });

    const globeGeo = new THREE.SphereGeometry(0.44, 16, 16);
    const globe = new THREE.Mesh(globeGeo, weaponMat);
    globe.position.set(0, 0.38, 0.7);
    turretGroup.add(globe);

    const ringMat = new THREE.MeshBasicMaterial({ color: 0xc084fc });
    const ring1Geo = new THREE.TorusGeometry(0.68, 0.05, 8, 24);
    ring1Geo.rotateX(Math.PI / 3);
    const ring1 = new THREE.Mesh(ring1Geo, ringMat);
    ring1.position.set(0, 0.38, 0.7);

    const ring2Geo = new THREE.TorusGeometry(0.68, 0.05, 8, 24);
    ring2Geo.rotateY(Math.PI / 3);
    const ring2 = new THREE.Mesh(ring2Geo, ringMat);
    ring2.position.set(0, 0.38, 0.7);
    turretGroup.add(ring1, ring2);

    muzzleTip.position.set(0, 0.38, 1.6);
    turretGroup.add(muzzleTip);

  } else {
    // Tembakan Beruntun (Gatling)
    weaponMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.3,
      metalness: 0.95
    });

    const bGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.4, 10);
    bGeo.rotateX(Math.PI / 2);

    const barrelCluster = new THREE.Group();
    barrelCluster.name = 'gatling_cluster';
    barrelCluster.position.set(0, 0.3, 1.2);

    const radius = 0.18;
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const b = new THREE.Mesh(bGeo, weaponMat);
      b.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
      barrelCluster.add(b);
    }

    const collarGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.15, 16);
    collarGeo.rotateX(Math.PI / 2);
    const collar = new THREE.Mesh(collarGeo, metalHubMat);
    collar.position.set(0, 0, 0.6);
    barrelCluster.add(collar);

    turretGroup.add(barrelCluster);

    muzzleTip.position.set(0, 0.3, 2.5);
    turretGroup.add(muzzleTip);
  }

  partsMeshes.senjata = turretGroup;
  originalMaterials.set('senjata', weaponMat);
  group.add(turretGroup);

  // ==========================================
  // 4. SENSOR (RADAR / DISH / TERMAL)
  // ==========================================
  if (sensorKey && sensorKey !== 'kosong') {
    const sensorGroup = new THREE.Group();
    let sMat;

    if (sensorKey === '360') {
      const sGeo = new THREE.SphereGeometry(0.48, 16, 16);
      sMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.8,
        roughness: 0.2
      });
      const sMesh = new THREE.Mesh(sGeo, sMat);
      sMesh.position.set(0, 2.1, -0.4);
      sensorGroup.add(sMesh);

    } else if (sensorKey === 'termal') {
      // Modul 4: Sensor Termal (Pod Inframerah dengan Lensa Sensor Ganda Oranye)
      sMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
      const tBoxGeo = new THREE.BoxGeometry(0.85, 0.42, 0.65);
      const tBox = new THREE.Mesh(tBoxGeo, sMat);
      tBox.position.set(0, 2.0, -0.4);

      const lensGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.12, 14);
      lensGeo.rotateX(Math.PI / 2);
      const lensMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
      const l1 = new THREE.Mesh(lensGeo, lensMat);
      l1.position.set(-0.24, 2.0, -0.07);
      const l2 = new THREE.Mesh(lensGeo, lensMat);
      l2.position.set(0.24, 2.0, -0.07);
      sensorGroup.add(tBox, l1, l2);

    } else if (sensorKey === 'jauh') {
      const mastGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.2, 8);
      const mast = new THREE.Mesh(mastGeo, metalHubMat);
      mast.position.set(0, 2.2, -0.5);

      const dishGeo = new THREE.ConeGeometry(0.48, 0.22, 18);
      dishGeo.rotateX(-Math.PI / 3.5);
      sMat = new THREE.MeshStandardMaterial({
        color: teamColorHex,
        emissive: teamColorHex,
        emissiveIntensity: 0.5,
        metalness: 0.6
      });
      const dish = new THREE.Mesh(dishGeo, sMat);
      dish.position.set(0, 2.8, -0.5);
      sensorGroup.add(mast, dish);

    } else {
      // Sensor Pendek Lapis Baja
      const sGeo = new THREE.BoxGeometry(0.7, 0.4, 0.7);
      sMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8 });
      const sMesh = new THREE.Mesh(sGeo, sMat);
      sMesh.position.set(0, 1.9, -0.4);
      sensorGroup.add(sMesh);
    }

    partsMeshes.sensor = sensorGroup;
    originalMaterials.set('sensor', sMat);
    group.add(sensorGroup);
  }

  // ==========================================
  // 5. ARMOR (PELAT BAJA TEBAL DENGAN GLOW REAKTIF)
  // ==========================================
  let armorMaterial = null;

  if (armorKey && armorKey !== 'kosong') {
    const armorGroup = new THREE.Group();

    armorMaterial = new THREE.MeshStandardMaterial({
      color: steelHex,
      roughness: 0.45,
      metalness: 0.85,
      emissive: teamColorHex,
      emissiveIntensity: 0.25
    });

    const reactiveBlockMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.9,
      roughness: 0.3
    });

    if (armorKey === 'berat') {
      // Armor Berat: Side skirts tebal & balok ERA
      const skirtGeo = new THREE.BoxGeometry(0.3, chassisH * 0.9, chassisL * 1.05);
      const skirtL = new THREE.Mesh(skirtGeo, armorMaterial);
      skirtL.position.set(-chassisW * 0.58, 0.85, 0);
      skirtL.castShadow = true;

      const skirtR = new THREE.Mesh(skirtGeo, armorMaterial);
      skirtR.position.set(chassisW * 0.58, 0.85, 0);
      skirtR.castShadow = true;
      armorGroup.add(skirtL, skirtR);

      const brickGeo = new THREE.BoxGeometry(0.5, 0.25, 0.2);
      for (let i = -2; i <= 2; i++) {
        const brick = new THREE.Mesh(brickGeo, reactiveBlockMat);
        brick.position.set(i * 0.6, 1.0, chassisL * 0.56);
        brick.castShadow = true;
        armorGroup.add(brick);
      }

    } else if (armorKey === 'reaktif') {
      // Modul 4: Armor Reaktif Regenerasi (Pelat Nanite Komposit dengan Jalur Hijau/Cyan)
      const skirtGeo = new THREE.BoxGeometry(0.26, chassisH * 0.82, chassisL * 0.95);
      const skirtL = new THREE.Mesh(skirtGeo, armorMaterial);
      skirtL.position.set(-chassisW * 0.56, 0.85, 0);
      const skirtR = new THREE.Mesh(skirtGeo, armorMaterial);
      skirtR.position.set(chassisW * 0.56, 0.85, 0);
      armorGroup.add(skirtL, skirtR);

      // Jalur sel nanite regenerasi
      const naniteMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
      [-0.8, 0, 0.8].forEach(zOff => {
        const blockGeo = new THREE.BoxGeometry(0.3, 0.24, 0.45);
        const bL = new THREE.Mesh(blockGeo, naniteMat);
        bL.position.set(-chassisW * 0.56, 0.85, zOff);
        const bR = new THREE.Mesh(blockGeo, naniteMat);
        bR.position.set(chassisW * 0.56, 0.85, zOff);
        armorGroup.add(bL, bR);
      });

    } else if (armorKey === 'sedang') {
      // Armor Sedang
      const skirtGeo = new THREE.BoxGeometry(0.24, chassisH * 0.75, chassisL * 0.95);
      const skirtL = new THREE.Mesh(skirtGeo, armorMaterial);
      skirtL.position.set(-chassisW * 0.55, 0.85, 0);

      const skirtR = new THREE.Mesh(skirtGeo, armorMaterial);
      skirtR.position.set(chassisW * 0.55, 0.85, 0);
      armorGroup.add(skirtL, skirtR);

      const frontBarGeo = new THREE.BoxGeometry(chassisW * 1.05, 0.28, 0.35);
      const frontBar = new THREE.Mesh(frontBarGeo, armorMaterial);
      frontBar.position.set(0, 0.7, chassisL * 0.52);
      armorGroup.add(frontBar);

    } else {
      // Armor Ringan
      const plateGeo = new THREE.BoxGeometry(0.18, chassisH * 0.6, chassisL * 0.85);
      const pL = new THREE.Mesh(plateGeo, armorMaterial);
      pL.position.set(-chassisW * 0.53, 0.85, 0);

      const pR = new THREE.Mesh(plateGeo, armorMaterial);
      pR.position.set(chassisW * 0.53, 0.85, 0);
      armorGroup.add(pL, pR);
    }

    partsMeshes.armor = armorGroup;
    originalMaterials.set('armor', armorMaterial);
    group.add(armorGroup);
  }

  group.partsMeshes = partsMeshes;
  group.originalMaterials = originalMaterials;
  group.turretMesh = turretGroup;
  group.muzzleTip = muzzleTip;
  group.armorMaterial = armorMaterial;

  return group;
}

/**
 * Update visual ketika suatu part rusak
 */
export function updatePartDamageVisual(robotGroup, partKey, isBroken) {
  if (!robotGroup || !robotGroup.partsMeshes) return;
  const target = robotGroup.partsMeshes[partKey];
  if (!target) return;

  const brokenMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.95,
    metalness: 0.1,
    emissive: 0x000000
  });

  target.traverse(child => {
    if (child.isMesh) {
      if (isBroken) {
        child.material = brokenMat;
      } else {
        const orig = robotGroup.originalMaterials.get(partKey);
        if (orig) child.material = orig;
      }
    }
  });
}

/**
 * Buat billboard text sprite 3D
 */
export function createBillboardText(text, color = '#ef4444') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.fillRect(4, 4, 248, 56);
  ctx.strokeRect(4, 4, 248, 56);

  ctx.font = 'bold 22px Rajdhani, sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(4, 1, 1);
  return sprite;
}

/**
 * Generator Puing Fisika Robot Hancur
 */
export function createRobotDebrisPieces(loadout = {}, team = 'teamA', worldPos = { x: 0, y: 1, z: 0 }) {
  const debrisPieces = [];

  const charredMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.9,
    metalness: 0.3
  });

  const glowingScrapMat = new THREE.MeshStandardMaterial({
    color: 0x27272a,
    emissive: 0xff4400,
    emissiveIntensity: 0.8,
    roughness: 0.7
  });

  const debrisConfigs = [
    { geo: new THREE.CylinderGeometry(0.7, 0.8, 0.3, 10), mat: charredMat },
    { geo: new THREE.CylinderGeometry(0.18, 0.22, 1.6, 8), mat: charredMat },
    { geo: new THREE.BoxGeometry(1.2, 0.6, 1.2), mat: glowingScrapMat },
    { geo: new THREE.BoxGeometry(1.0, 0.5, 0.9), mat: charredMat },
    { geo: new THREE.BoxGeometry(0.4, 0.5, 1.4), mat: charredMat },
    { geo: new THREE.CylinderGeometry(0.4, 0.4, 0.3, 10), mat: charredMat },
    { geo: new THREE.BoxGeometry(0.2, 0.8, 1.2), mat: charredMat },
    { geo: new THREE.BoxGeometry(0.8, 0.2, 0.8), mat: glowingScrapMat },
    { geo: new THREE.ConeGeometry(0.3, 0.4, 8), mat: charredMat }
  ];

  debrisConfigs.forEach((cfg) => {
    const mesh = new THREE.Mesh(cfg.geo, cfg.mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    mesh.position.set(
      worldPos.x + (Math.random() - 0.5) * 1.5,
      worldPos.y + 0.5 + Math.random() * 1.0,
      worldPos.z + (Math.random() - 0.5) * 1.5
    );

    const angle = Math.random() * Math.PI * 2;
    const speed = 7 + Math.random() * 11;
    const vel = new THREE.Vector3(
      Math.cos(angle) * speed,
      8 + Math.random() * 10,
      Math.sin(angle) * speed
    );

    mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    const rotVel = new THREE.Vector3(
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 12
    );

    debrisPieces.push({
      mesh,
      vel,
      rotVel,
      isGrounded: false,
      bounceCount: 0,
      smokeTimer: 0,
      lifetime: 15.0
    });
  });

  return debrisPieces;
}
