import { NavLink } from 'react-router-dom';
import { ArrowUpRight, ChevronDown, CircleHelp, Leaf, MoreHorizontal } from 'lucide-react';
import { CURRENT_USER, WORKSPACE } from '@/data/campus';
import { NAV_SECTIONS } from '@/data/navigation';
import { openReportCount } from '@/data/reports';
import { useReports } from '@/context/ReportsContext';
import { Icon } from '@/components/ui/Icon';

export function Sidebar({ open, onNavigate }) {
  const { reports } = useReports();
  const badges = { openReports: openReportCount(reports) };

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
          <div className="profile-avatar">{CURRENT_USER.initials}</div>
          <div>
            <b>{CURRENT_USER.name}</b>
            <small>{CURRENT_USER.role}</small>
          </div>
          <MoreHorizontal size={17} />
        </div>
      </div>
    </aside>
  );
}
