import { NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { navItems } from '../data/navItems';
import { useAuth } from '../hooks/useAuth';

function initialsFrom(name, email) {
  if (name) {
    return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return '?';
}

export default function Sidebar() {
  const { user, profile, signOut } = useAuth();

  const displayName = profile?.full_name || user?.email || 'User';
  const role = profile?.role || 'Team Member';

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">KTC</div>
        <div className="sidebar-brand-text">
          <strong>Kassam Trading Co.</strong>
          <span>Trade Manager</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
          >
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-user">
        <div className="sidebar-user-avatar">{initialsFrom(profile?.full_name, user?.email)}</div>
        <div className="sidebar-user-info" style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</strong>
          <span>{role}</span>
        </div>
        <button
          onClick={signOut}
          aria-label="Sign out"
          style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex' }}
          title="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
      <div className="sidebar-footer">KTC Trade Manager v1.0</div>
    </aside>
  );
}
