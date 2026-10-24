import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useReports } from '@/context/ReportsContext';
import { ReportModal } from '@/components/reports/ReportModal';
import { Toast } from '@/components/ui/Toast';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { toast, showReportModal, setShowReportModal, addReport, dismissToast } = useReports();

  return (
    <div className="app-shell">
      {menuOpen && <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} />}
      <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
      <main className="main-content">
        <Topbar onMenu={() => setMenuOpen(true)} />
        <Outlet />
      </main>
      {showReportModal && (
        <ReportModal onClose={() => setShowReportModal(false)} onSubmit={addReport} />
      )}
      {toast && <Toast title={toast.title} detail={toast.detail} onClose={dismissToast} />}
    </div>
  );
}
