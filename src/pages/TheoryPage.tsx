import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Callout, Tex } from '@/components/ui';

interface Section { id: string; no: string; title: string; to?: string; body: ReactNode }

const F = ({ children }: { children: string }) => (
  <div className="my-3 overflow-x-auto rounded-lg border border-slate-100 bg-slate-50/70 px-4 py-2 dark:border-slate-800 dark:bg-slate-950/50"><Tex block>{children}</Tex></div>
);
const P = ({ children }: { children: ReactNode }) => <p className="leading-relaxed text-slate-700 dark:text-slate-300">{children}</p>;
const UL = ({ items }: { items: ReactNode[] }) => (
  <ul className="ml-5 list-disc space-y-1 text-slate-700 marker:text-slate-400 dark:text-slate-300">{items.map((x, k) => <li key={k}>{x}</li>)}</ul>
);
const T = ({ children }: { children: string }) => <Tex>{children}</Tex>;

const SECTIONS: Section[] = [
  {
    id: 'pengantar', no: '15.1', title: 'Pengantar model persediaan', body: (
      <>
        <P>Persediaan disimpan agar permintaan dapat dipenuhi tepat waktu. Dua keputusan utama: <b>kapan memesan</b> (reorder point) dan <b>berapa banyak memesan</b> (order quantity). Model pada bab ini deterministik — permintaan diketahui dan tidak acak.</P>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            ['Biaya pesan / setup K', 'Biaya tetap setiap pesanan atau setiap persiapan produksi (administrasi, dokumen, penyiapan mesin).'],
            ['Biaya pembelian p', 'Biaya variabel per unit; biaya pembelian tahunan = pD bila harga konstan.'],
            ['Biaya simpan h', 'Biaya menyimpan satu unit selama setahun: gudang, asuransi, pajak, kerusakan, biaya peluang modal.'],
            ['Biaya kekurangan', 'Muncul saat permintaan tidak terpenuhi tepat waktu: backorder (pelanggan menunggu) atau lost sales.'],
          ].map(([a, b]) => (
            <div key={a} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"><p className="text-sm font-semibold">{a}</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{b}</p></div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: 'eoq', no: '15.2', title: 'Model EOQ dasar', to: '/model/eoq-dasar', body: (
      <>
        <P>Asumsi: permintaan konstan dan deterministik, biaya pesan K tetap per pesanan, lead time nol, kekurangan tidak diizinkan, dan biaya simpan h konstan. Persediaan turun linear dari q ke 0 sehingga rata-ratanya q/2, dan ada D/q pesanan per tahun.</P>
        <F>{'TC(q) = \\frac{KD}{q} + pD + \\frac{hq}{2}, \\qquad TC\'(q) = -\\frac{KD}{q^2} + \\frac{h}{2} = 0 \\;\\Rightarrow\\; q^* = \\sqrt{\\frac{2KD}{h}}'}</F>
        <P>Karena <T>{"TC''(q) = 2KD/q^3 > 0"}</T>, fungsi biaya konveks sehingga q* adalah minimum global. Panjang siklus <T>{'T = q^*/D'}</T> dan pada q* berlaku <T>{'hq^*/2 = KD/q^* = \\sqrt{KDh/2}'}</T>.</P>
        <div className="mt-3"><UL items={[
          'EOQ tidak bergantung pada harga p selama harga per unit konstan.',
          'K naik ⇒ EOQ naik; h naik ⇒ EOQ turun.',
          'EOQ sebanding dengan √D: permintaan 4× hanya membuat EOQ 2×.',
          <>Jika biaya simpan berupa persentase harga: <T>{'h = p\\,i'}</T>, sehingga <T>{'q^* = \\sqrt{2KD/(p\\,i)}'}</T>.</>,
        ]} /></div>
        <h4 className="mt-5 font-semibold">Reorder point (lead time L &gt; 0)</h4>
        <F>{'R = \\begin{cases} LD, & LD \\le q^* \\\\ LD - q^*\\left\\lfloor LD/q^* \\right\\rfloor = LD \\bmod q^*, & LD > q^* \\end{cases}'}</F>
        <Callout tone="insight" title="Kurva biaya datar">Memesan 20% di atas EOQ pada Contoh 1 (q = 300) hanya menaikkan biaya sekitar 1,67%. Kesalahan estimasi parameter kecil tidak terlalu merugikan.</Callout>
      </>
    ),
  },
  {
    id: 'diskon', no: '15.3', title: 'Diskon kuantitas', to: '/model/diskon-kuantitas', body: (
      <>
        <P>Harga per unit turun untuk pesanan besar: <T>{'p_i'}</T> berlaku jika <T>{'b_{i-1} \\le q < b_i'}</T> dengan <T>{'p_k < \\dots < p_1'}</T>. Biaya simpan dinyatakan sebagai persentase harga (I), sehingga ikut berubah.</P>
        <F>{'TC_i(q) = \\frac{KD}{q} + Dp_i + \\frac{q}{2}Ip_i, \\qquad EOQ_i = \\sqrt{\\frac{2KD}{Ip_i}}'}</F>
        <UL items={[
          <><b>Observasi 1:</b> untuk setiap q, <T>{'TC_k(q) < \\dots < TC_1(q)'}</T>.</>,
          <><b>Observasi 2:</b> jika <T>{'EOQ_i'}</T> admissible, minimum interval ada di <T>{'EOQ_i'}</T>; jika <T>{'EOQ_i < b_{i-1}'}</T>, minimum di titik putus <T>{'b_{i-1}'}</T>.</>,
          <><b>Observasi 3:</b> jika <T>{'EOQ_i'}</T> admissible, harga yang lebih mahal tidak mungkin optimal.</>,
        ]} />
        <h4 className="mt-5 font-semibold">Algoritma</h4>
        <ol className="ml-5 mt-1 list-decimal space-y-1 text-slate-700 dark:text-slate-300">
          <li>Mulai dari harga termurah <T>{'p_k'}</T>, hitung <T>{'EOQ_k'}</T>.</li>
          <li>Jika admissible, kandidat = EOQ dan berhenti; jika tidak, kandidat = titik putus <T>{'b_{k-1}'}</T>, lanjut ke harga berikutnya.</li>
          <li>Bandingkan TC seluruh kandidat; pilih yang terkecil.</li>
        </ol>
        <Callout tone="insight" className="mt-3" title="EOQ bukan jawaban akhir">Pada Contoh 4, EOQ₂ = 142,86 admissible, tetapi q = 300 lebih murah karena potongan biaya pembelian ($500) melebihi kenaikan biaya pesan + simpan ($388,33).</Callout>
      </>
    ),
  },
  {
    id: 'kontinu', no: '15.4', title: 'EOQ laju kontinu', to: '/model/laju-kontinu', body: (
      <>
        <P>Untuk barang yang diproduksi sendiri dengan laju r (r &gt; D). Selama produksi persediaan naik dengan laju r − D, lalu turun dengan laju D.</P>
        <F>{'I_{\\max} = \\frac{q}{r}(r-D), \\qquad TC = \\frac{hq(r-D)}{2r} + \\frac{KD}{q}'}</F>
        <P>Bentuknya sama dengan EOQ biasa dengan biaya simpan efektif <T>{"h' = h(r-D)/r"}</T>:</P>
        <F>{'q^* = \\sqrt{\\frac{2KDr}{h(r-D)}} = EOQ\\sqrt{\\frac{r}{r-D}} > EOQ, \\qquad \\lim_{r\\to\\infty} q^* = EOQ'}</F>
      </>
    ),
  },
  {
    id: 'backorder', no: '15.5', title: 'EOQ dengan back order', to: '/model/back-order', body: (
      <>
        <P>Kekurangan diizinkan dan pelanggan bersedia menunggu dengan biaya s per unit per tahun. Saat pesanan q tiba, q − M unit langsung melunasi backlog sehingga persediaan naik ke M.</P>
        <F>{'TC(q,M) = \\frac{M^2h}{2q} + \\frac{(q-M)^2 s}{2q} + \\frac{KD}{q}'}</F>
        <F>{'q^* = \\sqrt{\\frac{2KD(h+s)}{hs}}, \\qquad M^* = \\sqrt{\\frac{2KDs}{h(h+s)}}, \\qquad q^*-M^* = \\sqrt{\\frac{2KDh}{s(h+s)}}'}</F>
        <P>Jika s membesar, kekurangan optimal mengecil; untuk s → ∞ model kembali ke EOQ klasik (M* → q*).</P>
      </>
    ),
  },
  {
    id: 'validitas', no: '15.6', title: 'Validitas asumsi EOQ', to: '/model/validitas', body: (
      <>
        <P>Bila permintaan bergelombang (lumpy), asumsi konstan gagal. Peterson & Silver (1998) menyarankan koefisien variabilitas dari data n periode:</P>
        <F>{'\\bar d = \\frac{1}{n}\\sum d_i, \\qquad \\widehat{\\mathrm{var}}\\,D = \\frac{1}{n}\\sum d_i^2 - \\bar d^{\\,2}, \\qquad FC = \\frac{\\widehat{\\mathrm{var}}\\,D}{\\bar d^{\\,2}}'}</F>
        <UL items={[
          'FC < 0,20: variabilitas rendah — EOQ layak digunakan.',
          'FC > 0,20: variabilitas tinggi — gunakan pemrograman dinamis atau heuristik Silver–Meal.',
        ]} />
      </>
    ),
  },
  {
    id: 'multi', no: '15.7', title: 'Pemesanan multi-produk', to: '/model/multi-produk', body: (
      <>
        <P>Beberapa produk dipesan dari pemasok yang sama dengan biaya pengiriman gabungan <T>{'K_T'}</T> dan biaya tetap per produk <T>{'K_j'}</T>. Produk acuan dipesan n kali per tahun; produk j ikut setiap <T>{'m_j'}</T> pengiriman (bilangan bulat).</P>
        <F>{'TC(n,\\mathbf{m}) = n\\Big(K_T + \\sum_j \\frac{K_j}{m_j}\\Big) + \\frac{1}{n}\\sum_j \\frac{h_j D_j m_j}{2}, \\qquad n^* = \\sqrt{\\frac{\\sum_j h_jD_jm_j/2}{K_T + \\sum_j K_j/m_j}}'}</F>
        <P>Materi menggunakan Excel Evolutionary Solver. EOQ Studio memakai pencarian menyeluruh atas kombinasi pengali bulat, dengan n* tertutup untuk setiap kombinasi, sehingga optimum dijamin dalam batas pengali yang ditentukan.</P>
      </>
    ),
  },
];

export default function TheoryPage() {
  return (
    <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav className="no-print hidden lg:block">
        <div className="sticky top-20 space-y-1 text-sm">
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Daftar isi</p>
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
              className="flex gap-2 rounded-md px-2 py-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
              <span className="w-8 shrink-0 font-mono text-xs text-slate-400">{s.no}</span>{s.title}
            </a>
          ))}
        </div>
      </nav>
      <div className="min-w-0 space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Materi & rumus — Bab 15</h1>
          <p className="mt-1 text-sm text-slate-500">Ringkasan model persediaan EOQ deterministik beserta rumus inti. Sumber: W. L. Winston, <i>Operations Research: Applications and Algorithms</i>.</p>
        </div>
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="card scroll-mt-20 p-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold"><span className="mr-2 font-mono text-sm text-brand-600 dark:text-brand-400">{s.no}</span>{s.title}</h2>
              {s.to && <Link to={s.to} className="btn-secondary btn-sm no-print">Buka kalkulator <ArrowRight className="h-3.5 w-3.5" /></Link>}
            </div>
            <div className="space-y-2 text-[15px]">{s.body}</div>
          </section>
        ))}
        <section className="card p-6">
          <h2 className="text-lg font-semibold">Notasi</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="table-base">
              <thead><tr><th>Simbol</th><th>Arti</th><th>Satuan</th></tr></thead>
              <tbody>
                {[['D', 'Permintaan tahunan', 'unit/tahun'], ['K', 'Biaya pesan / setup', '$/pesanan'], ['h', 'Biaya simpan', '$/unit/tahun'], ['p', 'Harga / biaya produksi per unit', '$/unit'],
                  ['q', 'Kuantitas pesanan / ukuran run', 'unit'], ['L', 'Lead time', 'tahun'], ['r', 'Laju produksi', 'unit/tahun'], ['s', 'Biaya kekurangan', '$/unit/tahun'],
                  ['M', 'Persediaan maksimum (back order)', 'unit'], ['I', 'Biaya simpan per dolar nilai persediaan', '%/tahun']].map(([a, b, c]) => (
                  <tr key={a}><td><T>{a}</T></td><td>{b}</td><td className="text-slate-500">{c}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
