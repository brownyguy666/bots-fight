# Walkthrough: Pembangunan Lengkap Game RoboArena

Seluruh arsitektur dan fase pembangunan game **RoboArena** telah selesai diimplementasikan dan disempurnakan sesuai dengan rancangan pada `AGENTS (1).md`, `deployment_phases (1).md`, dan `module2-kustomisasi-robot (1).md`:
1. **Perbaikan Resolusi & Kursor Editor Otak**:
   - Menghapus stretching CSS pada canvas dan menerapkan `ResizeObserver` untuk ukuran 1:1 piksel nyata saat tab Editor dibuka. Resolusi menjadi tajam/jernih dan offset kursor terhadap node terkalibrasi 100% presisi.
2. **Perbaikan Arena Simulasi**:
   - Memperbaiki crash `bg.setLineDash` di `ArenaScene.js` dan memastikan booting Phaser scene menerima data `matchConfig` secara aman. Pertempuran N vs N kini berjalan lancar dengan peluru, laser, rudal, dan efek partikel.
3. **Pemisahan Komponen HUD**:
   - Modul `RobotHUD.js` mandiri dengan orientasi selalu horizontal dan tegak di atas robot, menampilkan bilah HP rangka dan 4-LED kotak status (Senjata, Penggerak, Sensor, Armor).
4. **Sentralisasi Nilai Balancing**:
   - Semua konstanta tuning Modul 2 dikumpulkan di `src/data/balance.js`.
5. **Ekspor/Impor Skema Terpadu**:
   - Menjamin pertukaran data robot via `{ namaRobot, loadout, brain, version: 1 }`.

---

## 1. Komponen yang Telah Dibangun

### A. Konfigurasi Balancing & Modul 2 (`src/data/balance.js` & `parts.js`)
- Nilai balancing terpusat:
  - Cap anti-RNG: maksimal 35% dari HP maksimal part target per hit.
  - Reduksi armor: 20% (Ringan), 35% (Sedang), 50% (Berat).
  - Bobot distribusi damage ke part: 50% Rangka, 20% Senjata, 20% Penggerak, 10% Sensor.
  - Ambang batas pincang: HP Penggerak $\le$ 60% (kecepatan gerak menjadi 50%).
  - Status lumpuh: HP Penggerak = 0% (kecepatan gerak 0, hanya bisa berputar di tempat).
  - Status senjata rusak: HP Senjata = 0% (action Tembak gagal, memicu peringatan).
  - Interval evaluasi AI: 150ms (`BALANCE.ARENA.AI_TICK_MS`).

### B. Manajer Penyimpanan Terpadu (`src/data/storage.js` & presets)
- Menyimpan profil robot lengkap ke `localStorage` dengan format pembungkus:
  ```json
  {
    "namaRobot": "Striker Meriam",
    "loadout": {
      "rangka": "sedang",
      "penggerak": "roda",
      "senjata": "meriam",
      "sensor": "jauh",
      "armor": "sedang"
    },
    "brain": { ...litegraph_data... },
    "exportedAt": "...",
    "version": 1
  }
  ```
- Tombol **Ekspor (.json)** dan **Impor (.json)** di editor dan turnamen membaca-tulis melalui skema terpadu ini, sehingga peserta turnamen cukup mengumpulkan 1 berkas per robot.
- Tersedia 4 robot preset bawaan: *Striker Meriam*, *Laser Sniper*, *Penyerbu Gatling*, dan *Benteng Rudal*.

### C. Bengkel Robot Modular (`src/bengkel/`)
- Tampilan 5 slot part modular:
  1. **Rangka**: Ringan, Sedang, Berat.
  2. **Penggerak**: Roda, Rantai/Track, Kaki Mekanik.
  3. **Senjata**: Meriam Berat, Laser Presisi, Rudal Pengejar, Tembakan Beruntun.
  4. **Sensor**: Kosong, Sensor Pendek, Radar Jarak Jauh, Sensor 360°.
  5. **Armor**: Kosong, Komposit Ringan, Pelat Baja Sedang, Reaktif Berat.
- **Preview Visual 2D Prosedural**: Merender perubahan bentuk sasis, roda/rantai/kaki, turet senjata, medan perisai energi glowing, animasi radar menyapu, dan jet thruster secara real-time.
- Ringkasan kalkulator statistik dinamis (Total HP, Kecepatan, Jangkauan Radar, Tipe Senjata, Absorpsi Armor).

### D. Editor Otak LiteGraph (`src/editor/`)
- Canvas kustom bertema neon cyber dengan port warna-kode (YA = Hijau, TIDAK = Merah).
- Palet blok drag-and-drop berbahasa Indonesia:
  - **Kondisi Dasar**: *Musuh Terlihat?*, *Jarak Musuh < X*, *HP Rangka < %*, *Amunisi Habis?*, *Sekutu Dekat?*.
  - **Kondisi Modul 2**: *Senjata Rusak?*, *Penggerak Lumpuh?*, *Penggerak Pincang?*, *Sensor Rusak?*, *Armor Habis?*.
  - **Aksi Tempur**: *Gerak ke Musuh*, *Mundur dari Musuh*, *Tembak*, *Diam / Bertahan*, *Gerak ke Titik*, *Isi Ulang*.
- Fitur **Tes Cepat (Quick Test 1v1)**: Laci mini-arena melayang yang dapat dibuka langsung di dalam editor untuk melihat reaksi AI secara langsung.
- Panduan interaktif bertahap (5 langkah) untuk siswa & pemula.

### E. Game Engine & Simulasi Arena (`src/game/`)
- Dibangun menggunakan **Phaser 3** dengan resolusi tajam 960x640:
  - **`RobotHUD.js`**: Menangani bilah HP rangka utama, 4 indikator kotak status LED mini (S: Senjata, P: Penggerak, R: Sensor, A: Armor) berwarna hijau/kuning/merah padam, teks melayang kerusakan, dan notifikasi *"SENJATA RUSAK! ❌"*.
  - **`RobotSprite.js`**: Mengelola physics, rotasi haluan, animasi roda/kaki, sentakan turet mundur (recoil), emisi partikel asap (saat pincang), dan percikan petir (saat lumpuh).
  - **`Projectile.js`**: Efek tembakan proyektil meriam, sinar laser cepat, rudal penjejak kendali berbelok, dan semburan gatling jarum.
  - **`ArenaScene.js`**: Simulasi pertandingan N vs N (1v1, 2v2, 3v3), timer 2 menit, AI tick loop 150ms, kontrol kecepatan (0.5x, 1x, 2x, 4x), dan panel tombol debug Modul 2.

### F. Mode Turnamen Nobar Ajang IT (`src/turnamen/`)
- Generator bagan sistem gugur (Single Elimination) untuk 4 atau 8 robot.
- Mendukung unggah banyak berkas `.json` robot sekaligus.
- Tampilan bagan pohon turnamen kontras tinggi untuk nobar proyektor layar besar.
- Menjalankan pertandingan babak demi babak dan menampilkan panggung juara bagi robot pemenang.

### G. Audio Sintetis Offline (`src/audio/sfx.js`)
- Menggunakan **Web Audio API** tanpa perlu file MP3/WAV eksternal:
  - Suara dentuman meriam, desingan laser, peluncuran rudal, dentingan perisai, ledakan mecha, dan klik UI.
  - Dapat di-mute/unmute melalui ikon di bar navigasi atas.

---

## 2. Cara Menguji Aplikasi

Dev server saat ini telah berjalan di:
👉 **`http://localhost:5173/`**

Langkah pengujian yang disarankan:
1. Buka browser dan akses **`http://localhost:5173/`**.
2. **Bengkel Robot**: Pilih berbagai kombinasi part (misal: Rangka Berat + Kaki Mekanik + Meriam + Armor Reaktif Berat) dan amati preview 2D yang langsung menyesuaikan bentuk serta statistiknya.
3. **Editor Otak**: Buka tab Editor, susun alur (misal: `Senjata Rusak?` -> `YA: Mundur`, `TIDAK: Tembak`), lalu tekan tombol ungu **⚡ Tes Cepat (1v1)** di pojok kanan atas untuk melihat pertarungan uji coba langsung di editor.
4. **Arena Simulasi**: Buka tab Arena, pilih format **2 vs 2** atau **3 vs 3**, lalu klik **🚀 Mulai Pertempuran Arena**. Gunakan tombol di bar bawah (*Rusakkan Senjata Bot 1*, *Pincangkan Penggerak 40%*) untuk melihat umpan balik visual partikel asap dan peringatan teks melayang.
5. **Turnamen**: Buka tab Turnamen, pilih 4 peserta, lalu klik **🚀 Bentuk Bagan Bracket** dan mainkan tiap babak hingga babak final.
