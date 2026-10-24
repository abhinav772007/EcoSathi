import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Check, Navigation, Sparkles, Zap } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useReports } from '@/context/ReportsContext';

export function RoutePreview({ canManage = true }) {
  const { reports } = useReports();
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    if (!canManage) return;
    apiRequest('/api/collection-plans')
      .then((plans) => setPlan(plans.find((item) => item.status !== 'cancelled') || plans[0] || null))
      .catch(() => setPlan(null));
  }, [canManage]);

  const openCount = reports.filter((report) => report.status !== 'Resolved' && report.status !== 'Rejected').length;
  const resolvedCount = reports.filter((report) => report.status === 'Resolved').length;

  if (!canManage) {
    return (
      <div className="side-stack">
        <section className="card route-card">
          <div className="card-heading">
            <div>
              <h2>Your reports</h2>
              <p>{openCount} open · {resolvedCount} resolved</p>
            </div>
            <span className="status-pill ready"><i /> {reports.length} total</span>
          </div>
          <div className="route-next">
            <div className="route-pin"><Check size={15} /></div>
            <div>
              <small>TRACK OUTCOMES</small>
              <b>{resolvedCount} resolved</b>
              <span>Status changes from workers appear here</span>
            </div>
            <ArrowUpRight size={16} />
          </div>
          <Link to="/reports" className="secondary-btn full">
            View my reports <ArrowUpRight size={15} />
          </Link>
        </section>
        <section className="card mini-card">
          <div className="mini-icon"><Sparkles size={17} /></div>
          <div>
            <b>Report by voice or text</b>
            <span>Missing location details can be corrected before submission</span>
          </div>
          <ArrowUpRight size={16} />
        </section>
      </div>
    );
  }

  const stops = [...(plan?.collection_stops || [])].sort((a, b) => a.sequence - b.sequence);
  const stopCount = stops.length;
  const completedCount = stops.filter((stop) => stop.worker_status === 'completed').length;
  const nextStop = stops.find((stop) => stop.worker_status !== 'completed' && stop.worker_status !== 'skipped');
  const progress = stopCount ? Math.round((completedCount / stopCount) * 100) : 0;
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
            <i /> {plan ? plan.status : 'No plan'}
          </span>
        </div>
        <div className="route-progress">
          <div className="progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
          <b>
            {plan ? completedCount : '—'} <small>/ {stopCount || '—'} stops</small>
          </b>
          <em>{plan ? `${plan.total_distance || 0} km` : '—'}</em>
        </div>
        <div className="route-next">
          <div className="route-pin">
            <Navigation size={15} />
          </div>
          <div>
            <small>NEXT STOP</small>
            <b>{nextStop ? nextStop.location_name || `Stop ${nextStop.sequence}` : 'Generate a route'}</b>
            <span>{nextStop ? `${nextStop.priority} · ${nextStop.report_code}` : 'Open the Route page to create one'}</span>
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
