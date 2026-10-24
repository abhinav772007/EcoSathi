import { useEffect, useMemo, useState } from 'react';
import { Check, Clock3, Download, GitMerge, Leaf, Loader2, RefreshCw, Route, ShieldCheck, TrendingUp, Weight } from 'lucide-react';
import { PageHeading } from '@/components/ui/PageHeading';
import { StatCard } from '@/components/ui/StatCard';
import { apiRequest } from '@/lib/api';
import { downloadJson } from '@/lib/export';
import { useReports } from '@/context/ReportsContext';

export function ImpactPage() {
  const { reports } = useReports();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadSummary() {
    setLoading(true);
    try {
      setSummary(await apiRequest('/api/analytics/summary'));
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
  }, []);

  const localResolved = reports.filter((report) => report.status === 'Resolved').length;
  const localActionable = reports.filter((report) => report.status !== 'Rejected').length;
  const resolutionRate = summary
    ? `${Math.round((summary.resolution_rate || 0) * 1000) / 10}%`
    : localActionable
      ? `${Math.round((localResolved / localActionable) * 1000) / 10}%`
      : '—';
  const medianHours = summary?.median_resolution_hours != null ? `${summary.median_resolution_hours}h` : '—';
  const resolvedCount = summary?.resolved_reports ?? localResolved;
  const pendingDuplicates = summary?.pending_duplicates ?? reports.filter((report) => report.status === 'Needs review').length;
  const series = summary?.last_7_days || [];
  const maxSeries = Math.max(1, ...series.map((item) => Math.max(item.reports, item.resolved)));
  const categories = summary?.category_breakdown || [];
  const maxCategory = Math.max(1, ...categories.map((item) => item.count));
  const plan = summary?.last_plan;

  const barData = useMemo(
    () => series.map((item) => ({
      ...item,
      height: Math.max(6, Math.round((item.resolved / maxSeries) * 100)),
    })),
    [maxSeries, series],
  );

  return (
    <div className="page">
      <PageHeading
        eyebrow="Impact dashboard"
        title="Make progress visible"
        description="Measured report, workflow, route, and collection outcomes."
        action={
          <div className="heading-actions">
            <button type="button" className="secondary-btn" onClick={loadSummary} disabled={loading}>
              {loading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />} Refresh
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => summary && downloadJson(`ecosathi-impact-${new Date().toISOString().slice(0, 10)}.json`, summary)}
              disabled={!summary}
            >
              <Download size={16} /> Export data
            </button>
          </div>
        }
      />

      <div className="demo-note">
        <ShieldCheck size={18} />
        <span>
          <b>Evidence discipline.</b>{' '}
          {error
            ? `Live analytics unavailable (${error}). Showing report totals from your session instead.`
            : summary?.data_note || 'Metrics are calculated from database records; seeded demonstration data is not verified campus impact.'}
        </span>
      </div>

      <div className="stat-grid six">
        <StatCard label="Resolution rate" value={resolutionRate} note="actionable reports" icon={<Check size={17} />} tone="green" />
        <StatCard label="Median resolution" value={medianHours} note="status timestamps" icon={<Clock3 size={17} />} tone="blue" />
        <StatCard label="Route saved" value={`${summary?.route_distance_saved_km ?? 0} km`} note={`${summary?.route_distance_saved_pct ?? 0}% vs baseline`} icon={<Route size={17} />} tone="orange" />
        <StatCard label="Waste measured" value={`${summary?.waste_recovered_kg ?? 0} kg`} note="logged, not estimated" icon={<Weight size={17} />} tone="purple" />
        <StatCard label="Stops complete" value={`${summary?.completed_stops ?? 0}/${summary?.collection_stops ?? 0}`} note="collection stops" icon={<Leaf size={17} />} tone="green" />
        <StatCard label="Duplicate queue" value={pendingDuplicates} note={`${summary?.duplicate_links ?? 0} links total`} icon={<GitMerge size={17} />} tone="orange" />
      </div>

      <div className="impact-grid">
        <div className="card impact-card">
          <div className="card-heading">
            <div>
              <h2>Resolved reports</h2>
              <p>Last 7 days from status timestamps</p>
            </div>
            <span className="trend-badge">
              <TrendingUp size={14} /> {resolvedCount} total
            </span>
          </div>
          <div className="impact-big">
            {resolvedCount} <small>reports</small>
          </div>
          <div className="bar-chart">
            {barData.map((item) => (
              <i key={item.date} style={{ height: `${item.height}%` }} title={`${item.day}: ${item.resolved} resolved / ${item.reports} received`} />
            ))}
          </div>
          <div className="bar-labels">
            {barData.map((item) => <span key={item.date}>{item.day}</span>)}
          </div>
        </div>
        <div className="card impact-card">
          <div className="card-heading">
            <div>
              <h2>Report mix</h2>
              <p>Counts by issue category</p>
            </div>
            <span className="trend-badge">{summary?.total_reports ?? reports.length} reports</span>
          </div>
          {categories.length ? categories.map((item) => (
            <div className="category-row" key={item.name}>
              <div>
                <span>{item.name}</span>
                <b>{item.count}</b>
              </div>
              <div className="category-bar">
                <i style={{ width: `${Math.round((item.count / maxCategory) * 100)}%` }} />
              </div>
            </div>
          )) : <p className="muted">No category data yet.</p>}
          <div className="material-total">
            <span>Waste recovered (measured)</span>
            <b>{summary?.waste_recovered_kg ?? 0} kg</b>
          </div>
        </div>
      </div>

      <section className="card comparison-card">
        <div className="card-heading">
          <div>
            <h2>Route comparison</h2>
            <p>Same eligible stops, FIFO baseline versus priority-aware nearest neighbour.</p>
          </div>
          <span className={`status-pill ${plan ? 'ready' : 'needs-review'}`}>{plan?.status || 'no plan'}</span>
        </div>
        <div className="comparison-grid">
          <div>
            <span>Proposed route</span>
            <b>{plan?.total_distance ?? '—'} km</b>
          </div>
          <div>
            <span>Baseline</span>
            <b>{plan?.baseline_distance ?? '—'} km</b>
          </div>
          <div>
            <span>Distance saved</span>
            <b>{summary?.route_distance_saved_km ?? 0} km</b>
          </div>
          <div>
            <span>Stops in plan</span>
            <b>{plan?.stop_count ?? summary?.collection_stops ?? 0}</b>
          </div>
          <div>
            <span>Workflow completion</span>
            <b>{summary ? `${Math.round((summary.workflow_completion_rate || 0) * 100)}%` : '—'}</b>
          </div>
        </div>
        <p className="comparison-note">
          Straight-line haversine distances are approximate. Distance saved is not fuel saved, and no emissions claim is made.
        </p>
      </section>
    </div>
  );
}
