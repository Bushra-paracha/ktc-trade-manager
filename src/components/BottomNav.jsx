import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import { navItems, MOBILE_PRIMARY_COUNT } from '../data/navItems';

export default function BottomNav() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const location = useLocation();

  const primary = navItems.slice(0, MOBILE_PRIMARY_COUNT);
  const overflow = navItems.slice(MOBILE_PRIMARY_COUNT);

  const isOverflowActive = overflow.some((item) =>
    item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
  );

  return (
    <>
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          {primary.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => 'bottom-nav-link' + (isActive ? ' active' : '')}
            >
              <Icon />
              {label}
            </NavLink>
          ))}
          <button
            className={'bottom-nav-link more-link' + (isOverflowActive ? ' active' : '')}
            onClick={() => setSheetOpen(true)}
          >
            <MoreHorizontal />
            More
          </button>
        </div>
      </nav>

      {sheetOpen && (
        <div className="sheet-overlay" onClick={() => setSheetOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-grid">
              {overflow.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={() => setSheetOpen(false)}
                  className={({ isActive }) => 'sheet-item' + (isActive ? ' active' : '')}
                >
                  <Icon />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
