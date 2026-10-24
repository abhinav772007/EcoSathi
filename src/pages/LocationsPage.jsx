import { useState } from 'react';
import { Loader2, MapPin, Plus, X } from 'lucide-react';
import { PageHeading } from '@/components/ui/PageHeading';
import { useAuth } from '@/context/AuthContext';
import { useReports } from '@/context/ReportsContext';
import { statusClassName } from '@/data/reports';
import { apiRequest } from '@/lib/api';

function zoneLabel(locationType) {
  if (locationType === 'hostel') return 'Hostel zone';
  if (locationType === 'academic') return 'Academic';
  if (locationType === 'campus') return 'Campus';
  return 'Collection point';
}

function locationStatus(openReports) {
  if (openReports >= 2) return 'Needs attention';
  if (openReports === 1) return 'Needs review';
  return 'Clear';
}

function AddLocationModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState('29.8645');
  const [longitude, setLongitude] = useState('77.8960');
  const [locationType, setLocationType] = useState('collection_point');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const created = await apiRequest('/api/locations', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          latitude: Number(latitude),
          longitude: Number(longitude),
          location_type: locationType,
        }),
      });
      onCreated(created);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div>
            <div className="eyebrow">Administrator</div>
            <h2>Add a configured location</h2>
            <p>Reports can only be filed against known campus coordinates.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close location form">
            <X size={18} />
          </button>
        </div>
        <label>NAME<input value={name} onChange={(event) => setName(event.target.value)} required /></label>
        <div className="form-grid">
          <label>LATITUDE<input value={latitude} onChange={(event) => setLatitude(event.target.value)} type="number" step="0.000001" required /></label>
          <label>LONGITUDE<input value={longitude} onChange={(event) => setLongitude(event.target.value)} type="number" step="0.000001" required /></label>
        </div>
        <label>
          TYPE
          <select value={locationType} onChange={(event) => setLocationType(event.target.value)}>
            <option value="collection_point">Collection point</option>
            <option value="hostel">Hostel</option>
            <option value="academic">Academic</option>
            <option value="campus">Campus</option>
          </select>
        </label>
        {error && <p className="inline-error">{error}</p>}
        <div className="modal-footer">
          <span>Coordinates are approximate campus demonstration data.</span>
          <button type="submit" className="primary-btn" disabled={saving}>
            {saving && <Loader2 size={15} className="spin" />} Add location
          </button>
        </div>
      </form>
    </div>
  );
}

export function LocationsPage() {
  const { role } = useAuth();
  const { locations, reports, loading, refreshLocations, notify } = useReports();
  const [showAdd, setShowAdd] = useState(false);

  const rows = locations.map((location) => {
    const openReports = reports.filter(
      (report) =>
        report.status !== 'Resolved' &&
        report.status !== 'Rejected' &&
        (report.location_id === location.id || report.location === location.name),
    ).length;
    return {
      id: location.id,
      name: location.name,
      zone: zoneLabel(location.location_type),
      bins: location.bins ?? 0,
      capacity: location.capacity ?? 0,
      wasteTypes: location.waste_types || [],
      openReports,
      status: locationStatus(openReports),
    };
  });

  async function handleCreated(created) {
    setShowAdd(false);
    await refreshLocations();
    notify('Location added', `${created.name} is now available for reports.`, 3000);
  }

  return (
    <div className="page">
      <PageHeading
        eyebrow="Configured collection points"
        title="Locations"
        description="Reports can only be filed against these campus locations until live operations expand the list."
        action={
          role === 'administrator' ? (
            <button type="button" className="primary-btn" onClick={() => setShowAdd(true)}>
              <Plus size={17} /> Add location
            </button>
          ) : null
        }
      />
      <section className="card reports-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>LOCATION</th>
                <th>ZONE</th>
                <th>BINS</th>
                <th>CAPACITY</th>
                <th>OPEN REPORTS</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6}>Loading locations…</td>
                </tr>
              )}
              {!loading && !rows.length && (
                <tr>
                  <td colSpan={6}>No locations found. Run the Supabase schema and seed first.</td>
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
                  <td>
                    {location.bins}
                    {location.wasteTypes.length > 0 && (
                      <small className="table-sub">{location.wasteTypes.join(' · ')}</small>
                    )}
                  </td>
                  <td>{location.capacity || '—'}</td>
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
      {showAdd && <AddLocationModal onClose={() => setShowAdd(false)} onCreated={handleCreated} />}
    </div>
  );
}
