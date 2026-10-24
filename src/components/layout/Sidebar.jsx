import { NavLink, useNavigate } from 'react-router-dom';
import { ArrowUpRight, ChevronDown, CircleHelp, Leaf, LogOut, MoreHorizontal } from 'lucide-react';
import { WORKSPACE } from '@/data/campus';
import { NAV_SECTIONS } from '@/data/navigation';
import { openReportCount } from '@/data/reports';
import { useAuth } from '@/context/AuthContext';
import { useReports } from '@/context/ReportsContext';
import { Icon } from '@/components/ui/Icon';

export function Sidebar({ open, onNavigate }) {
  const { displayName, role, initials, signOut } = useAuth();
  const { reports } = useReports();
  const navigate = useNavigate();
  const badges = { openReports: openReportCount(reports) };
  const roleLabel = role === 'administrator' ? 'Administrator' : role === 'worker' ? 'Collection worker' : 'Resident';

  async function handleSignOut() {
    if (window.confirm('Sign out of EcoSathi?')) {
      await signOut();
      navigate('/login', { replace: true });
    }
  }

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="brand">
        <div className="brand-mark">
          <Leaf size={20} strokeWidth={2.5} />
        </div>
        <span>
          Eco<span>Sathi</span>
        </span>
      </div>

      <div className="workspace-switcher">
        <div className="workspace-avatar">{WORKSPACE.initials}</div>
        <div>
          <b>{WORKSPACE.name}</b>
          <small>{WORKSPACE.unit}</small>
        </div>
        <ChevronDown size={15} />
      </div>

      <nav>
        {NAV_SECTIONS.map((section, index) => (
          <div key={section.label}>
            <p className={`nav-label ${index > 0 ? 'nav-gap' : ''}`}>{section.label}</p>
            {section.items.map((item) => {
              const NavIcon = item.icon;
              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={onNavigate}
                >
                  <Icon>
                    <NavIcon size={17} />
                  </Icon>
                  {item.label}
                  {item.badgeKey && <span className="nav-count">{badges[item.badgeKey]}</span>}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="help-card">
          <CircleHelp size={18} />
          <div>
            <b>Need a hand?</b>
            <small>Read the operations guide</small>
          </div>
          <ArrowUpRight size={15} />
        </div>
        <div className="profile">
          <div className="profile-avatar">{initials}</div>
          <div>
            <b>{displayName}</b>
            <small>{roleLabel}</small>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={handleSignOut}
            title="Sign out"
            aria-label="Sign out"
            style={{ marginLeft: 'auto' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}


