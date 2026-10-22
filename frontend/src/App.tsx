import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getCurrentUser } from './services/api';
import { CitizenLayout } from './layouts/CitizenLayout';
import { OfficerLayout } from './layouts/OfficerLayout';

// Public & Auth Pages
import { LandingPage } from './pages/LandingPage';
import { CitizenLoginPage } from './pages/CitizenLoginPage';
import { CitizenRegisterPage } from './pages/CitizenRegisterPage';
import { OfficerLoginPage } from './pages/OfficerLoginPage';

// Citizen Workspace Pages
import { CitizenDashboardPage } from './pages/CitizenDashboardPage';
import { CitizenNewComplaintPage } from './pages/CitizenNewComplaintPage';
import { CitizenComplaintsPage } from './pages/CitizenComplaintsPage';
import { CitizenCaseDetailPage } from './pages/CitizenCaseDetailPage';
import { CitizenProfilePage } from './pages/CitizenProfilePage';

// Officer Workspace Pages
import { OverviewPage } from './pages/OverviewPage';
import { QueuePage } from './pages/QueuePage';
import { CaseDetailPage } from './pages/CaseDetailPage';
import { EvidenceReviewPage } from './pages/EvidenceReviewPage';
import { GraphPage } from './pages/GraphPage';
import { ReportsPage } from './pages/ReportsPage';

// Route Guards
const RequireCitizen: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = getCurrentUser();
  if (!user) {
    return <Navigate to="/citizen/login" replace />;
  }
  if (user.role === 'OFFICER' || user.role === 'ADMIN') {
    return <Navigate to="/officer" replace />;
  }
  return <>{children}</>;
};

const RequireOfficer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = getCurrentUser();
  if (!user) {
    return <Navigate to="/officer/login" replace />;
  }
  if (user.role === 'CITIZEN') {
    return <Navigate to="/citizen" replace />;
  }
  return <>{children}</>;
};

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Landing & Authentication */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/citizen/login" element={<CitizenLoginPage />} />
        <Route path="/citizen/register" element={<CitizenRegisterPage />} />
        <Route path="/officer/login" element={<OfficerLoginPage />} />

        {/* Citizen Portal (Protected for Citizens) */}
        <Route
          path="/citizen"
          element={
            <RequireCitizen>
              <CitizenLayout />
            </RequireCitizen>
          }
        >
          <Route index element={<CitizenDashboardPage />} />
          <Route path="new" element={<CitizenNewComplaintPage />} />
          <Route path="complaints" element={<CitizenComplaintsPage />} />
          <Route path="complaints/:id" element={<CitizenCaseDetailPage />} />
          <Route path="profile" element={<CitizenProfilePage />} />
        </Route>

        {/* Officer Console (Protected for Authorized Officers / Admins) */}
        <Route
          path="/officer"
          element={
            <RequireOfficer>
              <OfficerLayout />
            </RequireOfficer>
          }
        >
          <Route index element={<OverviewPage />} />
          <Route path="queue" element={<QueuePage />} />
          <Route path="complaints/:id" element={<CaseDetailPage />} />
          <Route path="evidence" element={<EvidenceReviewPage />} />
          <Route path="graph" element={<GraphPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="reports/:id" element={<ReportsPage />} />
        </Route>

        {/* Legacy redirect */}
        <Route path="/intake" element={<Navigate to="/citizen/new" replace />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
