/**
 * RoboArena - Kamus Penjelasan Blok Logika (Ramah Anak)
 * Menyediakan penjelasan 1 kalimat sederhana + contoh untuk setiap blok logika
 * di palet editor pohon keputusan.
 */

export const BLOCK_DESCRIPTIONS = {
  // Mulai Di Sini
  Root: {
    judul: 'Mulai (Root)',
    penjelasan: 'Titik awal jalannya pikiran robot. Dari sinilah robot mulai membuat keputusan!',
    contoh: 'Contoh: Robot mulai berpikir dari sini tiap kali bernapas (150 milidetik).'
  },

  // Kondisi Dasar
  MusuhTerlihat: {
    judul: 'Musuh Terlihat?',
    penjelasan: 'Mengecek apakah radar sensor robot melihat ada musuh di depannya tanpa terhalang dinding batu.',
    contoh: 'Contoh: YA jika musuh masuk jangkauan radar dan pandangan bebas, TIDAK jika terhalang rintangan.'
  },
  JarakMusuhKurangDari: {
    judul: 'Jarak Musuh < X',
    penjelasan: 'Mengecek apakah musuh terdekat berada sangat dekat di bawah jarak tertentu.',
    contoh: 'Contoh: Atur ke 15 unit untuk tahu saat musuh sudah terlalu dekat.'
  },
  HPKurangDari: {
    judul: 'HP Rangka < %',
    penjelasan: 'Mengecek apakah darah atau daya tahan badan robot sudah menipis.',
    contoh: 'Contoh: Jika darah < 30%, robot bisa segera memutuskan untuk mundur!'
  },
  AmunisiHabis: {
    judul: 'Amunisi Habis?',
    penjelasan: 'Mengecek apakah peluru senjata robot sudah kosong melompong.',
    contoh: 'Contoh: Jika amunisi habis, robot bisa ganti taktik menabrak musuh.'
  },
  SekutuDekat: {
    judul: 'Sekutu Dekat?',
    penjelasan: 'Mengecek apakah ada teman satu tim yang berada di dekat robot.',
    contoh: 'Contoh: Membantu robot agar selalu bertarung bersama teman dan tidak sendirian.'
  },

  // Kondisi Taktis (Modul 4)
  MusuhLumpuh: {
    judul: 'Musuh Lumpuh?',
    penjelasan: 'Mengecek apakah musuh yang dihadapi sedang mogok atau terkena sengatan listrik EMP.',
    contoh: 'Contoh: Manfaatkan saat musuh mogok untuk mendekat dan menyerang tanpa takut dibalas!'
  },
  HPMusuhRendah: {
    judul: 'HP Musuh Rendah (%)',
    penjelasan: 'Mengecek apakah sisa darah musuh yang dibidik sudah sangat sekarat.',
    contoh: 'Contoh: Jika darah musuh < 25%, langsung serang habis-habisan untuk mengalahkannya.'
  },
  TimUntung: {
    judul: 'Tim Untung?',
    penjelasan: 'Mengecek apakah jumlah kawan yang hidup lebih banyak dari jumlah musuh.',
    contoh: 'Contoh: Jika tim kita lebih banyak, robot akan berani maju menyerbu bersama!'
  },
  WaktuHampirHabis: {
    judul: 'Waktu Hampir Habis?',
    penjelasan: 'Mengecek apakah sisa waktu pertandingan di arena tinggal sedikit.',
    contoh: 'Contoh: Jika waktu < 20 detik, robot yang unggul skor bisa memilih bertahan.'
  },

  // Kondisi Part Rusak
  SenjataRusak: {
    judul: 'Senjata Rusak?',
    penjelasan: 'Mengecek apakah meriam atau tembakan robot sudah patah atau hancur tertembak.',
    contoh: 'Contoh: Jika senjata hancur, robot otomatis tahu tembakan tidak akan mempan.'
  },
  PenggerakRusak: {
    judul: 'Penggerak Lumpuh?',
    penjelasan: 'Mengecek apakah roda atau rantai robot hancur total sehingga tidak bisa jalan.',
    contoh: 'Contoh: Saat kaki hancur, robot hanya bisa berputar di tempat sambil membidik.'
  },
  PenggerakPincang: {
    judul: 'Penggerak Pincang?',
    penjelasan: 'Mengecek apakah roda robot rusak separuh (HP < 60%) sehingga geraknya lambat.',
    contoh: 'Contoh: Robot bisa memilih menjaga jarak karena larinya kalah cepat dari musuh.'
  },
  SensorRusak: {
    judul: 'Sensor Rusak?',
    penjelasan: 'Mengecek apakah radar robot rusak sehingga matanya hanya bisa melihat jarak dekat.',
    contoh: 'Contoh: Saat radar rusak, robot butuh mendekat untuk menemukan musuh.'
  },
  ArmorHabis: {
    judul: 'Armor Habis?',
    penjelasan: 'Mengecek apakah pelat baja pelindung tambahan robot sudah habis terkelupas.',
    contoh: 'Contoh: Tanpa armor, serangan musuh akan langsung melukai badan utama robot.'
  },

  // Kondisi Modul 5 (Objektif & Sinyal Tim)
  SedangBawaFlag: {
    judul: 'Sedang Bawa Flag?',
    penjelasan: 'Mengecek apakah robot sedang membawa bendera lawan dalam mode Capture the Flag.',
    contoh: 'Contoh: Jika membawa flag, segera lari kembali ke pangkalan tim sendiri!'
  },
  FlagMusuhTerlihat: {
    judul: 'Flag Musuh Terlihat?',
    penjelasan: 'Mengecek apakah bendera tim lawan terlihat dalam jangkauan sensor dan pandangan bebas.',
    contoh: 'Contoh: Menuju bendera musuh untuk merebutnya.'
  },
  DiZonaHill: {
    judul: 'Di Zona Hill?',
    penjelasan: 'Mengecek apakah robot sedang berada di dalam zona bukit tengah (King of the Hill).',
    contoh: 'Contoh: Jika sudah di bukit, bertahan dan halau musuh yang mencoba masuk.'
  },
  TimUnggulDiHill: {
    judul: 'Tim Unggul di Hill?',
    penjelasan: 'Mengecek apakah timmu memiliki lebih banyak robot hidup di zona bukit daripada lawan.',
    contoh: 'Contoh: Jika tim unggul, pertahankan kendali untuk menambah poin waktu kontrol.'
  },
  SekutuMintaBantuan: {
    judul: 'Sekutu Minta Bantuan?',
    penjelasan: 'Mengecek apakah ada teman satu tim di sekitar yang mengirim sinyal darurat butuh bantuan.',
    contoh: 'Contoh: Jika ada teman sekarat minta tolong, datang untuk melindungi atau membantunya.'
  },
  AdaMusuhPrioritas: {
    judul: 'Ada Musuh Prioritas?',
    penjelasan: 'Mengecek apakah Komandan tim telah menandai sasaran tembak utama.',
    contoh: 'Contoh: Seluruh tim fokus menyerang musuh prioritas yang sama agar cepat roboh!'
  },

  // Aksi Tempur
  GerakKeMusuh: {
    judul: 'Gerak ke Musuh',
    penjelasan: 'Robot langsung melaju kencang mendekati posisi musuh terdekat.',
    contoh: 'Contoh: Digunakan untuk memburu musuh yang kabur atau mendekati target tembak.'
  },
  Mundur: {
    judul: 'Mundur dari Musuh',
    penjelasan: 'Robot berjalan mundur menjauhi musuh untuk menyelamatkan diri atau menjaga jarak.',
    contoh: 'Contoh: Berguna saat robot memakai senjata jarak jauh atau darahnya tinggal sedikit.'
  },
  Tembak: {
    judul: 'Tembak',
    penjelasan: 'Robot mengarahkan laras senjatanya dan menembak tepat ke sasaran.',
    contoh: 'Contoh: Tembakkan meriam, laser, atau rudal saat musuh masuk jangkauan.'
  },
  Diam: {
    judul: 'Diam / Bertahan',
    penjelasan: 'Robot menghentikan rodanya dan bertahan di tempat sambil tetap waspada.',
    contoh: 'Contoh: Menunggu musuh datang mendekat ke wilayah perangkap.'
  },
  GerakKeTitik: {
    judul: 'Gerak ke Titik (X, Y)',
    penjelasan: 'Robot meluncur menuju koordinat tertentu di arena pertempuran.',
    contoh: 'Contoh: Atur ke tengah arena (X: 30, Y: 20) untuk menguasai pusat pertempuran.'
  },
  IsiUlang: {
    judul: 'Isi Ulang Amunisi',
    penjelasan: 'Robot berhenti sejenak untuk mengisi kembali kotak peluru senjata.',
    contoh: 'Contoh: Dipakai saat amunisi habis agar senjata bisa menembak lagi.'
  },
  Tabrak: {
    judul: 'Tabrak Musuh',
    penjelasan: 'Robot menabrakkan badannya sekuat tenaga ke arah musuh terdekat!',
    contoh: 'Contoh: Serangan pamungkas saat peluru habis atau senjata patah.'
  },
  FokusMusuhTerlemah: {
    judul: 'Fokus Musuh Terlemah',
    penjelasan: 'Robot mencari musuh yang darahnya paling tipis dan langsung menyerangnya.',
    contoh: 'Contoh: Taktik cerdas untuk mengurangi jumlah musuh secepat mungkin!'
  },
  LindungiSekutu: {
    judul: 'Lindungi Sekutu',
    penjelasan: 'Robot bergerak maju menjadi tameng di depan teman satu tim yang sedang sekarat atau minta bantuan.',
    contoh: 'Contoh: Menyelamatkan teman yang hampir kalah agar tim tetap menang.'
  },

  // Aksi Modul 5 (Objektif & Sinyal Tim)
  SerangMusuhPrioritas: {
    judul: 'Serang Musuh Prioritas',
    penjelasan: 'Robot menyerbu dan menembaki target khusus yang ditandai oleh Komandan.',
    contoh: 'Contoh: Bekerja sama merobohkan musuh terkuat secara terkoordinasi.'
  },
  GerakKeFlagMusuh: {
    judul: 'Gerak ke Flag Musuh',
    penjelasan: 'Robot melaju menuju bendera lawan untuk mengambil dan membawanya pulang.',
    contoh: 'Contoh: Rebut bendera musuh secepat mungkin dalam mode Capture the Flag.'
  },
  KembaliKeBase: {
    judul: 'Kembali ke Base',
    penjelasan: 'Robot membawa bendera musuh kembali ke pangkalan tim sendiri.',
    contoh: 'Contoh: Antar bendera ke base untuk memenangkan pertandingan!'
  },
  KuasaiHill: {
    judul: 'Kuasai Zona Hill',
    penjelasan: 'Robot bergerak maju dan bertahan di dalam zona lingkaran bukit tengah.',
    contoh: 'Contoh: Kumpulkan poin waktu penguasaan bukit untuk menang dalam King of the Hill.'
  }
};
