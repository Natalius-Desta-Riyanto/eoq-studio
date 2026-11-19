import { lazy, Suspense } from 'react';
import { HashRouter, Link, Route, Routes } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import BasicPage from '@/pages/BasicPage';
import DiscountPage from '@/pages/DiscountPage';
import ContinuousPage from '@/pages/ContinuousPage';
import BackorderPage from '@/pages/BackorderPage';
import ValidityPage from '@/pages/ValidityPage';
import MultiPage from '@/pages/MultiPage';
import HistoryPage from '@/pages/HistoryPage';
import ComparePage from '@/pages/ComparePage';
import SettingsPage from '@/pages/SettingsPage';
import { Empty } from '@/components/ui';

const TheoryPage = lazy(() => import('@/pages/TheoryPage'));

function NotFound() {
  return <div className="card"><Empty title="Halaman tidak ditemukan" action={<Link to="/" className="btn-primary">Kembali ke dashboard</Link>} /></div>;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="model/eoq-dasar" element={<BasicPage />} />
          <Route path="model/diskon-kuantitas" element={<DiscountPage />} />
          <Route path="model/laju-kontinu" element={<ContinuousPage />} />
          <Route path="model/back-order" element={<BackorderPage />} />
          <Route path="model/validitas" element={<ValidityPage />} />
          <Route path="model/multi-produk" element={<MultiPage />} />
          <Route path="riwayat" element={<HistoryPage />} />
          <Route path="bandingkan" element={<ComparePage />} />
          <Route path="materi" element={<Suspense fallback={null}><TheoryPage /></Suspense>} />
          <Route path="pengaturan" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
