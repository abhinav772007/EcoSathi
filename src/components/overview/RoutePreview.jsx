import { Link } from 'react-router-dom';
import { ArrowUpRight, Navigation, Zap } from 'lucide-react';

export function RoutePreview() {
  return (
    <div className="side-stack">
      <section className="card route-card">
        <div className="card-heading">
          <div>
            <h2>Today’s route</h2>
            <p>12 stops · North campus</p>
          </div>
          <span className="status-pill ready">
            <i /> Ready
          </span>
        </div>
        <div className="route-progress">
          <div className="progress-track">
            <span />
          </div>
          <b>
            4 <small>/ 12 stops</small>
          </b>
          <em>33%</em>
        </div>
        <div className="route-next">
          <div className="route-pin">
            <Navigation size={15} />
          </div>
          <div>
            <small>NEXT STOP</small>
            <b>R. K. Hall · North gate</b>
            <span>Urgent · 120m away</span>
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
          <b>3 duplicate reports</b>
          <span>saved 42 minutes of work this week</span>
        </div>
        <ArrowUpRight size={16} />
      </section>
    </div>
  );
}
