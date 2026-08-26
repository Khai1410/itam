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

const ORG_NAME = import.meta.env.VITE_ORG_NAME || 'Your Company';

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
    <AntLayout className="itam-layout">
      <Sider width={232} className={`itam-sider${mobileOpen ? ' mobile-open' : ''}`}>
        <div className="itam-brand">
          <div className="mark">{initials(ORG_NAME)}</div>
          <div>
            <div className="title">IT Asset Management</div>
            <div className="subtitle">{ORG_NAME}</div>
          </div>
        </div>

        <nav className="itam-nav">
          {navItems.map((item) => (
            <div
              key={item.key}
              className={`itam-nav-item${location.pathname === item.key ? ' active' : ''}`}
              onClick={() => navigate(item.key)}
            >
              {item.icon}
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        <div className="itam-sider-footer">
          <div className="itam-avatar">{initials(user?.username)}</div>
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

      {mobileOpen && <div className="itam-sider-backdrop" onClick={() => setMobileOpen(false)} />}

      <AntLayout>
        <div className="itam-topbar">
          <MenuOutlined className="itam-menu-trigger" onClick={() => setMobileOpen((v) => !v)} />
          <div className="page-heading">{PAGE_TITLES[location.pathname] || ''}</div>
        </div>
        <Content className="itam-content">
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
}
