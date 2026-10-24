import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowUpRight, Bell, Check, ChevronDown, CircleHelp, Clock3, Download,
  Filter, Leaf, MapPin, Menu, Mic, MoreHorizontal, Navigation, Plus,
  Route, Search, ShieldCheck, Sparkles, Trash2, TrendingUp, Users, X, Zap
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import './styles.css';

const initialReports = [
  { id: 'ECO-1042', title: 'Overflowing bin near hostel mess', location: 'R. K. Hall · North gate', category: 'Overflowing bin', priority: 'Urgent', status: 'Needs review', age: '12 min ago', initials: 'AS', color: 'coral' },
  { id: 'ECO-1041', title: 'Mixed waste around the amphitheatre', location: 'Main amphitheatre', category: 'Scattered waste', priority: 'High', status: 'Verified', age: '38 min ago', initials: 'MP', color: 'blue' },
  { id: 'ECO-1040', title: 'Missed pickup from science block', location: 'Science block · Dock 2', category: 'Missed pickup', priority: 'Medium', status: 'Assigned', age: '1 hr ago', initials: 'RK', color: 'purple' },
  { id: 'ECO-1039', title: 'Where can I dispose of e-waste?', location: 'Rajendra Bhawan', category: 'Disposal question', priority: 'Low', status: 'Resolved', age: '2 hrs ago', initials: 'NJ', color: 'green' },
];

const locations = ['R. K. Hall · North gate', 'Main amphitheatre', 'Science block · Dock 2', 'Rajendra Bhawan', 'Central library'];
const chartData = [
  { day: 'Mon', reports: 32, resolved: 24 }, { day: 'Tue', reports: 41, resolved: 31 },
  { day: 'Wed', reports: 35, resolved: 29 }, { day: 'Thu', reports: 48, resolved: 39 },
  { day: 'Fri', reports: 44, resolved: 40 }, { day: 'Sat', reports: 27, resolved: 25 },
  { day: 'Sun', reports: 30, resolved: 28 }
];

function Icon({ children, size = 18 }) { return <span className="icon" style={{ width: size, height: size }}>{children}</span>; }

function App() {
  const [active, setActive] = useState('Overview');
  const [reports, setReports] = useState(initialReports);
  const [showReport, setShowReport] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [filter, setFilter] = useState('All reports');

  const visibleReports = useMemo(() => filter === 'All reports' ? reports : reports.filter((report) => report.status === filter), [filter, reports]);

  function addReport(report) {
    const newReport = { ...report, id: `ECO-${1043 + reports.length - initialReports.length}`, age: 'just now', initials: 'YU', color: 'green', status: 'Needs review' };
    setReports([newReport, ...reports]);
    setShowReport(false);
    setShowToast(true);
    window.setTimeout(() => setShowToast(false), 3500);
  }

  function resolveReport(id) {
    setReports(reports.map((report) => report.id === id ? { ...report, status: 'Resolved' } : report));
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Leaf size={20} strokeWidth={2.5} /></div><span>Eco<span>Sathi</span></span></div>
        <div className="workspace-switcher"><div className="workspace-avatar">IR</div><div><b>IIT Roorkee</b><small>Campus operations</small></div><ChevronDown size={15} /></div>
        <nav>
          <p className="nav-label">WORKSPACE</p>
          {['Overview', 'Reports', 'Collection route', 'Impact'].map((item, i) => (
            <button key={item} className={`nav-item ${active === item ? 'active' : ''}`} onClick={() => setActive(item)}>
              <Icon>{[<TrendingUp size={17} />, <Bell size={17} />, <Route size={17} />, <Leaf size={17} />][i]}</Icon>{item}
              {item === 'Reports' && <span className="nav-count">12</span>}
            </button>
          ))}
          <p className="nav-label nav-gap">MANAGE</p>
          {['Team', 'Locations'].map((item) => <button key={item} className="nav-item" onClick={() => setActive(item)}><Icon>{item === 'Team' ? <Users size={17} /> : <MapPin size={17} />}</Icon>{item}</button>)}
        </nav>
        <div className="sidebar-bottom"><div className="help-card"><CircleHelp size={18} /><div><b>Need a hand?</b><small>Read the operations guide</small></div><ArrowUpRight size={15} /></div><div className="profile"><div className="profile-avatar">AK</div><div><b>Ananya Kapoor</b><small>Administrator</small></div><MoreHorizontal size={17} /></div></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><div className="mobile-brand"><div className="brand-mark"><Leaf size={18} /></div><b>EcoSathi</b></div><div className="breadcrumb"><span>Workspace</span><span>/</span><b>{active}</b></div><div className="top-actions"><button className="icon-button"><Search size={18} /></button><button className="icon-button notification"><Bell size={18} /><i /></button><div className="top-avatar">AK</div></div></header>

        {active === 'Overview' && <Overview reports={reports} visibleReports={visibleReports} filter={filter} setFilter={setFilter} onReport={() => setShowReport(true)} onResolve={resolveReport} />}
        {active === 'Reports' && <ReportsPage reports={visibleReports} filter={filter} setFilter={setFilter} onReport={() => setShowReport(true)} onResolve={resolveReport} />}
        {active === 'Collection route' && <RoutePage />}
        {active === 'Impact' && <ImpactPage />}
        {['Team', 'Locations'].includes(active) && <Placeholder title={active} />}
      </main>
      {showReport && <ReportModal onClose={() => setShowReport(false)} onSubmit={addReport} />}
      {showToast && <div className="toast"><div className="toast-check"><Check size={16} /></div><div><b>Report submitted</b><span>EcoSathi is processing ECO-1043</span></div><button onClick={() => setShowToast(false)}><X size={16} /></button></div>}
    </div>
  );
}

function PageHeading({ eyebrow, title, description, action }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function Overview({ reports, visibleReports, filter, setFilter, onReport, onResolve }) {
  return <div className="page">
    <PageHeading eyebrow="Monday, 24 October 2026" title="Good morning, Ananya" description="Here’s what’s happening across your campus today." action={<button className="primary-btn" onClick={onReport}><Plus size={17} /> New report</button>} />
    <div className="insight-banner"><div className="insight-icon"><Sparkles size={19} /></div><div><b>Collection efficiency is up 18% this week</b><span>Resolution time is trending down after the new route plan. Keep it up.</span></div><button>View insights <ArrowUpRight size={15} /></button></div>
    <div className="stat-grid">
      <StatCard label="Open reports" value={reports.filter(r => r.status !== 'Resolved').length} change="+12%" note="vs last week" icon={<Bell size={17} />} tone="orange" />
      <StatCard label="Resolved this week" value="86" change="+24%" note="vs last week" icon={<Check size={17} />} tone="green" />
      <StatCard label="Avg. resolution time" value="2.4h" change="-18%" note="vs last week" icon={<Clock3 size={17} />} tone="blue" />
      <StatCard label="Waste recovered" value="142 kg" change="+31%" note="this month" icon={<Leaf size={17} />} tone="purple" />
    </div>
    <div className="content-grid"><section className="card chart-card"><div className="card-heading"><div><h2>Report activity</h2><p>Reports received and resolved this week</p></div><button className="select-button">This week <ChevronDown size={14} /></button></div><div className="legend"><span><i className="dot reports-dot" /> Reports</span><span><i className="dot resolved-dot" /> Resolved</span></div><div className="chart-wrap"><ResponsiveContainer width="100%" height={220}><AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}><defs><linearGradient id="reportsGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f2a36b" stopOpacity={0.22}/><stop offset="100%" stopColor="#f2a36b" stopOpacity={0}/></linearGradient></defs><CartesianGrid vertical={false} stroke="#e8ede6" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#89918a', fontSize: 12 }} dy={8} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#89918a', fontSize: 12 }} /><Tooltip contentStyle={{ border: '1px solid #e3e9e1', borderRadius: 10, boxShadow: '0 6px 20px #1e3a2a12' }} /><Area type="monotone" dataKey="reports" stroke="#e8975e" strokeWidth={2.5} fill="url(#reportsGradient)" /><Area type="monotone" dataKey="resolved" stroke="#4e9c70" strokeWidth={2.5} fill="none" /></AreaChart></ResponsiveContainer></div></section><div className="side-stack"><section className="card route-card"><div className="card-heading"><div><h2>Today’s route</h2><p>12 stops · North campus</p></div><span className="status-pill ready"><i /> Ready</span></div><div className="route-progress"><div className="progress-track"><span /></div><b>4 <small>/ 12 stops</small></b><em>33%</em></div><div className="route-next"><div className="route-pin"><Navigation size={15} /></div><div><small>NEXT STOP</small><b>R. K. Hall · North gate</b><span>Urgent · 120m away</span></div><ArrowUpRight size={16} /></div><button className="secondary-btn full">Open route <ArrowUpRight size={15} /></button></section><section className="card mini-card"><div className="mini-icon"><Zap size={17} /></div><div><b>3 duplicate reports</b><span>saved 42 minutes of work this week</span></div><ArrowUpRight size={16} /></section></div></div>
    <section className="card reports-card"><div className="card-heading"><div><h2>Needs attention</h2><p>Prioritized reports requiring action</p></div><div className="heading-actions"><button className="select-button" onClick={() => setFilter(filter === 'All reports' ? 'Needs review' : 'All reports')}><Filter size={14} /> {filter} <ChevronDown size={14} /></button><button className="text-button">View all <ArrowUpRight size={14} /></button></div></div><ReportTable reports={visibleReports.slice(0, 4)} onResolve={onResolve} /></section>
  </div>;
}

function StatCard({ label, value, change, note, icon, tone }) { return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-label">{label}<span className="stat-trend">{change} <small>{note}</small></span></div><strong>{value}</strong></div>; }

function ReportsPage({ reports, filter, setFilter, onReport, onResolve }) { return <div className="page"><PageHeading eyebrow="Operations queue" title="All reports" description="Review, prioritize, and track every waste report from campus." action={<button className="primary-btn" onClick={onReport}><Plus size={17} /> New report</button>} /><div className="toolbar"><div className="search-field"><Search size={16} /><input placeholder="Search reports..." /></div><button className="select-button"><Filter size={14} /> {filter} <ChevronDown size={14} /></button><button className="select-button"><Download size={14} /> Export</button></div><section className="card reports-card"><ReportTable reports={reports} onResolve={onResolve} /></section></div>; }

function ReportTable({ reports, onResolve }) { return <div className="table-wrap"><table><thead><tr><th>REPORT</th><th>LOCATION</th><th>PRIORITY</th><th>STATUS</th><th>REPORTED</th><th></th></tr></thead><tbody>{reports.map(report => <tr key={report.id}><td><div className="report-title"><div className={`report-avatar ${report.color}`}>{report.initials}</div><div><b>{report.title}</b><span>{report.id} · {report.category}</span></div></div></td><td><span className="location-cell"><MapPin size={14} />{report.location}</span></td><td><span className={`priority ${report.priority.toLowerCase()}`}><i />{report.priority}</span></td><td><span className={`status-pill ${report.status.toLowerCase().replace(' ', '-')}`}>{report.status}</span></td><td className="muted">{report.age}</td><td><button className="row-action" title="Mark resolved" onClick={() => onResolve(report.id)}>{report.status === 'Resolved' ? <Check size={16} /> : <MoreHorizontal size={17} />}</button></td></tr>)}</tbody></table></div>; }

function RoutePage() { return <div className="page"><PageHeading eyebrow="Collection planning" title="Today’s collection route" description="A prioritized route generated from 12 verified reports." action={<button className="primary-btn"><Sparkles size={17} /> Regenerate route</button>} /><div className="route-layout"><section className="card map-card"><div className="map-top"><div><h2>North campus · Live plan</h2><p>Nearest-neighbour optimization · Updated 8 min ago</p></div><span className="status-pill ready"><i /> Route active</span></div><div className="campus-map"><div className="map-grid" /><div className="map-road r1" /><div className="map-road r2" /><div className="map-road r3" /><div className="route-line" /><MapMarker x="22%" y="70%" n="1" /><MapMarker x="37%" y="50%" n="2" /><MapMarker x="53%" y="62%" n="3" urgent /><MapMarker x="68%" y="35%" n="4" /><MapMarker x="82%" y="48%" n="5" /><div className="map-label label-a">HOSTEL ZONE</div><div className="map-label label-b">NORTH CAMPUS</div></div><div className="map-footer"><span><i className="legend-dot green-dot" /> Completed</span><span><i className="legend-dot orange-dot" /> Next stop</span><span><i className="legend-dot gray-dot" /> Upcoming</span><b>4.8 km <small>total distance</small></b></div></section><section className="card stop-card"><div className="card-heading"><div><h2>Stop list</h2><p>Worker: Rajesh Kumar</p></div><button className="icon-button"><MoreHorizontal size={17} /></button></div>{['R. K. Hall · North gate','Main amphitheatre','Science block · Dock 2','Rajendra Bhawan','Central library'].map((stop, i) => <div className={`stop-row ${i === 0 ? 'next' : ''}`} key={stop}><div className={`stop-number ${i < 1 ? 'done' : i === 1 ? 'current' : ''}`}>{i < 1 ? <Check size={14} /> : i + 1}</div><div><b>{stop}</b><span>{i === 0 ? 'Urgent · Overflowing bin' : i === 1 ? 'High · Scattered waste' : 'Medium · Pickup'}</span></div><small>{i === 0 ? '120m' : `${(i + 1) * 4} min`}</small></div>)}<button className="secondary-btn full">View full stop list <ArrowUpRight size={15} /></button></section></div><div className="compare-row"><div className="compare-number">18%</div><div><b>Distance saved against baseline</b><span>4.8 km proposed route vs 5.9 km baseline · Approximate straight-line distance</span></div><TrendingUp size={20} /></div></div>; }

function MapMarker({ x, y, n, urgent }) { return <div className={`map-marker ${urgent ? 'urgent' : ''}`} style={{ left: x, top: y }}><span>{n}</span></div>; }
function ImpactPage() { return <div className="page"><PageHeading eyebrow="Impact dashboard" title="Make progress visible" description="Measured outcomes from EcoSathi operations. Demo data is clearly labelled." action={<button className="secondary-btn"><Download size={16} /> Export report</button>} /><div className="demo-note"><ShieldCheck size={18} /><span><b>Demonstration dataset</b> These figures are seeded for the IIT Roorkee pilot and are not observed campus impact.</span></div><div className="stat-grid"><StatCard label="Resolution rate" value="84.3%" change="+7.2%" note="this month" icon={<Check size={17} />} tone="green" /><StatCard label="Median resolution" value="2.4h" change="-18%" note="this month" icon={<Clock3 size={17} />} tone="blue" /><StatCard label="Route distance saved" value="18%" change="+4.1%" note="vs baseline" icon={<Route size={17} />} tone="orange" /><StatCard label="Waste recovered" value="142 kg" change="+31%" note="this month" icon={<Leaf size={17} />} tone="purple" /></div><div className="impact-grid"><div className="card impact-card"><div className="card-heading"><div><h2>Resolved reports</h2><p>Last 30 days</p></div><span className="trend-badge"><TrendingUp size={14} /> 12.8%</span></div><div className="impact-big">312 <small>reports</small></div><div className="bar-chart">{[43, 55, 49, 61, 58, 75, 68, 82, 77, 90, 84, 96].map((height, i) => <i key={i} style={{ height: `${height}%` }} />)}</div></div><div className="card impact-card"><div className="card-heading"><div><h2>Waste recovered</h2><p>By material type · this month</p></div><MoreHorizontal size={17} /></div><div className="material-row"><span><i className="material green" />Organic</span><b>68 kg</b></div><div className="material-row"><span><i className="material blue" />Recyclable</span><b>51 kg</b></div><div className="material-row"><span><i className="material orange" />E-waste</span><b>23 kg</b></div><div className="material-total"><span>Total recorded</span><b>142 kg</b></div></div></div></div>; }
function Placeholder({ title }) { return <div className="page"><PageHeading eyebrow="Workspace" title={title} description="This workspace is ready for your campus team." /><div className="card empty-state"><div className="empty-icon"><Leaf size={25} /></div><h2>Coming next</h2><p>Team and location management will connect here as the pilot moves from demo data to live operations.</p></div></div>; }

function ReportModal({ onClose, onSubmit }) { const [location, setLocation] = useState(locations[0]); const [category, setCategory] = useState('Overflowing bin'); const [severity, setSeverity] = useState('High'); const [description, setDescription] = useState(''); return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={e => e.stopPropagation()}><div className="modal-heading"><div><div className="eyebrow">Resident report</div><h2>What needs attention?</h2><p>Tell us what you noticed. EcoSathi will route it to the right team.</p></div><button className="icon-button" onClick={onClose}><X size={18} /></button></div><button className="voice-box"><div className="voice-icon"><Mic size={19} /></div><div><b>Tap to describe by voice</b><span>Speak naturally in English or Hindi</span></div><ArrowUpRight size={17} /></button><div className="or-divider"><span>or fill in the details</span></div><label>LOCATION<select value={location} onChange={e => setLocation(e.target.value)}>{locations.map(item => <option key={item}>{item}</option>)}</select></label><div className="form-grid"><label>ISSUE TYPE<select value={category} onChange={e => setCategory(e.target.value)}>{['Overflowing bin','Scattered waste','Missed pickup','Disposal question'].map(item => <option key={item}>{item}</option>)}</select></label><label>SEVERITY<select value={severity} onChange={e => setSeverity(e.target.value)}>{['Low','Medium','High','Urgent'].map(item => <option key={item}>{item}</option>)}</select></label></div><label>DESCRIPTION<textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Add a few details so the collection team knows what to expect..." /></label><div className="modal-footer"><span><ShieldCheck size={15} /> Your report is only shared with campus operations.</span><button className="primary-btn" onClick={() => onSubmit({ title: description || `${category} reported at ${location}`, location, category, priority: severity })}>Submit report <ArrowUpRight size={16} /></button></div></div></div>; }

createRoot(document.getElementById('root')).render(<App />);
