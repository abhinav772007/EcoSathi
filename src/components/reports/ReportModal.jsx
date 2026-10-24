import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, Loader2, Mic, MicOff, ShieldCheck, Volume2, X } from 'lucide-react';
import { CATEGORIES, PRIORITIES } from '@/data/reports';
import { apiBlob, apiRequest } from '@/lib/api';
import { useSpeechRecognition } from '@/lib/useSpeechRecognition';

export function ReportModal({ locations, onClose, onSubmit }) {
  const [locationId, setLocationId] = useState(locations[0]?.id ?? '');
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

  useEffect(() => () => {
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    window.speechSynthesis?.cancel();
  }, []);

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
      if (draft.missing_fields?.includes('location')) {
        setVoiceDraft((current) => ({
          ...current,
          confirmation: 'I could not match a configured location. Pick one below before submitting.',
        }));
      }
    } catch {
      setVoiceDraft({
        confidence: null,
        confirmation: 'Voice was captured, but the draft could not be structured. Review the text below.',
      });
    } finally {
      setInterpreting(false);
    }
  }

  async function handleSubmit() {
    const selectedLocation = locations.find((location) => String(location.id) === String(locationId));
    if (!selectedLocation) return;
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
      window.setTimeout(() => speakConfirmation(report), 250);
    }
  }

  async function speakConfirmation(report) {
    const text = `Report ${report.id} was created with status ${report.status} at ${report.location}. Collection has not started yet.`;
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
      await audio.play();
    } catch {
      if (window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => setSpeaking(false);
        window.speechSynthesis.speak(utterance);
      } else {
        setSpeaking(false);
      }
    }
  }

  function handleClose() {
    speech.stop();
    window.speechSynthesis?.cancel();
    onClose();
  }

  return (
    <div className="modal-backdrop" onMouseDown={handleClose}>
      <div className="modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div>
            <div className="eyebrow">{created ? 'Report confirmed' : 'Resident report'}</div>
            <h2>{created ? 'EcoSathi created your report' : 'What needs attention?'}</h2>
            <p>
              {created
                ? 'The backend returned this real report ID. Collection status will update separately.'
                : 'Speak or type the issue. Nothing is submitted until you confirm the details.'}
            </p>
          </div>
          <button type="button" className="icon-button" onClick={handleClose} aria-label="Close report form">
            <X size={18} />
          </button>
        </div>

        {created ? (
          <div className="report-confirmation">
            <div className="confirmation-badge"><Check size={22} /></div>
            <div className="confirmation-id">{created.id}</div>
            <p>
              <b>{created.status}</b> · {created.category} at {created.location}
            </p>
            <div className="confirmation-note">
              <ShieldCheck size={16} />
              A report ID is not proof of collection. The operations team still needs to verify and resolve it.
            </div>
            <div className="confirmation-actions">
              <button type="button" className="secondary-btn" onClick={() => speakConfirmation(created)} disabled={speaking}>
                {speaking ? <Loader2 size={15} className="spin" /> : <Volume2 size={15} />}
                {speaking ? 'Speaking...' : 'Hear confirmation'}
              </button>
              <button type="button" className="primary-btn" onClick={handleClose}>
                Done <ArrowUpRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          <>
            <button
              type="button"
              className={`voice-box ${speech.listening ? 'listening' : ''}`}
              onClick={speech.listening ? speech.stop : speech.start}
            >
              <div className="voice-icon">
                {speech.listening ? <MicOff size={19} /> : <Mic size={19} />}
              </div>
              <div>
                <b>{speech.listening ? 'Listening... tap to stop' : 'Tap to describe by voice'}</b>
                <span>
                  Browser speech fallback, in English or Hindi. The ElevenLabs agent uses the same backend tools.
                </span>
              </div>
              {speech.listening ? <span className="voice-pulse" /> : <ArrowUpRight size={17} />}
            </button>

            {(speech.error || voiceDraft) && (
              <div className={`voice-review ${speech.error ? 'voice-error' : ''}`}>
                {interpreting ? (
                  <span><Loader2 size={14} className="spin" /> Structuring your words...</span>
                ) : (
                  <>
                    {speech.error && <span>{speech.error}</span>}
                    {voiceDraft && (
                      <>
                        <b>
                          Draft confidence {Math.round((voiceDraft.confidence || 0) * 100)}%
                        </b>
                        <span>{voiceDraft.confirmation || 'Review the fields below and correct anything that is wrong.'}</span>
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="or-divider">
              <span>{voiceUsed ? 'review and correct the details' : 'or fill in the details'}</span>
            </div>

            <label>
              LOCATION
              <select value={locationId} onChange={(event) => setLocationId(event.target.value)} disabled={!locations.length}>
                {!locations.length && <option value="">No configured locations</option>}
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
              <button type="button" className="primary-btn" onClick={handleSubmit} disabled={submitting || !locations.length}>
                {submitting ? <Loader2 size={16} className="spin" /> : null}
                {submitting ? 'Submitting...' : 'Submit report'} {!submitting && <ArrowUpRight size={16} />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
