import { useMemo, useState } from 'react';
import { Download, Plus, Search } from 'lucide-react';
import { REPORT_STATUSES } from '@/data/reports';
import { useAuth } from '@/context/AuthContext';
import { useReports } from '@/context/ReportsContext';
import { ReportTable } from '@/components/reports/ReportTable';
import { ReportDetailModal } from '@/components/reports/ReportDetailModal';
import { FilterMenu } from '@/components/ui/FilterMenu';
import { PageHeading } from '@/components/ui/PageHeading';
import { downloadCsv } from '@/lib/export';

export function ReportsPage() {
  const { role } = useAuth();
  const { reports, resolveReport, updateReportStatus, setShowReportModal, notify } = useReports();
  const [filter, setFilter] = useState('All reports');
  const [query, setQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const canManage = role === 'administrator' || role === 'worker';

  const visibleReports = useMemo(() => {
    const byStatus = filter === 'All reports' ? reports : reports.filter((report) => report.status === filter);
    const needle = query.trim().toLowerCase();
    if (!needle) return byStatus;
    return byStatus.filter((report) =>
      [report.title, report.id, report.location, report.category].join(' ').toLowerCase().includes(needle),
    );
  }, [filter, query, reports]);

  function handleExport() {
    downloadCsv(
      `ecosathi-reports-${new Date().toISOString().slice(0, 10)}.csv`,
      visibleReports,
      [
        { label: 'Report ID', value: (row) => row.id },
        { label: 'Title', value: (row) => row.title },
        { label: 'Location', value: (row) => row.location },
        { label: 'Category', value: (row) => row.category },
        { label: 'Priority', value: (row) => row.priority },
        { label: 'Status', value: (row) => row.status },
        { label: 'Source', value: (row) => row.source },
        { label: 'Created', value: (row) => row.created_at },
        { label: 'Resolved', value: (row) => row.resolved_at || '' },
      ],
    );
    notify('Export ready', `${visibleReports.length} reports downloaded as CSV.`, 2500);
  }

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
        <button type="button" className="select-button" onClick={handleExport} disabled={!visibleReports.length}>
          <Download size={14} /> Export
        </button>
      </div>
      <section className="card reports-card">
        {visibleReports.length ? (
          <ReportTable
            reports={visibleReports}
            onResolve={resolveReport}
            onOpen={setSelectedReport}
            canManage={canManage}
          />
        ) : (
          <div className="empty-state">
            <h2>No matching reports</h2>
            <p>Try another search term or clear the status filter.</p>
          </div>
        )}
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
