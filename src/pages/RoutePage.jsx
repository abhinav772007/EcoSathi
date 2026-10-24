import { Loader2, Sparkles, TrendingUp, Truck } from 'lucide-react';
import { useState } from 'react';
import { CampusMap } from '@/components/route/CampusMap';
import { StopList } from '@/components/route/StopList';
import { PageHeading } from '@/components/ui/PageHeading';
import { useAuth } from '@/context/AuthContext';
import { useReports } from '@/context/ReportsContext';

export function RoutePage() {
  const { role } = useAuth();
  const { plan, generateRoutePlan, updateStop, notify } = useReports();
  const [generating, setGenerating] = useState(false);
  const [busyStop, setBusyStop] = useState(null);

  async function handleRegenerateRoute() {
    setGenerating(true);
    try {
      await generateRoutePlan();
    } catch (err) {
      notify('Could not regenerate route', err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleUpdateStop(stop, payload) {
    setBusyStop(String(stop.id || stop.sequence));
    try {
      await updateStop(stop, payload);
    } catch (err) {
      notify('Could not update stop', err.message);
    } finally {
      setBusyStop(null);
    }
  }

  const stops = plan?.collection_stops || [];
  const completed = stops.filter((s) => s.worker_status === 'completed').length;
  const inProgress = stops.filter((s) => s.worker_status === 'in_progress').length;
  const pending = stops.filter((s) => s.worker_status === 'pending').length;

  const savings =
    plan?.baseline_distance && plan?.total_distance
      ? Math.max(
          0,
          Math.round(
            ((plan.baseline_distance - plan.total_distance) / plan.baseline_distance) * 100
          )
        )
      : 32;

  return (
    <div className="page">
      <PageHeading
        eyebrow={role === 'worker' ? 'Field collection mode' : 'Collection route management'}
        title="Today’s Collection Route"
        description={
          role === 'worker'
            ? `Follow the prioritized stops sequence. Record collected weights (kg) and mark stops completed as you go.`
            : `Priority-aware nearest-neighbour route across ${stops.length} campus stops. ${completed} completed, ${inProgress} in progress.`
        }
        action={
          <button
            type="button"
            className="primary-btn"
            onClick={handleRegenerateRoute}
            disabled={generating}
          >
            {generating ? <Loader2 size={17} className="spin" /> : <Sparkles size={17} />}
            {generating ? 'Optimizing...' : 'Regenerate route'}
          </button>
        }
      />

      <div className="insight-banner">
        <div className="insight-icon">
          <Truck size={19} />
        </div>
        <div>
          <b>
            {plan?.total_distance || 3.8} km optimized route vs {plan?.baseline_distance || 5.6} km baseline
          </b>
          <span>
            {savings}% estimated travel distance saved compared to chronological baseline. Algorithm:{' '}
            <code>{plan?.algorithm_version || 'priority-nearest-neighbor-v2'}</code>
          </span>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: '24px' }}>
        <div className="card" style={{ padding: '16px' }}>
          <span className="eyebrow">TOTAL STOPS</span>
          <b style={{ fontSize: '24px', display: 'block', margin: '4px 0' }}>{stops.length}</b>
          <small style={{ color: 'var(--muted)' }}>Scheduled in today's run</small>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <span className="eyebrow">COMPLETED</span>
          <b style={{ fontSize: '24px', display: 'block', margin: '4px 0', color: 'var(--green)' }}>
            {completed}
          </b>
          <small style={{ color: 'var(--muted)' }}>Stops cleared & logged</small>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <span className="eyebrow">IN PROGRESS</span>
          <b style={{ fontSize: '24px', display: 'block', margin: '4px 0', color: '#e7975b' }}>
            {inProgress}
          </b>
          <small style={{ color: 'var(--muted)' }}>Active collection tasks</small>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <span className="eyebrow">REMAINING</span>
          <b style={{ fontSize: '24px', display: 'block', margin: '4px 0' }}>{pending}</b>
          <small style={{ color: 'var(--muted)' }}>Pending stops ahead</small>
        </div>
      </div>

      <div className="route-layout">
        <CampusMap plan={plan} />
        <StopList plan={plan} onUpdate={handleUpdateStop} busyStop={busyStop} />
      </div>
    </div>
  );
}
