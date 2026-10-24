import { useState } from 'react';
import { AlertTriangle, Check, GitMerge, Loader2, MapPin, RefreshCw, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useReports } from '@/context/ReportsContext';
import { PageHeading } from '@/components/ui/PageHeading';

function reportAge(value) {
  if (!value) return '';
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.round(minutes / 60)} hr ago`;
}

export function DuplicatesPage() {
  const { role } = useAuth();
  const { duplicateLinks, reviewDuplicate } = useReports();
  const [deciding, setDeciding] = useState(null);

  const pendingLinks = duplicateLinks.filter((link) => !link.reviewed);

  async function handleReview(link, decision) {
    setDeciding(`${link.id}-${decision}`);
    try {
      await reviewDuplicate(link.id, decision);
    } finally {
      setDeciding(null);
    }
  }

  return (
    <div className="page">
      <PageHeading
        eyebrow="Consolidation engine"
        title="Duplicate Review"
        description="Review likely duplicate issues detected by spatio-temporal and category matching rules. Confirm to consolidate or dismiss to keep separate."
      />

      <div className="insight-banner">
        <div className="insight-icon">
          <GitMerge size={19} />
        </div>
        <div>
          <b>
            {pendingLinks.length} pending candidate {pendingLinks.length === 1 ? 'pair' : 'pairs'}
          </b>
          <span>
            EcoSathi never auto-merges uncertain duplicates. Human administrators confirm before merging to preserve transparency.
          </span>
        </div>
      </div>

      <div className="duplicate-stack" style={{ marginTop: '24px' }}>
        {pendingLinks.map((link) => (
          <section className="card duplicate-card" key={link.id}>
            <div className="duplicate-heading">
              <div>
                <b>
                  <AlertTriangle size={15} color="#e7975b" />
                  Possible Duplicate Match ({Math.round(link.confidence * 100)}% confidence)
                </b>
                <span>{link.match_reason}</span>
              </div>
              <span className="status-pill needs-review">Needs review</span>
            </div>

            <div className="duplicate-pair">
              {/* Existing Canonical Report */}
              <article>
                <em>EXISTING CANONICAL ISSUE</em>
                <b>{link.canonical?.title || 'Existing Report'}</b>
                <span>
                  <MapPin size={12} /> {link.canonical?.location}
                </span>
                <small>
                  {link.canonical?.code || link.canonical?.id} · {reportAge(link.canonical?.created_at)} ·{' '}
                  {link.canonical?.status}
                </small>
              </article>

              <div className="duplicate-arrow">⟷</div>

              {/* Incoming Duplicate Report */}
              <article>
                <em>INCOMING REPORT (CANDIDATE)</em>
                <b>{link.report?.title || 'Incoming Report'}</b>
                <span>
                  <MapPin size={12} /> {link.report?.location}
                </span>
                <small>
                  {link.report?.code || link.report?.id} · {reportAge(link.report?.created_at)} ·{' '}
                  {link.report?.status}
                </small>
              </article>
            </div>

            <div className="duplicate-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => handleReview(link, 'dismissed')}
                disabled={Boolean(deciding)}
              >
                {deciding === `${link.id}-dismissed` ? <Loader2 size={13} className="spin" /> : <X size={13} />}
                Keep separate (Distinct issue)
              </button>

              <button
                type="button"
                className="primary-btn"
                onClick={() => handleReview(link, 'confirmed')}
                disabled={Boolean(deciding)}
              >
                {deciding === `${link.id}-confirmed` ? <Loader2 size={13} className="spin" /> : <Check size={13} />}
                Confirm duplicate (Merge)
              </button>
            </div>
          </section>
        ))}

        {!pendingLinks.length && (
          <div className="empty-state">
            <Check size={28} color="var(--green)" style={{ margin: '0 auto 8px' }} />
            <h2>All duplicate reviews cleared</h2>
            <p>No unreviewed duplicate clusters found across active campus reports.</p>
          </div>
        )}
      </div>
    </div>
  );
}
