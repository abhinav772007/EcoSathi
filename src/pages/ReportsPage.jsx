import { useMemo, useState } from 'react';
import { Download, Plus, Search } from 'lucide-react';
import { REPORT_STATUSES } from '@/data/reports';
import { useReports } from '@/context/ReportsContext';
import { ReportTable } from '@/components/reports/ReportTable';
import { FilterMenu } from '@/components/ui/FilterMenu';
import { PageHeading } from '@/components/ui/PageHeading';

export function ReportsPage() {
  const { reports, resolveReport, setShowReportModal } = useReports();
  const [filter, setFilter] = useState('All reports');
  const [query, setQuery] = useState('');

  const visibleReports = useMemo(() => {
    const byStatus = filter === 'All reports' ? reports : reports.filter((report) => report.status === filter);
    const needle = query.trim().toLowerCase();
    if (!needle) return byStatus;
    return byStatus.filter((report) =>
      [report.title, report.id, report.location, report.category].join(' ').toLowerCase().includes(needle),
    );
  }, [filter, query, reports]);

  return (
    <div className="page">
      <PageHeading
        eyebrow="Operations queue"
        title="All reports"
        description="Review, prioritize, and track every waste report from campus."
        action={
          <button type="button" className="primary-btn" onClick={() => setShowReportModal(true)}>
            <Plus size={17} /> New report
          </button>
        }
      />
      <div className="toolbar">
        <div className="search-field">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search reports..."
          />
        </div>
        <FilterMenu value={filter} options={REPORT_STATUSES} onChange={setFilter} />
        <button type="button" className="select-button">
          <Download size={14} /> Export
        </button>
      </div>
      <section className="card reports-card">
        {visibleReports.length ? (
          <ReportTable reports={visibleReports} onResolve={resolveReport} />
        ) : (
          <div className="empty-state">
            <h2>No matching reports</h2>
            <p>Try another search term or clear the status filter.</p>
          </div>
        )}
      </section>
    </div>
  );
}
