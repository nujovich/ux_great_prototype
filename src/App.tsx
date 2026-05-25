import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './layouts/AppShell';
import { HomePage } from './pages/HomePage';
import { PreEstimationPage } from './pages/PreEstimationPage';
import { EstimationReviewPage } from './pages/EstimationReviewPage';
import { AllocationPage } from './pages/AllocationPage';
import { FinalReviewPage } from './pages/FinalReviewPage';
import { ManagementPage } from './pages/ManagementPage';
import { AdminPage } from './pages/AdminPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/pre-estimation" element={<PreEstimationPage />} />
          <Route path="/estimation-review" element={<EstimationReviewPage />} />
          <Route path="/allocation" element={<AllocationPage />} />
          <Route path="/final-review" element={<FinalReviewPage />} />
          <Route path="/management" element={<ManagementPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
