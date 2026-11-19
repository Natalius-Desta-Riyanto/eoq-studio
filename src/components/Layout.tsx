import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { ArrowRight, BookOpen, GitCompareArrows, Library, History, LayoutDashboard, Menu, Monitor, Moon, Settings, Sun, X, CircleCheck, CircleAlert, Info } from 'lucide-react';
import { MODELS } from '@/lib/registry';
import { applyTheme, useSettings, type Theme } from '@/store/settings';
import { useHistory } from '@/store/history';
import { useToast } from '@/store/toast';
import { seedOnFirstRun } from '@/data/seed';
import { PRIMARY_REFERENCE } from '@/data/references';
import { Citation } from '@/components/Citation';

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 shadow-sm shadow-brand-600/40">
        <svg viewBox="0 0 32 32" className="h-5 w-5" aria-hidden><path d="M5 8v16l7-8v8l7-8v8l7-8" stroke="white" strokeWidth="2.6" fill="none" strokeLinejoin="round" strokeLinecap="round" /></svg>
      </div>
      <p className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white">EOQ Studio</p>
    </div>
  );
}

function NavItem({ to, icon, children, badge, end }: { to: string; icon: ReactNode; children: ReactNode; badge?: ReactNode; end?: boolean }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => clsx(
      'group flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition',
      isActive
        ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100',
    )}>
      <span className="shrink-0 opacity-90">{icon}</span>
      <span className="flex-1 truncate">{children}</span>
      {badge}
    </NavLink>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const count = useHistory((s) => s.entries.length);
  return (
    <nav className="flex h-full flex-col gap-6 overflow-y-auto px-3 py-5" onClick={onNavigate}>
      <div className="px-2"><Logo /></div>
      <div className="space-y-1">
        <NavItem to="/" end icon={<LayoutDashboard className="h-[18px] w-[18px]" />}>Dashboard</NavItem>
      </div>
      <div>
        <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Model</p>
        <div className="space-y-1">
          {MODELS.map((m) => (
            <NavItem key={m.kind} to={m.path} icon={<m.icon className="h-[18px] w-[18px]" />}>
              {m.name}
            </NavItem>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Data</p>
        <div className="space-y-1">
          <NavItem to="/riwayat" icon={<History className="h-[18px] w-[18px]" />}
            badge={count ? <span className="rounded-full bg-slate-200 px-1.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{count}</span> : null}>
            Riwayat
          </NavItem>
          <NavItem to="/bandingkan" icon={<GitCompareArrows className="h-[18px] w-[18px]" />}>Bandingkan</NavItem>
        </div>
      </div>
      <div>
        <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Referensi</p>
        <div className="space-y-1">
          <NavItem to="/materi" icon={<BookOpen className="h-[18px] w-[18px]" />}>Materi & Rumus</NavItem>
          <NavItem to="/pengaturan" icon={<Settings className="h-[18px] w-[18px]" />}>Pengaturan</NavItem>
        </div>
      </div>
      <figure className="mt-auto rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
        <figcaption className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          <Library className="h-3.5 w-3.5" /> Referensi utama
        </figcaption>
        <p className="pl-4 -indent-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300"><Citation r={PRIMARY_REFERENCE} /></p>
        <NavLink to="/materi#referensi" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
          Daftar pustaka lengkap <ArrowRight className="h-3 w-3" />
        </NavLink>
      </figure>
    </nav>
  );
}

function ThemeSwitch() {
  const { theme, setTheme } = useSettings();
  const next: Record<Theme, Theme> = { light: 'dark', dark: 'system', system: 'light' };
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  const label = theme === 'light' ? 'Terang' : theme === 'dark' ? 'Gelap' : 'Ikuti sistem';
  return (
    <button className="btn-ghost btn-sm" onClick={() => setTheme(next[theme])} title={`Tema: ${label}`} aria-label={`Tema: ${label}`}>
      <Icon className="h-4 w-4" /><span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function Toaster() {
  const { toasts, dismiss } = useToast();
  return (
    <div className="no-print pointer-events-none fixed inset-x-4 top-16 z-[60] flex flex-col gap-2 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:top-auto sm:w-80">
      {toasts.map((t) => {
        const Icon = t.tone === 'success' ? CircleCheck : t.tone === 'error' ? CircleAlert : Info;
        return (
          <div key={t.id} role="status" className="pointer-events-auto flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900">
            <Icon className={clsx('mt-0.5 h-4 w-4 shrink-0', t.tone === 'success' ? 'text-emerald-500' : t.tone === 'error' ? 'text-red-500' : 'text-brand-500')} />
            <p className="flex-1">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-slate-600" aria-label="Tutup"><X className="h-3.5 w-3.5" /></button>
          </div>
        );
      })}
    </div>
  );
}

const TITLES: Record<string, string> = {
  '/': 'Dashboard', '/riwayat': 'Riwayat perhitungan', '/bandingkan': 'Bandingkan skenario', '/materi': 'Materi & rumus', '/pengaturan': 'Pengaturan',
};

export default function Layout() {
  const theme = useSettings((s) => s.theme);
  const [open, setOpen] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    applyTheme(theme);
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const h = () => applyTheme('system');
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, [theme]);
  useEffect(() => { seedOnFirstRun(); }, []);
  useEffect(() => { window.scrollTo(0, 0); setOpen(false); }, [loc.pathname]);

  const model = MODELS.find((m) => m.path === loc.pathname);
  const title = model ? model.name : TITLES[loc.pathname] ?? '';
  useEffect(() => { document.title = `${title ? `${title} · ` : ''}EOQ Studio`; }, [title]);

  return (
    <div className="min-h-screen">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 lg:block">
        <Sidebar />
      </aside>
      {open && (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl dark:bg-slate-950"><Sidebar onNavigate={() => setOpen(false)} /></aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="no-print sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 sm:px-6">
          <button className="btn-ghost btn-sm -ml-1 lg:hidden" onClick={() => setOpen(true)} aria-label="Buka menu"><Menu className="h-5 w-5" /></button>
          <nav className="flex min-w-0 items-center gap-1.5 text-sm text-slate-500" aria-label="Breadcrumb">
            <span className="hidden sm:inline">EOQ Studio</span>
            {title && <><span className="hidden sm:inline">/</span>{model && <span className="hidden md:inline">Model /</span>}<span className="truncate font-medium text-slate-900 dark:text-white">{title}</span></>}
          </nav>
          <div className="ml-auto flex items-center gap-1"><ThemeSwitch /></div>
        </header>
        <main className="print-full mx-auto max-w-[1400px] px-4 pb-24 pt-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  );
}
