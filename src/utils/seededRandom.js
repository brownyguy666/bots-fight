/**
 * RoboArena - Seeded Pseudo-Random Number Generator (PRNG) (Fase 29)
 * Menggunakan algoritma Mulberry32 untuk menjamin reproduktibilitas deterministik
 * pada arena prosedural, seeding turnamen, dan replay simulasi.
 */

export function hashStringToInt(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

export function createSeededRandom(initialSeed = 'ROBO-DEFAULT') {
  let seedValue = typeof initialSeed === 'number'
    ? (initialSeed >>> 0)
    : hashStringToInt(String(initialSeed));

  if (seedValue === 0) seedValue = 1337;

  // Generator Mulberry32
  function next() {
    seedValue |= 0;
    seedValue = (seedValue + 0x6D2B79F5) | 0;
    let t = Math.imul(seedValue ^ (seedValue >>> 15), 1 | seedValue);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    range(min, max) {
      return min + next() * (max - min);
    },
    int(min, max) {
      return Math.floor(this.range(min, max + 1));
    },
    choice(arr) {
      if (!arr || arr.length === 0) return null;
      return arr[this.int(0, arr.length - 1)];
    },
    boolean(chance = 0.5) {
      return next() < chance;
    }
  };
}
