import { useEffect, useState } from 'react';
import { Row, Col, Spin } from 'antd';
import client from '../api/client';
import StatTile from '../components/StatTile.jsx';
import BarList from '../components/BarList.jsx';

const STATUS_COLORS = {
  'In Use': 'var(--status-in-use)',
  'In Stock': 'var(--status-in-stock)',
  Damaged: 'var(--status-damaged)',
  Lost: 'var(--status-lost)',
  Sold: 'var(--status-sold)',
  Warranty: 'var(--status-warranty)',
};

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
      <div className="stat-grid">
        <StatTile label="Total Devices" value={data.total} color="var(--brand)" />
        {Object.entries(data.statusCounts).map(([status, value]) => (
          <StatTile key={status} label={status} value={value} color={STATUS_COLORS[status]} />
        ))}
      </div>

      <Row gutter={[20, 0]}>
        <Col xs={24} lg={12}>
          <div className="panel">
            <h3>By Device Type</h3>
            <BarList rows={data.byType} labelKey="device_name" color="var(--series-1)" />
          </div>
        </Col>
        <Col xs={24} lg={12}>
          <div className="panel">
            <h3>By Location</h3>
            <BarList rows={data.byLocation} labelKey="location" color="var(--series-2)" />
          </div>
        </Col>
      </Row>

      <Row gutter={[20, 0]}>
        <Col xs={24} lg={12}>
          <div className="panel">
            <h3>By Business Unit</h3>
            <BarList rows={data.byBusinessUnit} labelKey="business_unit" color="var(--series-3)" />
          </div>
        </Col>
        <Col xs={24} lg={12}>
          <div className="panel">
            <h3>Laptops by Chip</h3>
            <BarList rows={data.byChip} labelKey="chip" color="var(--series-4)" />
          </div>
        </Col>
      </Row>

      <Row gutter={[20, 0]}>
        <Col xs={24} lg={12}>
          <div className="panel">
            <h3>Laptops by Storage</h3>
            <BarList rows={data.byStorage} labelKey="storage" color="var(--series-5)" />
          </div>
        </Col>
      </Row>
    </div>
  );
}
