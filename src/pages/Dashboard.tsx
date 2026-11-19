import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Clock, History, Sparkles, Star, Layers } from 'lucide-react';
import { MODELS, modelByKind } from '@/lib/registry';
import { PRESETS_BY_KIND } from '@/data/presets';
import { useHistory } from '@/store/history';
import { useSettings } from '@/store/settings';
import { relativeTime } from '@/lib/format';
import { Card, Empty, MetricValue, Stat } from '@/components/ui';
import { SimpleBar } from '@/components/charts';

const DAY = 86_400_000;

export default function Dashboard() {
  const entries = useHistory((s) => s.entries);
  const name = useSettings((s) => s.analystName);
  const nav = useNavigate();

  const stats = useMemo(() => {
    const now = Date.now();
    const week = entries.filter((e) => now - e.createdAt < 7 * DAY).length;
    const byModel = MODELS.map((m) => ({ name: m.short, kind: m.kind, count: entries.filter((e) => e.kind === m.kind).length }));
    const top = [...byModel].sort((a, b) => b.count - a.count)[0];
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const days = Array.from({ length: 14 }, (_, k) => {
      const d0 = start.getTime() - (13 - k) * DAY;
      const d = new Date(d0);
      return {
        day: `${d.getDate()}/${d.getMonth() + 1}`,
        count: entries.filter((e) => e.createdAt >= d0 && e.createdAt < d0 + DAY).length,
      };
    });
    return { week, byModel, top, days, starred: entries.filter((e) => e.starred).length };
  }, [entries]);

  const hour = new Date().getHours();
  const greet = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 19 ? 'Selamat sore' : 'Selamat malam';
  const recent = entries.slice(0, 6);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-brand-900/10 bg-gradient-to-br from-brand-700 via-brand-600 to-indigo-600 p-6 text-white shadow-lg sm:p-8">
        <svg className="pointer-events-none absolute -right-10 -top-6 h-64 w-[28rem] opacity-20" viewBox="0 0 400 200" aria-hidden>
          <path d="M0 40 L80 160 L80 40 L160 160 L160 40 L240 160 L240 40 L320 160 L320 40 L400 160" fill="none" stroke="white" strokeWidth="3" />
          <path d="M0 175 H400" stroke="white" strokeWidth="1.5" strokeDasharray="6 6" />
        </svg>
        <div className="relative max-w-2xl">
          <p className="text-sm font-medium text-brand-100">{greet}{name ? `, ${name}` : ''} 👋</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Model Persediaan EOQ Deterministik</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-brand-50/90">
            Hitung kuantitas pesanan ekonomis, diskon kuantitas, produksi laju kontinu, back order, uji validitas, dan pemesanan multi-produk —
            lengkap dengan langkah penyelesaian, grafik, dan riwayat analisis.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/model/eoq-dasar" className="btn bg-white text-brand-700 shadow-sm hover:bg-brand-50">Mulai hitung EOQ <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/materi" className="btn border border-white/30 bg-white/10 text-white hover:bg-white/20"><BookOpen className="h-4 w-4" /> Ringkasan materi</Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total analisis tersimpan" value={entries.length} icon={<History className="h-4 w-4" />} sub="di perangkat ini" />
        <Stat label="7 hari terakhir" value={stats.week} icon={<Clock className="h-4 w-4" />} sub="analisis baru" />
        <Stat label="Ditandai bintang" value={stats.starred} icon={<Star className="h-4 w-4" />} sub="favorit" />
        <Stat label="Model terbanyak" value={stats.top.count ? modelByKind(stats.top.kind).short : '—'} icon={<Layers className="h-4 w-4" />} sub={stats.top.count ? `${stats.top.count} analisis` : 'belum ada data'} />
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-base font-semibold">Model persediaan</h2>
          <span className="text-xs text-slate-500">6 model · Subbab 15.1–15.7</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {MODELS.map((m) => {
            const n = stats.byModel.find((x) => x.kind === m.kind)?.count ?? 0;
            return (
              <Link key={m.kind} to={m.path} className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:hover:border-brand-700">
                <div className="flex items-start justify-between">
                  <div className="rounded-lg bg-brand-50 p-2 text-brand-600 ring-1 ring-inset ring-brand-100 dark:bg-brand-950 dark:text-brand-300 dark:ring-brand-900"><m.icon className="h-5 w-5" /></div>
                  <span className="text-xs font-medium text-slate-400">Subbab {m.section}</span>
                </div>
                <p className="mt-4 font-semibold">{m.name}</p>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{m.description}</p>
                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="text-slate-500">{n ? `${n} tersimpan` : 'Belum ada analisis'}</span>
                  <span className="inline-flex items-center gap-1 font-medium text-brand-600 group-hover:gap-2 dark:text-brand-400">Buka <ArrowRight className="h-3.5 w-3.5 transition-all" /></span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card title="Analisis terbaru" actions={<Link to="/riwayat" className="btn-ghost btn-sm">Lihat semua <ArrowRight className="h-3.5 w-3.5" /></Link>} bodyClass="p-0">
          {recent.length === 0 ? (
            <Empty icon={<History className="h-5 w-5" />} title="Belum ada riwayat">
              Hasil yang Anda simpan dari halaman model akan muncul di sini. Coba muat salah satu contoh soal di samping.
            </Empty>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {recent.map((e) => {
                const meta = modelByKind(e.kind);
                const main = e.metrics[0];
                return (
                  <li key={e.id}>
                    <button className="flex w-full items-center gap-4 px-5 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40" onClick={() => nav(`${meta.path}?h=${e.id}`)}>
                      <div className="rounded-lg bg-slate-100 p-2 text-slate-500 dark:bg-slate-800"><meta.icon className="h-4 w-4" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{e.starred && <Star className="mr-1 inline h-3.5 w-3.5 fill-amber-400 text-amber-400" />}{e.title}</p>
                        <p className="text-xs text-slate-500">{meta.name} · {relativeTime(e.createdAt)}</p>
                      </div>
                      {main && <div className="text-right"><p className="text-[11px] text-slate-400">{main.label}</p><p className="text-sm font-semibold tabular-nums"><MetricValue m={main} /></p></div>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Contoh soal dari materi" subtitle="Muat langsung ke kalkulator" bodyClass="p-2">
          <ul>
            {MODELS.flatMap((m) => PRESETS_BY_KIND[m.kind].map((p) => ({ m, p }))).map(({ m, p }) => (
              <li key={`${m.kind}-${p.id}`}>
                <Link to={`${m.path}?preset=${p.id}`} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="truncate text-xs text-slate-500">{p.description}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-slate-400">{m.section}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {entries.length > 0 && (
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Aktivitas 14 hari terakhir" subtitle="Jumlah analisis yang disimpan per hari">
            <SimpleBar data={stats.days} x="day" y="count" label="Analisis" highlight={(r) => Number(r.count) > 0} height={220} />
          </Card>
          <Card title="Distribusi per model" subtitle="Jumlah analisis tersimpan">
            <SimpleBar data={stats.byModel} x="name" y="count" label="Analisis" horizontal highlight={() => true} height={220} />
          </Card>
        </section>
      )}
    </div>
  );
}
