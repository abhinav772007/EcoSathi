import { TEAM_MEMBERS } from '@/data/campus';
import { PageHeading } from '@/components/ui/PageHeading';

export function TeamPage() {
  return (
    <div className="page">
      <PageHeading
        eyebrow="Campus operations"
        title="Team"
        description="People who review reports, plan collection, and close the loop on campus waste issues."
      />
      <div className="team-grid">
        {TEAM_MEMBERS.map((member) => (
          <section className="card member-card" key={member.name}>
            <div className={`report-avatar ${member.color}`}>{member.initials}</div>
            <div>
              <b>{member.name}</b>
              <span>{member.role}</span>
              <small>{member.focus}</small>
            </div>
            <em className={`status-pill ${member.status === 'On route' ? 'needs-review' : 'ready'}`}>{member.status}</em>
          </section>
        ))}
      </div>
    </div>
  );
}
