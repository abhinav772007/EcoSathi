import { useMemo, useState } from 'react';
import { Activity, Check, Clock3, Loader2, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { PageHeading } from '@/components/ui/PageHeading';
import { StatCard } from '@/components/ui/StatCard';
import { useAuth } from '@/context/AuthContext';
import { useReports } from '@/context/ReportsContext';

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
  const { workflowRuns } = useReports();

  const stats = useMemo(() => {
    const finished = workflowRuns.filter((r) => ['succeeded', 'failed'].includes(r.status));
    const succeeded = workflowRuns.filter((r) => r.status === 'succeeded').length;
    return {
      total: workflowRuns.length,
      succeeded,
      failed: workflowRuns.filter((r) => r.status === 'failed').length,
      rate: finished.length ? `${Math.round((succeeded / finished.length) * 100)}%` : '100%',
    };
  }, [workflowRuns]);

  return (
    <div className="page">
      <PageHeading
        eyebrow="Render workflows"
        title="Automated Operations Pipelines"
        description="Every incoming waste report, duplicate detection scan, and route optimization task executed transparently as an auditable workflow run."
      />

      <div className="pipeline-strip">
        <div className="active">
          <span>01</span>
          <b>01 Validate & Ingest</b>
        </div>
        <div className="active">
          <span>02</span>
          <b>02 Deduplicate</b>
        </div>
        <div className="active">
          <span>03</span>
          <b>03 Priority Scoring</b>
        </div>
        <div className="active">
          <span>04</span>
          <b>04 Route Planner</b>
        </div>
        <div className="active">
          <span>05</span>
          <b>05 Dispatch Stops</b>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: '24px' }}>
        <StatCard label="Total workflow runs" value={stats.total} note="logged" icon={<Activity size={17} />} tone="blue" />
        <StatCard label="Succeeded runs" value={stats.succeeded} note="completed" icon={<Check size={17} />} tone="green" />
        <StatCard label="Failed runs" value={stats.failed} note="need attention" icon={<X size={17} />} tone="orange" />
        <StatCard label="Completion rate" value={stats.rate} note="uptime" icon={<ShieldCheck size={17} />} tone="purple" />
      </div>

      <section className="card">
        <div className="card-heading">
          <div>
            <h2>Recent Workflow Runs</h2>
            <p>Task executions triggered by voice/text submissions and dispatch actions</p>
          </div>
          <span className="status-pill ready">
            <i /> Live pipeline active
          </span>
        </div>

        <div className="table-wrapper">
          <table className="reports-table">
            <thead>
              <tr>
                <th>RUN ID</th>
                <th>PIPELINE KIND</th>
                <th>ALGORITHM</th>
                <th>STATUS</th>
                <th>DURATION</th>
                <th>SUMMARY / TARGET</th>
                <th>TIME</th>
              </tr>
            </thead>
            <tbody>
              {workflowRuns.map((run) => (
                <tr key={run.id}>
                  <td>
                    <code>{run.id.slice(0, 10)}</code>
                  </td>
                  <td>
                    <b>{run.kind === 'route_generation' ? 'Route Generation' : 'Report Processing'}</b>
                  </td>
                  <td>
                    <small>{run.algorithm_version || 'standard-v1'}</small>
                  </td>
                  <td>
                    <span className={`status-pill ${statusClass(run.status)}`}>
                      <i /> {run.status}
                    </span>
                  </td>
                  <td>{formatDuration(run)}</td>
                  <td>
                    {run.payload?.stops
                      ? `${run.payload.stops} stops planned (${run.payload.total_distance} km)`
                      : run.report?.code
                      ? `${run.report.code} · ${run.report.title}`
                      : 'Validation & triage check completed'}
                  </td>
                  <td>
                    <small style={{ color: 'var(--muted)' }}>
                      {new Date(run.started_at || Date.now()).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
