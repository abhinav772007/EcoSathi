import { Loader2, Sparkles, TrendingUp } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { CampusMap } from '@/components/route/CampusMap';
import { StopList } from '@/components/route/StopList';
import { PageHeading } from '@/components/ui/PageHeading';
import { useReports } from '@/context/ReportsContext';
import { apiRequest } from '@/lib/api';

export function RoutePage() {
  const { refreshReports, notify } = useReports();
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [busyStop, setBusyStop] = useState(null);

  const loadPlan = useCallback(async (planId) => {
    try {
      if (planId) {
        const nextPlan = await apiRequest(`/api/collection-plans/${planId}`);
        setPlan(nextPlan);
        return nextPlan;
      }
      const plans = await apiRequest('/api/collection-plans');
      const nextPlan = plans.find((item) => item.status !== 'cancelled') || plans[0] || null;
      setPlan(nextPlan);
      return nextPlan;
    } catch (requestError) {
      setError(requestError.message);
      return null;
    }
  }, []);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  async function regenerateRoute() {
    setError('');
    setGenerating(true);
    try {
      const nextPlan = await apiRequest('/api/collection-plans/generate', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setPlan(nextPlan);
      await refreshReports();
      notify('Route generated', `${nextPlan.collection_stops?.length || 0} stops in the new plan.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setGenerating(false);
    }
  }

  async function updateStop(stop, payload) {
    setBusyStop(String(stop.id));
    setError('');
    try {
      await apiRequest(`/api/collection-stops/${stop.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      await Promise.all([loadPlan(plan.id), refreshReports()]);
      notify(
        'Stop updated',
        `${stop.location_name || `Stop ${stop.sequence}`} is now ${payload.worker_status.replaceAll('_', ' ')}.`,
        2500,
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyStop(null);
    }
  }

  const distance = plan
    ? `${plan.total_distance} km proposed route vs ${plan.baseline_distance} km baseline`
    : 'No route plan has been generated yet';
  const savings = plan?.baseline_distance
    ? Math.max(0, Math.round(((plan.baseline_distance - plan.total_distance) / plan.baseline_distance) * 100))
    : null;
  const completed = plan?.collection_stops?.filter((stop) => stop.worker_status === 'completed').length || 0;

  return (
    <div className="page">
      <PageHeading
        eyebrow="Collection planning"
        title="Today’s collection route"
        description={
          plan
            ? `Priority-aware nearest-neighbour route across ${plan.collection_stops?.length || 0} stops. ${completed} completed.`
            : 'Generate a route from verified reports.'
        }
        action={
          <button type="button" className="primary-btn" onClick={regenerateRoute} disabled={generating}>
            {generating ? <Loader2 size={17} className="spin" /> : <Sparkles size={17} />}
            {generating ? 'Planning...' : 'Regenerate route'}
          </button>
        }
      />
      {error && <div className="demo-note error-note"><span>{error}</span></div>}
      <div className="route-layout">
        <CampusMap plan={plan} />
        <StopList plan={plan} onUpdate={updateStop} busyStop={busyStop} />
      </div>
      <div className="compare-row">
        <div className="compare-number">{savings != null ? `${savings}%` : '—'}</div>
        <div>
          <b>Distance saved against baseline</b>
          <span>{distance} · Approximate straight-line haversine estimate; not fuel or emissions savings.</span>
        </div>
        <TrendingUp size={20} />
      </div>
    </div>
  );
}
