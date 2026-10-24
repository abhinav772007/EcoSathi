import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, Clock3, Link2, Loader2, MapPin, ShieldCheck, X } from 'lucide-react';
import { allowedStatuses, statusClassName } from '@/data/reports';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

function eventLabel(action) {
  return action.replaceAll('_', ' ');
}

export function ReportDetailModal({ report: initialReport, onClose, onStatusChange }) {
  const { role } = useAuth();
  const [report, setReport] = useState(initialReport);
  const [timeline, setTimeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');

  const loadTimeline = useCallback(async (code) => {
    try {
      const data = await apiRequest(`/api/reports/${code}/timeline`);
      setTimeline(data);
      setReport(data.report);
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTimeline(initialReport.id);
  }, [initialReport.id, loadTimeline]);

  async function changeStatus(status) {
    setSaving(status);
    const updated = await onStatusChange(report.id, status, note);
    setSaving('');
    if (updated) {
      setNote('');
      await loadTimeline(report.id);
    }
  }

  const nextStatuses = allowedStatuses(report.status, role);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal wide" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div>
            <div className="eyebrow">{report.id} · {report.category}</div>
            <h2>{report.title}</h2>
            <p>{report.description || 'No additional description was provided.'}</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close report details">
            <X size={18} />
          </button>
        </div>

        <div className="detail-grid">
          <div className="detail-meta">
            <span><MapPin size={15} /> {report.location}</span>
            <span><Clock3 size={15} /> Reported {report.age}</span>
            <span className={`priority ${report.priority.toLowerCase()}`}><i /> {report.priority}</span>
            <span className={`status-pill ${statusClassName(report.status)}`}>{report.status}</span>
            {report.source === 'voice' && <span className="source-badge">voice report</span>}
          </div>
          {report.status === 'Rejected' && (
            <div className="demo-note compact">
              <AlertTriangle size={16} />
              <span>{report.resolution_note || 'This report was rejected after review.'}</span>
            </div>
          )}
        </div>

        {nextStatuses.length > 0 && (
          <section className="status-editor">
            <div>
              <h3>Advance the report</h3>
              <p>Choose a valid next state. Every change is written to the audit trail.</p>
            </div>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Optional note for the audit trail (for example, duplicate evidence)"
            />
            <div className="status-actions">
              {nextStatuses.map((status) => (
                <button
                  type="button"
                  key={status}
                  className={`small-btn ${status === 'Rejected' ? 'danger' : ''}`}
                  onClick={() => changeStatus(status)}
                  disabled={Boolean(saving)}
                >
                  {saving === status ? <Loader2 size={14} className="spin" /> : status === 'Resolved' ? <Check size={14} /> : null}
                  {status}
                </button>
              ))}
            </div>
          </section>
        )}

        {timeline && (
          <div className="timeline-grid">
            <section>
              <h3><ShieldCheck size={15} /> Audit history</h3>
              {loading ? (
                <p className="muted">Loading history...</p>
              ) : timeline.events?.length ? (
                <div className="timeline">
                  {timeline.events.map((event) => (
                    <div className="timeline-row" key={event.id}>
                      <i />
                      <div>
                        <b>{eventLabel(event.action)}</b>
                        <span>
                          {event.metadata?.from && event.metadata?.to
                            ? `${event.metadata.from} → ${event.metadata.to}`
                            : event.metadata?.source
                              ? `Source: ${event.metadata.source}`
                              : ''}
                          {event.metadata?.note ? ` · ${event.metadata.note}` : ''}
                        </span>
                        <small>{new Date(event.created_at).toLocaleString()}</small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">No audit events yet.</p>
              )}
            </section>

            <section>
              <h3><Link2 size={15} /> Duplicate review</h3>
              {timeline.duplicate_links?.length || timeline.duplicates_of_me?.length ? (
                <div className="duplicate-links">
                  {timeline.duplicate_links?.map((link) => (
                    <div key={link.id}>
                      <b>This report is suspected duplicate</b>
                      <span>{link.match_reason}</span>
                      <small>{Math.round(link.confidence * 100)}% confidence · {link.reviewed ? 'reviewed' : 'pending review'}</small>
                    </div>
                  ))}
                  {timeline.duplicates_of_me?.map((link) => (
                    <div key={`of-${link.id}`}>
                      <b>Another report points here</b>
                      <span>{link.match_reason}</span>
                      <small>{Math.round(link.confidence * 100)}% confidence · {link.reviewed ? 'reviewed' : 'pending review'}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">No duplicate links for this report.</p>
              )}
            </section>
          </div>
        )}

        {error && <p className="inline-error">{error}</p>}
      </div>
    </div>
  );
}
