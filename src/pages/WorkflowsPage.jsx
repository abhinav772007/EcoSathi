import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Check, Clock3, Loader2, RefreshCw, RotateCw, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeading } from '@/components/ui/PageHeading';
import { StatCard } from '@/components/ui/StatCard';
import { apiRequest } from '@/lib/api';

function statusClass(status) {
  if (status === 'succeeded') return 'ready';
  if (status === 'failed') return 'needs-attention';
  if (status === 'running') return 'needs-review';
  return 'clear';
}

function formatDuration(run) {
  if (!run.started_at || !run.completed_at) return '—';
  const ms = new Date(run.completed_at).getTime() - new Date(run.started_at).getTime();
  if (ms < 1000) return `${Math.max(0, Math.round(ms))} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export function WorkflowsPage() {
  const { role } = useAuth();
  const [runs, setRuns] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextRuns, nextEvents] = await Promise.all([
        apiRequest('/api/workflows'),
        role === 'administrator' ? apiRequest('/api/audit-events?limit=20').catch(() => []) : Promise.resolve([]),
      ]);
      setRuns(nextRuns);
      setEvents(nextEvents);
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const finished = runs.filter((run) => ['succeeded', 'failed'].includes(run.status));
    return {
      total: runs.length,
      succeeded: runs.filter((run) => run.status === 'succeeded').length,
      failed: runs.filter((run) => run.status === 'failed').length,
      running: runs.filter((run) => run.status === 'running').length,
      rate: finished.length
        ? `${Math.round((finished.filter((run) => run.status === 'succeeded').length / finished.length) * 100)}%`
        : '—',
    };
  }, [runs]);

  return (
    <div className="page">
      <PageHeading
        eyebrow="Processing pipeline"
        title="Workflow runs"
        description="Validation, duplicate detection, prioritisation, and route generation are recorded as durable runs."
        action={
          <button type="button" className="secondary-btn" onClick={load} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
          </button>
        }
      />

      <div className="pipeline-strip">
        {['Validate', 'Find duplicates', 'Prioritise', 'Generate route', 'Persist plan'].map((step, index) => (
          <div key={step} className={index === 0 ? 'active' : ''}>
            <span>{index + 1}</span>
            <b>{step}</b>
          </div>
        ))}
      </div>

      {error && <div className="demo-note error-note"><span>{error}</span></div>}

      <div className="stat-grid">
        <StatCard label="Workflow runs" value={stats.total} note="last 100" icon={<Activity size={17} />} tone="blue" />
        <StatCard label="Succeeded" value={stats.succeeded} note="durable records" icon={<Check size={17} />} tone="green" />
        <StatCard label="Failed" value={stats.failed} note="retryable" icon={<X size={17} />} tone="orange" />
        <StatCard label="Completion rate" value={stats.rate} note={`${stats.running} running`} icon={<RotateCw size={17} />} tone="purple" />
      </div>

      <section className="card reports-card">
        <div className="card-heading">
          <div>
            <h2>Pipeline runs</h2>
            <p>Newest first. Failed runs keep their error for investigation.</p>
          </div>
        </div>
        {loading ? (
          <div className="loading-state"><Loader2 size={18} className="spin" /> Loading runs...</div>
        ) : !runs.length ? (
          <div className="empty-state">
            <h2>No workflow runs yet</h2>
            <p>Create a report or generate a collection route to produce a run.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>RUN</th>
                  <th>KIND</th>
                  <th>REPORT / PLAN</th>
                  <th>STATUS</th>
                  <th>ALGORITHM</th>
                  <th>DURATION</th>
                  <th>STARTED</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td className="mono">{run.id.slice(0, 8)}</td>
                    <td>{run.kind.replaceAll('_', ' ')}</td>
                    <td>
                      {run.report?.code
                        ? `${run.report.code} · ${run.report.title}`
                        : run.payload?.plan_id
                          ? `Plan ${String(run.payload.plan_id).slice(0, 8)}`
                          : '—'}
                      {run.payload?.stops != null && <small className="table-sub">{run.payload.stops} stops</small>}
                    </td>
                    <td>
                      <span className={`status-pill ${statusClass(run.status)}`}>{run.status}</span>
                      {run.error && <small className="table-sub error-text">{run.error}</small>}
                    </td>
                    <td className="mono">{run.algorithm_version || '—'}</td>
                    <td>{formatDuration(run)}</td>
                    <td className="muted">{new Date(run.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {role === 'administrator' && (
        <section className="card reports-card audit-card">
          <div className="card-heading">
            <div>
              <h2><ShieldCheck size={17} /> Recent audit events</h2>
              <p>Meaningful status, route, and duplicate-review changes.</p>
            </div>
          </div>
          {!events.length ? (
            <div className="empty-state"><p>No audit events yet.</p></div>
          ) : (
            <div className="timeline">
              {events.map((event) => (
                <div className="timeline-row" key={event.id}>
                  <i />
                  <div>
                    <b>{event.action.replaceAll('_', ' ')}</b>
                    <span>
                      {event.entity_type} #{event.entity_id}
                      {event.actor?.name ? ` · ${event.actor.name}` : ''}
                    </span>
                    <small><Clock3 size={11} /> {new Date(event.created_at).toLocaleString()}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
