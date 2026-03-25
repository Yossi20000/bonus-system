import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const adminNav = [
  { section: 'ניהול', items: [
    { path: '/admin/dashboard', icon: '📊', label: 'דשבורד' },
    { path: '/admin/employees', icon: '👥', label: 'עובדים' },
    { path: '/admin/products', icon: '📱', label: 'מוצרים' },
    { path: '/admin/sales', icon: '💼', label: 'מכירות' },
    { path: '/admin/reports', icon: '📈', label: 'דוחות' },
  ]},
];

const employeeNav = [
  { section: 'עובד', items: [
    { path: '/employee/sales', icon: '➕', label: 'מכירות שלי' },
    { path: '/employee/new-sale', icon: '🛍️', label: 'הוסף מכירה' },
  ]},
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const nav = user?.role === 'admin' ? adminNav : employeeNav;
  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2) || '?';

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>💰 מערכת בונוסים</h1>
          <p>ניהול מכירות ועמלות</p>
        </div>
        <div className="sidebar-user">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="name">{user?.name}</div>
            <div className="role">{user?.role === 'admin' ? '👑 מנהל' : '👤 עובד'}</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {nav.map(section => (
            <div key={section.section}>
              <div className="nav-section">{section.section}</div>
              {section.items.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>🚪 יציאה</button>
        </div>
      </aside>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
