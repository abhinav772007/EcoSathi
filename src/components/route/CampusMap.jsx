import { MAP_MARKERS } from '@/data/campus';

function MapMarker({ x, y, n, urgent }) {
  return (
    <div className={`map-marker ${urgent ? 'urgent' : ''}`} style={{ left: x, top: y }}>
      <span>{n}</span>
    </div>
  );
}

export function CampusMap() {
  return (
    <section className="card map-card">
      <div className="map-top">
        <div>
          <h2>North campus · Live plan</h2>
          <p>Nearest-neighbour optimization · Updated 8 min ago</p>
        </div>
        <span className="status-pill ready">
          <i /> Route active
        </span>
      </div>
      <div className="campus-map">
        <div className="map-grid" />
        <div className="map-road r1" />
        <div className="map-road r2" />
        <div className="map-road r3" />
        <div className="route-line" />
        {MAP_MARKERS.map((marker) => (
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
          4.8 km <small>total distance</small>
        </b>
      </div>
    </section>
  );
}
