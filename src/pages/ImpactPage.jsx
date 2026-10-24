import { useEffect, useState } from 'react';
import { Check, Clock3, Download, Leaf, MoreHorizontal, Route, ShieldCheck, TrendingUp } from 'lucide-react';
import { IMPACT_BARS, MATERIAL_BREAKDOWN } from '@/data/campus';
import { PageHeading } from '@/components/ui/PageHeading';
import { StatCard } from '@/components/ui/StatCard';
import { apiRequest } from '@/lib/api';
import { useReports } from '@/context/ReportsContext';

export function ImpactPage() {
  const { reports } = useReports();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('/api/analytics/summary')
      .then(setSummary)
      .catch((requestError) => setError(requestError.message));
  }, []);

  const localResolved = reports.filter((report) => report.status === 'Resolved').length;
  const localOpen = reports.filter((report) => report.status !== 'Resolved').length;
  const resolutionRate = summary
    ? `${Math.round((summary.resolution_rate || 0) * 1000) / 10}%`
    : reports.length
      ? `${Math.round((localResolved / reports.length) * 1000) / 10}%`
      : '—';
  const medianHours = summary?.median_resolution_hours != null ? `${summary.median_resolution_hours}h` : '—';
  const resolvedCount = summary?.resolved_reports ?? localResolved;
  const openCount = summary?.open_reports ?? localOpen;

  return (
    <div className="page">
      <PageHeading
        eyebrow="Impact dashboard"
        title="Make progress visible"
        description="Measured outcomes from EcoSathi operations."
        action={
          <button type="button" className="secondary-btn">
            <Download size={16} /> Export report
          </button>
        }
      />
      {(error || summary?.demo_data) && (
        <div className="demo-note">
          <ShieldCheck size={18} />
          <span>
            {error
              ? <><b>Live analytics unavailable.</b> {error} Showing report totals from your session instead.</>
              : <><b>Approximate metrics</b> Resolution figures come from the API; material recovery below remains illustrative demo data.</>}
          </span>
        </div>
      )}
      <div className="stat-grid">
        <StatCard label="Resolution rate" value={resolutionRate} change="" note="all reports" icon={<Check size={17} />} tone="green" />
        <StatCard label="Median resolution" value={medianHours} change="" note="hours" icon={<Clock3 size={17} />} tone="blue" />
        <StatCard label="Open reports" value={String(openCount)} change="" note="active queue" icon={<Route size={17} />} tone="orange" />
        <StatCard label="Resolved reports" value={String(resolvedCount)} change="" note="all time" icon={<Leaf size={17} />} tone="purple" />
      </div>
      <div className="impact-grid">
        <div className="card impact-card">
          <div className="card-heading">
            <div>
              <h2>Resolved reports</h2>
              <p>Tracked outcomes</p>
            </div>
            <span className="trend-badge">
              <TrendingUp size={14} /> {resolvedCount}
            </span>
          </div>
          <div className="impact-big">
            {resolvedCount} <small>reports</small>
          </div>
          <div className="bar-chart">
            {IMPACT_BARS.map((height, index) => (
              <i key={index} style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>
        <div className="card impact-card">
          <div className="card-heading">
            <div>
              <h2>Waste recovered</h2>
              <p>By material type · demo estimate</p>
            </div>
            <MoreHorizontal size={17} />
          </div>
          {MATERIAL_BREAKDOWN.map((item) => (
            <div className="material-row" key={item.label}>
              <span>
                <i className={`material ${item.tone}`} />
                {item.label}
              </span>
              <b>{item.amount}</b>
            </div>
          ))}
          <div className="material-total">
            <span>Total recorded</span>
            <b>142 kg</b>
          </div>
        </div>
      </div>
    </div>
  );
}
