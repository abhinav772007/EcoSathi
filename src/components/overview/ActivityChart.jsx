import { ChevronDown } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART_DATA } from '@/data/campus';

export function ActivityChart({ data = CHART_DATA, demo = false }) {
  return (
    <section className="card chart-card">
      <div className="card-heading">
        <div>
          <h2>Report activity</h2>
          <p>Reports received and resolved over the last 7 days</p>
        </div>
        <button type="button" className="select-button">
          {demo ? 'Demo series' : 'Live'} <ChevronDown size={14} />
        </button>
      </div>
      <div className="legend">
        <span>
          <i className="dot reports-dot" /> Reports
        </span>
        <span>
          <i className="dot resolved-dot" /> Resolved
        </span>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="reportsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f2a36b" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#f2a36b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#e8ede6" />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#89918a', fontSize: 12 }} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#89918a', fontSize: 12 }} allowDecimals={false} />
            <Tooltip contentStyle={{ border: '1px solid #e3e9e1', borderRadius: 10, boxShadow: '0 6px 20px #1e3a2a12' }} />
            <Area type="monotone" dataKey="reports" stroke="#e8975e" strokeWidth={2.5} fill="url(#reportsGradient)" />
            <Area type="monotone" dataKey="resolved" stroke="#4e9c70" strokeWidth={2.5} fill="none" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
