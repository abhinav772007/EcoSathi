import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Navigation, Zap } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useReports } from '@/context/ReportsContext';

export function RoutePreview() {
  const { reports } = useReports();
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    apiRequest('/api/collection-plans')
      .then((plans) => setPlan(plans[0] || null))
      .catch(() => setPlan(null));
  }, []);

  const openCount = reports.filter((report) => report.status !== 'Resolved').length;
  const stopCount = plan?.collection_stops?.length || 0;
  const nextStop = plan?.collection_stops?.[0];
  const duplicateHint = reports.filter((report) => report.status === 'Needs review').length;

  return (
    <div className="side-stack">
      <section className="card route-card">
        <div className="card-heading">
          <div>
            <h2>Today’s route</h2>
            <p>{plan ? `${stopCount} stops · generated plan` : `${openCount} open reports awaiting a plan`}</p>
          </div>
          <span className={`status-pill ${plan ? 'ready' : 'needs-review'}`}>
            <i /> {plan ? 'Ready' : 'No plan'}
          </span>
        </div>
        <div className="route-progress">
          <div className="progress-track">
            <span style={{ width: plan && stopCount ? '20%' : '0%' }} />
          </div>
          <b>
            {plan ? 0 : '—'} <small>/ {stopCount || '—'} stops</small>
          </b>
          <em>{plan ? `${plan.total_distance || 0} km` : '—'}</em>
        </div>
        <div className="route-next">
          <div className="route-pin">
            <Navigation size={15} />
          </div>
          <div>
            <small>NEXT STOP</small>
            <b>{nextStop ? `Stop ${nextStop.sequence}` : 'Generate a route'}</b>
            <span>{nextStop ? `Report #${nextStop.report_id}` : 'Open the Route page to create one'}</span>
          </div>
          <ArrowUpRight size={16} />
        </div>
        <Link to="/route" className="secondary-btn full">
          Open route <ArrowUpRight size={15} />
        </Link>
      </section>
      <section className="card mini-card">
        <div className="mini-icon">
          <Zap size={17} />
        </div>
        <div>
          <b>{duplicateHint} reports need review</b>
          <span>Possible duplicates stay in Needs review until confirmed</span>
        </div>
        <ArrowUpRight size={16} />
      </section>
    </div>
  );
}
