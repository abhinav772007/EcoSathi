import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, GitMerge, Loader2, MapPin, RefreshCw, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useReports } from '@/context/ReportsContext';
import { PageHeading } from '@/components/ui/PageHeading';
import { apiRequest } from '@/lib/api';

function reportAge(value) {
  if (!value) return '';
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.round(minutes / 60)} hr ago`;
}

export function DuplicatesPage() {
  const { role } = useAuth();
  const { refreshReports, notify } = useReports();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deciding, setDeciding] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/api/duplicates');
      setLinks(data.filter((link) => !link.reviewed));
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function review(link, decision) {
    setDeciding(`${link.id}-${decision}`);
    try {
      await apiRequest(`/api/duplicates/${link.id}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      });
      setLinks((current) => current.filter((item) => item.id !== link.id));
      await refreshReports();
      notify(
        decision === 'confirmed' ? 'Duplicate confirmed' : 'Reports kept separate',
        `${link.report?.code || 'Report'} ${decision === 'confirmed' ? 'was linked to' : 'stays independent of'} ${link.canonical?.code || 'the canonical report'}.`,
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeciding(null);
    }
  }

  const canReview = role === 'administrator';

  return (
    <div className="page">
      <PageHeading
        eyebrow="Human review"
        title="Duplicate reports"
        description="Ambiguous matches are never merged silently. Confirm a duplicate or keep both reports actionable."
        action={
          <button type="button" className="secondary-btn" onClick={load} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
          </button>
        }
      />

      {!canReview && (
        <div className="demo-note">
          <AlertTriangle size={17} />
          <span>Only administrators can resolve duplicate matches. Workers can review the queue here.</span>
        </div>
      )}
      {error && <div className="demo-note error-note"><span>{error}</span></div>}

      {loading ? (
        <div className="loading-state"><Loader2 size={18} className="spin" /> Loading duplicate queue...</div>
      ) : !links.length ? (
        <section className="card empty-state">
          <GitMerge size={26} />
          <h2>No duplicates waiting</h2>
          <p>New reports are checked automatically against the same location and category within 24 hours.</p>
        </section>
      ) : (
        <div className="duplicate-stack">
          {links.map((link) => (
            <section className="card duplicate-card" key={link.id}>
              <div className="duplicate-heading">
                <div>
                  <b><GitMerge size={16} /> Possible duplicate</b>
                  <span>{Math.round((link.confidence || 0) * 100)}% confidence · {link.match_reason}</span>
                </div>
                <span className="status-pill needs-review">needs review</span>
              </div>
              <div className="duplicate-pair">
                <article>
                  <em>NEW REPORT</em>
                  <b>{link.report?.title || 'Unknown report'}</b>
                  <span><MapPin size={13} /> {link.report?.location || 'Unknown'}</span>
                  <small>{link.report?.code} · {link.report?.category} · {reportAge(link.report?.created_at)}</small>
                </article>
                <div className="duplicate-arrow">↔</div>
                <article>
                  <em>CANONICAL ISSUE</em>
                  <b>{link.canonical?.title || 'Unknown report'}</b>
                  <span><MapPin size={13} /> {link.canonical?.location || 'Unknown'}</span>
                  <small>{link.canonical?.code} · {link.canonical?.category} · {reportAge(link.canonical?.created_at)}</small>
                </article>
              </div>
              <div className="duplicate-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => review(link, 'dismissed')}
                  disabled={!canReview || Boolean(deciding)}
                >
                  {deciding === `${link.id}-dismissed` ? <Loader2 size={15} className="spin" /> : <X size={15} />}
                  Keep separate
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => review(link, 'confirmed')}
                  disabled={!canReview || Boolean(deciding)}
                >
                  {deciding === `${link.id}-confirmed` ? <Loader2 size={15} className="spin" /> : <Check size={15} />}
                  Confirm duplicate
                </button>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
