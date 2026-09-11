/**
 * RoboArena - Onboarding Tutorial untuk Siswa & Pemula
 * 5 Langkah interaktif yang menjelaskan konsep Decision Tree visual.
 */

const TUTORIAL_SEEN_KEY = 'roboarena_tutorial_seen';

export const TUTORIAL_STEPS = [
  {
    title: 'Selamat Datang di Editor Otak RoboArena! 🤖',
    desc: 'Di sini kamu adalah programmer robot tempur! Robotmu TIDAK dikendalikan manual dengan keyboard saat bertarung, melainkan bergerak otomatis menggunakan **Pohon Keputusan (Decision Tree)** yang kamu susun.',
    highlightEl: null
  },
  {
    title: '1. Node Mulai (ROOT) 🚀',
    desc: 'Setiap 150 milidetik saat bertanding, robot akan membaca pikiran dari node emas **ROOT**. Alur logika selalu dimulai dari port sebelah kanan node ini.',
    highlightEl: null
  },
  {
    title: '2. Node Kondisi (Sensor) 👁️',
    desc: 'Node biru/oranye adalah sensor pertanyaan (misal: "Musuh Terlihat?", "Senjata Rusak?"). Setiap kondisi punya dua cabang: **YA (Hijau)** jika kondisi benar, dan **TIDAK (Merah)** jika salah.',
    highlightEl: '#editor-palette-list'
  },
  {
    title: '3. Node Aksi (Terminal) 🎯',
    desc: 'Cabang kondisi harus bermuara ke node ungu **Aksi** (seperti "Tembak", "Gerak ke Musuh", atau "Mundur"). Saat alur menyentuh aksi, robot langsung menjalankan aksi tersebut!',
    highlightEl: '#editor-palette-list'
  },
  {
    title: '4. Tes Cepat & Simpan ⚡',
    desc: 'Gunakan tombol **"Tes Cepat"** untuk langsung melihat robotmu bertarung 1 lawan 1 tanpa pindah halaman, dan jangan lupa tekan **"Simpan Otak"** saat strategimu sudah mantap!',
    highlightEl: '#btn-quick-test'
  }
];

export function initTutorial(force = false) {
  const hasSeen = localStorage.getItem(TUTORIAL_SEEN_KEY);
  if (hasSeen && !force) return;

  let currentStep = 0;
  let overlay = document.getElementById('tutorial-modal-overlay');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'tutorial-modal-overlay';
    overlay.className = 'tutorial-modal-overlay';
    document.body.appendChild(overlay);
  }

  function renderStep(index) {
    const step = TUTORIAL_STEPS[index];
    const isLast = index === TUTORIAL_STEPS.length - 1;

    overlay.innerHTML = `
      <div class="tutorial-card">
        <div class="tutorial-header">
          <span class="tutorial-badge">Panduan Pemula • Langkah ${index + 1}/${TUTORIAL_STEPS.length}</span>
          <button class="tutorial-close-btn" id="tutorial-close-btn">&times;</button>
        </div>
        <h3 class="tutorial-title">${step.title}</h3>
        <p class="tutorial-desc">${step.desc}</p>
        <div class="tutorial-footer">
          ${index > 0 ? '<button class="btn-tut-secondary" id="tut-prev-btn">Sebelumnya</button>' : '<span></span>'}
          <button class="btn-tut-primary" id="tut-next-btn">${isLast ? 'Mulai Merakit Otak! 🚀' : 'Lanjut ➔'}</button>
        </div>
      </div>
    `;

    overlay.classList.add('active');

    document.getElementById('tutorial-close-btn').onclick = closeTutorial;
    const prevBtn = document.getElementById('tut-prev-btn');
    if (prevBtn) {
      prevBtn.onclick = () => {
        if (currentStep > 0) {
          currentStep--;
          renderStep(currentStep);
        }
      };
    }
    document.getElementById('tut-next-btn').onclick = () => {
      if (isLast) {
        closeTutorial();
      } else {
        currentStep++;
        renderStep(currentStep);
      }
    };
  }

  function closeTutorial() {
    overlay.classList.remove('active');
    localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
  }

  renderStep(0);
}
