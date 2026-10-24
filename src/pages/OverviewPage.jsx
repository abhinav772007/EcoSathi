import { Link } from 'react-router-dom';
import { ArrowUpRight, Bell, Check, Clock3, Leaf, Plus, Sparkles } from 'lucide-react';
import { openReportCount, REPORT_STATUSES } from '@/data/reports';
import { useAuth } from '@/context/AuthContext';
import { useReports } from '@/context/ReportsContext';
import { ActivityChart } from '@/components/overview/ActivityChart';
import { RoutePreview } from '@/components/overview/RoutePreview';
import { ReportTable } from '@/components/reports/ReportTable';
import { FilterMenu } from '@/components/ui/FilterMenu';
import { PageHeading } from '@/components/ui/PageHeading';
import { StatCard } from '@/components/ui/StatCard';
import { useMemo, useState } from 'react';

export function OverviewPage() {
  const { displayName } = useAuth();
  const { reports, resolveReport, setShowReportModal } = useReports();
  const [filter, setFilter] = useState('All reports');

  const visibleReports = useMemo(
    () => (filter === 'All reports' ? reports : reports.filter((report) => report.status === filter)),
    [filter, reports],
  );
  const resolvedCount = reports.filter((report) => report.status === 'Resolved').length;
  const firstName = displayName.split(' ')[0] || 'there';

  return (
    <div className="page">
      <PageHeading
        eyebrow="Campus operations"
        title={`Good morning, ${firstName}`}
        description="Here’s what’s happening across your campus today."
        action={
          <button type="button" className="primary-btn" onClick={() => setShowReportModal(true)}>
            <Plus size={17} /> New report
          </button>
        }
      />

      <div className="insight-banner">
        <div className="insight-icon">
          <Sparkles size={19} />
        </div>
        <div>
          <b>{openReportCount(reports)} open reports in the queue</b>
          <span>Review, verify, and generate a collection route from the Route page.</span>
        </div>
        <Link to="/impact">
          View insights <ArrowUpRight size={15} />
        </Link>
      </div>

      <div className="stat-grid">
        <StatCard label="Open reports" value={openReportCount(reports)} change="" note="active" icon={<Bell size={17} />} tone="orange" />
        <StatCard label="Resolved" value={resolvedCount} change="" note="all loaded" icon={<Check size={17} />} tone="green" />
        <StatCard label="Total reports" value={reports.length} change="" note="your view" icon={<Clock3 size={17} />} tone="blue" />
        <StatCard label="Locations in use" value={new Set(reports.map((report) => report.location)).size} change="" note="from reports" icon={<Leaf size={17} />} tone="purple" />
      </div>

      <div className="content-grid">
        <ActivityChart />
        <RoutePreview />
      </div>

      <section className="card reports-card">
        <div className="card-heading">
          <div>
            <h2>Needs attention</h2>
            <p>Prioritized reports requiring action</p>
          </div>
          <div className="heading-actions">
            <FilterMenu value={filter} options={REPORT_STATUSES} onChange={setFilter} />
            <Link to="/reports" className="text-button">
              View all <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
        <ReportTable reports={visibleReports.slice(0, 4)} onResolve={resolveReport} />
      </section>
    </div>
  );
}
