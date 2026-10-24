import { ArrowUpRight, Check, MoreHorizontal } from 'lucide-react';
import { ROUTE_STOPS } from '@/data/campus';

export function StopList() {
  return (
    <section className="card stop-card">
      <div className="card-heading">
        <div>
          <h2>Stop list</h2>
          <p>Worker: Rajesh Kumar</p>
        </div>
        <button type="button" className="icon-button" aria-label="Stop options">
          <MoreHorizontal size={17} />
        </button>
      </div>
      {ROUTE_STOPS.map((stop, index) => {
        const numberClass = index === 0 ? 'done' : index === 1 ? 'current' : '';
        return (
          <div className={`stop-row ${stop.state === 'next' ? 'next' : ''}`} key={stop.location}>
            <div className={`stop-number ${numberClass}`}>
              {index === 0 ? <Check size={14} /> : index + 1}
            </div>
            <div>
              <b>{stop.location}</b>
              <span>{stop.issue}</span>
            </div>
            <small>{stop.eta}</small>
          </div>
        );
      })}
      <button type="button" className="secondary-btn full">
        View full stop list <ArrowUpRight size={15} />
      </button>
    </section>
  );
}
