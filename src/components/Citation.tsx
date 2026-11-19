import type { Reference } from '@/data/references';

/** Menampilkan satu entri pustaka dalam format APA 7 (judul miring). */
export function Citation({ r }: { r: Reference }) {
  return (
    <>
      {r.authors} ({r.year}). <i>{r.title}</i>
      {r.edition ? ` (${r.edition})` : ''}
      {r.medium ? ` ${r.medium}` : ''}. {r.publisher}.
    </>
  );
}

/** Teks polos (untuk disalin). */
export function citationText(r: Reference) {
  return `${r.authors} (${r.year}). ${r.title}${r.edition ? ` (${r.edition})` : ''}${r.medium ? ` ${r.medium}` : ''}. ${r.publisher}.`;
}
