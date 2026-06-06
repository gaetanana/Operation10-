import { NavLink } from 'react-router-dom';

const links = [
  { to: '/todo',      icon: 'ti-checks',    label: 'Todo' },
  { to: '/sport',     icon: 'ti-barbell',   label: 'Sport' },
  { to: '/nutrition', icon: 'ti-salad',     label: 'Nutrition' },
  { to: '/stats',     icon: 'ti-chart-line', label: 'Stats' },
];

export default function Sidebar() {
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <i className="ti ti-flame" />
        </div>
        <div>
          <div className="brand-name">Operation10</div>
          <div className="brand-sub">Rennes · 10 mois</div>
        </div>
      </div>

      <nav className="nav">
        {links.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <i className={`ti ${icon}`} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="week-box">
          <div className="week-label">Progression</div>
          <div className="week-val">{today}</div>
        </div>
      </div>
    </aside>
  );
}
