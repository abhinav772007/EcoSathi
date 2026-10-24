import { Check, ExternalLink, MapPin, MoreHorizontal } from 'lucide-react';
import { statusClassName } from '@/data/reports';

export function ReportTable({ reports, onResolve, onOpen, canManage = true }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>REPORT</th>
            <th>LOCATION</th>
            <th>PRIORITY</th>
            <th>STATUS</th>
            <th>REPORTED</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report.id}>
              <td>
                <button type="button" className="report-title" onClick={() => onOpen?.(report)}>
                  <div className={`report-avatar ${report.color}`}>{report.initials}</div>
                  <div>
                    <b>{report.title}</b>
                    <span>
                      {report.id} · {report.category}
                      {report.source === 'voice' && <em className="source-badge">voice</em>}
                    </span>
                  </div>
                </button>
              </td>
              <td>
                <span className="location-cell">
                  <MapPin size={14} />
                  {report.location}
                </span>
              </td>
              <td>
                <span className={`priority ${report.priority.toLowerCase()}`}>
                  <i />
                  {report.priority}
                </span>
              </td>
              <td>
                <span className={`status-pill ${statusClassName(report.status)}`}>{report.status}</span>
              </td>
              <td className="muted">{report.age}</td>
              <td>
                <div className="row-actions">
                  {onOpen && (
                    <button type="button" className="row-action" title="Open details" onClick={() => onOpen(report)}>
                      <ExternalLink size={15} />
                    </button>
                  )}
                  {canManage && report.status !== 'Resolved' && report.status !== 'Rejected' ? (
                    <button
                      type="button"
                      className="resolve-btn"
                      title="Mark resolved"
                      onClick={() => onResolve(report.id)}
                    >
                      Resolve
                      <MoreHorizontal size={14} />
                    </button>
                  ) : report.status === 'Resolved' ? (
                    <button type="button" className="row-action" title="Resolved" disabled>
                      <Check size={16} />
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
