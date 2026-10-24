import { Sparkles, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CampusMap } from '@/components/route/CampusMap';
import { StopList } from '@/components/route/StopList';
import { PageHeading } from '@/components/ui/PageHeading';
import { apiRequest } from '@/lib/api';

export function RoutePage() {
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('/api/collection-plans')
      .then((plans) => setPlan(plans[0] || null))
      .catch((requestError) => setError(requestError.message));
  }, []);

  async function regenerateRoute() {
    setError('');
    try {
      setPlan(await apiRequest('/api/collection-plans/generate', { method: 'POST', body: JSON.stringify({}) }));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const distance = plan ? `${plan.total_distance} km proposed route vs ${plan.baseline_distance} km baseline` : 'No route plan has been generated yet';
  const savings = plan?.baseline_distance
    ? Math.max(0, Math.round(((plan.baseline_distance - plan.total_distance) / plan.baseline_distance) * 100))
    : null;

  return (
    <div className="page">
      <PageHeading
        eyebrow="Collection planning"
        title="Today’s collection route"
        description={plan ? `A prioritized route generated from ${plan.collection_stops?.length || 0} verified reports.` : 'Generate a route from verified reports.'}
        action={
          <button type="button" className="primary-btn" onClick={regenerateRoute}>
            <Sparkles size={17} /> Regenerate route
          </button>
        }
      />
      {error && <div className="demo-note"><span>{error}</span></div>}
      <div className="route-layout">
        <CampusMap plan={plan} />
        <StopList plan={plan} />
      </div>
      <div className="compare-row">
        <div className="compare-number">{savings != null ? `${savings}%` : '—'}</div>
        <div>
          <b>Distance saved against baseline</b>
          <span>{distance} · Approximate straight-line distance</span>
        </div>
        <TrendingUp size={20} />
      </div>
    </div>
  );
}
