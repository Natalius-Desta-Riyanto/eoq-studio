export function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const esc = (v: unknown) => {
  const s = v == null ? '' : typeof v === 'number' ? (Number.isFinite(v) ? String(+v.toPrecision(12)) : '') : String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export interface CsvSection { title: string; headers?: string[]; rows: unknown[][] }

/** CSV multi-bagian (dibuka rapi di Excel/Sheets). Angka memakai titik desimal. */
export function toCsv(sections: CsvSection[]): string {
  return sections
    .map((s) => [esc(s.title), ...(s.headers ? [s.headers.map(esc).join(',')] : []), ...s.rows.map((r) => r.map(esc).join(','))].join('\n'))
    .join('\n\n');
}

export function downloadCsv(filename: string, sections: CsvSection[]) {
  download(filename, '﻿' + toCsv(sections), 'text/csv;charset=utf-8');
}

export function downloadJson(filename: string, data: unknown) {
  download(filename, JSON.stringify(data, null, 2), 'application/json');
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'hasil';
export const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
