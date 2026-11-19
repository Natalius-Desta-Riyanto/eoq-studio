import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useSettings, type Theme } from '@/store/settings';
import { useHistory } from '@/store/history';
import { toast } from '@/store/toast';
import { makeFormatter } from '@/lib/format';
import { Card, Modal, NumberField, Segmented, SelectField, TextField } from '@/components/ui';

const CURRENCIES = [
  { value: '$', label: '$ — Dolar (sesuai buku)' },
  { value: 'Rp', label: 'Rp — Rupiah' },
  { value: '€', label: '€ — Euro' },
  { value: 'RM', label: 'RM — Ringgit' },
  { value: '', label: 'Tanpa simbol' },
];

export default function SettingsPage() {
  const s = useSettings();
  const { entries, clear } = useHistory();
  const [confirm, setConfirm] = useState(false);
  const preview = makeFormatter(s.locale, s.currency, s.decimals);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Pengaturan</h1>
        <p className="mt-1 text-sm text-slate-500">Preferensi tersimpan di browser ini.</p>
      </div>

      <Card title="Tampilan">
        <div className="space-y-5">
          <div>
            <span className="label">Tema</span>
            <Segmented<Theme> value={s.theme} onChange={s.setTheme} options={[{ value: 'light', label: 'Terang' }, { value: 'dark', label: 'Gelap' }, { value: 'system', label: 'Ikuti sistem' }]} />
          </div>
          <TextField label="Nama analis (muncul di sapaan dan hasil cetak)" value={s.analystName} onChange={(analystName) => s.update({ analystName })} placeholder="mis. Natalius" />
        </div>
      </Card>

      <Card title="Format angka">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SelectField label="Format lokal" value={s.locale} onChange={(locale) => s.update({ locale })}
            options={[{ value: 'id-ID', label: 'Indonesia (1.234,56)' }, { value: 'en-US', label: 'Inggris (1,234.56)' }]} />
          <SelectField label="Mata uang" value={s.currency} onChange={(currency) => s.update({ currency })} options={CURRENCIES} />
          <NumberField label="Desimal" value={s.decimals} integer min={0} onChange={(v) => s.update({ decimals: Math.min(6, Math.max(0, Number.isFinite(v) ? v : 2)) })} />
        </div>
        <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-950/50">Pratinjau: <b className="tabular-nums">{preview.money(50288.3333)}</b> · <b className="tabular-nums">{preview.num(142.857142)}</b> unit</p>
      </Card>

      <Card title="Data">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-medium">Hapus seluruh riwayat</p>
            <p className="text-sm text-slate-500">{entries.length} entri tersimpan. Ekspor dari halaman Riwayat sebelum menghapus.</p>
          </div>
          <button className="btn-secondary !text-red-600" disabled={!entries.length} onClick={() => setConfirm(true)}><Trash2 className="h-4 w-4" /> Hapus semua</button>
        </div>
      </Card>

      <Card title="Tentang">
        <div className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
          <p><b>EOQ Studio</b> v1.0 — aplikasi pendukung materi Riset Operasi Bab 15 (Deterministic EOQ Inventory Models).</p>
          <p>Dibangun dengan React, TypeScript, Vite, Tailwind CSS, Recharts, KaTeX, dan Zustand. Semua perhitungan berjalan di browser; tidak ada data yang dikirim ke server.</p>
          <p className="text-slate-500">Solver diverifikasi terhadap Contoh 1–7 pada materi melalui unit test (<code className="kbd">npm test</code>).</p>
        </div>
      </Card>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Hapus seluruh riwayat?"
        footer={<><button className="btn-ghost" onClick={() => setConfirm(false)}>Batal</button>
          <button className="btn-danger" onClick={() => { clear(); setConfirm(false); toast('Seluruh riwayat dihapus.'); }}>Hapus semua</button></>}>
        <p className="text-sm text-slate-600 dark:text-slate-300">{entries.length} entri akan dihapus permanen dari browser ini.</p>
      </Modal>
    </div>
  );
}
