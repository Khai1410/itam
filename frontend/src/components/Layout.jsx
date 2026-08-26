import { useEffect, useState } from 'react';
import { Layout as AntLayout } from 'antd';
import {
  DashboardOutlined,
  LaptopOutlined,
  UserSwitchOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  LogoutOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

const { Sider, Content } = AntLayout;

const NAV_ITEMS = [
  { key: '/dashboard', label: 'Dashboard', icon: <DashboardOutlined /> },
  { key: '/assets', label: 'Assets', icon: <LaptopOutlined /> },
  { key: '/employee-lookup', label: 'Employee Lookup', icon: <UserSwitchOutlined /> },
  { key: '/employees', label: 'Employees', icon: <TeamOutlined /> },
];

const PAGE_TITLES = {
  '/dashboard': 'Overview',
  '/assets': 'Asset Management',
  '/employee-lookup': 'Employee Asset Lookup',
  '/employees': 'Employees',
  '/users': 'Account Management',
};

function initials(name) {
  if (!name) return '?';
  return name.slice(0, 2).toUpperCase();
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const navItems = isAdmin
    ? [...NAV_ITEMS, { key: '/users', label: 'Accounts', icon: <SafetyCertificateOutlined /> }]
    : NAV_ITEMS;

  return (
    <AntLayout className="vam-layout">
      <Sider width={232} className={`vam-sider${mobileOpen ? ' mobile-open' : ''}`}>
        <div className="vam-brand">
          <div className="mark">VS</div>
          <div>
            <div className="title">VSOL Assets</div>
            <div className="subtitle">IT Asset Management</div>
          </div>
        </div>

        <nav className="vam-nav">
          {navItems.map((item) => (
            <div
              key={item.key}
              className={`vam-nav-item${location.pathname === item.key ? ' active' : ''}`}
              onClick={() => navigate(item.key)}
            >
              {item.icon}
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        <div className="vam-sider-footer">
          <div className="vam-avatar">{initials(user?.username)}</div>
          <div className="who">
            <div className="name">{user?.username}</div>
            <div className="role">{user?.role}</div>
          </div>
          <LogoutOutlined
            style={{ color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 15 }}
            onClick={logout}
            title="Logout"
          />
        </div>
      </Sider>

      {mobileOpen && <div className="vam-sider-backdrop" onClick={() => setMobileOpen(false)} />}

      <AntLayout>
        <div className="vam-topbar">
          <MenuOutlined className="vam-menu-trigger" onClick={() => setMobileOpen((v) => !v)} />
          <div className="page-heading">{PAGE_TITLES[location.pathname] || ''}</div>
        </div>
        <Content className="vam-content">
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
}
