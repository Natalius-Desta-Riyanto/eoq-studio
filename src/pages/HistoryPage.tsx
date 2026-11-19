import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { BookOpenCheck, Download, ExternalLink, FileJson, FileSpreadsheet, GitCompareArrows, History, Pencil, Search, Star, Trash2, Upload } from 'lucide-react';
import type { ModelKind } from '@/lib/models/common';
import { MODELS, modelByKind } from '@/lib/registry';
import { useHistory, type HistoryEntry } from '@/store/history';
import { toast } from '@/store/toast';
import { downloadCsv, downloadJson, stamp } from '@/lib/export';
import { formatDate, relativeTime } from '@/lib/format';
import { seedExamples, SEED_IDS } from '@/data/seed';
import { Badge, Card, Empty, MetricValue, Modal, SelectField, TextField } from '@/components/ui';

type Sort = 'new' | 'old' | 'title';

export default function HistoryPage() {
  const { entries, remove, removeMany, toggleStar, update, importMany } = useHistory();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<'all' | ModelKind>('all');
  const [starOnly, setStarOnly] = useState(false);
  const [sort, setSort] = useState<Sort>('new');
  const [sel, setSel] = useState<string[]>([]);
  const [editing, setEditing] = useState<HistoryEntry | null>(null);
  const [draft, setDraft] = useState({ title: '', note: '' });
  const [confirm, setConfirm] = useState<string[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const out = entries.filter((e) =>
      (kind === 'all' || e.kind === kind) && (!starOnly || e.starred) &&
      (!term || e.title.toLowerCase().includes(term) || e.note.toLowerCase().includes(term) || modelByKind(e.kind).name.toLowerCase().includes(term)));
    if (sort === 'old') out.sort((a, b) => a.createdAt - b.createdAt);
    else if (sort === 'title') out.sort((a, b) => a.title.localeCompare(b.title, 'id'));
    else out.sort((a, b) => b.createdAt - a.createdAt);
    return out;
  }, [entries, q, kind, starOnly, sort]);

  const selected = entries.filter((e) => sel.includes(e.id));
  const sameKind = selected.length >= 2 && selected.every((e) => e.kind === selected[0].kind);
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allChecked = list.length > 0 && list.every((e) => sel.includes(e.id));

  const exportJson = (items: HistoryEntry[]) => {
    downloadJson(`eoq-studio-riwayat-${stamp()}.json`, { app: 'EOQ Studio', version: 1, exportedAt: new Date().toISOString(), entries: items });
    toast(`${items.length} entri diekspor ke JSON.`);
  };
  const exportCsv = (items: HistoryEntry[]) => {
    downloadCsv(`eoq-studio-riwayat-${stamp()}.csv`, [{
      title: 'Riwayat EOQ Studio',
      headers: ['Tanggal', 'Model', 'Judul', 'Catatan', 'Metrik 1', 'Nilai 1', 'Metrik 2', 'Nilai 2', 'Metrik 3', 'Nilai 3', 'Metrik 4', 'Nilai 4'],
      rows: items.map((e) => [new Date(e.createdAt).toISOString(), modelByKind(e.kind).name, e.title, e.note,
        ...e.metrics.slice(0, 4).flatMap((m) => [m.label, m.value])]),
    }]);
    toast('Ringkasan riwayat diekspor ke CSV.');
  };
  const onImport = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      const items: HistoryEntry[] = Array.isArray(data) ? data : data.entries;
      if (!Array.isArray(items)) throw new Error('format');
      const n = importMany(items.filter((x) => MODELS.some((m) => m.kind === x.kind)));
      toast(n ? `${n} entri berhasil diimpor.` : 'Tidak ada entri baru (mungkin sudah ada).', n ? 'success' : 'info');
    } catch {
      toast('File tidak valid. Gunakan file JSON hasil ekspor EOQ Studio.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Riwayat perhitungan</h1>
          <p className="mt-1 text-sm text-slate-500">Semua analisis tersimpan secara lokal di browser ini. Ekspor JSON untuk cadangan atau berpindah perangkat.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ''; }} />
          <button className="btn-secondary" title="Tambahkan kembali contoh soal PPT yang belum ada di riwayat"
            onClick={() => { const n = seedExamples(); toast(n ? `${n} contoh soal PPT ditambahkan ke riwayat.` : 'Semua contoh soal PPT sudah ada di riwayat.', n ? 'success' : 'info'); }}>
            <BookOpenCheck className="h-4 w-4" /> Muat contoh soal PPT
          </button>
          <button className="btn-secondary" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Impor JSON</button>
          <button className="btn-secondary" disabled={!entries.length} onClick={() => exportCsv(list)}><FileSpreadsheet className="h-4 w-4" /> CSV</button>
          <button className="btn-secondary" disabled={!entries.length} onClick={() => exportJson(entries)}><FileJson className="h-4 w-4" /> Ekspor semua</button>
        </div>
      </div>

      <Card bodyClass="p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Cari judul, catatan, atau model…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <SelectField<'all' | ModelKind> value={kind} onChange={setKind} className="w-48"
            options={[{ value: 'all', label: 'Semua model' }, ...MODELS.map((m) => ({ value: m.kind, label: m.name }))]} />
          <SelectField<Sort> value={sort} onChange={setSort} className="w-40"
            options={[{ value: 'new', label: 'Terbaru' }, { value: 'old', label: 'Terlama' }, { value: 'title', label: 'Judul A–Z' }]} />
          <button className={clsx('btn-secondary', starOnly && '!border-amber-300 !bg-amber-50 !text-amber-800 dark:!bg-amber-950/40 dark:!text-amber-300')} onClick={() => setStarOnly((s) => !s)}>
            <Star className={clsx('h-4 w-4', starOnly && 'fill-amber-400 text-amber-400')} /> Favorit
          </button>
        </div>

        {sel.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-brand-50/60 px-4 py-2.5 text-sm dark:border-slate-800 dark:bg-brand-950/30">
            <span className="font-medium">{sel.length} dipilih</span>
            <button className="btn-secondary btn-sm" disabled={!sameKind} title={sameKind ? '' : 'Pilih ≥ 2 entri dari model yang sama'}
              onClick={() => nav(`/bandingkan?ids=${sel.join(',')}`)}><GitCompareArrows className="h-3.5 w-3.5" /> Bandingkan</button>
            <button className="btn-secondary btn-sm" onClick={() => exportJson(selected)}><Download className="h-3.5 w-3.5" /> Ekspor</button>
            <button className="btn-secondary btn-sm !text-red-600" onClick={() => setConfirm(sel)}><Trash2 className="h-3.5 w-3.5" /> Hapus</button>
            <button className="btn-ghost btn-sm ml-auto" onClick={() => setSel([])}>Batal pilih</button>
          </div>
        )}

        {list.length === 0 ? (
          <Empty icon={<History className="h-5 w-5" />} title={entries.length ? 'Tidak ada yang cocok' : 'Belum ada riwayat'}
            action={!entries.length && <Link to="/model/eoq-dasar" className="btn-primary">Buat analisis pertama</Link>}>
            {entries.length ? 'Ubah kata kunci atau filter.' : 'Tekan tombol Simpan di halaman model untuk menyimpan hasil perhitungan.'}
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th className="w-10"><input type="checkbox" checked={allChecked} onChange={() => setSel(allChecked ? [] : list.map((e) => e.id))} aria-label="Pilih semua" /></th>
                  <th>Analisis</th><th>Model</th><th>Hasil utama</th><th>Dibuat</th><th className="w-36" />
                </tr>
              </thead>
              <tbody>
                {list.map((e) => {
                  const meta = modelByKind(e.kind);
                  return (
                    <tr key={e.id} className={clsx('align-top hover:bg-slate-50/70 dark:hover:bg-slate-800/30', sel.includes(e.id) && 'bg-brand-50/40 dark:bg-brand-950/20')}>
                      <td className="pt-3"><input type="checkbox" checked={sel.includes(e.id)} onChange={() => toggle(e.id)} aria-label={`Pilih ${e.title}`} /></td>
                      <td className="max-w-[320px]">
                        <button className="text-left font-medium text-slate-900 hover:text-brand-600 dark:text-white dark:hover:text-brand-400" onClick={() => nav(`${meta.path}?h=${e.id}`)}>{e.title}</button>
                        {SEED_IDS.includes(e.id) && <Badge tone="amber" className="ml-2 align-middle">PPT</Badge>}
                        {e.note && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{e.note}</p>}
                      </td>
                      <td><Badge tone="blue"><meta.icon className="h-3 w-3" />{meta.short}</Badge></td>
                      <td>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                          {e.metrics.slice(0, 3).map((m) => (
                            <span key={m.key}><span className="text-slate-400">{m.label}: </span><span className="font-medium tabular-nums"><MetricValue m={m} /></span></span>
                          ))}
                        </div>
                      </td>
                      <td className="whitespace-nowrap text-xs text-slate-500" title={formatDate(e.createdAt)}>{relativeTime(e.createdAt)}</td>
                      <td>
                        <div className="flex justify-end gap-0.5">
                          <button className="btn-ghost btn-sm px-2" onClick={() => toggleStar(e.id)} aria-label="Favorit"><Star className={clsx('h-4 w-4', e.starred && 'fill-amber-400 text-amber-400')} /></button>
                          <button className="btn-ghost btn-sm px-2" onClick={() => { setEditing(e); setDraft({ title: e.title, note: e.note }); }} aria-label="Ubah"><Pencil className="h-4 w-4" /></button>
                          <button className="btn-ghost btn-sm px-2" onClick={() => nav(`${meta.path}?h=${e.id}`)} aria-label="Buka"><ExternalLink className="h-4 w-4" /></button>
                          <button className="btn-ghost btn-sm px-2 hover:!text-red-600" onClick={() => setConfirm([e.id])} aria-label="Hapus"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Ubah entri"
        footer={<><button className="btn-ghost" onClick={() => setEditing(null)}>Batal</button>
          <button className="btn-primary" onClick={() => { if (editing) update(editing.id, { title: draft.title.trim() || editing.title, note: draft.note }); setEditing(null); toast('Entri diperbarui.'); }}>Simpan</button></>}>
        <div className="space-y-4">
          <TextField label="Judul" value={draft.title} onChange={(title) => setDraft((d) => ({ ...d, title }))} />
          <TextField label="Catatan" multiline value={draft.note} onChange={(note) => setDraft((d) => ({ ...d, note }))} />
        </div>
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Hapus entri?"
        footer={<><button className="btn-ghost" onClick={() => setConfirm(null)}>Batal</button>
          <button className="btn-danger" onClick={() => {
            if (!confirm) return;
            if (confirm.length === 1) remove(confirm[0]); else removeMany(confirm);
            setSel((s) => s.filter((x) => !confirm.includes(x)));
            toast(`${confirm.length} entri dihapus.`);
            setConfirm(null);
          }}>Hapus permanen</button></>}>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {confirm?.length === 1 ? 'Entri ini' : `${confirm?.length} entri`} akan dihapus dari browser ini dan tidak dapat dikembalikan. Ekspor JSON terlebih dahulu jika ingin menyimpan cadangan.
        </p>
      </Modal>
    </div>
  );
}
