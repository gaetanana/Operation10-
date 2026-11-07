import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';

const links = [
  { to: '/', icon: 'ti-sun', label: 'Aujourd’hui' },
  { to: '/sport', icon: 'ti-barbell', label: 'Entraînement' },
  { to: '/nutrition', icon: 'ti-salad', label: 'Nutrition' },
];

export default function Sidebar({ onLogout, loggingOut }: {
  onLogout: () => void;
  loggingOut: boolean;
}) {
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon"><i className="ti ti-flame" aria-hidden="true" /></div>
        <div><div className="brand-name">Operation10</div><div className="brand-sub">Le progrès, à ton rythme.</div></div>
      </div>
      <nav className="nav" aria-label="Navigation principale">
        {links.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) => `nav-item${isActive || (to === '/sport' && location.pathname === '/seance') ? ' active' : ''}`}>
            <i className={`ti ${icon}`} aria-hidden="true" /><span>{label}</span>
          </NavLink>
        ))}
        <div className="more-wrapper" onKeyDown={e => {
          if (e.key === 'Escape') { setOpen(false); menuButton.current?.focus(); }
        }}>
          <button ref={menuButton} className={`nav-item more-toggle${open ? ' active' : ''}`}
            aria-expanded={open} aria-controls="more-navigation" onClick={() => setOpen(v => !v)}>
            <i className="ti ti-dots" aria-hidden="true" /><span>Plus</span>
          </button>
          {open && (
            <div className="more-panel" id="more-navigation">
              <NavLink to="/stats"><i className="ti ti-chart-line" aria-hidden="true" /> Progression</NavLink>
              <button onClick={onLogout} disabled={loggingOut}><i className="ti ti-logout" aria-hidden="true" />{loggingOut ? 'Déconnexion…' : 'Se déconnecter'}</button>
            </div>
          )}
        </div>
      </nav>
      <div className="sidebar-footer"><p>Chaque séance compte.<br />Même les petites.</p></div>
    </aside>
  );
}
