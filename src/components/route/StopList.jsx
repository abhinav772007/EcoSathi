import { Check, Loader2, Play, SkipForward, Weight } from 'lucide-react';

export function StopList({ plan, onUpdate, busyStop }) {
  const stops = [...(plan?.collection_stops || [])].sort((a, b) => a.sequence - b.sequence);
  const nextIndex = stops.findIndex((stop) => stop.worker_status === 'pending' || stop.worker_status === 'in_progress');

  function complete(stop) {
    const raw = window.prompt(
      `Weight collected at ${stop.location_name || 'this stop'} in kg (leave blank if not measured):`,
      '',
    );
    if (raw === null) return;
    const trimmed = raw.trim();
    const weight = trimmed === '' ? null : Number(trimmed);
    if (trimmed !== '' && (!Number.isFinite(weight) || weight < 0)) {
      window.alert('Enter a valid non-negative weight in kilograms.');
      return;
    }
    onUpdate?.(stop, { worker_status: 'completed', weight_kg: weight });
  }

  return (
    <section className="card stop-card">
      <div className="card-heading">
        <div>
          <h2>Stop list</h2>
          <p>{stops.length ? `${stops.length} stops in plan` : 'Generate a route to see stops'}</p>
        </div>
        <span className="status-pill clear">{plan?.algorithm_version || 'waiting'}</span>
      </div>
      {!stops.length && (
        <div className="empty-state" style={{ padding: '18px 8px' }}>
          <p>No collection stops yet. Click Regenerate route after reports are Verified.</p>
        </div>
      )}
      {stops.map((stop, index) => {
        const state = stop.worker_status || 'pending';
        const numberClass = state === 'completed' ? 'done' : index === nextIndex ? 'current' : '';
        return (
          <div className={`stop-row ${index === nextIndex ? 'next' : ''}`} key={stop.id || stop.sequence}>
            <div className={`stop-number ${numberClass}`}>
              {state === 'completed' ? <Check size={14} /> : index + 1}
            </div>
            <div className="stop-main">
              <b>{stop.location_name || `Stop ${stop.sequence}`}</b>
              <span>
                {stop.report_code ? `${stop.report_code} · ` : ''}
                {stop.priority} · {stop.category || stop.title}
              </span>
              <small>
                {state.replaceAll('_', ' ')}
                {stop.weight_kg != null ? ` · ${stop.weight_kg} kg logged` : ''}
              </small>
            </div>
            <div className="stop-actions">
              {busyStop === String(stop.id) ? (
                <Loader2 size={15} className="spin" />
              ) : (
                <>
                  {state === 'pending' && (
                    <button
                      type="button"
                      className="small-btn"
                      title="Start this stop"
                      onClick={() => onUpdate?.(stop, { worker_status: 'in_progress' })}
                    >
                      <Play size={13} /> Start
                    </button>
                  )}
                  {state === 'in_progress' && (
                    <button type="button" className="small-btn success" onClick={() => complete(stop)}>
                      <Check size={13} /> Complete
                    </button>
                  )}
                  {(state === 'pending' || state === 'in_progress') && (
                    <button
                      type="button"
                      className="small-btn danger"
                      title="Skip this stop"
                      onClick={() => onUpdate?.(stop, { worker_status: 'skipped', note: 'Skipped by worker' })}
                    >
                      <SkipForward size={13} />
                    </button>
                  )}
                  {state === 'completed' && stop.weight_kg == null && (
                    <span className="weight-hint"><Weight size={12} /> no weight</span>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
