# RoboArena — Modul 6 (Refined)
## Grafis, Animasi, Kamera & Arena Prosedural

> Lanjutan dari Modul 5 (Fase 20–25).  
> Modul ini meningkatkan kualitas presentasi tanpa merusak determinisme simulasi, performa perangkat sekolah, atau arsitektur AI 2D yang sudah ada.

---

# Prinsip Desain Modul 6

1. **Visual tidak boleh menentukan gameplay.**
   - Three.js hanya menampilkan state simulasi.
   - AI, collision, damage, objective, dan kemenangan tetap berasal dari layer simulation.

2. **Posisi logis robot tetap 2D.**
   ```js
   { x, y }
   ```
   Heightmap tidak mengubah arsitektur AI menjadi full 3D.

3. **Tinggi terrain mempengaruhi gameplay hanya lewat data tambahan.**
   - line-of-sight
   - slope speed modifier

4. **Death logic dipisahkan dari death visual.**
   - HP 0 → langsung mati secara gameplay
   - animasi kehancuran boleh tetap berjalan sesudahnya

5. **Performance budget harus mempertimbangkan 10v10.**
   - Hindari dynamic light per robot
   - Hindari jumlah mesh/detail yang berlebihan
   - Hindari partikel tanpa pooling

6. **Arena prosedural harus reproducible melalui seed.**

---

# Struktur Arsitektur Modul 6

Gunakan pemisahan:

```text
DATA
  ↓
SIMULATION
  ↓ events/state
PRESENTATION (Three.js)
```

Contoh event:

```js
weaponFired(...)
robotDestroyed(...)
robotMoved(...)
statusApplied(...)
```

Renderer mendengar event tersebut, tetapi renderer tidak boleh mengubah damage, HP, target, objective, atau keputusan AI.

---

# Fase 26 — Visual Robot & Lingkungan

## Tujuan

Membuat robot dan arena terlihat lebih “jadi” tanpa aset eksternal dan tanpa mengorbankan performa.

## Material

Gunakan `MeshStandardMaterial`.

Rekomendasi:

```text
Rangka:
metalness sedang
roughness sedang

Armor:
metalness tinggi
roughness lebih rendah

Sensor:
sedikit emissive

Laser/EMP:
emissive kuat

Roda/Karet:
metalness rendah
roughness tinggi
```

## Lighting

Jangan membuat satu `PointLight` untuk setiap robot.

Gunakan:

```text
1 HemisphereLight
1 DirectionalLight utama
opsional 1 AmbientLight sangat rendah
```

Warna tim ditampilkan melalui:

```text
emissive material
team ring
small glow mesh
```

bukan actual light per robot.

## Detail Geometri

Tambahkan greebling secukupnya:

```text
panel
ventilasi
baut besar
housing sensor
barrel detail
armor seam
```

Target kasar:

```text
10–25 mesh penting per robot
```

Untuk detail kecil berulang:

```text
InstancedMesh
atau merged geometry
```

Jangan beri collider ke detail kosmetik.

## Sudut Membulat

`BoxGeometry` biasa tidak otomatis menjadi rounded hanya dengan menambah segment.

Gunakan:

```text
RoundedBoxGeometry dari three/examples
```

atau helper reusable:

```text
createRoundedBox()
```

## Ground

Tambahkan:

```text
grid prosedural
marking arena
zona spawn
garis tengah
decal buatan CanvasTexture bila dibutuhkan
```

Tetap tanpa file PNG eksternal.

## Ambient Particle

Partikel debu boleh ada, tetapi:

```text
jumlah terbatas
gunakan pooling
disable/reduce pada quality rendah
```

## Quality Preset

Tambahkan:

```text
Low
Medium
High
```

Contoh:

### Low
- shadow off
- ambient particle off
- greeble sederhana

### Medium
- shadow terbatas
- partikel sedikit

### High
- shadow aktif
- detail penuh

## Prompt Implementasi

```text
Implementasikan Fase 26:

1. Upgrade RobotBuilder.js ke MeshStandardMaterial.

2. Jangan gunakan PointLight per robot.
   Gunakan HemisphereLight + DirectionalLight,
   dengan emissive material untuk aksen warna tim.

3. Tambahkan greebling visual secara terbatas.
   Target 10–25 mesh utama per robot.
   Gunakan InstancedMesh/merge untuk detail berulang.

4. Rounded box:
   gunakan RoundedBoxGeometry atau helper reusable.
   Jangan hanya menambah segment BoxGeometry.

5. Ground:
   tambahkan grid/procedural marking tanpa file gambar eksternal.

6. Tambahkan ambient dust sangat ringan dengan pooling.

7. Tambahkan quality preset Low/Medium/High.

8. Semua detail kosmetik tidak boleh memiliki collider
   dan tidak boleh mempengaruhi simulation state.
```

---

# Fase 27 — Animasi Gerak, Senjata, Projectile & Kehancuran

## Tujuan

Membuat robot terasa hidup, sambil menjaga pemisahan ketat antara gameplay dan visual.

---

## Event Visual

Simulation mengeluarkan event:

```js
{
  type: "weaponFired",
  shooterId,
  weaponType,
  from,
  to,
  targetId,
  hit
}
```

```js
{
  type: "robotDestroyed",
  robotId,
  position,
  tick
}
```

Renderer mendengar event dan memainkan FX.

## Animasi Penggerak

### Roda
Rotasi roda mengikuti kecepatan aktual.

```text
diam → roda diam
lumpuh → roda diam
bergerak cepat → rotasi cepat
```

### Roda Omni
Selain berputar, orientasi roda dapat tetap visual sesuai desain fisik.

### Kaki Mekanik
Gunakan sinus fase bergantian:

```js
phase = simulationVisualTime * speedFactor + legOffset
```

Animasi hanya visual.

### Melayang
Bobbing kecil secara visual.

PENTING:
bobbing tidak mengubah posisi logic robot.

### Track
Gunakan idler wheel + rotasi sederhana.
Tidak perlu animated UV kompleks pada fase ini.

---

## Senjata

### Meriam / Railgun
- recoil
- muzzle flash
- projectile glow
- trail pendek

### Laser
- beam instan
- fade cepat
- tidak perlu projectile yang berjalan pelan

### Rudal
- visual missile
- smoke trail
- mengikuti posisi projectile simulation

### Tembakan Beruntun
- beberapa flash
- projectile kecil

### EMP
- pulse ring
- arc/light effect kosmetik

### Semburan Api
- pooled particles
- lifetime pendek

---

## Death Logic vs Death Visual

Saat:

```text
HP Rangka <= 0
```

Simulation langsung:

```text
alive = false
targetable = false
collisionEnabled = false
AI disabled
weapon disabled
movement disabled
```

Renderer:

```text
masih mempertahankan mesh 0.5–1 detik
↓
ledakan
↓
miring/rebah
↓
fade atau scale
↓
hapus mesh
```

Robot yang sedang animasi mati tidak boleh:
- ditembak lagi,
- menahan collision,
- menangkap flag,
- menghitung KOTH,
- mengirim signal.

## Object Pool

Gunakan pool untuk:

```text
muzzle flash
trail
debris ringan
smoke
fire particle
```

Agar GC tidak sering terjadi saat 10v10.

## Prompt Implementasi

```text
Implementasikan Fase 27 dengan event-driven visual:

1. Simulation mengeluarkan event weaponFired dan robotDestroyed.

2. Renderer hanya merespons event.
   Renderer tidak boleh menentukan hit/damage.

3. Animasi penggerak mengikuti kecepatan aktual robot.

4. Bobbing Hover hanya visual dan tidak mengubah logic position.

5. Tiap senjata punya FX berbeda:
   Meriam/Railgun, Laser, Rudal,
   Tembakan Beruntun, EMP, Semburan Api.

6. Saat HP <= 0:
   robot mati secara logic langsung.
   Mesh boleh bertahan 0.5–1 detik untuk animasi kehancuran.

7. Robot mati:
   - tidak targetable
   - collision off
   - AI off
   - objective off.

8. Gunakan object pooling untuk FX berulang.
```

---

# Fase 28 — Kamera Sentuh, Orbit & Camera State Machine

## Tujuan

Kamera nyaman digunakan mouse maupun tablet tanpa bentrok dengan auto-camera.

## Mode Kamera

```text
First Person
Third Person
Cinematic
```

### First Person
Sepenuhnya otomatis.

Tidak memakai OrbitControls.

### Third Person
OrbitControls aktif.

Target mengikuti robot yang dipilih.

### Cinematic
OrbitControls aktif.

Target default dapat berupa pusat arena atau fokus pertandingan.

---

# Camera State Machine

Gunakan:

```text
AUTO
USER_CONTROL
RETURNING
```

## Transisi

```text
AUTO
→ user drag / pinch / zoom
→ USER_CONTROL

USER_CONTROL
→ 4 detik tanpa input
→ RETURNING

RETURNING
→ lerp selesai
→ AUTO
```

Saat `USER_CONTROL`, auto camera tidak boleh menulis transform kamera terus-menerus.

Saat `RETURNING`, interpolasi:

```text
position
target
zoom/distance
```

ke framing default.

## Kontrol

- pinch zoom
- drag orbit
- mouse orbit
- wheel zoom
- tombol +
- tombol -
- Reset Kamera

## UI

Jangan menutupi:

```text
BrainViewer
status part
Pause/Tick
objective HUD
```

## Accessibility

Ukuran tombol sentuh minimum dibuat ramah tablet.

## Prompt Implementasi

```text
Implementasikan Fase 28:

1. Integrasikan OrbitControls hanya untuk:
   Third Person dan Cinematic.

2. First Person tetap otomatis.

3. Buat cameraState:
   AUTO / USER_CONTROL / RETURNING.

4. Saat user berinteraksi:
   masuk USER_CONTROL.

5. Setelah 4 detik tanpa input:
   masuk RETURNING dan lerp ke framing default.

6. Jangan jalankan auto-camera dan OrbitControls
   saling menulis transform pada frame yang sama.

7. Tambahkan tombol:
   Reset Kamera
   +
   -

8. Pastikan touch control tidak bentrok dengan UI overlay.

9. Kamera tetap dapat digerakkan saat simulation pause.
```

---

# Fase 29 — Arena Prosedural, Heightmap, Seed & Fairness Validation

## Tujuan

Membuat arena dapat di-generate otomatis, tetapi tetap adil, reproducible, dan kompatibel dengan AI 2D.

---

# 1. Seeded PRNG

Jangan gunakan `Math.random()` di procedural generator.

Buat:

```text
src/game3d/ArenaGenerator.js
src/utils/seededRandom.js
```

API:

```js
const rng = createSeededRandom(seed);
```

Semua variasi procedural menggunakan `rng()`:

```text
arena size
obstacle
heightmap
terrain zone
decorative variation
```

Seed yang sama harus menghasilkan arena yang sama.

---

# 2. Ukuran Arena

Contoh:

```text
2v2   → 40 x 40
3v3   → 44 x 44
5v5   → 52 x 52
10v10 → maksimum sekitar 68 x 68
```

Nilai final boleh dituning.

Jangan membesarkan arena tanpa batas.

---

# 3. Heightmap

Gunakan noise ringan:

```text
simplex/perlin ringan
atau kombinasi sinus 2D
```

Heightmap disimpan sebagai data yang dapat di-sample:

```js
sampleHeight(x, y)
sampleGradient(x, y)
```

## Spawn Safety

Radius sekitar spawn:

```text
relatif datar
bebas obstacle
tidak berada di lereng ekstrem
```

Koridor awal juga tidak boleh membuat satu tim langsung terjebak.

---

# 4. Posisi Logic Tetap 2D

Simulation tetap:

```js
robot.position = { x, y }
```

Renderer:

```js
visualY = sampleHeight(x, y)
```

Jangan mengubah collision dan brain menjadi full 3D.

---

# 5. Terrain Line-of-Sight

Jangan hanya membandingkan tinggi tanah.

Gunakan eye height:

```js
eyeA = terrainHeight(A) + sensorEyeHeightA
eyeB = terrainHeight(B) + targetBodyHeightB
```

Kemudian sample garis LOS.

Untuk parameter `t`:

```js
lineHeight =
  eyeA + (eyeB - eyeA) * t
```

Jika:

```text
terrainHeight(samplePoint) > lineHeight
```

maka LOS terhalang.

Jumlah sample disesuaikan dengan jarak.

---

# 6. Slope Modifier

Gradient saja tidak cukup untuk menentukan naik/turun.

Gunakan dot product:

```js
slopeAlongMovement =
  gradientX * moveDirX +
  gradientY * moveDirY
```

Interpretasi:

```text
> 0  menanjak
< 0  menurun
≈ 0  melintas sejajar lereng
```

Contoh modifier:

```text
tanjakan kuat   0.80x
tanjakan ringan 0.90x
datar           1.00x
turunan ringan  1.05x
turunan kuat    max 1.10x
```

Cap bonus downhill agar tidak berlebihan.

Modifier slope dikalikan dengan:
- penggerak,
- terrain zone,
- kerusakan komponen.

---

# 7. Obstacle Generator

Gunakan grid kasar untuk distribusi awal.

Aturan minimum:

```text
tidak di spawn safety radius
tidak overlap objective penting
tidak menutup semua jalur
tidak terlalu dekat satu sama lain
```

---

# 8. Casual vs Tournament Procedural

Tambahkan dua mode procedural.

## Casual

```text
lebih liar
asimetri diperbolehkan
heightmap lebih organik
```

## Tournament

Gunakan symmetry.

Contoh:
- generate separuh arena
- mirror ke separuh lainnya

atau:
- rotational symmetry 180°

Tujuannya:

```text
jalur
obstacle
cover
akses area tengah
```

setara bagi kedua tim.

Heightmap dapat tetap sedikit organik selama validator menyatakan fair.

---

# 9. Arena Validation Pass

Setelah arena di-generate:

```text
generate
↓
validate
↓
pass → gunakan
fail → generate ulang dengan sub-seed
```

Validator minimum:

```text
[ ] spawn A bebas
[ ] spawn B bebas
[ ] tidak ada spawn di obstacle
[ ] jalur menuju area tengah tersedia
[ ] kedua tim dapat mencapai objective
[ ] obstacle density tidak timpang ekstrem
[ ] beda elevasi spawn masuk batas
[ ] objective tidak terkunci obstacle
```

Jika gagal:

```js
subSeed = `${seed}:retry:${attempt}`;
```

Batasi retry.

Jika semua retry gagal:
- fallback ke preset aman.

---

# 10. Seed UI

Di setup match tampilkan:

```text
Arena: Procedural
Mode: Tournament / Casual
Seed: ROBO-SEMIFINAL-01

[Generate Arena Baru]
[Pakai Seed Ini]
[Salin Seed]
```

Panitia dapat menggunakan seed sama untuk semua match pada ronde tertentu.

---

# Prompt Implementasi

```text
Implementasikan Fase 29:

1. Buat seeded PRNG.
   Jangan gunakan Math.random() di generator arena.

2. Buat generateArena(seed, jumlahRobotPerTim, mode).

3. Ukuran arena naik berdasarkan jumlah robot,
   tetapi memiliki batas maksimum.

4. Buat heightmap dan API:
   sampleHeight(x,y)
   sampleGradient(x,y)

5. Posisi logic robot tetap {x,y}.
   Tinggi hanya digunakan oleh renderer dan gameplay tambahan.

6. LOS terrain memakai:
   eye height robot
   target body height
   sampling sepanjang garis pandang.

7. Modifier tanjakan memakai dot product
   gradient terrain terhadap arah gerak robot.

8. Obstacle tidak boleh muncul:
   - di spawn safety
   - di objective
   - menutup seluruh jalur.

9. Tambahkan:
   Casual Procedural
   Tournament Procedural.

10. Tournament Procedural memakai symmetry
    untuk menjaga fairness.

11. Tambahkan Arena Validation Pass.

12. Jika validate gagal:
    retry dengan sub-seed,
    maksimal beberapa kali,
    lalu fallback arena aman.

13. Tampilkan seed di UI dan izinkan reuse seed.
```

---

# Fase 30 Opsional — Performance & Visual Diagnostics

> Fase ini opsional, tetapi sangat direkomendasikan sebelum 10v10 dijadikan mode resmi.

## Tujuan

Memberikan indikator apakah visual terlalu berat untuk perangkat sekolah.

## Statistik Debug

Tambahkan overlay dev:

```text
FPS
draw calls
triangles
active particles
active projectiles
robot meshes
```

## Performance Budget Awal

Target referensi:

```text
10v10 tetap playable di laptop sekolah menengah
```

Bukan mengejar kualitas desktop gaming.

## Adaptive Quality Opsional

Jika FPS rata-rata turun terus:

```text
High → Medium → Low
```

Jangan mengubah gameplay.

---

# Checklist Modul 6

```text
[ ] renderer tidak menentukan gameplay
[ ] tidak ada point light per robot
[ ] quality preset tersedia
[ ] greeble tidak berlebihan
[ ] rounded geometry benar
[ ] event-driven weapon FX
[ ] death logic terpisah dari death visual
[ ] object pooling FX
[ ] camera state machine bekerja
[ ] first-person bebas OrbitControls
[ ] seeded PRNG tersedia
[ ] logic position tetap 2D
[ ] LOS terrain memakai eye height
[ ] slope memakai gradient dot movement
[ ] tournament procedural simetris
[ ] arena validator bekerja
[ ] seed bisa direuse panitia
```

---

# Hasil Akhir Modul 6

Setelah Modul 6 selesai, RoboArena memiliki:

- robot yang terlihat lebih matang,
- animasi penggerak dan senjata,
- efek kehancuran,
- kamera desktop/tablet yang nyaman,
- terrain procedural,
- line-of-sight berbasis bukit,
- modifier lereng,
- serta arena seeded yang layak digunakan untuk pertandingan.

Namun prinsip terpenting tetap:

> **Visual boleh semakin kaya, tetapi otak robot tetap berpikir dalam simulasi yang sederhana, stabil, dan dapat dijelaskan.**
