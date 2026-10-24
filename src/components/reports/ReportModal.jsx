import { useEffect, useState } from 'react';
import { ArrowUpRight, Mic, ShieldCheck, X } from 'lucide-react';
import { CATEGORIES, PRIORITIES } from '@/data/reports';

export function ReportModal({ locations, onClose, onSubmit }) {
  const [locationId, setLocationId] = useState(locations[0]?.id ?? '');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [severity, setSeverity] = useState('High');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!locationId && locations[0]?.id != null) {
      setLocationId(locations[0].id);
    }
  }, [locationId, locations]);

  function handleSubmit() {
    const selectedLocation = locations.find((location) => String(location.id) === String(locationId));
    if (!selectedLocation) return;
    onSubmit({
      title: description || `${category} reported at ${selectedLocation.name}`,
      location: selectedLocation.name,
      location_id: selectedLocation.id,
      category,
      priority: severity,
      description: description || null,
    });
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div>
            <div className="eyebrow">Resident report</div>
            <h2>What needs attention?</h2>
            <p>Tell us what you noticed. EcoSathi will route it to the right team.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close report form">
            <X size={18} />
          </button>
        </div>

        <button type="button" className="voice-box">
          <div className="voice-icon">
            <Mic size={19} />
          </div>
          <div>
            <b>Tap to describe by voice</b>
            <span>Speak naturally in English or Hindi</span>
          </div>
          <ArrowUpRight size={17} />
        </button>

        <div className="or-divider">
          <span>or fill in the details</span>
        </div>

        <label>
          LOCATION
          <select value={locationId} onChange={(event) => setLocationId(event.target.value)} disabled={!locations.length}>
            {locations.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>

        <div className="form-grid">
          <label>
            ISSUE TYPE
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {CATEGORIES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            SEVERITY
            <select value={severity} onChange={(event) => setSeverity(event.target.value)}>
              {PRIORITIES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>

        <label>
          DESCRIPTION
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Add a few details so the collection team knows what to expect..."
          />
        </label>

        <div className="modal-footer">
          <span>
            <ShieldCheck size={15} /> Your report is only shared with campus operations.
          </span>
          <button type="button" className="primary-btn" onClick={handleSubmit}>
            Submit report <ArrowUpRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
