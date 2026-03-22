import { NavLink } from 'react-router-dom'

const NAV = [
  { section: 'Main', items: [
    { to: '/',           icon: '📊', label: 'Dashboard'        },
    { to: '/quotes',     icon: '📄', label: 'Quotations'       },
    { to: '/clients',    icon: '👥', label: 'Clients'          },
  ]},
  { section: 'Configuration', items: [
    { to: '/packages',   icon: '📦', label: 'Packages'         },
  ]},
  { section: 'Tools', items: [
    { to: '/pricing',    icon: '💹', label: 'Pricing Tool'     },
    { to: '/calculator', icon: '🧮', label: 'Solar Calculator' },
  ]},
  { section: 'Reports', items: [
    { to: '/analytics',  icon: '📈', label: 'Analytics'        },
  ]},
]

export default function Sidebar({ pendingQuotes }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <div className="logo-sun">☀</div>
          <div>
            <div className="logo-text">SolarPro</div>
            <div className="logo-sub">Admin System</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(({ section, items }) => (
          <div key={section}>
            <div className="nav-section">{section}</div>
            {items.map(({ to, icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                style={{ textDecoration: 'none' }}
              >
                <span className="ni">{icon}</span>
                {label}
                {to === '/quotes' && pendingQuotes > 0 && (
                  <span className="nav-badge">{pendingQuotes}</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="version">
          <div className="ver-dot"/>
          <span>v1.3.0 · Spring Boot API</span>
        </div>
      </div>
    </aside>
  )
}
