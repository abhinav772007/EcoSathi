import { MAP_MARKERS } from '@/data/campus';

function MapMarker({ x, y, n, urgent }) {
  return (
    <div className={`map-marker ${urgent ? 'urgent' : ''}`} style={{ left: x, top: y }}>
      <span>{n}</span>
    </div>
  );
}

export function CampusMap({ plan }) {
  const stopCount = plan?.collection_stops?.length || 0;
  const markers = stopCount
    ? MAP_MARKERS.slice(0, Math.min(stopCount, MAP_MARKERS.length)).map((marker, index) => ({
      ...marker,
      n: String(index + 1),
      urgent: index === 0,
    }))
    : MAP_MARKERS;

  return (
    <section className="card map-card">
      <div className="map-top">
        <div>
          <h2>North campus · Live plan</h2>
          <p>
            {plan
              ? `Prioritized route · ${stopCount} stops`
              : 'Generate a route to activate the live plan'}
          </p>
        </div>
        <span className={`status-pill ${plan ? 'ready' : 'needs-review'}`}>
          <i /> {plan ? 'Route active' : 'Waiting'}
        </span>
      </div>
      <div className="campus-map">
        <div className="map-grid" />
        <div className="map-road r1" />
        <div className="map-road r2" />
        <div className="map-road r3" />
        <div className="route-line" />
        {markers.map((marker) => (
          <MapMarker key={marker.n} {...marker} />
        ))}
        <div className="map-label label-a">HOSTEL ZONE</div>
        <div className="map-label label-b">NORTH CAMPUS</div>
      </div>
      <div className="map-footer">
        <span>
          <i className="legend-dot green-dot" /> Completed
        </span>
        <span>
          <i className="legend-dot orange-dot" /> Next stop
        </span>
        <span>
          <i className="legend-dot gray-dot" /> Upcoming
        </span>
        <b>
          {plan ? `${plan.total_distance} km` : '—'} <small>total distance</small>
        </b>
      </div>
    </section>
  );
}
