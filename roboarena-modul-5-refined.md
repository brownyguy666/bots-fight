# RoboArena — Modul 5 (Refined)
## Arena, Tim, Pembelajaran, Debug & Panitia

> Lanjutan dari Modul 4 (Fase 15–19).  
> Versi refined ini mempertahankan arah asli Modul 5, tetapi memperkuat arsitektur simulasi, determinisme, navigasi dasar, fairness mode permainan, pembelajaran bertahap, dan kesiapan turnamen.

---

# Prinsip Desain Modul 5

Sebelum masuk ke fase per fase, seluruh implementasi Modul 5 mengikuti prinsip berikut:

1. **Logika gameplay memakai satuan arena, bukan pixel layar.**
   - Contoh: `JarakMusuh < 22 unit`, bukan `220 px`.
   - Renderer boleh menampilkan skala visual apa pun, tetapi AI tidak bergantung pada resolusi layar.

2. **Simulasi memakai fixed tick.**
   - Gunakan konstanta:
     ```js
     const SIM_TICK_MS = 150;
     ```
   - Seluruh logika gameplay berbasis `simulationTick` / `simulationTimeMs`, bukan `Date.now()`.

3. **Deterministik sebisa mungkin.**
   - Dengan state awal, brain, arena, dan seed yang sama, hasil simulasi harus sedekat mungkin sama.
   - Ini penting untuk pembelajaran, debugging, replay, dan turnamen.

4. **Editor tetap sederhana untuk pemain.**
   - Anak cukup menggunakan node seperti `GerakKeMusuh`, `Mundur`, `Tembak`.
   - Navigasi obstacle, collision sliding, dan anti-stuck dikerjakan engine, bukan dibebankan ke brain pemain.

5. **Brain tetap decision tree.**
   - Satu node hanya punya satu parent.
   - Tidak ada merge dua cabang ke satu node.
   - Jika perilaku sama dibutuhkan pada dua cabang, node/subtree boleh diduplikasi.

6. **Setiap robot wajib memiliki ID permanen.**
   - Gunakan `crypto.randomUUID()` saat robot pertama dibuat.
   - Nama robot hanya untuk display.

Contoh schema robot:

```js
{
  id,
  namaRobot,
  loadout,
  brain,
  isKomandan,
  createdAt,
  updatedAt
}
```

---

# Fase 20 — Obstacle, Terrain & Anti-Stuck Navigation

## Tujuan

Arena tidak lagi kosong. Tambahkan obstacle statis, zona terrain, collision sederhana, line-of-sight, modifier kecepatan, dan sistem anti-stuck agar action `GerakKeMusuh` tetap mudah digunakan pemain.

## Kriteria Selesai

- Minimal tersedia:
  - Arena Kosong
  - Arena Berbatu
  - Arena Berpasir
- Robot tidak menembus obstacle.
- Proyektil yang memang bersifat projectile tidak menembus obstacle.
- `MusuhTerlihat` menjadi `false` bila LOS terhalang obstacle.
- Terrain dapat memodifikasi kecepatan berdasarkan jenis penggerak.
- Robot yang terus menabrak obstacle tidak macet permanen.
- Seluruh jarak gameplay menggunakan **unit arena**, bukan pixel layar.

## Data Arena

Buat:

```text
src/data/arena_maps.js
src/data/terrain_modifiers.js
src/game3d/obstacles.js
src/simulation/navigation.js
```

Contoh struktur preset:

```js
{
  id: "arena_berbatu",
  nama: "Arena Berbatu",
  width: 40,
  height: 40,
  obstacles: [
    { x: 0, y: 3, w: 4, h: 2 }
  ],
  zones: []
}
```

## Anti-Stuck

Setiap robot memiliki state internal:

```js
robotState.navigation = {
  stuckTicks: 0,
  avoidanceDirection: null,
  lastPosition: { x, y }
}
```

Aturan sederhana:

```text
Jika robot mencoba bergerak tetapi perpindahan aktual sangat kecil
selama >= 3 tick:
    aktifkan obstacle avoidance sementara

Prioritas:
1. coba slide tangent kiri
2. jika gagal, coba tangent kanan
3. jika masih gagal, putar heading sementara
4. setelah jalur terbuka, kembali ke target asli
```

Tidak perlu A* pada fase ini.

## Prompt Implementasi

```text
Implementasikan Fase 20 RoboArena:

1. Ubah seluruh logika jarak gameplay agar memakai satuan arena,
   bukan pixel layar. Rendering tidak boleh mempengaruhi AI.

2. Buat src/data/arena_maps.js dengan minimal:
   - Arena Kosong
   - Arena Berbatu
   - Arena Berpasir

3. Buat src/game3d/obstacles.js:
   - render obstacle dari data arena
   - collision robot circle-vs-box
   - collision projectile-vs-box
   - jika robot menyentuh obstacle, lakukan sliding di sisi obstacle,
     bukan langsung berhenti total bila masih ada arah gerak valid.

4. Update src/ai/sensors.js:
   MusuhTerlihat harus mengecek:
   - radius sensor
   - line-of-sight terhadap obstacle menggunakan ray-vs-box sederhana.

5. Buat src/data/terrain_modifiers.js:
   tabel modifier per kombinasi terrain + jenis penggerak.
   Contoh:
   Berpasir + Roda = 0.5x
   Berpasir + Kaki Mekanik = 0.85x
   Berpasir + Melayang = 1.0x

6. Terapkan modifier terrain pada pergerakan dengan mengalikan
   modifier rangka, penggerak, status kerusakan, dan terrain.

7. Tambahkan anti-stuck navigation sederhana di layer simulation:
   - hitung stuckTicks
   - setelah 3 tick gagal bergerak, coba tangent kiri/kanan
   - setelah jalur bebas, kembali ke target normal
   - jangan tambahkan node pathfinding baru ke pemain.

8. Tambahkan dropdown Arena di setup match.
   Default tetap Arena Kosong.
```

---

# Fase 21 — Mode Permainan: Eliminasi, Capture the Flag & King of the Hill

## Tujuan

Menambah objektif selain eliminasi sehingga pemain belajar bahwa brain yang bagus bukan hanya soal menembak.

## Mode

### 1. Eliminasi

Tetap menjadi mode default.

Tidak boleh ada perubahan perilaku terhadap mode lama.

---

### 2. Capture the Flag

Setiap tim memiliki:

```js
flag = {
  teamId,
  homePosition,
  currentPosition,
  carrierRobotId: null,
  droppedAtTick: null,
  state: "HOME" | "CARRIED" | "DROPPED"
}
```

Aturan:

```text
Robot overlap flag musuh
→ otomatis membawa flag

Pembawa kembali ke base sendiri
→ tim menang

Pembawa hancur
→ flag jatuh di posisi itu

Jika flag DROPPED tidak diambil selama 3 detik simulasi
→ flag kembali HOME
```

Gunakan simulation clock, bukan waktu real browser.

Node baru:

```text
Condition:
- SedangBawaFlag
- FlagMusuhTerlihat

Action opsional fase berikutnya:
- GerakKeFlagMusuh
- KembaliKeBase
```

Untuk scope fase ini, action tambahan tidak wajib bila sistem action lama sudah cukup.

---

### 3. King of the Hill

Zona hill berada di area tengah.

Jangan simpan skor sebagai “200 tick”.

Gunakan waktu kontrol:

```js
hillControlMs[teamId] += SIM_TICK_MS;
```

Aturan:

```text
Jika jumlah robot hidup Tim A di zona > Tim B:
    waktu kontrol Tim A bertambah

Jika sama:
    tidak ada yang bertambah

Tim pertama mencapai target, misal 30.000 ms:
    menang
```

UI menampilkan:

```text
Biru: 17.4 s
Merah: 12.9 s
Target: 30 s
```

Node:

```text
- DiZonaHill
- TimUnggulDiHill
```

## Prompt Implementasi

```text
Implementasikan Fase 21:

1. Tambahkan Mode Permainan:
   Eliminasi / Capture the Flag / King of the Hill.
   Default Eliminasi.

2. Pastikan Eliminasi tetap backward-compatible.

3. CTF:
   - setiap tim punya flag dengan state HOME/CARRIED/DROPPED
   - robot yang overlap flag lawan otomatis membawa
   - kembali ke base sendiri = menang
   - jika carrier hancur, flag jatuh di lokasi tersebut
   - jika tidak diambil selama 3000 ms waktu simulasi, flag kembali HOME
   - jangan gunakan Date.now()

4. Tambahkan Condition:
   - SedangBawaFlag
   - FlagMusuhTerlihat

5. KOTH:
   - zona lingkaran tengah
   - hitung jumlah robot hidup tiap tim dalam zona per SIM_TICK
   - tim mayoritas menambah hillControlMs sebesar SIM_TICK_MS
   - target default 30000 ms
   - jika timer match habis, skor kontrol terbesar menang.

6. Tambahkan Condition:
   - DiZonaHill
   - TimUnggulDiHill

7. Update hasil match sesuai mode:
   - Eliminasi: tim pemenang
   - CTF: carrier terakhir / scorer
   - KOTH: waktu kontrol akhir
```

---

# Fase 22 — Koordinasi Tim, Signal & Komandan

## Tujuan

Robot dapat bekerja sebagai tim tanpa perlu scripting kompleks.

## Sistem Signal

Buat:

```text
src/ai/signals.js
```

Signal disimpan sebagai ID, bukan reference object.

Contoh:

```js
{
  id,
  type: "butuh_bantuan",
  teamId,
  sourceRobotId,
  position: { x, y },
  createdTick,
  expiresTick
}
```

Musuh prioritas:

```js
{
  id,
  type: "musuh_prioritas",
  teamId,
  sourceRobotId,
  targetRobotId,
  createdTick,
  expiresTick
}
```

## Kapan Robot Minta Bantuan

Trigger bila salah satu benar:

```text
HP Rangka < 30%
ATAU
Penggerak Lumpuh
ATAU
Senjata Rusak DAN musuh berada dalam radius bahaya
```

Tetap kirim satu jenis signal:

```text
butuh_bantuan
```

Lakukan throttle agar tidak broadcast setiap tick.

## Komandan

- Maksimal **1 Komandan per tim**.
- Jika user memilih robot lain menjadi Komandan:
  - Komandan lama otomatis dinonaktifkan.

Saat Komandan:

```text
Tembak target tertentu
ATAU
GerakKeMusuh menuju target tertentu
```

broadcast:

```text
musuh_prioritas
```

## Node Baru

Condition:

```text
SekutuMintaBantuan < radius
AdaMusuhPrioritas
```

Action:

```text
SerangMusuhPrioritas
LindungiSekutu
```

`SekutuMintaBantuan` harus memiliki radius yang dapat diatur.

## Prompt Implementasi

```text
Implementasikan Fase 22:

1. Buat src/ai/signals.js.
   Semua signal memakai robot ID, bukan reference object.

2. Signal harus menggunakan simulationTick untuk umur/expiry.

3. Auto-trigger butuh_bantuan jika:
   - HP Rangka <30%
   - atau Penggerak Lumpuh
   - atau Senjata Rusak dan ada musuh dalam radius bahaya.
   Throttle agar tidak broadcast tiap tick.

4. Tambahkan Condition:
   SekutuMintaBantuan dengan parameter radius arena.

5. Tambahkan toggle Jadikan Komandan pada profil robot.

6. Maksimal 1 Komandan per tim.
   Jika memilih Komandan baru, status Komandan lama otomatis dilepas.

7. Saat Komandan melakukan Tembak atau GerakKeMusuh pada target,
   broadcast signal musuh_prioritas berisi targetRobotId.

8. Tambahkan:
   Condition AdaMusuhPrioritas
   Action SerangMusuhPrioritas

9. Jika target prioritas mati atau signal expired,
   action gagal diam-diam dan brain lanjut sesuai aturan engine.

10. Tambahkan ikon visual kecil crown/komandan pada robot di arena,
    tetapi ikon ini hanya visual dan tidak mempengaruhi logic.
```

---

# Fase 23 — Mode Belajar Berjenjang

## Tujuan

Mengajarkan logika AI secara bertahap, bukan sekadar memberikan semua node sejak awal.

## Prinsip

Misi tidak hanya mengecek:

```text
menang / kalah
```

tetapi juga apakah konsep yang dipelajari benar-benar digunakan.

## Schema Misi

```js
{
  id,
  judul,
  deskripsi,
  blokDibuka,
  arenaPreset,
  musuhPreset,
  requiredNodes,
  requiredEvents,
  kondisiMenang
}
```

Contoh:

```js
{
  id: "misi_hp_mundur",
  judul: "Tahu Kapan Mundur",
  blokDibuka: ["HPRangkaKurangDari", "MundurDariMusuh"],
  requiredNodes: ["HPRangkaKurangDari", "MundurDariMusuh"],
  requiredEvents: [
    "condition_true:HPRangkaKurangDari",
    "action_executed:MundurDariMusuh"
  ],
  kondisiMenang: {
    type: "survive_or_win"
  }
}
```

## Rekomendasi 8 Misi

### Misi 1 — Lihat dan Tembak
Belajar:
- MusuhTerlihat
- Tembak

### Misi 2 — Mendekati Target
Tambah:
- GerakKeMusuh
- JarakMusuh

### Misi 3 — Jaga Jarak
Tambah:
- MundurDariMusuh

### Misi 4 — Bertahan Hidup
Tambah:
- HPRangka<%
- ArmorHabis

### Misi 5 — Kerusakan Komponen
Tambah:
- SenjataRusak
- PenggerakLumpuh
- IsiUlang bila tersedia

### Misi 6 — Kerja Sama
Tambah:
- SekutuDekat
- SekutuMintaBantuan
- LindungiSekutu

### Misi 7 — Objektif Arena
Tambah:
- CTF atau KOTH condition

### Misi 8 — Debugging
Pemain diberikan brain salah dan harus:
- pause
- tick step-by-step
- lihat jalur aktif
- perbaiki brain

## Penyimpanan Progres

```text
localStorage:
roboarena_misi_progress
```

Simpan versi schema agar migrasi mudah:

```js
{
  version: 1,
  completedMissionIds: []
}
```

## Prompt Implementasi

```text
Implementasikan Fase 23:

1. Buat src/data/missions.js minimal 8 misi berurutan.

2. Tiap misi memiliki:
   id, judul, deskripsi, blokDibuka, arenaPreset,
   musuhPreset, requiredNodes, requiredEvents, kondisiMenang.

3. Palette Editor mode misi hanya menampilkan:
   - blok dari misi ini
   - blok dari misi sebelumnya yang telah lulus.

4. Jangan luluskan misi hanya karena robot menang.
   Jika misi mengajarkan node tertentu,
   evaluator harus memverifikasi node/event tersebut benar-benar terjadi.

5. Catat telemetry edukasi ringan per match misi:
   - node mana dievaluasi
   - cabang true/false
   - action mana dieksekusi.

6. Simpan progress di localStorage dengan version field.

7. Tambahkan Misi Debugging:
   - berikan brain sengaja salah
   - pemain wajib memakai Pause + Tick Berikutnya
   - brain baru dianggap selesai setelah diperbaiki dan lolos test.
```

---

# Fase 24 — Simulation Clock & Debug Step-by-Step

## Tujuan

Membuat simulasi bisa dijeda dan dijalankan satu tick secara presisi, sekaligus menjadikan sistem gameplay deterministik dan mudah dipahami.

## Simulation Clock

Buat modul:

```text
src/simulation/SimulationClock.js
```

Contoh API:

```js
SimulationClock = {
  tick: 0,
  timeMs: 0,
  tickMs: 150,
  isPaused: false
}
```

Setiap step:

```js
tick += 1;
timeMs += tickMs;
```

Semua gameplay berikut memakai clock ini:

```text
weapon cooldown
reload
EMP duration
disable duration
signal expiry
flag return timer
KOTH control time
status effect
AI tick counter
```

Jangan gunakan `Date.now()` untuk aturan gameplay.

## Debug UI

Saat pause:

```text
[Jeda]
[Tick Berikutnya]
Tick: 84
Time: 12.60 s
```

BrainViewer harus menampilkan:

```text
node yang dievaluasi
hasil Condition
Action yang dipilih
nilai sensor relevan
```

Contoh:

```text
MusuhTerlihat = true
JarakMusuh = 18.4
JarakMusuh < 14 = false
JarakMusuh < 23 = true
Action = Tembak
```

## Prompt Implementasi

```text
Implementasikan Fase 24 sebagai fondasi Simulation Clock:

1. Buat SIM_TICK_MS = 150.

2. Buat SimulationClock dengan:
   tick, timeMs, tickMs, isPaused.

3. Refactor seluruh timer gameplay agar berbasis simulation time/tick,
   bukan Date.now().

4. Tombol Jeda:
   - hentikan AI
   - hentikan movement simulation
   - hentikan projectile gameplay
   - kamera tetap boleh digerakkan.

5. Tombol Tick Berikutnya:
   - hanya aktif saat pause
   - jalankan tepat satu full simulation tick untuk SEMUA robot
   - evaluateBrain
   - apply actions
   - movement
   - projectile/status update
   - objective update
   - signal expiry
   - lalu freeze kembali.

6. BrainViewer harus menyimpan trace tick terakhir:
   - nodeId
   - nodeType
   - hasil condition
   - nilai sensor penting
   - action akhir.

7. Tampilkan Tick dan Simulation Time di UI.

8. Pastikan hasil multi-tick manual sama dengan hasil tick otomatis
   jika state awal sama.
```

---

# Fase 25 — Dashboard Guru / Panitia

## Tujuan

Memberikan fitur operasional untuk pembelajaran kelas dan turnamen sekolah.

## 1. Match Log

Jangan mengidentifikasi robot dari nama saja.

Gunakan:

```js
{
  id,
  robotAId,
  robotAName,
  robotBId,
  robotBName,
  winnerRobotId,
  mode,
  arenaId,
  arenaSeed,
  matchSeed,
  startedAt,
  finishedAt
}
```

Untuk match tim:

```js
teamAIds: [],
teamBIds: [],
winnerTeamId
```

## 2. Leaderboard

Tampilkan:

```text
Robot
Main
Menang
Kalah
Win Rate
Mode favorit / opsional
```

Gunakan `robotId` sebagai key.

## 3. Generator Matchup

- multi-select robot
- acak pasangan
- support bye
- optional seed agar hasil pengacakan dapat diulang

## 4. Timer Kelas

- input durasi
- start/pause/reset
- mode fullscreen
- SFX waktu habis

Timer kelas boleh memakai real time browser karena bukan bagian gameplay.

## 5. Cetak Kartu Robot

Kartu memuat:

```text
Nama Robot
Render 3D
Loadout
Stat ringkas
Role
Snapshot decision tree
QR opsional di masa depan
```

## 6. Export / Import

Wajib tersedia:

```text
Export Data
Import Data
Backup Turnamen
Mulai Musim Baru
```

Contoh file:

```text
roboarena-turnamen-2026.json
```

Isi:

```js
{
  schemaVersion,
  robots,
  matchlog,
  missionProgress,
  tournamentSettings
}
```

Sebelum import:

```text
validasi schemaVersion
preview jumlah data
minta konfirmasi
```

## Prompt Implementasi

```text
Implementasikan Fase 25:

1. Buat matchlog yang menyimpan robotId selain nama robot.

2. Simpan arenaSeed dan matchSeed bila tersedia
   agar pertandingan dapat direproduksi/debug.

3. Dashboard Panitia memiliki:
   - Leaderboard
   - Generator Matchup
   - Timer Kelas
   - Cetak Kartu Robot
   - Export/Import Data.

4. Leaderboard aggregate berdasarkan robotId,
   bukan nama display.

5. Generator Matchup mendukung:
   - random pairing
   - bye
   - seed opsional agar pairing dapat diulang.

6. Cetak kartu menggunakan snapshot render 3D
   dan snapshot tree LiteGraph.

7. Tambahkan Export JSON dan Import JSON.
   Gunakan schemaVersion.

8. Tambahkan tombol Mulai Musim Baru
   dengan dialog konfirmasi yang jelas.
   Jangan hapus data tanpa konfirmasi.

9. Tidak perlu sistem login pada fase ini.
```

---

# Checklist Modul 5

Sebelum Modul 5 dianggap selesai:

```text
[ ] semua jarak gameplay memakai unit arena
[ ] fixed simulation tick tersedia
[ ] obstacle collision stabil
[ ] anti-stuck bekerja
[ ] LOS obstacle bekerja
[ ] terrain modifier bekerja
[ ] Eliminasi backward-compatible
[ ] CTF stabil
[ ] KOTH berbasis waktu kontrol
[ ] signal memakai robotId
[ ] maksimal 1 komandan/tim
[ ] mode misi menilai penggunaan konsep
[ ] pause + single tick deterministik
[ ] BrainViewer menunjukkan trace
[ ] matchlog berbasis robotId
[ ] export/import data tersedia
```

---

# Hasil Akhir Modul 5

Setelah Modul 5 selesai, RoboArena bukan lagi sekadar sandbox robot.

Ia sudah memiliki:

- arena taktis,
- objective permainan,
- koordinasi tim,
- role Komandan,
- mode belajar bertahap,
- debugging satu tick,
- dan dashboard turnamen.

Yang paling penting: semua fitur tersebut tetap dibangun di atas brain visual yang mudah dipahami pemain.
