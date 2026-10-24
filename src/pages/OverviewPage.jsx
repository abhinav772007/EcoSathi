import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  Check,
  Clock3,
  Leaf,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  User,
} from 'lucide-react';
import { openReportCount, REPORT_STATUSES } from '@/data/reports';
import { useAuth } from '@/context/AuthContext';
import { useReports } from '@/context/ReportsContext';
import { ActivityChart } from '@/components/overview/ActivityChart';
import { RoutePreview } from '@/components/overview/RoutePreview';
import { ReportDetailModal } from '@/components/reports/ReportDetailModal';
import { ReportTable } from '@/components/reports/ReportTable';
import { FilterMenu } from '@/components/ui/FilterMenu';
import { PageHeading } from '@/components/ui/PageHeading';
import { StatCard } from '@/components/ui/StatCard';
import { CHART_DATA } from '@/data/campus';
import { apiRequest } from '@/lib/api';
import { useEffect, useMemo, useState } from 'react';

export function OverviewPage() {
  const { displayName, role, roleMeta } = useAuth();
  const { reports, resolveReport, updateReportStatus, setShowReportModal, plan } = useReports();
  const [filter, setFilter] = useState('All reports');
  const [summary, setSummary] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [trackerCode, setTrackerCode] = useState('');
  const [trackedResult, setTrackedResult] = useState(null);

  const canManage = role === 'administrator' || role === 'worker';

  useEffect(() => {
    if (!canManage) return;
    apiRequest('/api/analytics/summary')
      .then(setSummary)
      .catch(() => setSummary(null));
  }, [canManage]);

  const visibleReports = useMemo(() => {
    const list =
      role === 'resident'
        ? reports.filter((r) => r.user_id === 'user-resident' || r.source === 'voice' || !canManage)
        : reports;

    return filter === 'All reports' ? list : list.filter((r) => r.status === filter);
  }, [canManage, filter, reports, role]);

  const resolvedCount = summary?.resolved_reports ?? reports.filter((r) => r.status === 'Resolved').length;
  const openCount = summary?.open_reports ?? openReportCount(reports);
  const pendingDuplicates =
    summary?.pending_duplicates ?? reports.filter((r) => r.status === 'Needs review').length;
  const firstName = displayName.split(' ')[0] || 'there';
  const chartData = summary?.last_7_days?.length ? summary.last_7_days : CHART_DATA;

  function handleTrackReport(e) {
    e.preventDefault();
    const query = trackerCode.trim().toUpperCase();
    if (!query) return;
    const match = reports.find((r) => r.id === query || r.code === query || r.id.includes(query));
    setTrackedResult(match || 'NOT_FOUND');
  }

  return (
    <div className="page">
      <PageHeading
        eyebrow={`Perspective: ${roleMeta.label}`}
        title={`Good day, ${firstName}`}
        description={
          role === 'administrator'
            ? 'Campus waste triage, automated workflows, and collection dispatch overview.'
            : role === 'worker'
            ? 'Your active route stops, field assignments, and collection tasks for today.'
            : 'Report overflowing bins or scattered waste, and track the status of campus resolutions.'
        }
        action={
          <button type="button" className="primary-btn" onClick={() => setShowReportModal(true)}>
            <Plus size={17} /> New report
          </button>
        }
      />

      {/* Role-Specific Insight Banner */}
      {role === 'administrator' && (
        <div className="insight-banner">
          <div className="insight-icon">
            <ShieldCheck size={19} />
          </div>
          <div>
            <b>{openCount} open reports in the queue</b>
            <span>
              {pendingDuplicates} possible duplicate{pendingDuplicates === 1 ? '' : 's'} flagged for human review. Verify pending reports and dispatch route.
            </span>
          </div>
          <Link to="/route">
            Plan route <ArrowUpRight size={15} />
          </Link>
        </div>
      )}

      {role === 'worker' && (
        <div className="insight-banner" style={{ background: '#fdf7f0', borderColor: '#f8e4d2' }}>
          <div className="insight-icon" style={{ background: '#f1d7c0', color: '#9d5828' }}>
            <Truck size={19} />
          </div>
          <div>
            <b>Collection Worker Mode: {plan?.collection_stops?.length || 4} stops scheduled</b>
            <span>
              Follow the optimized stop list, record measured waste weights (kg), and mark stops completed in real time.
            </span>
          </div>
          <Link to="/route" style={{ color: '#9d5828' }}>
            Open stop list <ArrowUpRight size={15} />
          </Link>
        </div>
      )}

      {role === 'resident' && (
        <div className="insight-banner" style={{ background: '#f0f6fd', borderColor: '#d7e6f8' }}>
          <div className="insight-icon" style={{ background: '#dceafb', color: '#2b5ea7' }}>
            <Sparkles size={19} />
          </div>
          <div>
            <b>Voice-First Waste Reporting Enabled</b>
            <span>
              Tap "+ New report" to describe issues naturally using your voice. EcoSathi structures the details and routes tasks to collection crews.
            </span>
          </div>
          <Link to="/guidance" style={{ color: '#2b5ea7' }}>
            Disposal rules <ArrowUpRight size={15} />
          </Link>
        </div>
      )}

      {/* Resident Tracker Widget */}
      {role === 'resident' && (
        <section className="card" style={{ marginBottom: '24px', padding: '18px 24px' }}>
          <div className="card-heading" style={{ marginBottom: '12px' }}>
            <div>
              <h2>Track Report Status</h2>
              <p>Enter your report ID (e.g. ECO-1042) to check real-time progress</p>
            </div>
            <Link to="/guidance" className="text-button" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <BookOpen size={14} /> View disposal rules
            </Link>
          </div>

          <form onSubmit={handleTrackReport} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div className="search-field" style={{ flex: 1 }}>
              <Search size={16} />
              <input
                value={trackerCode}
                onChange={(e) => setTrackerCode(e.target.value)}
                placeholder="Enter Report ID (e.g. ECO-1042, ECO-1041)..."
              />
            </div>
            <button type="submit" className="primary-btn">
              Track status
            </button>
          </form>

          {trackedResult && trackedResult !== 'NOT_FOUND' && (
            <div className="tracked-result-box" style={{ marginTop: '14px', padding: '12px', background: '#f5f9f5', border: '1px solid #dce8dd', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b>
                  {trackedResult.code || trackedResult.id}: {trackedResult.title}
                </b>
                <span className={`status-pill ${trackedResult.status.toLowerCase().replaceAll(' ', '-')}`}>
                  {trackedResult.status}
                </span>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                Location: <strong>{trackedResult.location}</strong> · Category: {trackedResult.category} · Priority: {trackedResult.priority}
              </p>
            </div>
          )}

          {trackedResult === 'NOT_FOUND' && (
            <div style={{ marginTop: '14px', padding: '10px', background: '#fff4eb', border: '1px solid #f2ded0', borderRadius: '8px', color: '#a6562a', fontSize: '12px' }}>
              No report found matching "{trackerCode}". Please check your code.
            </div>
          )}
        </section>
      )}

      {/* High-Level Stat Grid */}
      <div className="stat-grid">
        <StatCard
          label={role === 'resident' ? 'My open reports' : 'Open queue'}
          value={role === 'resident' ? visibleReports.filter((r) => r.status !== 'Resolved').length : openCount}
          note="active"
          icon={<Bell size={17} />}
          tone="orange"
        />
        <StatCard
          label="Resolved reports"
          value={resolvedCount}
          note="all time"
          icon={<Check size={17} />}
          tone="green"
        />
        <StatCard
          label="Campus stops"
          value={plan?.collection_stops?.length || 4}
          note="in current plan"
          icon={<Truck size={17} />}
          tone="blue"
        />
        <StatCard
          label="Campus locations"
          value={new Set(reports.map((r) => r.location)).size}
          note="monitored zones"
          icon={<Leaf size={17} />}
          tone="purple"
        />
      </div>

      <div className="content-grid">
        <ActivityChart data={chartData} demo={!summary} />
        <RoutePreview canManage={canManage} />
      </div>

      <section className="card reports-card">
        <div className="card-heading">
          <div>
            <h2>{role === 'resident' ? 'Your Reported Issues' : 'Needs attention'}</h2>
            <p>{role === 'resident' ? 'Status updates on your submitted reports' : 'Prioritized reports requiring triage or pickup'}</p>
          </div>
          <div className="heading-actions">
            <FilterMenu value={filter} options={REPORT_STATUSES} onChange={setFilter} />
            <Link to="/reports" className="text-button">
              View all <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
        <ReportTable
          reports={visibleReports.slice(0, 5)}
          onResolve={resolveReport}
          onOpen={setSelectedReport}
          canManage={canManage}
        />
      </section>

      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onStatusChange={updateReportStatus}
        />
      )}
    </div>
  );
}
