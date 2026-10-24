import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  ChevronDown,
  Leaf,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  Truck,
  User,
  Users,
} from 'lucide-react';
import { pageLabelFromPath } from '@/data/navigation';
import { useAuth } from '@/context/AuthContext';
import { useReports } from '@/context/ReportsContext';

export function Topbar({ onMenu }) {
  const { signOut, initials, displayName, role, roleMeta, switchRole } = useAuth();
  const { notify } = useReports();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const pageLabel = pageLabelFromPath(pathname);

  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setRoleMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSignOut() {
    if (window.confirm('Sign out of EcoSathi?')) {
      await signOut();
      navigate('/login', { replace: true });
    }
  }

  function handleSwitch(newRole) {
    switchRole(newRole);
    setRoleMenuOpen(false);
    const label =
      newRole === 'administrator'
        ? 'Administrator'
        : newRole === 'worker'
        ? 'Collection Worker'
        : 'Resident / Student';
    notify('Role switched', `Switched active perspective to ${label}.`);
  }

  const roleIcon =
    role === 'administrator' ? (
      <ShieldCheck size={14} />
    ) : role === 'worker' ? (
      <Truck size={14} />
    ) : (
      <User size={14} />
    );

  return (
    <header className="topbar">
      <button
        type="button"
        className="icon-button mobile-menu-btn"
        onClick={onMenu}
        aria-label="Open navigation"
      >
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
        {/* Interactive Role Switcher */}
        <div className="role-switcher-container" ref={dropdownRef}>
          <button
            type="button"
            className={`role-switcher-btn ${role}`}
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            title="Switch your campus role perspective"
          >
            <span className="role-icon">{roleIcon}</span>
            <span className="role-label">{roleMeta.label}</span>
            <ChevronDown size={13} className={`chevron ${roleMenuOpen ? 'open' : ''}`} />
          </button>

          {roleMenuOpen && (
            <div className="role-dropdown-menu">
              <div className="role-dropdown-header">
                <b>Switch perspective</b>
                <small>Explore EcoSathi as different users</small>
              </div>

              <button
                type="button"
                className={`role-option-btn ${role === 'administrator' ? 'selected' : ''}`}
                onClick={() => handleSwitch('administrator')}
              >
                <div className="role-option-icon admin">
                  <ShieldCheck size={16} />
                </div>
                <div className="role-option-content">
                  <div className="role-option-title">
                    <b>Administrator</b>
                    {role === 'administrator' && <Check size={14} className="check-mark" />}
                  </div>
                  <span>Queue review, routing, duplicate triage & team access</span>
                </div>
              </button>

              <button
                type="button"
                className={`role-option-btn ${role === 'worker' ? 'selected' : ''}`}
                onClick={() => handleSwitch('worker')}
              >
                <div className="role-option-icon worker">
                  <Truck size={16} />
                </div>
                <div className="role-option-content">
                  <div className="role-option-title">
                    <b>Collection worker</b>
                    {role === 'worker' && <Check size={14} className="check-mark" />}
                  </div>
                  <span>Mobile stops list, weight logging & route completion</span>
                </div>
              </button>

              <button
                type="button"
                className={`role-option-btn ${role === 'resident' ? 'selected' : ''}`}
                onClick={() => handleSwitch('resident')}
              >
                <div className="role-option-icon resident">
                  <User size={16} />
                </div>
                <div className="role-option-content">
                  <div className="role-option-title">
                    <b>Resident / Student</b>
                    {role === 'resident' && <Check size={14} className="check-mark" />}
                  </div>
                  <span>Voice & text waste reporting, tracking & disposal rules</span>
                </div>
              </button>
            </div>
          )}
        </div>

        <div className="top-user" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            className="top-avatar"
            title={`${displayName} (${roleMeta.label})`}
            style={{ cursor: 'default' }}
          >
            {initials}
          </span>
          <button
            type="button"
            className="icon-button"
            onClick={handleSignOut}
            title="Sign out / Switch account"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
