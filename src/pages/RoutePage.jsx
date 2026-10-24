import { Sparkles, TrendingUp } from 'lucide-react';
import { CampusMap } from '@/components/route/CampusMap';
import { StopList } from '@/components/route/StopList';
import { PageHeading } from '@/components/ui/PageHeading';

export function RoutePage() {
  return (
    <div className="page">
      <PageHeading
        eyebrow="Collection planning"
        title="Today’s collection route"
        description="A prioritized route generated from 12 verified reports."
        action={
          <button type="button" className="primary-btn">
            <Sparkles size={17} /> Regenerate route
          </button>
        }
      />
      <div className="route-layout">
        <CampusMap />
        <StopList />
      </div>
      <div className="compare-row">
        <div className="compare-number">18%</div>
        <div>
          <b>Distance saved against baseline</b>
          <span>4.8 km proposed route vs 5.9 km baseline · Approximate straight-line distance</span>
        </div>
        <TrendingUp size={20} />
      </div>
    </div>
  );
}
