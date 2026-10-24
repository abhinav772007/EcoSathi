import { MapPin } from 'lucide-react';
import { CAMPUS_LOCATIONS } from '@/data/campus';
import { PageHeading } from '@/components/ui/PageHeading';
import { statusClassName } from '@/data/reports';

export function LocationsPage() {
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
              {CAMPUS_LOCATIONS.map((location) => (
                <tr key={location.name}>
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
