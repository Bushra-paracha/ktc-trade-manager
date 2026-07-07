import { Bell, Search, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Topbar() {
  return (
    <header className="topbar">
      <div className="topbar-brand">
        <div className="topbar-brand-mark">KTC</div>
        <div>
          <strong>Trade Manager</strong>
          <span>Export CRM</span>
        </div>
      </div>
      <div className="topbar-actions">
        <div className="topbar-search">
          <Search size={16} />
          <input placeholder="Search buyers…" aria-label="Search buyers" />
        </div>
        <Link to="/clients" className="topbar-create">
          <Plus size={16} />
          New buyer
        </Link>
        <button className="icon-btn" aria-label="Notifications">
          <Bell size={17} />
        </button>
      </div>
    </header>
  );
}
