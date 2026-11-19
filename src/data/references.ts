// Daftar pustaka (format APA 7). Dipakai di sidebar dan halaman Materi.
export interface Reference {
  id: string;
  authors: string;
  year: string;
  title: string;      // dicetak miring
  edition?: string;
  medium?: string;    // mis. "[Slide presentasi]"
  publisher: string;
  isbn?: string;
  note?: string;      // keterangan penggunaan di aplikasi
}

export const REFERENCES: Reference[] = [
  {
    id: 'winston',
    authors: 'Winston, W. L.',
    year: '2004',
    title: 'Operations research: Applications and algorithms',
    edition: '4th ed.',
    publisher: 'Thomson Brooks/Cole',
    isbn: '978-0-534-38058-8',
    note: 'Sumber utama teori, notasi, dan contoh soal (Deterministic EOQ inventory models).',
  },
  {
    id: 'silver',
    authors: 'Silver, E. A., Pyke, D. F., & Peterson, R.',
    year: '1998',
    title: 'Inventory management and production planning and scheduling',
    edition: '3rd ed.',
    publisher: 'John Wiley & Sons',
    isbn: '978-0-471-11947-0',
    note: 'Sumber uji koefisien variabilitas (FC) dan ambang 0,20 pada modul Validitas EOQ.',
  },
  {
    id: 'ppt',
    authors: 'Laksamana, M. A., Riyanto, N. D., & Mafaza, B. I.',
    year: '2026, 31 Oktober',
    title: 'Model persediaan EOQ deterministik',
    medium: '[Slide presentasi]',
    publisher: 'Departemen Matematika, Universitas Indonesia',
    note: 'Sumber 12 contoh soal yang dimuat di Riwayat.',
  },
];

export const PRIMARY_REFERENCE = REFERENCES[0];
