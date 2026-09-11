# RoboArena — Modul 4: Ekspansi Konten & Visualisasi Live

> Lanjutan dari Modul 3 (Fase 11-14, migrasi Three.js). Modul ini
> memperluas variasi part & blok logika, menaikkan skala match sampai
> 10 vs 10, menambah preset brain, dan menambahkan panel visualisasi alur
> logika live saat robot dipilih di Arena.

## Perbaikan Mendesak (sebelum ekspansi)

Dari screenshot Bengkel yang ada sekarang: label tombol pilihan Rangka
menampilkan "Rangka" untuk ketiga opsi (harusnya "Ringan"/"Sedang"/"Berat"),
Sensor menampilkan "Sensor"/"Tanpa"/"Sensor"/"Radar", Armor menampilkan
"Tanpa"/"Armor"/"Armor"/"Armor" — semua ini bug, label tombol memakai nama
SLOT bukan nama OPSI. Ini harus dibenerin duluan di Fase 15 sebelum opsi baru
ditambahkan, supaya tidak makin campur aduk.

## Part Baru per Slot

| Slot | Opsi baru | Efek |
|---|---|---|
| Rangka | Kompak | HP rendah, tapi ukuran fisik lebih kecil jadi lebih susah ditarget/kena damage |
| Rangka | Lapis Baja | HP sangat tinggi, tapi kecepatan gerak dasar sangat rendah |
| Penggerak | Roda Omni | Bisa geser ke segala arah tanpa perlu berputar dulu (strafe instan), tapi kecepatan lurus lebih rendah dari Roda biasa |
| Penggerak | Melayang | Kecepatan tinggi & merata di segala medan, tapi HP part paling tipis di antara semua Penggerak |
| Senjata | Railgun (Meriam Presisi) | Damage sangat besar sekali tembak, tapi perlu 1 tick "isi tenaga" sebelum benar-benar menembak, lalu cooldown sangat panjang |
| Senjata | Semburan Api | Damage kecil tapi terus-menerus (damage-over-time) selama musuh dalam jangkauan sangat dekat, jarak paling pendek dari semua senjata |
| Senjata | Pulsa EMP | Damage kecil, tapi mengenai musuh membuatnya berstatus Lumpuh sementara (beberapa detik) walau Penggeraknya sendiri masih utuh — efek crowd control, bukan damage race |
| Sensor | Sensor Termal | Radius sedang, tapi bisa mendeteksi musuh yang sedang berstatus Lumpuh dari jarak berapa pun (musuh yang rusak "memancarkan panas") |
| Armor | Armor Reaktif | Reduksi kecil (15%) per hit, tapi HP armor pulih sedikit tiap beberapa detik selama robot tidak kena serangan |

## Palet Blok Logika: Grup & Blok Baru

Grup baru **KONDISI TAKTIS** (di antara Kondisi Dasar dan Kondisi Part
Rusak):
- **Musuh Lumpuh?** — musuh yang dibidik sedang tidak bisa bergerak sama sekali
- **HP Musuh Rendah?** — HP musuh yang dibidik di bawah nilai tertentu (widget angka persen, sama pola dengan HP Rangka < %)
- **Tim Untung?** — jumlah sekutu yang masih hidup lebih banyak dari jumlah musuh yang masih hidup
- **Waktu Hampir Habis?** — sisa waktu match di bawah nilai tertentu (widget angka detik)

Tambahan di grup **AKSI TEMPUR**:
- **Tabrak** — menabrakkan diri ke musuh terdekat, kedua robot sama-sama kena damage tabrakan
- **Fokus Musuh Terlemah** — gerak & serang musuh dengan HP Rangka paling rendah dalam jangkauan sensor (bukan yang paling dekat jarak)
- **Lindungi Sekutu** — gerak mendekat & memposisikan diri di antara sekutu ber-HP paling rendah dengan musuh terdekat

**Root masuk palet**: tambahkan grup paling atas **MULAI DI SINI** berisi
blok Root (visual sama seperti di kanvas: oranye, ikon roket). Blok ini
TIDAK bisa di-drag berkali-kali (Root cuma boleh 1 per pohon, sudah otomatis
ada di kanvas) — tampilkan dengan gaya redup/terkunci + ikon pin kecil,
tujuannya cuma referensi visual biar anak paham blok itu bagian dari
"bahasa" yang sama, bukan sesuatu yang beda sendiri.

**Tooltip ramah anak**: tiap blok (semua grup, termasuk yang lama) dapat
tooltip singkat berisi penjelasan bahasa sederhana + contoh, muncul saat
hover (desktop) atau tekan-lama (touch). Contoh: "Musuh Terlihat? — robot
mengecek apakah ada musuh yang kelihatan di depan sensornya."

---

## Fase 15 — Perbaikan Label & Perluasan Part Bengkel

**Tujuan:** Benerin bug label tombol, lalu tambahkan semua part baru dari
tabel di atas ke Bengkel dan ke `RobotBuilder.js` (Modul 3).

**Kriteria selesai:** Tiap tombol opsi di Bengkel menampilkan nama opsinya
sendiri yang unik (bukan nama slot berulang). Semua part baru muncul sebagai
pilihan, Statistik Gabungan ter-update sesuai part yang dipilih, dan preview
3D (`RobotBuilder.js`) menampilkan bentuk berbeda untuk tiap part baru
(boleh sederhana/placeholder dulu asal beda dari part lain, tidak harus
sempurna di fase ini).

**Prompt untuk Antigravity:**
```
1. Perbaiki bug di UI Bengkel: pastikan tiap tombol opsi part menampilkan
   nama OPSI itu sendiri (misal "Ringan", "Sedang", "Berat" untuk Rangka),
   BUKAN nama slot yang berulang. Cek juga slot Sensor dan Armor yang
   sama-sama kena bug ini.
2. Tambahkan ke src/data/parts.js semua opsi baru berikut beserta nilai
   statistiknya (boleh dikira-kira dulu, penting proporsinya masuk akal):
   Rangka: Kompak (HP rendah, hitbox/radius fisik lebih kecil dari default),
   Lapis Baja (HP sangat tinggi, speedModifier sangat negatif).
   Penggerak: Roda Omni (bisa strafe tanpa delay rotasi, kecepatan lurus
   sedikit di bawah Roda biasa), Melayang (kecepatan tinggi merata segala
   medan, HP part paling rendah dari semua Penggerak).
   Senjata: Railgun (damage sangat besar, delay 1 tick charge sebelum
   tembak benar-benar terjadi, cooldown sangat panjang setelahnya),
   Semburan Api (damage kecil per tick tapi berulang selama musuh dalam
   jangkauan sangat pendek, jangkauan lebih pendek dari Tembakan Beruntun),
   Pulsa EMP (damage kecil, efek tambahan: kalau kena, robot target
   dipaksa getLocomotionState = 'lumpuh' sementara selama beberapa detik
   walau HP Penggeraknya sendiri tidak berubah — butuh flag/timer
   statusEffect terpisah dari HP part).
   Sensor: Termal (radius sedang, tambahan: MusuhTerlihat bernilai true
   untuk musuh berstatus Lumpuh berapapun jaraknya, terlepas dari radius
   normal).
   Armor: Reaktif (reduksi 15% per hit, HP armor bertambah sedikit tiap
   beberapa detik kalau robot tidak menerima damage sama sekali dalam
   rentang waktu itu).
3. Update RobotBuilder.js (dari Fase 13) supaya buildRobotMesh() punya
   cabang geometri untuk tiap part baru ini (boleh reuse bentuk part
   terdekat dengan warna/skala berbeda sebagai versi awal, tidak wajib
   desain unik sempurna).
4. Update kalkulasi Statistik Gabungan di UI Bengkel supaya mencerminkan
   part baru dengan benar.
```

---

## Fase 16 — Perluasan & Penyederhanaan Palet Blok Logika

**Tujuan:** Palet blok logika lebih ramah anak SD (tooltip penjelasan) dan
lebih variatif (grup Kondisi Taktis + aksi baru), Root ikut tampil di palet.

**Kriteria selesai:** Grup baru "Kondisi Taktis" dan 3 aksi baru muncul di
palet dan bisa dipakai di pohon keputusan sungguhan. Hover/tekan-lama tiap
blok (lama maupun baru) menampilkan tooltip penjelasan singkat. Blok Root
tampil di palet dalam grup "Mulai Di Sini", bergaya redup/terkunci, tidak
bisa di-drag jadi node Root kedua ke kanvas.

**Prompt untuk Antigravity:**
```
1. Tambahkan node Condition baru (pola sama seperti yang sudah ada) di
   src/editor/nodes.js: MusuhLumpuh, HPMusuhRendah (widget angka persen),
   TimUntung, WaktuHampirHabis (widget angka detik). Implementasikan fungsi
   sensor pendukungnya di src/ai/sensors.js.
2. Tambahkan node Action baru: Tabrak, FokusMusuhTerlemah,
   LindungiSekutu. Implementasikan fungsi aksinya di src/ai/actions.js
   (Tabrak: damage tabrakan dua arah ke robot & musuh terdekat, lalu robot
   pengecualian sementara dari overlap check di tick berikutnya biar tidak
   nyangkut; FokusMusuhTerlemah: cari musuh dengan HP rangka terendah dalam
   sensorRadius, jadikan target gerak+tembak; LindungiSekutu: cari sekutu
   ber-HP rangka terendah, gerak ke titik tengah antara sekutu itu dan
   musuh terdekat sekutu itu).
3. Di UI palet (panel kiri Editor), tambahkan grup baru "KONDISI TAKTIS"
   berisi 4 blok di atas, ditempatkan di antara grup "Kondisi Dasar" dan
   "Kondisi Part Rusak". Tambahkan 3 blok aksi baru ke grup "Aksi Tempur"
   yang sudah ada.
4. Tambahkan grup paling atas "MULAI DI SINI" berisi 1 entri visual blok
   Root (styling sama seperti node Root di kanvas: oranye, ikon roket),
   TAPI beri gaya redup/opacity lebih rendah + ikon gembok/pin kecil di
   pojoknya, dan JANGAN buat entri ini bisa di-drag ke kanvas (atau kalau
   di-drag, tolak dengan pesan singkat "Root sudah otomatis ada di
   kanvasmu"). Tujuannya murni referensi visual.
5. Tambahkan tooltip (hover di desktop, tekan-lama/long-press di touch) ke
   SEMUA blok di palet (lama dan baru), berisi 1 kalimat penjelasan bahasa
   sederhana + boleh 1 contoh singkat. Simpan teks tooltip di satu file data
   terpusat (misal src/data/block_descriptions.js) supaya gampang diedit
   tanpa bongkar kode UI.
```

---

## Fase 17 — Skalakan Ukuran Tim hingga 10 vs 10

**Tujuan:** Mode match custom (Fase 4) mendukung sampai 10 robot per tim
(20 robot sekaligus di Arena), tetap lancar dimainkan.

**Kriteria selesai:** Slider/dropdown jumlah robot per tim di layar setup
mendukung 2 sampai 10 (sebelumnya 2-5). Match 10v10 berjalan tanpa patah-
patah berarti di laptop sekolah standar. Arena otomatis menyesuaikan ukuran
spawn area supaya tidak terlalu sesak di jumlah robot besar.

**Prompt untuk Antigravity:**
```
1. Ubah batas slider/dropdown jumlah robot per tim di layar setup match
   (Fase 4) dari rentang 2-5 menjadi 2-10.
2. Sesuaikan posisi spawn awal robot supaya berbentuk formasi grid/baris
   yang rapi dan tidak saling tumpuk, skalakan jarak antar titik spawn dan
   ukuran arena (ground plane Three.js) mengikuti jumlah robot per tim
   (semakin banyak robot, area sedikit lebih luas).
3. Lakukan pengecekan performa kasar: dengan 10v10 (20 robot, tiap robot
   mesh modular dari RobotBuilder.js + AI tick 150ms + kemungkinan efek
   particle dari Fase 14), pastikan frame rate tetap wajar. Kalau terasa
   berat, terapkan optimisasi ringan seperti: batasi jumlah particle aktif
   bersamaan, atau kurangi kompleksitas geometri (jumlah segment silinder/
   bola) pada mesh robot saat jumlah robot di Arena banyak.
4. Pastikan UI indikator (health bar, 4-kotak status part dari Fase 10) 
   tetap terbaca jelas walau layar penuh robot — perkecil ukurannya secara
   proporsional kalau jumlah robot di Arena lebih dari sekitar 10.
```

---

## Fase 18 — Preset Brain Tambahan

**Tujuan:** Menambah variasi preset brain pemula dari 4 jadi 8, memakai
node-node baru dari Fase 16 sebagai contoh nyata pemakaiannya.

**Kriteria selesai:** 4 preset baru tersedia di daftar brain contoh saat
buat robot baru, masing-masing menunjukkan pola berpikir berbeda dan bisa
langsung dites di Arena/QuickTest.

**Prompt untuk Antigravity:**
```
Tambahkan 4 file preset baru di src/data/preset_brains/ (format sama seperti
4 preset yang sudah ada):
1. "Penopang" (Support): prioritas LindungiSekutu kalau ada sekutu ber-HP
   rendah dalam jangkauan, kalau tidak ada baru Tembak musuh terdekat.
2. "Pemburu" (Hunter): cek MusuhLumpuh dulu → kalau ya, GerakKeMusuh +
   Tembak (kejar target lemah); kalau tidak, cek HPMusuhRendah → fokus
   selesaikan; kalau tidak ada target lemah, baru perilaku umum (cek
   MusuhTerlihat → Tembak, tidak → GerakKeMusuh).
3. "Kamikaze": cek SenjataRusak → kalau ya, langsung Tabrak musuh terdekat
   tanpa mundur; kalau senjata masih hidup, main normal (Tembak/GerakKeMusuh)
   tapi dengan ambang Mundur yang sangat rendah (nyaris tidak pernah mundur).
4. "Penjaga Formasi": cek TimUntung → kalau tidak (kalah jumlah), Mundur/
   Diam dekat sekutu (pakai SekutuDekat) sambil nunggu; kalau TimUntung
   true, baru maju menyerang normal.

Pastikan tiap preset bisa dimuat langsung dari layar "buat robot baru" atau
tombol "muat contoh" di Editor, sama seperti 4 preset lama.
```

---

## Fase 19 — Visualisasi Alur Logika Live di Arena

**Tujuan:** Saat pemain memilih (klik) robot tertentu dari tim manapun di
Arena, muncul panel yang menampilkan pohon keputusan robot itu, dengan
jalur node yang sedang aktif menyala real-time mengikuti tick AI robot itu.

**Kriteria selesai:** Klik robot di Arena (raycasting Three.js) memunculkan
panel samping berisi mini-viewer LiteGraph read-only dari brain robot itu.
Tiap ~150ms (sinkron dengan AI tick), node yang baru dilewati (dari Root
sampai Action yang dieksekusi) menyala terang sesaat, lalu meredup lagi
sebelum tick berikutnya. Menutup panel/klik robot lain berhenti melacak
robot sebelumnya dan mulai melacak yang baru.

**Prompt untuk Antigravity:**
```
1. Ubah src/ai/interpreter.js: fungsi evaluateBrain sekarang juga
   mengembalikan (atau menyimpan ke robotState._lastTrace) array berisi
   ID node yang dilewati pada evaluasi tick itu, berurutan dari Root sampai
   node Action yang akhirnya dieksekusi, termasuk info YA/TIDAK yang
   diambil di tiap Condition. Ini TIDAK BOLEH mengubah return value/perilaku
   yang sudah dipakai actions.js selama ini — cukup tambahan data, bukan
   pengganti.
2. Tambahkan raycasting klik di scene Arena Three.js (Fase 11-12): klik
   pada mesh robot manapun (tim A atau B) memicu event "robotSelected"
   dengan referensi robotState robot itu.
3. Buat komponen panel baru src/game3d/BrainViewerPanel.js: saat menerima
   event robotSelected, buka panel samping (HTML/CSS overlay di atas
   canvas) berisi instance LiteGraph BARU dalam mode read-only (tanpa bisa
   edit/drag node) yang me-load brain robot terpilih (graph.configure dari
   data brain robot itu).
4. Tiap AI tick (150ms) untuk robot yang sedang dipantau, baca
   robotState._lastTrace dan beri highlight visual (border menyala/warna
   terang berbeda) pada node-node di _lastTrace pada instance LiteGraph
   panel ini, serta highlight pada link/koneksi yang sesuai jalur YA/TIDAK
   yang diambil. Highlight meredup halus (fade) sebelum tick berikutnya
   datang, supaya terlihat seperti "aliran" bukan kedipan kasar.
5. Panel punya tombol tutup (X) yang menghentikan pelacakan robot itu.
   Klik robot lain di Arena otomatis memindahkan pelacakan ke robot baru
   tanpa perlu tutup panel dulu.
6. Pastikan fitur ini hanya aktif untuk robot yang sedang dipantau (jangan
   hitung/kirim trace untuk semua robot tiap tick kalau tidak ada yang
   dipantau) supaya tidak menambah beban performa terutama saat match 10v10
   dari Fase 17.
```
