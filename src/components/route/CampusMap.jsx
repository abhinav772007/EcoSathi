import { MapPin } from 'lucide-react';

function projectPoints(points) {
  if (!points.length) return [];
  const lats = points.map((point) => point.latitude);
  const lngs = points.map((point) => point.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const scale = (value, min, max) => (max - min < 1e-9 ? 0.5 : (value - min) / (max - min));
  return points.map((point) => ({
    ...point,
    x: 12 + scale(point.longitude, minLng, maxLng) * 76,
    y: 88 - scale(point.latitude, minLat, maxLat) * 76,
  }));
}

export function CampusMap({ plan }) {
  const stops = [...(plan?.collection_stops || [])].sort((a, b) => a.sequence - b.sequence);
  const depot = plan?.depot;
  const hasCoordinates = Boolean(
    depot?.latitude != null && depot?.longitude != null
    && stops.every((stop) => stop.latitude != null && stop.longitude != null),
  );
  const projected = hasCoordinates
    ? projectPoints([
      { kind: 'depot', latitude: depot.latitude, longitude: depot.longitude, label: 'D' },
      ...stops.map((stop) => ({
        kind: 'stop',
        latitude: stop.latitude,
        longitude: stop.longitude,
        label: String(stop.sequence),
        state: stop.worker_status,
        priority: stop.priority,
        location: stop.location_name,
      })),
    ])
    : [];
  const polyline = projected.map((point) => `${point.x},${point.y}`).join(' ');
  const completed = stops.filter((stop) => stop.worker_status === 'completed').length;

  return (
    <section className="card map-card">
      <div className="map-top">
        <div>
          <h2>Configured campus stops</h2>
          <p>
            {plan
              ? `${stops.length} stops · ${completed} completed · straight-line estimate`
              : 'Generate a route to activate the live plan'}
          </p>
        </div>
        <span className={`status-pill ${plan ? 'ready' : 'needs-review'}`}>
          <i /> {plan ? plan.status : 'Waiting'}
        </span>
      </div>
      <div className="campus-map">
        <div className="map-grid" />
        <div className="map-road r1" />
        <div className="map-road r2" />
        <div className="map-road r3" />
        {projected.length > 1 && (
          <svg className="route-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polyline points={polyline} />
          </svg>
        )}
        {projected.map((point) => (
          <div
            key={`${point.kind}-${point.label}`}
            className={[
              'map-marker',
              point.kind === 'depot' ? 'depot' : '',
              point.state === 'completed' ? 'done' : point.state === 'in_progress' ? 'urgent' : '',
            ].join(' ')}
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
            title={point.location || 'Collection depot'}
          >
            <span>{point.kind === 'depot' ? <MapPin size={12} /> : point.label}</span>
          </div>
        ))}
        {!projected.length && (
          <div className="map-empty">
            <MapPin size={18} />
            <span>{plan ? 'Stops need configured coordinates.' : 'No plan generated yet.'}</span>
          </div>
        )}
        <div className="map-label label-a">HOSTEL ZONE</div>
        <div className="map-label label-b">NORTH CAMPUS</div>
      </div>
      <div className="map-footer">
        <span><i className="legend-dot green-dot" /> Completed</span>
        <span><i className="legend-dot orange-dot" /> Next / active</span>
        <span><i className="legend-dot gray-dot" /> Upcoming</span>
        <b>
          {plan ? `${plan.total_distance} km` : '—'} <small>total distance</small>
        </b>
      </div>
    </section>
  );
}
