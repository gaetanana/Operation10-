import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';

const links = [
  { to: '/', icon: 'ti-barbell', label: 'Entraînement' },
  { to: '/nutrition', icon: 'ti-salad', label: 'Nutrition' },
  { to: '/stats', icon: 'ti-chart-line', label: 'Progression' },
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
    <header className="app-navigation">
      <div className="brand">
        <div className="brand-icon"><i className="ti ti-bolt" aria-hidden="true" /></div>
        <div className="brand-name">operation<span>10</span></div>
      </div>
      <nav className="nav" aria-label="Navigation principale">
        {links.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) => `nav-item${isActive || (to === '/' && location.pathname === '/seance') ? ' active' : ''}`}>
            <i className={`ti ${icon}`} aria-hidden="true" /><span>{label}</span>
          </NavLink>
        ))}
        <div className="more-wrapper" onKeyDown={e => {
          if (e.key === 'Escape') { setOpen(false); menuButton.current?.focus(); }
        }}>
          <button ref={menuButton} className={`nav-item more-toggle${open ? ' active' : ''}`}
            aria-expanded={open} aria-controls="more-navigation" onClick={() => setOpen(v => !v)}>
            <i className="ti ti-menu-2" aria-hidden="true" /><span>Menu</span>
          </button>
          {open && (
            <div className="more-panel" id="more-navigation">
              <NavLink to="/?view=history"><i className="ti ti-history" aria-hidden="true" /> Historique</NavLink>
              <NavLink to="/import-history"><i className="ti ti-file-import" aria-hidden="true" /> Importer des séances</NavLink>
              <NavLink to="/archives"><i className="ti ti-archive" aria-hidden="true" /> Anciens contrats</NavLink>
              <button onClick={onLogout} disabled={loggingOut}><i className="ti ti-logout" aria-hidden="true" />{loggingOut ? 'Déconnexion…' : 'Se déconnecter'}</button>
            </div>
          )}
        </div>
      </nav>
      <span className="navigation-private"><i className="ti ti-lock" aria-hidden="true" /> Espace personnel</span>
    </header>
  );
}
