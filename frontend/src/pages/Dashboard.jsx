import { useEffect, useState } from 'react';
import { Spin } from 'antd';
import {
  AppstoreOutlined,
  CheckCircleOutlined,
  InboxOutlined,
  WarningOutlined,
  QuestionCircleOutlined,
  DollarCircleOutlined,
  SafetyCertificateOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  HddOutlined,
} from '@ant-design/icons';
import client from '../api/client';
import BarList from '../components/BarList.jsx';

const STATUS_META = {
  'In Use': { color: 'var(--status-in-use)', icon: <CheckCircleOutlined /> },
  'In Stock': { color: 'var(--status-in-stock)', icon: <InboxOutlined /> },
  Damaged: { color: 'var(--status-damaged)', icon: <WarningOutlined /> },
  Lost: { color: 'var(--status-lost)', icon: <QuestionCircleOutlined /> },
  Sold: { color: 'var(--status-sold)', icon: <DollarCircleOutlined /> },
  Warranty: { color: 'var(--status-warranty)', icon: <SafetyCertificateOutlined /> },
};

function StatSeg({ label, value, color, icon, hero }) {
  return (
    <div className={`stat-seg${hero ? ' stat-seg-hero' : ''}`} style={color ? { '--tile-color': color } : undefined}>
      <div className="stat-seg-icon">{icon}</div>
      <div className="stat-seg-body">
        <div className="stat-seg-value">{value}</div>
        <div className="stat-seg-label">{label}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    client.get('/dashboard/summary').then((res) => setData(res.data));
  }, []);

  if (!data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div className="stats-strip">
        <StatSeg label="Total Devices" value={data.total} color="var(--brand)" icon={<AppstoreOutlined />} hero />
        {Object.entries(data.statusCounts).map(([status, value]) => (
          <StatSeg
            key={status}
            label={status}
            value={value}
            color={STATUS_META[status]?.color}
            icon={STATUS_META[status]?.icon}
          />
        ))}
      </div>

      <div className="panel-grid">
        <div className="panel">
          <h3>
            <AppstoreOutlined /> By Device Type
          </h3>
          <BarList rows={data.byType} labelKey="device_name" color="var(--series-1)" />
        </div>

        <div className="panel">
          <h3>
            <EnvironmentOutlined /> By Location
          </h3>
          <BarList rows={data.byLocation} labelKey="location" color="var(--series-2)" />
        </div>

        <div className="panel">
          <h3>
            <TeamOutlined /> By Business Unit
          </h3>
          <BarList rows={data.byBusinessUnit} labelKey="business_unit" color="var(--series-3)" />
        </div>

        <div className="panel">
          <h3>
            <ThunderboltOutlined /> Laptops by Chip
          </h3>
          <BarList rows={data.byChip} labelKey="chip" color="var(--series-4)" />
        </div>

        <div className="panel">
          <h3>
            <HddOutlined /> Laptops by Storage
          </h3>
          <BarList rows={data.byStorage} labelKey="storage" color="var(--series-5)" />
        </div>
      </div>
    </div>
  );
}
