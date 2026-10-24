import { MapPin } from 'lucide-react';
import { PageHeading } from '@/components/ui/PageHeading';
import { useReports } from '@/context/ReportsContext';
import { statusClassName } from '@/data/reports';

function zoneLabel(locationType) {
  if (locationType === 'hostel') return 'Hostel zone';
  if (locationType === 'academic') return 'Academic';
  return 'Campus';
}

function locationStatus(openReports) {
  if (openReports >= 2) return 'Needs attention';
  if (openReports === 1) return 'Needs review';
  return 'Clear';
}

export function LocationsPage() {
  const { locations, reports, loading } = useReports();

  const rows = locations.map((location) => {
    const openReports = reports.filter(
      (report) =>
        report.status !== 'Resolved' &&
        (report.location_id === location.id || report.location === location.name),
    ).length;
    return {
      id: location.id,
      name: location.name,
      zone: zoneLabel(location.location_type),
      bins: '—',
      openReports,
      status: locationStatus(openReports),
    };
  });

  return (
    <div className="page">
      <PageHeading
        eyebrow="Configured collection points"
        title="Locations"
        description="Reports can only be filed against these campus locations until live operations expand the list."
      />
      <section className="card reports-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>LOCATION</th>
                <th>ZONE</th>
                <th>BINS</th>
                <th>OPEN REPORTS</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5}>Loading locations…</td>
                </tr>
              )}
              {!loading && !rows.length && (
                <tr>
                  <td colSpan={5}>No locations found. Run the Supabase schema seed insert first.</td>
                </tr>
              )}
              {rows.map((location) => (
                <tr key={location.id}>
                  <td>
                    <span className="location-cell">
                      <MapPin size={14} />
                      {location.name}
                    </span>
                  </td>
                  <td>{location.zone}</td>
                  <td>{location.bins}</td>
                  <td>{location.openReports}</td>
                  <td>
                    <span className={`status-pill ${statusClassName(location.status)}`}>{location.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
