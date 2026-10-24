import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Leaf, LogOut, Menu, Search } from 'lucide-react';
import { pageLabelFromPath } from '@/data/navigation';
import { useAuth } from '@/context/AuthContext';

export function Topbar({ onMenu }) {
  const { signOut, initials, displayName } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const pageLabel = pageLabelFromPath(pathname);

  async function handleSignOut() {
    if (window.confirm(`Sign out of EcoSathi?`)) {
      await signOut();
      navigate('/login', { replace: true });
    }
  }

  return (
    <header className="topbar">
      <button type="button" className="icon-button mobile-menu-btn" onClick={onMenu} aria-label="Open navigation">
        <Menu size={18} />
      </button>
      <div className="mobile-brand">
        <div className="brand-mark">
          <Leaf size={18} />
        </div>
        <b>EcoSathi</b>
      </div>
      <div className="breadcrumb">
        <span>Workspace</span>
        <span>/</span>
        <b>{pageLabel}</b>
      </div>
      <div className="top-actions">
        <button type="button" className="icon-button" aria-label="Search">
          <Search size={18} />
        </button>
        <button type="button" className="icon-button notification" aria-label="Notifications">
          <Bell size={18} />
          <i />
        </button>
        <div className="top-user" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="top-avatar" title={displayName} style={{ cursor: 'default' }}>{initials}</span>
          <button type="button" className="icon-button" onClick={handleSignOut} title="Sign out" aria-label="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
