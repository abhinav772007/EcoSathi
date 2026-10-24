import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const ReportsContext = createContext(null);

export function ReportsProvider({ children }) {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([apiRequest('/api/reports'), apiRequest('/api/locations')])
      .then(([nextReports, nextLocations]) => {
        setReports(nextReports);
        setLocations(nextLocations);
      })
      .catch((error) => {
        setReports([]);
        setToast({ title: 'Could not load reports', detail: error.message });
      })
      .finally(() => setLoading(false));
  }, [user]);

  const dismissToast = useCallback(() => setToast(null), []);

  const addReport = useCallback(async (report) => {
    try {
      const created = await apiRequest('/api/reports', {
        method: 'POST',
        body: JSON.stringify({ ...report, confirmed: true, source: 'text' }),
      });
      setReports((current) => [created, ...current]);
      setShowReportModal(false);
      setToast({ title: 'Report submitted', detail: `EcoSathi is processing ${created.id}` });
      window.setTimeout(() => setToast(null), 3500);
    } catch (error) {
      setToast({ title: 'Report was not submitted', detail: error.message });
    }
  }, []);

  const resolveReport = useCallback(async (id) => {
    try {
      const resolved = await apiRequest(`/api/reports/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Resolved' }),
      });
      setReports((current) => current.map((report) => (report.id === id ? resolved : report)));
      setToast({ title: 'Report resolved', detail: `${id} marked as resolved` });
      window.setTimeout(() => setToast(null), 2500);
    } catch (error) {
      setToast({ title: 'Could not resolve report', detail: error.message });
    }
  }, []);

  const value = useMemo(
    () => ({
      reports, locations, loading,
      toast,
      showReportModal,
      setShowReportModal,
      addReport,
      resolveReport,
      dismissToast,
    }),
    [addReport, dismissToast, locations, reports, resolveReport, showReportModal, toast, loading],
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
