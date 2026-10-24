import { ArrowUpRight, Check, MoreHorizontal } from 'lucide-react';
import { useReports } from '@/context/ReportsContext';

export function StopList({ plan }) {
  const { reports } = useReports();

  const stops = plan?.collection_stops?.length
    ? [...plan.collection_stops]
        .sort((a, b) => a.sequence - b.sequence)
        .map((stop) => {
          const linked = reports.find(
            (report) =>
              Number(report.location_id) === Number(stop.location_id)
              || String(report.id) === String(stop.report_id),
          );
          return {
            key: stop.id || stop.sequence,
            location: linked?.location || `Stop ${stop.sequence}`,
            issue: linked ? `${linked.priority} · ${linked.category}` : `Report ${stop.report_id}`,
            eta: (stop.worker_status || 'pending').replaceAll('_', ' '),
            state: stop.worker_status,
          };
        })
    : [];

  return (
    <section className="card stop-card">
      <div className="card-heading">
        <div>
          <h2>Stop list</h2>
          <p>{stops.length ? `${stops.length} stops in plan` : 'Generate a route to see stops'}</p>
        </div>
        <button type="button" className="icon-button" aria-label="Stop options">
          <MoreHorizontal size={17} />
        </button>
      </div>
      {!stops.length && (
        <div className="empty-state" style={{ padding: '18px 8px' }}>
          <p>No collection stops yet. Click Regenerate route after reports are Verified.</p>
        </div>
      )}
      {stops.map((stop, index) => {
        const numberClass = stop.state === 'completed' ? 'done' : index === 0 ? 'current' : '';
        return (
          <div className={`stop-row ${index === 0 ? 'next' : ''}`} key={stop.key}>
            <div className={`stop-number ${numberClass}`}>
              {stop.state === 'completed' ? <Check size={14} /> : index + 1}
            </div>
            <div>
              <b>{stop.location}</b>
              <span>{stop.issue}</span>
            </div>
            <small>{stop.eta}</small>
          </div>
        );
      })}
      <button type="button" className="secondary-btn full" disabled={!stops.length}>
        View full stop list <ArrowUpRight size={15} />
      </button>
    </section>
  );
}
