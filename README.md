# EOQ Studio — Riset Operasi Bab 15

Aplikasi web untuk **Model Persediaan EOQ Deterministik** (W. L. Winston, *Operations Research: Applications and Algorithms*, Bab 15). Setiap model punya input tervalidasi, hasil otomatis, langkah penyelesaian (LaTeX), grafik, tabel, ekspor, dan riwayat analisis.

## Cara cepat (tanpa instalasi)

Buka **`EOQ-Studio.html`** dengan browser apa pun (klik dua kali). Seluruh aplikasi ada dalam satu file dan berjalan offline. Riwayat tersimpan di browser yang dipakai.

## Menjalankan dari kode sumber

Butuh Node.js 18 atau lebih baru.

```bash
npm install
npm run dev              # server pengembangan → http://localhost:5173
npm test                 # unit test solver terhadap Contoh 1–7 di materi
npm run build            # build produksi ke dist/ (untuk Vercel/Netlify/GitHub Pages)
npm run build:standalone # build satu file → EOQ-Studio.html
```

## Deploy gratis

Aplikasi ini 100% statis (tanpa server), jadi bisa di-hosting gratis. Pilih salah satu:

| Layanan | Langkah | Hasil URL |
|---|---|---|
| **Vercel** (paling mudah) | Push folder ini ke GitHub → vercel.com → *Add New Project* → pilih repo → *Deploy*. Preset Vite terdeteksi otomatis (build `npm run build`, output `dist`). | `nama-proyek.vercel.app` |
| **GitHub Pages** | Push ke repo GitHub publik → *Settings → Pages → Source: GitHub Actions*. Workflow `.github/workflows/deploy.yml` sudah tersedia (menjalankan test lalu build). | `username.github.io/nama-repo/` |
| **Netlify** | app.netlify.com → *Add new site → Import from Git* (build `npm run build`, publish `dist`), atau seret folder `dist` ke halaman Netlify Drop. | `nama-situs.netlify.app` |
| **Cloudflare Pages** | dash.cloudflare.com → *Workers & Pages → Create → Pages → Connect to Git*, preset Vite. | `nama-proyek.pages.dev` |

Konfigurasi `base: './'` dan HashRouter membuat aplikasi jalan di root domain maupun subfolder tanpa pengaturan tambahan. Riwayat tetap tersimpan di browser masing-masing pengunjung; setiap pengunjung baru otomatis mendapat 12 contoh soal PPT.

## Contoh soal PPT di riwayat

Saat aplikasi pertama kali dibuka, 12 contoh soal dari PPT otomatis masuk ke Riwayat (berlabel **PPT**), lengkap dengan catatan jawaban buku untuk dicocokkan. Jika terhapus, tekan **Muat contoh soal PPT** di halaman Riwayat. Daftarnya ada di `src/data/seed.ts`.

## Fitur

| Modul | Subbab | Isi |
|---|---|---|
| EOQ Dasar | 15.1–15.2 | q*, frekuensi & siklus, HC = OC, TC, reorder point (kasus 1 & 2, satuan lead time bebas), pembulatan bilangan bulat, tabel sensitivitas q, analisis sensitivitas D/K/h, biaya simpan nominal atau % harga, satuan waktu bebas (contoh bus per jam) |
| Diskon Kuantitas | 15.3 | Tabel tingkat harga dinamis, jejak algoritma buku (Observasi 1–3), tabel seluruh interval ala Qd.xls, perbandingan kandidat, kurva TC piecewise |
| EOQ Laju Kontinu | 15.4 | q*, faktor √(r/(r−D)), Imax, waktu produksi/idle, utilisasi, pengaruh r → ∞ |
| Back Order | 15.5 | q*, M*, kekurangan maks, komponen biaya, fase stok/kekurangan, grafik persediaan negatif, pengaruh s |
| Validitas EOQ | 15.6 | Uji Peterson & Silver (FC), tempel data dari Excel, grafik vs rata-rata, lanjut otomatis ke EOQ Dasar |
| Multi-Produk | 15.7 | Optimasi pengali bulat menyeluruh (pengganti Evolutionary Solver) atau trial manual, top-8 alternatif, perbandingan pesan gabungan vs terpisah |

Fitur umum:

- **Dashboard**: statistik, kartu model, analisis terbaru, aktivitas 14 hari, distribusi per model, dan contoh soal yang bisa dibuka langsung.
- **Riwayat**: simpan/perbarui analisis dengan judul dan catatan; cari, filter, urutkan, tandai favorit, ubah, hapus; ekspor/impor JSON; ekspor CSV.
- **Bandingkan**: hingga 6 skenario dari model yang sama, ditampilkan berdampingan; input yang berbeda ditandai, plus grafik metrik.
- **Ekspor per hasil**: CSV (bisa dibuka di Excel), cetak/PDF dengan tata letak khusus cetak, dan salin ringkasan.
- **Materi & Rumus**: ringkasan teori setiap subbab dengan rumus KaTeX.
- **Pengaturan**: tema terang/gelap/sistem, format angka Indonesia/Inggris, mata uang ($, Rp, €, RM), jumlah desimal, nama analis.
- Responsif (desktop & ponsel). Semua perhitungan berjalan di browser.

## Stack

| Bagian | Pilihan | Alasan |
|---|---|---|
| UI | React 18 + TypeScript | Komponen terketik, mudah dikembangkan |
| Build | Vite 5 (+ vite-plugin-singlefile) | Dev server cepat; bisa dibuat menjadi satu file HTML offline |
| Styling | Tailwind CSS 3 | Desain konsisten, mode gelap |
| Grafik | Recharts | Grafik interaktif dengan tooltip |
| Rumus | KaTeX | Render LaTeX cepat untuk langkah penyelesaian |
| State & penyimpanan | Zustand + localStorage | Riwayat & pengaturan persisten tanpa server |
| Routing | React Router (HashRouter) | Bisa dibuka lewat file:// maupun hosting statis |
| Test | Vitest | Verifikasi solver terhadap contoh buku |

Tidak memakai backend: aplikasi ini untuk perhitungan personal/kelas, sehingga dibuka langsung tanpa server atau database. Jika nanti perlu akun dan riwayat bersama, lapisan `src/store/history.ts` bisa diganti dengan API (mis. FastAPI/Supabase) tanpa mengubah solver.

## Struktur

```
src/
  lib/models/        # solver murni per model + langkah LaTeX + validasi (+ models.test.ts)
  lib/registry.ts    # metadata model & metrik ringkasan untuk riwayat
  lib/format.ts      # format angka/mata uang (id-ID / en-US)
  lib/export.ts      # CSV & JSON
  data/presets.ts    # contoh soal dari materi
  store/             # settings, history, toast (Zustand)
  components/        # UI primitives, charts, shell halaman model, layout
  pages/             # Dashboard, 6 model, Riwayat, Bandingkan, Materi, Pengaturan
```

## Verifikasi terhadap materi

`npm test` mengecek hasil berikut:

| Contoh | Hasil |
|---|---|
| 1 Braneast Airlines | q* = 250, 2 pesanan/tahun, T = 0,5 tahun; q = 300 → 20,33 (+1,67%) |
| Reorder point | L = 1 bulan → R = 41,67; L = 15 bulan → R = 625 mod 250 = 125 |
| 2 Kamera | q* = 70,71 (bandingkan 70 dan 71) |
| 3 Bus | q* = 20, 5 bus/jam, tiap 12 menit |
| 4 Disket | EOQ₃ = 143,59, EOQ₂ = 142,86; optimum q = 300, TC = $50.288,33 |
| 5 Macho Auto | q* = 115,47, 86,60 run/tahun, biaya $34.641,02 |
| 6 Smalltown | q* = 537,48, M* = 413,45, kekurangan 124,03 |
| 15.6 Kuartal | d̄ = 100, var = 350, FC = 0,035 |
| 7 Ohm City | n = 10,4614, pengali 1:1:4, TC = $130.766,97 |

Catatan: pada Contoh 7, kombinasi 1:2:5 menghasilkan total biaya yang persis sama dengan 1:1:4 (2√(AB) identik), jadi solusi optimalnya tidak tunggal. Aplikasi menandai alternatif ini sebagai "setara".
