import { Bell, Search } from 'lucide-react';

export default function Topbar() {
  return (
    <header className="topbar">
      <div className="topbar-brand">
        <div className="topbar-brand-mark">KTC</div>
        <strong>Trade Manager</strong>
      </div>
      <div className="topbar-actions">
        <button className="icon-btn" aria-label="Search">
          <Search size={17} />
        </button>
        <button className="icon-btn" aria-label="Notifications">
          <Bell size={17} />
        </button>
      </div>
    </header>
  );
}
