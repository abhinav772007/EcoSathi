import { Check, Clock3, Download, Leaf, MoreHorizontal, Route, ShieldCheck, TrendingUp } from 'lucide-react';
import { IMPACT_BARS, MATERIAL_BREAKDOWN } from '@/data/campus';
import { PageHeading } from '@/components/ui/PageHeading';
import { StatCard } from '@/components/ui/StatCard';

export function ImpactPage() {
  return (
    <div className="page">
      <PageHeading
        eyebrow="Impact dashboard"
        title="Make progress visible"
        description="Measured outcomes from EcoSathi operations. Demo data is clearly labelled."
        action={
          <button type="button" className="secondary-btn">
            <Download size={16} /> Export report
          </button>
        }
      />
      <div className="demo-note">
        <ShieldCheck size={18} />
        <span>
          <b>Demonstration dataset</b> These figures are seeded for the IIT Roorkee pilot and are not observed campus
          impact.
        </span>
      </div>
      <div className="stat-grid">
        <StatCard label="Resolution rate" value="84.3%" change="+7.2%" note="this month" icon={<Check size={17} />} tone="green" />
        <StatCard label="Median resolution" value="2.4h" change="-18%" note="this month" icon={<Clock3 size={17} />} tone="blue" />
        <StatCard label="Route distance saved" value="18%" change="+4.1%" note="vs baseline" icon={<Route size={17} />} tone="orange" />
        <StatCard label="Waste recovered" value="142 kg" change="+31%" note="this month" icon={<Leaf size={17} />} tone="purple" />
      </div>
      <div className="impact-grid">
        <div className="card impact-card">
          <div className="card-heading">
            <div>
              <h2>Resolved reports</h2>
              <p>Last 30 days</p>
            </div>
            <span className="trend-badge">
              <TrendingUp size={14} /> 12.8%
            </span>
          </div>
          <div className="impact-big">
            312 <small>reports</small>
          </div>
          <div className="bar-chart">
            {IMPACT_BARS.map((height, index) => (
              <i key={index} style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>
        <div className="card impact-card">
          <div className="card-heading">
            <div>
              <h2>Waste recovered</h2>
              <p>By material type · this month</p>
            </div>
            <MoreHorizontal size={17} />
          </div>
          {MATERIAL_BREAKDOWN.map((item) => (
            <div className="material-row" key={item.label}>
              <span>
                <i className={`material ${item.tone}`} />
                {item.label}
              </span>
              <b>{item.amount}</b>
            </div>
          ))}
          <div className="material-total">
            <span>Total recorded</span>
            <b>142 kg</b>
          </div>
        </div>
      </div>
    </div>
  );
}
