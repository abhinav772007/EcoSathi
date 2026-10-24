export function StatCard({ label, value, change, note, icon, tone }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <div className="stat-label">
        {label}
        <span className="stat-trend">
          {change} <small>{note}</small>
        </span>
      </div>
      <strong>{value}</strong>
    </div>
  );
}
