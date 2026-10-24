import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { initialReports, nextReportId } from '@/data/reports';

const ReportsContext = createContext(null);

export function ReportsProvider({ children }) {
  const [reports, setReports] = useState(initialReports);
  const [toast, setToast] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const dismissToast = useCallback(() => setToast(null), []);

  const addReport = useCallback((report) => {
    let createdId = '';
    setReports((current) => {
      createdId = nextReportId(current);
      return [
        {
          ...report,
          id: createdId,
          age: 'just now',
          initials: 'YU',
          color: 'green',
          status: 'Needs review',
        },
        ...current,
      ];
    });
    setShowReportModal(false);
    setToast({ title: 'Report submitted', detail: `EcoSathi is processing ${createdId}` });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const resolveReport = useCallback((id) => {
    setReports((current) =>
      current.map((report) => (report.id === id ? { ...report, status: 'Resolved' } : report)),
    );
  }, []);

  const value = useMemo(
    () => ({
      reports,
      toast,
      showReportModal,
      setShowReportModal,
      addReport,
      resolveReport,
      dismissToast,
    }),
    [addReport, dismissToast, reports, resolveReport, showReportModal, toast],
  );

  return <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>;
}

export function useReports() {
  const context = useContext(ReportsContext);
  if (!context) {
    throw new Error('useReports must be used inside ReportsProvider');
  }
  return context;
}
