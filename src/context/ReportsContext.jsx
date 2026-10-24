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

  const notify = useCallback((title, detail, timeout = 3500) => {
    setToast({ title, detail });
    window.setTimeout(() => setToast(null), timeout);
  }, []);

  const loadReports = useCallback(async () => {
    const nextReports = await apiRequest('/api/reports');
    setReports(nextReports);
    return nextReports;
  }, []);

  const loadLocations = useCallback(async () => {
    const nextLocations = await apiRequest('/api/locations');
    setLocations(nextLocations);
    return nextLocations;
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([loadReports(), loadLocations()])
      .catch((error) => {
        setReports([]);
        notify('Could not load reports', error.message);
      })
      .finally(() => setLoading(false));
  }, [loadLocations, loadReports, notify, user]);

  const dismissToast = useCallback(() => setToast(null), []);

  const refreshReports = useCallback(async () => {
    try {
      return await loadReports();
    } catch (error) {
      notify('Could not refresh reports', error.message);
      return null;
    }
  }, [loadReports, notify]);

  const refreshLocations = useCallback(async () => {
    try {
      return await loadLocations();
    } catch (error) {
      notify('Could not refresh locations', error.message);
      return null;
    }
  }, [loadLocations, notify]);

  const addReport = useCallback(async (report) => {
    try {
      const created = await apiRequest('/api/reports', {
        method: 'POST',
        body: JSON.stringify({ ...report, source: report.source || 'text', confirmed: true }),
      });
      setReports((current) => [created, ...current]);
      notify('Report submitted', `EcoSathi is processing ${created.id}`);
      return created;
    } catch (error) {
      notify('Report was not submitted', error.message, 5000);
      return null;
    }
  }, [notify]);

  const updateReportStatus = useCallback(async (id, status, note) => {
    try {
      const updated = await apiRequest(`/api/reports/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, note: note || null }),
      });
      setReports((current) => current.map((report) => (report.id === id ? updated : report)));
      notify('Report updated', `${id} is now ${updated.status}`);
      return updated;
    } catch (error) {
      notify('Could not update report', error.message, 4500);
      return null;
    }
  }, [notify]);

  const resolveReport = useCallback(async (id) => {
    const updated = await updateReportStatus(id, 'Resolved', null);
    if (updated) notify('Report resolved', `${id} marked as resolved`, 2500);
    return updated;
  }, [notify, updateReportStatus]);

  const value = useMemo(
    () => ({
      reports,
      locations,
      loading,
      toast,
      showReportModal,
      setShowReportModal,
      addReport,
      updateReportStatus,
      resolveReport,
      refreshReports,
      refreshLocations,
      dismissToast,
      notify,
    }),
    [
      addReport,
      dismissToast,
      loading,
      locations,
      notify,
      refreshLocations,
      refreshReports,
      reports,
      resolveReport,
      setShowReportModal,
      showReportModal,
      toast,
      updateReportStatus,
    ],
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
