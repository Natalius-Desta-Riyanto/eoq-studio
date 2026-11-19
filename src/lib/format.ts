import { useMemo } from 'react';
import { useSettings } from '@/store/settings';
import type { TexFmt } from './models/common';

const cache = new Map<string, Intl.NumberFormat>();
function nf(locale: string, digits: number, minDigits = 0) {
  const key = `${locale}|${digits}|${minDigits}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, { maximumFractionDigits: digits, minimumFractionDigits: minDigits });
    cache.set(key, f);
  }
  return f;
}

export interface Formatter {
  num: (n: number, digits?: number) => string;
  money: (n: number, digits?: number) => string;
  pct: (n: number, digits?: number) => string; // n dalam persen (mis. 12.5 → "12,5%")
  tex: TexFmt;
  locale: string;
  currency: string;
  decimals: number;
}

export function makeFormatter(locale: string, currency: string, decimals: number): Formatter {
  const num = (n: number, digits = decimals) => {
    if (n === Infinity) return '∞';
    if (!Number.isFinite(n)) return '–';
    return nf(locale, digits).format(Math.abs(n) < 1e-12 ? 0 : n);
  };
  const money = (n: number, digits = decimals) => {
    if (!Number.isFinite(n)) return '–';
    const s = nf(locale, digits, digits).format(Math.abs(n));
    const sign = n < 0 ? '−' : '';
    return currency ? `${sign}${currency}${currency.length > 1 ? ' ' : ''}${s}` : `${sign}${s}`;
  };
  const pct = (n: number, digits = 2) => `${num(n, digits)}%`;
  const tex: TexFmt = (n, digits = decimals) =>
    num(n, digits).replace(/,/g, '{,}').replace(/\u00a0/g, '\\,').replace(/−/g, '-');
  return { num, money, pct, tex, locale, currency, decimals };
}

export function useFormatter(): Formatter {
  const { locale, currency, decimals } = useSettings();
  return useMemo(() => makeFormatter(locale, currency, decimals), [locale, currency, decimals]);
}

export function formatDate(ts: number, locale = 'id-ID', withTime = true) {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric', month: 'short', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(ts);
}

export function relativeTime(ts: number, now = Date.now()) {
  const s = Math.round((now - ts) / 1000);
  if (s < 60) return 'baru saja';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} menit lalu`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} hari lalu`;
  return formatDate(ts, 'id-ID', false);
}

/** Parsing angka dari input pengguna: menerima "1.250,5", "1250.5", "0,08". */
export function parseNumber(raw: string): number {
  const t = raw.trim().replace(/\s/g, '');
  if (t === '') return NaN;
  let x = t;
  if (x.includes(',') && x.includes('.')) {
    x = x.lastIndexOf(',') > x.lastIndexOf('.') ? x.replace(/\./g, '').replace(',', '.') : x.replace(/,/g, '');
  } else if (x.includes(',')) {
    x = x.replace(',', '.');
  }
  if (!/^-?\d*\.?\d+(e-?\d+)?$/i.test(x) && !/^-?\d+\.$/.test(x)) return NaN;
  return Number(x);
}
