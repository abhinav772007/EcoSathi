import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ReportsProvider } from '@/context/ReportsContext';
import { AppShell } from '@/components/layout/AppShell';
import { OverviewPage } from '@/pages/OverviewPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { RoutePage } from '@/pages/RoutePage';
import { ImpactPage } from '@/pages/ImpactPage';
import { TeamPage } from '@/pages/TeamPage';
import { LocationsPage } from '@/pages/LocationsPage';
import { DuplicatesPage } from '@/pages/DuplicatesPage';
import { WorkflowsPage } from '@/pages/WorkflowsPage';
import { GuidancePage } from '@/pages/GuidancePage';
import { AuthPage } from '@/pages/AuthPage';
import { AuthProvider } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RoleRoute } from '@/components/auth/RoleRoute';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ReportsProvider>
          <Routes>
            <Route path="/login" element={<AuthPage />} />
            <Route path="/signup" element={<AuthPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<OverviewPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/locations" element={<LocationsPage />} />
                <Route path="/guidance" element={<GuidancePage />} />
                <Route element={<RoleRoute roles={['administrator', 'worker']} />}>
                  <Route path="/route" element={<RoutePage />} />
                  <Route path="/impact" element={<ImpactPage />} />
                  <Route path="/duplicates" element={<DuplicatesPage />} />
                  <Route path="/workflows" element={<WorkflowsPage />} />
                </Route>
                <Route element={<RoleRoute roles={['administrator']} />}>
                  <Route path="/team" element={<TeamPage />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Route>
          </Routes>
        </ReportsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
