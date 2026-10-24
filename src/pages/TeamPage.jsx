import { useMemo, useState } from 'react';
import {
  Check,
  Filter,
  Plus,
  Search,
  ShieldCheck,
  Truck,
  User,
  Users,
  X,
} from 'lucide-react';
import { ROLE_DEFINITIONS } from '@/data/campus';
import { PageHeading } from '@/components/ui/PageHeading';
import { useReports } from '@/context/ReportsContext';

function AddMemberModal({ onClose, onAdd }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('worker');
  const [focus, setFocus] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    onAdd({
      name: name.trim(),
      email: email.trim(),
      role,
      focus: focus.trim() || 'Campus operations',
    });
    onClose();
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className="modal"
        onSubmit={handleSubmit}
        onMouseDown={(e) => e.stopPropagation()}
        style={{ width: 'min(100%, 460px)' }}
      >
        <div className="modal-heading">
          <div>
            <div className="eyebrow">Team administration</div>
            <h2>Add campus personnel</h2>
            <p>Register a team member and assign their campus operational role.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <label className="field-label">
            FULL NAME
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Vikram Chandra"
              required
            />
          </label>

          <label className="field-label">
            CAMPUS EMAIL
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. vikram@ecosathi.campus"
              required
            />
          </label>

          <label className="field-label">
            ASSIGNED ROLE
            <select value={role} onChange={(e) => setRole(e.target.value)} className="role-select">
              <option value="administrator">Administrator (Queue triage & route planning)</option>
              <option value="worker">Collection Worker (Route execution & stop completion)</option>
              <option value="resident">Resident / Student (Voice & text reporter)</option>
            </select>
          </label>

          <label className="field-label">
            FOCUS AREA OR ASSIGNED ZONE
            <input
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="e.g. South campus collection · 8 stops"
            />
          </label>
        </div>

        <div className="modal-footer" style={{ marginTop: '20px' }}>
          <button type="button" className="secondary-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary-btn">
            Add team member
          </button>
        </div>
      </form>
    </div>
  );
}

export function TeamPage() {
  const { teamMembers, updateMemberRole, addTeamMember } = useReports();
  const [roleFilter, setRoleFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredMembers = useMemo(() => {
    let list = teamMembers;
    if (roleFilter !== 'all') {
      list = list.filter((m) => m.role === roleFilter);
    }
    const needle = query.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((m) =>
      [m.name, m.email, m.role, m.focus].join(' ').toLowerCase().includes(needle)
    );
  }, [query, roleFilter, teamMembers]);

  return (
    <div className="page">
      <PageHeading
        eyebrow="Campus operations & governance"
        title="Team & Role Management"
        description="Configure role-based permissions and manage personnel who review reports, execute collection routes, and maintain campus waste infrastructure."
        action={
          <button
            type="button"
            className="primary-btn"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={17} /> Add team member
          </button>
        }
      />

      {/* Role Architecture Overview Cards based on Technical Blueprint */}
      <div className="role-architecture-grid">
        <section className="card role-summary-card admin">
          <div className="role-summary-header">
            <div className="role-avatar-badge admin">
              <ShieldCheck size={18} />
            </div>
            <div>
              <b>Administrator</b>
              <small>Full triage & planning access</small>
            </div>
          </div>
          <p>{ROLE_DEFINITIONS.administrator.summary}</p>
          <ul className="role-caps-list">
            <li>Review & verify incoming reports</li>
            <li>Run route-planning workflows</li>
            <li>Review and merge duplicate clusters</li>
            <li>Configure campus locations & user roles</li>
          </ul>
        </section>

        <section className="card role-summary-card worker">
          <div className="role-summary-header">
            <div className="role-avatar-badge worker">
              <Truck size={18} />
            </div>
            <div>
              <b>Collection Worker</b>
              <small>Operations & route execution</small>
            </div>
          </div>
          <p>{ROLE_DEFINITIONS.worker.summary}</p>
          <ul className="role-caps-list">
            <li>View today's prioritized route stops</li>
            <li>Start & complete stops with weights (kg)</li>
            <li>Skip blocked or unreachable stops</li>
            <li>Update assigned report statuses in real time</li>
          </ul>
        </section>

        <section className="card role-summary-card resident">
          <div className="role-summary-header">
            <div className="role-avatar-badge resident">
              <User size={18} />
            </div>
            <div>
              <b>Resident / Student</b>
              <small>Voice-first issue reporting</small>
            </div>
          </div>
          <p>{ROLE_DEFINITIONS.resident.summary}</p>
          <ul className="role-caps-list">
            <li>Report waste issues via voice or text</li>
            <li>Receive genuine report tracking code</li>
            <li>Track live resolution status of reports</li>
            <li>Access campus disposal rules & guide</li>
          </ul>
        </section>
      </div>

      {/* Team Member Filter & Search Toolbar */}
      <div className="toolbar" style={{ marginTop: '26px' }}>
        <div className="search-field">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search personnel by name, email, or zone..."
          />
        </div>

        <div className="stream-tabs">
          <button
            type="button"
            className={`tab-btn ${roleFilter === 'all' ? 'active' : ''}`}
            onClick={() => setRoleFilter('all')}
          >
            All Personnel ({teamMembers.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${roleFilter === 'administrator' ? 'active' : ''}`}
            onClick={() => setRoleFilter('administrator')}
          >
            Administrators ({teamMembers.filter((m) => m.role === 'administrator').length})
          </button>
          <button
            type="button"
            className={`tab-btn ${roleFilter === 'worker' ? 'active' : ''}`}
            onClick={() => setRoleFilter('worker')}
          >
            Workers ({teamMembers.filter((m) => m.role === 'worker').length})
          </button>
          <button
            type="button"
            className={`tab-btn ${roleFilter === 'resident' ? 'active' : ''}`}
            onClick={() => setRoleFilter('resident')}
          >
            Residents ({teamMembers.filter((m) => m.role === 'resident').length})
          </button>
        </div>
      </div>

      {/* Team Members List */}
      <section className="card" style={{ marginTop: '16px' }}>
        <div className="card-heading">
          <div>
            <h2>Campus Team Roster</h2>
            <p>Change assigned roles or adjust operational focus</p>
          </div>
          <span className="status-pill ready">
            <i /> {filteredMembers.length} active
          </span>
        </div>

        <div className="team-roster-list">
          {filteredMembers.map((member) => {
            const roleColor =
              member.role === 'administrator'
                ? 'green'
                : member.role === 'worker'
                ? 'orange'
                : 'blue';

            return (
              <div className="team-roster-row" key={member.id || member.email}>
                <div className={`report-avatar ${member.color || roleColor}`}>
                  {member.initials || 'ES'}
                </div>

                <div className="roster-main">
                  <div className="roster-name-line">
                    <b>{member.name}</b>
                    <small>{member.email}</small>
                  </div>
                  <span>{member.focus}</span>
                </div>

                <div className="roster-role-control">
                  <label>ROLE ASSIGNMENT</label>
                  <select
                    value={member.role}
                    onChange={(e) => updateMemberRole(member.id || member.name, e.target.value)}
                    className={`role-inline-select ${member.role}`}
                  >
                    <option value="administrator">👑 Administrator</option>
                    <option value="worker">🚛 Collection Worker</option>
                    <option value="resident">👤 Resident / Student</option>
                  </select>
                </div>

                <div className="roster-status">
                  <em
                    className={`status-pill ${
                      member.status === 'On route' ? 'needs-review' : 'ready'
                    }`}
                  >
                    {member.status || 'Active'}
                  </em>
                </div>
              </div>
            );
          })}

          {!filteredMembers.length && (
            <div className="empty-state">
              <h2>No personnel found</h2>
              <p>Try clearing your search query or changing the role filter.</p>
            </div>
          )}
        </div>
      </section>

      {showAddModal && (
        <AddMemberModal
          onClose={() => setShowAddModal(false)}
          onAdd={addTeamMember}
        />
      )}
    </div>
  );
}
