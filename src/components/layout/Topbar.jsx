import { useLocation } from 'react-router-dom';
import { Bell, Leaf, Menu, Search } from 'lucide-react';
import { CURRENT_USER } from '@/data/campus';
import { pageLabelFromPath } from '@/data/navigation';
import { useAuth } from '@/context/AuthContext';

export function Topbar({ onMenu }) {
  const { signOut } = useAuth();
  const { pathname } = useLocation();
  const pageLabel = pageLabelFromPath(pathname);

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
        <button type="button" className="top-avatar" onClick={signOut} title="Sign out">{CURRENT_USER.initials}</button>
      </div>
    </header>
  );
}
