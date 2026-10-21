import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CitizenLayout } from './layouts/CitizenLayout';
import { OfficerLayout } from './layouts/OfficerLayout';
import { IntakePage } from './pages/IntakePage';
import { OverviewPage } from './pages/OverviewPage';
import { QueuePage } from './pages/QueuePage';
import { CaseDetailPage } from './pages/CaseDetailPage';
import { EvidenceReviewPage } from './pages/EvidenceReviewPage';
import { GraphPage } from './pages/GraphPage';
import { ReportsPage } from './pages/ReportsPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Citizen Intake Workspace */}
        <Route path="/" element={<CitizenLayout />}>
          <Route index element={<IntakePage />} />
        </Route>

        {/* Officer Investigation Workspace */}
        <Route path="/officer" element={<OfficerLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="queue" element={<QueuePage />} />
          <Route path="complaints/:id" element={<CaseDetailPage />} />
          <Route path="evidence" element={<EvidenceReviewPage />} />
          <Route path="graph" element={<GraphPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="reports/:id" element={<ReportsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
