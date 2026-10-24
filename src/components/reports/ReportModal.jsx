import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, Loader2, Mic, MicOff, ShieldCheck, Sparkles, Volume2, X } from 'lucide-react';
import { CATEGORIES, PRIORITIES } from '@/data/reports';
import { apiBlob, apiRequest } from '@/lib/api';
import { useSpeechRecognition } from '@/lib/useSpeechRecognition';

// Client-side fallback keyword interpreter if backend API is offline
function interpretLocally(text, locations = []) {
  const lower = text.toLowerCase();

  // Category matching
  let category = CATEGORIES[0];
  if (lower.includes('overflow') || lower.includes('spill') || lower.includes('full bin') || lower.includes('dustbin')) {
    category = 'Overflowing bin';
  } else if (lower.includes('scatter') || lower.includes('litter') || lower.includes('dump') || lower.includes('plastic on')) {
    category = 'Scattered waste';
  } else if (lower.includes('missed') || lower.includes('not collected') || lower.includes('pick up') || lower.includes('pickup')) {
    category = 'Missed pickup';
  } else if (lower.includes('where') || lower.includes('dispose') || lower.includes('recycle') || lower.includes('e-waste') || lower.includes('battery')) {
    category = 'Disposal question';
  }

  // Priority matching
  let priority = 'Medium';
  if (lower.includes('urgent') || lower.includes('hazard') || lower.includes('emergency') || lower.includes('overflowing') || lower.includes('smell')) {
    priority = 'Urgent';
  } else if (lower.includes('high') || lower.includes('large') || lower.includes('scattered') || lower.includes('broken')) {
    priority = 'High';
  } else if (lower.includes('question') || lower.includes('where') || lower.includes('how to')) {
    priority = 'Low';
  }

  // Location matching
  let matchedLocation = null;
  for (const loc of locations) {
    const locNameLower = loc.name.toLowerCase();
    const parts = locNameLower.split(/[\s·,-]+/).filter((p) => p.length > 2);
    if (parts.some((part) => lower.includes(part))) {
      matchedLocation = loc;
      break;
    }
  }

  return {
    title: `${category} reported via voice`,
    category,
    priority,
    location_id: matchedLocation ? matchedLocation.id : locations[0]?.id || 1,
    location_name: matchedLocation ? matchedLocation.name : locations[0]?.name || 'R. K. Hall · North gate',
    description: text,
    confirmation: matchedLocation
      ? `Captured "${category}" at ${matchedLocation.name} with ${priority} priority.`
      : `Captured "${category}". Please verify the campus location below.`,
  };
}

export function ReportModal({ locations = [], onClose, onSubmit }) {
  const [locationId, setLocationId] = useState(() => locations[0]?.id ?? 1);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [severity, setSeverity] = useState('High');
  const [description, setDescription] = useState('');
  const [title, setTitle] = useState('');
  const [voiceDraft, setVoiceDraft] = useState(null);
  const [voiceUsed, setVoiceUsed] = useState(false);
  const [interpreting, setInterpreting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const audioUrlRef = useRef(null);

  const speech = useSpeechRecognition({
    onFinal: (text) => interpretTranscript(text),
  });

  useEffect(() => {
    if (!locationId && locations[0]?.id != null) {
      setLocationId(locations[0].id);
    }
  }, [locationId, locations]);

  useEffect(
    () => () => {
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    },
    []
  );

  async function interpretTranscript(text) {
    if (!text) return;
    setVoiceUsed(true);
    setInterpreting(true);

    try {
      const draft = await apiRequest('/api/voice/interpret', {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      setVoiceDraft(draft);
      setDescription(draft.description || text);
      setTitle(draft.title || '');
      setCategory(draft.category || CATEGORIES[0]);
      setSeverity(draft.priority || 'Medium');
      if (draft.location_id) setLocationId(draft.location_id);
    } catch {
      // Fallback: local keyword parsing
      const localDraft = interpretLocally(text, locations);
      setVoiceDraft(localDraft);
      setDescription(localDraft.description);
      setTitle(localDraft.title);
      setCategory(localDraft.category);
      setSeverity(localDraft.priority);
      if (localDraft.location_id) setLocationId(localDraft.location_id);
    } finally {
      setInterpreting(false);
    }
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    const selectedLocation =
      locations.find((l) => String(l.id) === String(locationId)) ||
      locations[0] || { id: 1, name: 'Campus collection point' };

    setSubmitting(true);
    const payload = {
      title: title || description || `${category} reported at ${selectedLocation.name}`,
      location: selectedLocation.name,
      location_id: selectedLocation.id,
      category,
      priority: severity,
      description: description || null,
      source: voiceUsed ? 'voice' : 'text',
    };

    const report = await onSubmit(payload);
    setSubmitting(false);

    if (report) {
      setCreated(report);
      setTimeout(() => speakConfirmation(report), 250);
    }
  }

  async function speakConfirmation(report) {
    const text = `Report ${report.id || report.code} was created with status ${
      report.status
    } at ${report.location}. Collection team has been notified.`;

    setSpeaking(true);
    try {
      const blob = await apiBlob('/api/voice/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = URL.createObjectURL(blob);
      const audio = new Audio(audioUrlRef.current);
      audio.onended = () => setSpeaking(false);
      audio.onerror = () => speakWithBrowser(text);
      await audio.play();
    } catch {
      speakWithBrowser(text);
    }
  }

  function speakWithBrowser(text) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setSpeaking(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal report-modal"
        onMouseDown={(e) => e.stopPropagation()}
        style={{ width: 'min(100%, 540px)' }}
      >
        <div className="modal-heading">
          <div>
            <div className="eyebrow">Voice-first campus operations</div>
            <h2>Report a waste issue</h2>
            <p>Speak naturally or fill the details below to notify campus collection teams.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close modal">
            <X size={16} />
          </button>
        </div>

        {created ? (
          <div className="created-banner" style={{ marginTop: '16px' }}>
            <div className="created-icon">
              <Check size={20} />
            </div>
            <div className="created-content">
              <b>{created.id || created.code} created successfully</b>
              <span>
                Status: <strong>{created.status}</strong> · {created.location}
              </span>
              <p>
                {speaking ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <Volume2 size={13} className="spin" /> Reading spoken confirmation...
                  </span>
                ) : (
                  'Voice confirmation delivered. Task is now routed to the collection queue.'
                )}
              </p>
            </div>
            <button type="button" className="primary-btn" onClick={onClose} style={{ marginTop: '12px' }}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Voice Capture Bar */}
            <div className="voice-input-card">
              <div className="voice-card-top">
                <button
                  type="button"
                  className={`voice-mic-btn ${speech.listening ? 'listening' : ''}`}
                  onClick={speech.listening ? speech.stop : speech.start}
                  title={speech.listening ? 'Stop recording' : 'Click to speak your report'}
                >
                  {speech.listening ? <MicOff size={18} /> : <Mic size={18} />}
                  <span>{speech.listening ? 'Listening... click to process' : 'Tap to speak issue'}</span>
                </button>
                {speech.listening && <span className="listening-pulse" />}
              </div>

              {speech.transcript && (
                <div className="transcript-box">
                  <small>LIVE TRANSCRIPT:</small>
                  <p>"{speech.transcript}"</p>
                </div>
              )}

              {interpreting && (
                <div className="interpreting-indicator">
                  <Loader2 size={13} className="spin" /> Structuring report with NLP...
                </div>
              )}

              {voiceDraft?.confirmation && !interpreting && (
                <div className="draft-confirmation">
                  <Sparkles size={13} />
                  <span>{voiceDraft.confirmation}</span>
                </div>
              )}
            </div>

            {/* Standard Form Inputs */}
            <div className="form-fields-grid">
              <label className="field-label">
                CONFIGURED LOCATION
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(Number(e.target.value))}
                  className="role-select"
                  required
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.zone ? `(${loc.zone})` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field-label">
                ISSUE CATEGORY
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="role-select"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field-label">
                SEVERITY / PRIORITY
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="role-select"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field-label" style={{ gridColumn: '1 / -1' }}>
                BRIEF TITLE (OPTIONAL)
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Overflowing mess bin at R. K. Hall North gate"
                />
              </label>

              <label className="field-label" style={{ gridColumn: '1 / -1' }}>
                DESCRIPTION / NOTES
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue, size of spill, or specific directions..."
                />
              </label>
            </div>

            <div className="modal-footer" style={{ marginTop: '10px' }}>
              <button type="button" className="secondary-btn" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="primary-btn" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 size={15} className="spin" /> Submitting...
                  </>
                ) : (
                  <>
                    Submit report <ArrowUpRight size={15} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
