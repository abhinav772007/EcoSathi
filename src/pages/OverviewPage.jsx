import { Link } from 'react-router-dom';
import { ArrowUpRight, Bell, Check, Clock3, Leaf, Plus, Sparkles } from 'lucide-react';
import { CURRENT_USER } from '@/data/campus';
import { openReportCount, REPORT_STATUSES } from '@/data/reports';
import { useReports } from '@/context/ReportsContext';
import { ActivityChart } from '@/components/overview/ActivityChart';
import { RoutePreview } from '@/components/overview/RoutePreview';
import { ReportTable } from '@/components/reports/ReportTable';
import { FilterMenu } from '@/components/ui/FilterMenu';
import { PageHeading } from '@/components/ui/PageHeading';
import { StatCard } from '@/components/ui/StatCard';
import { useMemo, useState } from 'react';

export function OverviewPage() {
  const { reports, resolveReport, setShowReportModal } = useReports();
  const [filter, setFilter] = useState('All reports');

  const visibleReports = useMemo(
    () => (filter === 'All reports' ? reports : reports.filter((report) => report.status === filter)),
    [filter, reports],
  );

  return (
    <div className="page">
      <PageHeading
        eyebrow="Monday, 24 October 2026"
        title={`Good morning, ${CURRENT_USER.name.split(' ')[0]}`}
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
          <b>Collection efficiency is up 18% this week</b>
          <span>Resolution time is trending down after the new route plan. Keep it up.</span>
        </div>
        <Link to="/impact">
          View insights <ArrowUpRight size={15} />
        </Link>
      </div>

      <div className="stat-grid">
        <StatCard label="Open reports" value={openReportCount(reports)} change="+12%" note="vs last week" icon={<Bell size={17} />} tone="orange" />
        <StatCard label="Resolved this week" value="86" change="+24%" note="vs last week" icon={<Check size={17} />} tone="green" />
        <StatCard label="Avg. resolution time" value="2.4h" change="-18%" note="vs last week" icon={<Clock3 size={17} />} tone="blue" />
        <StatCard label="Waste recovered" value="142 kg" change="+31%" note="this month" icon={<Leaf size={17} />} tone="purple" />
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
