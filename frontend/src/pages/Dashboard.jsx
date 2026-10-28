import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin, Tooltip, Button, Modal, Checkbox } from 'antd';
import {
  AppstoreOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  HddOutlined,
  ClockCircleOutlined,
  LoginOutlined,
  LogoutOutlined,
  SettingOutlined,
  HolderOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import client from '../api/client';
import BarList from '../components/BarList.jsx';

const STATUS_META = {
  'In Use': { color: 'var(--status-in-use)' },
  'In Stock': { color: 'var(--status-in-stock)' },
  Damaged: { color: 'var(--status-damaged)' },
  Lost: { color: 'var(--status-lost)' },
  Sold: { color: 'var(--status-sold)' },
  Warranty: { color: 'var(--status-warranty)' },
};

const PANEL_META = {
  byType: { title: 'By Device Type', icon: <AppstoreOutlined /> },
  byLocation: { title: 'By Location', icon: <EnvironmentOutlined /> },
  byBusinessUnit: { title: 'By Business Unit', icon: <TeamOutlined /> },
  byChip: { title: 'Laptops by Chip', icon: <ThunderboltOutlined /> },
  byStorage: { title: 'Laptops by Storage', icon: <HddOutlined /> },
  recentActivity: { title: 'Recent Activity', icon: <ClockCircleOutlined /> },
};

const DEFAULT_LAYOUT = Object.keys(PANEL_META).map((id) => ({ id, visible: true }));

const LAYOUT_KEY = 'itam_dashboard_layout';
const HEIGHTS_KEY = 'itam_dashboard_panel_heights';

function loadLayout() {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const stored = JSON.parse(raw).filter((p) => PANEL_META[p.id]);
    const storedIds = new Set(stored.map((p) => p.id));
    const missing = DEFAULT_LAYOUT.filter((p) => !storedIds.has(p.id));
    return [...stored, ...missing];
  } catch {
    return DEFAULT_LAYOUT;
  }
}

function loadHeights() {
  try {
    return JSON.parse(localStorage.getItem(HEIGHTS_KEY)) || {};
  } catch {
    return {};
  }
}

// accent-ladder move: one container split by dividers, not four separate
// cards — the full brand hue stays off the chrome here (it's the hero's
// job) and only marks a cell whose number is a real negative signal.
function KpiCell({ label, value, sub, tone, onClick }) {
  return (
    <div className={`kpi-cell${onClick ? ' kpi-cell-clickable' : ''}`} onClick={onClick}>
      <div className="kpi-cell-label">{label}</div>
      <div className={`kpi-cell-value${tone ? ` kpi-cell-value-${tone}` : ''}`}>{value}</div>
      {sub && <div className="kpi-cell-sub">{sub}</div>}
    </div>
  );
}

function StatusOverview({ statusCounts, total, onStatusClick }) {
  const entries = Object.entries(statusCounts).filter(([, v]) => v > 0);
  return (
    <div className="status-overview-card">
      <h3>
        <AppstoreOutlined /> Status Overview
      </h3>
      <div className="status-bar-track">
        {entries.map(([status, value]) => (
          <Tooltip key={status} title={`${status}: ${value} (${Math.round((value / total) * 100)}%) — click to view`}>
            <div
              className="status-bar-seg status-bar-seg-clickable"
              style={{ width: `${(value / total) * 100}%`, background: STATUS_META[status]?.color }}
              onClick={() => onStatusClick(status)}
            />
          </Tooltip>
        ))}
      </div>
      <div className="status-legend">
        {entries.map(([status, value]) => (
          <div className="status-legend-item status-legend-item-clickable" key={status} onClick={() => onStatusClick(status)}>
            <span className="status-legend-dot" style={{ background: STATUS_META[status]?.color }} />
            {status} <b>{value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB');
}

function panelBody(id, data, goToAssets) {
  switch (id) {
    case 'byType':
      return (
        <BarList
          rows={data.byType}
          labelKey="device_name"
          onRowClick={(deviceName) => goToAssets({ type: deviceName })}
        />
      );
    case 'byLocation':
      return (
        <BarList
          rows={data.byLocation}
          labelKey="location"
          onRowClick={(location) => goToAssets({ location })}
        />
      );
    case 'byBusinessUnit':
      return (
        <BarList
          rows={data.byBusinessUnit}
          labelKey="business_unit"
          onRowClick={(businessUnit) => goToAssets({ businessUnit })}
        />
      );
    case 'byChip':
      return (
        <BarList
          rows={data.byChip}
          labelKey="chip"
          onRowClick={(chip) => goToAssets({ type: 'LAPTOP', chip })}
        />
      );
    case 'byStorage':
      return <BarList rows={data.byStorage} labelKey="storage" />;
    case 'recentActivity':
      return (
        <>
          {data.recentActivity.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No activity yet</div>
          )}
          <div className="activity-list">
            {data.recentActivity.map((r) => (
              <div className="activity-item" key={`${r.id}-${r.event_type}`}>
                <div className={`activity-icon activity-icon-${r.event_type}`}>
                  {r.event_type === 'assigned' ? <LoginOutlined /> : <LogoutOutlined />}
                </div>
                <div className="activity-text">
                  <span className="activity-emp">{r.employee_name}</span>{' '}
                  {r.event_type === 'assigned' ? 'was assigned' : 'returned'}{' '}
                  <span className="activity-device">
                    {r.device_name} {r.label ? `(${r.label})` : ''}
                  </span>
                </div>
                <div className="activity-time">{timeAgo(r.event_at)}</div>
              </div>
            ))}
          </div>
        </>
      );
    default:
      return null;
  }
}

function LayoutEditor({ layout, onChange, onReset }) {
  const dragIndex = useRef(null);

  const handleDrop = (index) => {
    if (dragIndex.current === null || dragIndex.current === index) return;
    const next = [...layout];
    const [moved] = next.splice(dragIndex.current, 1);
    next.splice(index, 0, moved);
    dragIndex.current = null;
    onChange(next);
  };

  const toggleVisible = (id, visible) => {
    onChange(layout.map((p) => (p.id === id ? { ...p, visible } : p)));
  };

  return (
    <div>
      <div className="layout-editor">
        {layout.map((item, index) => (
          <div
            key={item.id}
            className="layout-editor-row"
            draggable
            onDragStart={() => (dragIndex.current = index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(index)}
          >
            <HolderOutlined className="layout-editor-handle" />
            <Checkbox checked={item.visible} onChange={(e) => toggleVisible(item.id, e.target.checked)} />
            <span className="layout-editor-icon">{PANEL_META[item.id].icon}</span>
            <span>{PANEL_META[item.id].title}</span>
          </div>
        ))}
      </div>
      <Button icon={<UndoOutlined />} onClick={onReset} style={{ marginTop: 12 }}>
        Reset to Default
      </Button>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [layout, setLayout] = useState(loadLayout);
  const [heights, setHeights] = useState(loadHeights);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const panelRefs = useRef({});

  const goToAssets = (params = {}) => {
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) value.forEach((v) => usp.append(key, v));
      else if (value !== undefined && value !== null && value !== '') usp.append(key, value);
    });
    const query = usp.toString();
    navigate(query ? `/assets?${query}` : '/assets');
  };

  useEffect(() => {
    client.get('/dashboard/summary').then((res) => setData(res.data));
  }, []);

  const saveLayout = (next) => {
    setLayout(next);
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(next));
  };

  const resetLayout = () => {
    saveLayout(DEFAULT_LAYOUT);
    setHeights({});
    localStorage.removeItem(HEIGHTS_KEY);
  };

  const saveHeight = (id, height) => {
    setHeights((prev) => {
      if (prev[id] === height) return prev;
      const next = { ...prev, [id]: height };
      localStorage.setItem(HEIGHTS_KEY, JSON.stringify(next));
      return next;
    });
  };

  if (!data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  const licensePct = data.licenseStats.total
    ? Math.round((data.licenseStats.licensed / data.licenseStats.total) * 100)
    : 0;

  return (
    <div className="dash-page">
      <div className="dash-hero-row">
        <div className="hero-card hero-card-clickable" onClick={() => goToAssets()}>
          <div className="hero-value">{data.total.toLocaleString('en-US')}</div>
          <div className="hero-label">Total Devices</div>
        </div>
        <StatusOverview
          statusCounts={data.statusCounts}
          total={data.total}
          onStatusClick={(status) => goToAssets({ status })}
        />
      </div>

      <div className="kpi-strip">
        <KpiCell
          label="Total Asset Value"
          value={`${(data.totalValue / 1000000).toLocaleString('en-US', { maximumFractionDigits: 1 })}M`}
        />
        <KpiCell
          label="Damaged"
          value={data.statusCounts.Damaged}
          tone={data.statusCounts.Damaged > 0 ? 'negative' : undefined}
          onClick={() => goToAssets({ status: 'Damaged' })}
        />
        <KpiCell
          label="Lost"
          value={data.statusCounts.Lost}
          tone={data.statusCounts.Lost > 0 ? 'negative' : undefined}
          onClick={() => goToAssets({ status: 'Lost' })}
        />
        <KpiCell
          label="Win 11 Licensed"
          value={`${licensePct}%`}
          sub={`${data.licenseStats.licensed}/${data.licenseStats.total} laptops`}
          onClick={() => goToAssets({ type: 'LAPTOP', license: 'true' })}
        />
      </div>

      <div className="dash-toolbar">
        <div className="dash-toolbar-title">Charts &amp; Insights</div>
        <Button icon={<SettingOutlined />} onClick={() => setCustomizeOpen(true)}>
          Customize Layout
        </Button>
      </div>

      <div className="panel-grid">
        {layout
          .filter((p) => p.visible)
          .map(({ id }) => (
            <div
              key={id}
              className="panel panel-resizable"
              style={heights[id] ? { height: heights[id] } : undefined}
              ref={(el) => (panelRefs.current[id] = el)}
              onMouseUp={() => {
                const el = panelRefs.current[id];
                if (el) saveHeight(id, el.offsetHeight);
              }}
            >
              <h3>
                {PANEL_META[id].icon} {PANEL_META[id].title}
              </h3>
              <div className="panel-body">{panelBody(id, data, goToAssets)}</div>
            </div>
          ))}
      </div>

      <Modal
        title="Customize Dashboard Layout"
        open={customizeOpen}
        onCancel={() => setCustomizeOpen(false)}
        onOk={() => setCustomizeOpen(false)}
        okText="Done"
        cancelButtonProps={{ style: { display: 'none' } }}
        width="min(420px, 92vw)"
      >
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: -4 }}>
          Drag to reorder, toggle to show or hide a panel. Drag a panel's bottom-right corner to resize it.
        </p>
        <LayoutEditor layout={layout} onChange={saveLayout} onReset={resetLayout} />
      </Modal>
    </div>
  );
}
