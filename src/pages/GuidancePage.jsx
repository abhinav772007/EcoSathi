import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BatteryCharging,
  Check,
  HelpCircle,
  Leaf,
  MapPin,
  Plus,
  Recycle,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { DISPOSAL_GUIDELINES } from '@/data/campus';
import { PageHeading } from '@/components/ui/PageHeading';
import { useReports } from '@/context/ReportsContext';

export function GuidancePage() {
  const { setShowReportModal } = useReports();
  const [selectedStream, setSelectedStream] = useState('all');
  const [query, setQuery] = useState('');

  const filteredGuidelines = useMemo(() => {
    let list = DISPOSAL_GUIDELINES;
    if (selectedStream !== 'all') {
      list = list.filter((item) => item.id === selectedStream);
    }
    const needle = query.trim().toLowerCase();
    if (!needle) return list;

    return list.filter((item) => {
      const matchName = item.stream.toLowerCase().includes(needle);
      const matchDesc = item.description.toLowerCase().includes(needle);
      const matchAccepted = item.accepted.some((a) => a.toLowerCase().includes(needle));
      const matchForbidden = item.forbidden.some((f) => f.toLowerCase().includes(needle));
      const matchLocs = item.locations.some((l) => l.toLowerCase().includes(needle));
      return matchName || matchDesc || matchAccepted || matchForbidden || matchLocs;
    });
  }, [query, selectedStream]);

  return (
    <div className="page">
      <PageHeading
        eyebrow="Campus guidelines"
        title="Disposal & Segregation Guide"
        description="Learn how to segregate waste streams properly across IIT Roorkee campus bins and drop-off points."
        action={
          <button
            type="button"
            className="primary-btn"
            onClick={() => setShowReportModal(true)}
          >
            <Plus size={17} /> Report an issue
          </button>
        }
      />

      <div className="guidance-banner">
        <div className="guidance-banner-icon">
          <Sparkles size={20} />
        </div>
        <div>
          <b>Source segregation prevents 85% of campus landfill waste</b>
          <span>
            Always dispose of items in the designated color-coded bins. If a bin is full or damaged, use voice or text to submit a quick report.
          </span>
        </div>
      </div>

      <div className="toolbar" style={{ marginTop: '20px' }}>
        <div className="search-field">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search waste item (e.g., batteries, pizza box, tea cup, gloves)..."
          />
        </div>

        <div className="stream-tabs">
          <button
            type="button"
            className={`tab-btn ${selectedStream === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedStream('all')}
          >
            All Streams
          </button>
          <button
            type="button"
            className={`tab-btn ${selectedStream === 'organic' ? 'active' : ''}`}
            onClick={() => setSelectedStream('organic')}
          >
            🍏 Organic
          </button>
          <button
            type="button"
            className={`tab-btn ${selectedStream === 'recyclable' ? 'active' : ''}`}
            onClick={() => setSelectedStream('recyclable')}
          >
            ♻️ Recyclables
          </button>
          <button
            type="button"
            className={`tab-btn ${selectedStream === 'ewaste' ? 'active' : ''}`}
            onClick={() => setSelectedStream('ewaste')}
          >
            🔋 E-Waste
          </button>
          <button
            type="button"
            className={`tab-btn ${selectedStream === 'hazardous' ? 'active' : ''}`}
            onClick={() => setSelectedStream('hazardous')}
          >
            ⚠️ Hazardous
          </button>
        </div>
      </div>

      <div className="guidance-grid">
        {filteredGuidelines.map((guide) => (
          <section className={`card guidance-card ${guide.color}`} key={guide.id}>
            <div className="guidance-card-header">
              <div>
                <span className={`stream-pill ${guide.color}`}>{guide.binType}</span>
                <h2>{guide.stream}</h2>
              </div>
              <span className="badge-pill">{guide.badge}</span>
            </div>

            <p className="guidance-desc">{guide.description}</p>

            <div className="guidance-lists-grid">
              <div className="guidance-col accepted">
                <div className="list-title">
                  <Check size={14} /> <b>ACCEPTED ITEMS</b>
                </div>
                <ul>
                  {guide.accepted.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="guidance-col forbidden">
                <div className="list-title">
                  <X size={14} /> <b>FORBIDDEN (KEEP OUT)</b>
                </div>
                <ul>
                  {guide.forbidden.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="guidance-footer">
              <div className="guidance-locations">
                <MapPin size={13} />
                <span>
                  <b>Campus drop-offs:</b> {guide.locations.join(' · ')}
                </span>
              </div>
              <div className="guidance-tip">
                <Leaf size={13} />
                <small>{guide.bestPractice}</small>
              </div>
            </div>
          </section>
        ))}

        {!filteredGuidelines.length && (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <h2>No waste items matched your search</h2>
            <p>Try searching for terms like plastic, food, battery, chemical, or paper.</p>
          </div>
        )}
      </div>
    </div>
  );
}
