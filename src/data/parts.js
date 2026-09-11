import { BALANCE } from './balance.js';

export const PARTS = {
  rangka: {
    ringan: {
      id: 'ringan',
      label: 'Ringan',
      nama: 'Rangka Ringan',
      hpMax: 90,
      radius: 20,
      speedModifier: 0.25,
      color: 0x38bdf8,
      deskripsi: 'HP rendah, +25% kecepatan gerak. Lincah bermanuver.'
    },
    sedang: {
      id: 'sedang',
      label: 'Sedang',
      nama: 'Rangka Sedang',
      hpMax: 140,
      radius: 22,
      speedModifier: 0.0,
      color: 0x818cf8,
      deskripsi: 'Seimbang, daya tahan dan kecepatan standar.'
    },
    berat: {
      id: 'berat',
      label: 'Berat',
      nama: 'Rangka Berat',
      hpMax: 210,
      radius: 24,
      speedModifier: -0.20,
      color: 0x475569,
      deskripsi: 'HP sangat tinggi, -20% kecepatan gerak. Tahan gempuran.'
    },
    kompak: {
      id: 'kompak',
      label: 'Kompak',
      nama: 'Rangka Kompak',
      hpMax: 65,
      radius: 17,
      speedModifier: 0.35,
      color: 0x06b6d4,
      deskripsi: 'Hitbox kecil (radius 17), +35% kecepatan gerak, tapi HP rendah.'
    },
    lapis_baja: {
      id: 'lapis_baja',
      label: 'Lapis Baja',
      nama: 'Rangka Lapis Baja',
      hpMax: 280,
      radius: 26,
      speedModifier: -0.35,
      color: 0x1e293b,
      deskripsi: 'HP super tebal (280), sangat tahan banting, tapi gerak lambat (-35%).'
    }
  },

  penggerak: {
    roda: {
      id: 'roda',
      label: 'Roda Cepat',
      nama: 'Roda Cepat',
      hpMax: 70,
      speedModifier: 0.20,
      turnModifier: 1.0,
      deskripsi: 'Kecepatan tinggi di area terbuka. Cocok untuk serbuan kilat.'
    },
    rantai: {
      id: 'rantai',
      label: 'Rantai Tank',
      nama: 'Rantai / Track',
      hpMax: 110,
      speedModifier: 0.0,
      turnModifier: 0.85,
      deskripsi: 'HP part tebal, stabil dan tahan terhadap kerusakan tembakan.'
    },
    kaki: {
      id: 'kaki',
      label: 'Kaki Mekanik',
      nama: 'Kaki Mekanik',
      hpMax: 85,
      speedModifier: -0.05,
      turnModifier: 1.4,
      deskripsi: 'Kecepatan sedang dengan manuver putar sangat lincah.'
    },
    omni: {
      id: 'omni',
      label: 'Roda Omni',
      nama: 'Roda Omni',
      hpMax: 75,
      speedModifier: 0.05,
      turnModifier: 2.2,
      strafe: true,
      deskripsi: 'Bisa geser (strafe) dan putar instan ke segala arah, kecepatan sedang.'
    },
    melayang: {
      id: 'melayang',
      label: 'Melayang',
      nama: 'Pendorong Melayang',
      hpMax: 45,
      speedModifier: 0.35,
      turnModifier: 1.15,
      hover: true,
      deskripsi: 'Kecepatan sangat tinggi (+35%) merata di segala medan, tapi HP tipis.'
    }
  },

  senjata: {
    meriam: {
      id: 'meriam',
      label: 'Meriam Berat',
      nama: 'Meriam Berat',
      hpMax: 65,
      damage: 38,
      cooldown: 1.6,
      range: 420,
      projectileSpeed: 380,
      bulletColor: 0xffaa00,
      deskripsi: 'Damage besar, cooldown lama, proyektil melesat.'
    },
    laser: {
      id: 'laser',
      label: 'Laser Presisi',
      nama: 'Laser Presisi',
      hpMax: 50,
      damage: 16,
      cooldown: 0.75,
      range: 480,
      projectileSpeed: 1600,
      bulletColor: 0x00f0ff,
      deskripsi: 'Hit sangat cepat, akurasi tinggi, jangkauan jauh.'
    },
    rudal: {
      id: 'rudal',
      label: 'Rudal Pengejar',
      nama: 'Rudal Pengejar',
      hpMax: 55,
      damage: 30,
      cooldown: 2.3,
      range: 440,
      projectileSpeed: 240,
      homing: true,
      bulletColor: 0xff3366,
      deskripsi: 'Membelok mengejar musuh terdekat, damage signifikan.'
    },
    beruntun: {
      id: 'beruntun',
      label: 'Tembakan Beruntun',
      nama: 'Tembakan Beruntun',
      hpMax: 60,
      damage: 9,
      burstCount: 4,
      burstInterval: 0.08,
      cooldown: 1.3,
      range: 280,
      projectileSpeed: 440,
      bulletColor: 0xa855f7,
      deskripsi: 'Menembakkan 4 peluru bertubi-tubi pada jarak dekat.'
    },
    railgun: {
      id: 'railgun',
      label: 'Railgun',
      nama: 'Railgun Presisi',
      hpMax: 60,
      damage: 85,
      cooldown: 3.5,
      chargeDelay: 0.15,
      range: 600,
      projectileSpeed: 2400,
      bulletColor: 0x38bdf8,
      deskripsi: 'Damage sangat besar (85), jeda isi tenaga (charge), cooldown panjang.'
    },
    api: {
      id: 'api',
      label: 'Semburan Api',
      nama: 'Semburan Api',
      hpMax: 55,
      damage: 6,
      dotInterval: 0.1,
      cooldown: 0.35,
      range: 160,
      projectileSpeed: 400,
      bulletColor: 0xff6600,
      isFlamethrower: true,
      deskripsi: 'Semburan api kontinu jarak dekat, membakar musuh terus-menerus.'
    },
    emp: {
      id: 'emp',
      label: 'Pulsa EMP',
      nama: 'Pulsa EMP',
      hpMax: 50,
      damage: 12,
      cooldown: 2.8,
      range: 350,
      projectileSpeed: 520,
      bulletColor: 0xc084fc,
      empDuration: 3.0,
      isEmp: true,
      deskripsi: 'Melumpuhkan musuh selama 3 detik walau penggeraknya utuh.'
    }
  },

  sensor: {
    kosong: {
      id: 'kosong',
      label: 'Tanpa Sensor',
      nama: 'Tanpa Sensor Ekstra',
      hpMax: 0,
      radius: BALANCE.ARENA.DEFAULT_SENSOR_RADIUS,
      omnidirectional: false,
      deskripsi: 'Menggunakan sensor internal standar bawaan robot.'
    },
    pendek: {
      id: 'pendek',
      label: 'Pendek Baja',
      nama: 'Sensor Pendek Lapis Baja',
      hpMax: 85,
      radius: 230,
      omnidirectional: false,
      deskripsi: 'Radius deteksi kecil, tapi HP part tebal sehingga awet.'
    },
    jauh: {
      id: 'jauh',
      label: 'Jarak Jauh',
      nama: 'Radar Jarak Jauh',
      hpMax: 40,
      radius: 460,
      omnidirectional: false,
      deskripsi: 'Radius deteksi sangat luas, namun rentan rusak.'
    },
    '360': {
      id: '360',
      label: 'Radar 360°',
      nama: 'Sensor 360° Omnidireksional',
      hpMax: 35,
      radius: 320,
      omnidirectional: true,
      deskripsi: 'Mampu melihat musuh ke segala penjuru tanpa harus menghadap.'
    },
    termal: {
      id: 'termal',
      label: 'Termal',
      nama: 'Sensor Termal',
      hpMax: 45,
      radius: 340,
      termal: true,
      deskripsi: 'Radius sedang, tapi mendeteksi musuh lumpuh/terbakar di jarak berapa pun!'
    }
  },

  armor: {
    kosong: {
      id: 'kosong',
      label: 'Tanpa Armor',
      nama: 'Tanpa Armor Tambahan',
      hpMax: 0,
      reduction: 0,
      speedModifier: 0,
      deskripsi: 'Tidak ada pelat armor ekstra. Bobot robot maksimal ringan.'
    },
    ringan: {
      id: 'ringan',
      label: 'Ringan',
      nama: 'Armor Komposit Ringan',
      hpMax: 50,
      reduction: BALANCE.ARMOR_REDUCTION.ringan,
      speedModifier: -0.02,
      deskripsi: 'Menyerap 20% dari tiap serangan masuk. Sedikit mengurangi speed.'
    },
    sedang: {
      id: 'sedang',
      label: 'Sedang',
      nama: 'Armor Pelat Baja Sedang',
      hpMax: 90,
      reduction: BALANCE.ARMOR_REDUCTION.sedang,
      speedModifier: -0.08,
      deskripsi: 'Menyerap 35% damage per hit. Perlindungan seimbang.'
    },
    berat: {
      id: 'berat',
      label: 'Berat',
      nama: 'Armor Reaktif Berat',
      hpMax: 140,
      reduction: BALANCE.ARMOR_REDUCTION.berat,
      speedModifier: -0.18,
      deskripsi: 'Menyerap 50% damage per hit. Bobot berat memperlambat gerak.'
    },
    reaktif: {
      id: 'reaktif',
      label: 'Reaktif',
      nama: 'Armor Reaktif Regenerasi',
      hpMax: 60,
      reduction: BALANCE.ARMOR_REDUCTION.reaktif,
      speedModifier: -0.04,
      isReactive: true,
      regenRate: 5,
      deskripsi: 'Reduksi 15%, meregenerasi HP armor perlahan jika 3.5 detik tidak kena hit.'
    }
  }
};

/**
 * Buat instance state part untuk sebuah robot berdasarkan loadout terpilih
 */
export function createPartsState(loadout) {
  const l = loadout || {};
  const rangkaKey = l.rangka || 'sedang';
  const penggerakKey = l.penggerak || 'roda';
  const senjataKey = l.senjata || 'meriam';
  const sensorKey = l.sensor || 'kosong';
  const armorKey = l.armor || 'kosong';

  const rData = PARTS.rangka[rangkaKey] || PARTS.rangka.sedang;
  const pData = PARTS.penggerak[penggerakKey] || PARTS.penggerak.roda;
  const sData = PARTS.senjata[senjataKey] || PARTS.senjata.meriam;
  const sensData = PARTS.sensor[sensorKey] || PARTS.sensor.kosong;
  const aData = PARTS.armor[armorKey] || PARTS.armor.kosong;

  return {
    rangka: {
      jenis: rData.id,
      nama: rData.nama,
      hp: rData.hpMax,
      hpMax: rData.hpMax,
      radius: rData.radius || 22,
      speedModifier: rData.speedModifier
    },
    penggerak: {
      jenis: pData.id,
      nama: pData.nama,
      hp: pData.hpMax,
      hpMax: pData.hpMax,
      speedModifier: pData.speedModifier,
      turnModifier: pData.turnModifier,
      strafe: !!pData.strafe,
      hover: !!pData.hover
    },
    senjata: {
      jenis: sData.id,
      nama: sData.nama,
      hp: sData.hpMax,
      hpMax: sData.hpMax,
      damage: sData.damage,
      cooldown: sData.cooldown,
      range: sData.range,
      projectileSpeed: sData.projectileSpeed,
      homing: !!sData.homing,
      burstCount: sData.burstCount || 1,
      burstInterval: sData.burstInterval || 0,
      chargeDelay: sData.chargeDelay || 0,
      isFlamethrower: !!sData.isFlamethrower,
      isEmp: !!sData.isEmp,
      empDuration: sData.empDuration || 0
    },
    sensor: {
      jenis: sensData.id,
      nama: sensData.nama,
      hp: sensData.hpMax,
      hpMax: sensData.hpMax,
      radius: sensData.radius,
      omnidirectional: !!sensData.omnidirectional,
      termal: !!sensData.termal
    },
    armor: {
      jenis: aData.id,
      nama: aData.nama,
      hp: aData.hpMax,
      hpMax: aData.hpMax,
      reduction: aData.reduction,
      speedModifier: aData.speedModifier,
      isReactive: !!aData.isReactive,
      regenRate: aData.regenRate || 0
    }
  };
}

/**
 * Hitung kalkulasi stat ringkasan gabungan untuk Bengkel UI
 */
export function calculateTotalStats(loadout) {
  const parts = createPartsState(loadout);
  const totalHP = parts.rangka.hpMax + parts.penggerak.hpMax + parts.senjata.hpMax +
    parts.sensor.hpMax + parts.armor.hpMax;

  // Total speed modifier
  let speedMod = 1.0 + parts.rangka.speedModifier + parts.penggerak.speedModifier + parts.armor.speedModifier;
  speedMod = Math.max(0.3, speedMod);

  const effectiveSpeed = Math.round(BALANCE.ARENA.BASE_ROBOT_SPEED * speedMod);
  const sensorRange = parts.sensor.radius;
  let weaponDamage = parts.senjata.damage;
  if (parts.senjata.burstCount > 1) {
    weaponDamage = `${parts.senjata.damage} x ${parts.senjata.burstCount}`;
  } else if (parts.senjata.isFlamethrower) {
    weaponDamage = `${parts.senjata.damage} (DoT)`;
  } else if (parts.senjata.isEmp) {
    weaponDamage = `${parts.senjata.damage} (+EMP)`;
  }

  const armorAbsorption = Math.round(parts.armor.reduction * 100);

  return {
    totalHP,
    effectiveSpeed,
    speedMod,
    sensorRange,
    weaponDamage,
    armorAbsorption,
    weaponType: parts.senjata.nama,
    locomotionType: parts.penggerak.nama
  };
}
