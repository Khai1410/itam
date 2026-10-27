import { useEffect, useState } from 'react';
import { Table, Descriptions, Tag, Spin, Empty } from 'antd';
import client from '../api/client';
import { useAuth } from '../auth.jsx';

const STATUS_COLORS = {
  'In Use': '#2a78d6',
  'In Stock': '#1baf7a',
  Damaged: '#fab219',
  Lost: '#d03b3b',
  Sold: '#8b8f9b',
  Warranty: '#4a3aa7',
};

export default function MyAssets() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    client
      .get('/employees/me/assets')
      .then((res) => setResult(res.data))
      .catch((err) => {
        if (err.response?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <Spin />
      </div>
    );
  }

  if (notFound || !result) {
    return (
      <div className="panel">
        <Empty
          description={
            <>
              No device information is linked to <b>{user?.username}</b> yet.
              <br />
              Please contact IT if this looks wrong.
            </>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <div className="panel">
        <h3>Employee Information</h3>
        <Descriptions column={{ xs: 1, sm: 1, md: 2 }} size="small">
          <Descriptions.Item label="Name">{result.employee.name}</Descriptions.Item>
          <Descriptions.Item label="Account">{result.employee.account}</Descriptions.Item>
          <Descriptions.Item label="Job Title">{result.employee.job_title}</Descriptions.Item>
          <Descriptions.Item label="Business Unit">{result.employee.business_unit}</Descriptions.Item>
          <Descriptions.Item label="Project">{result.employee.project}</Descriptions.Item>
          <Descriptions.Item label="Location">{result.employee.location}</Descriptions.Item>
        </Descriptions>
      </div>

      <div className="panel">
        <h3>Assigned Assets ({result.assets.length})</h3>
        <Table
          rowKey="id"
          size="small"
          dataSource={result.assets}
          pagination={false}
          locale={{ emptyText: 'No devices currently assigned to you' }}
          columns={[
            { title: 'Type', dataIndex: 'device_name', width: 110 },
            { title: 'Label', dataIndex: 'label', width: 110 },
            { title: 'Description', dataIndex: 'description' },
            { title: 'Serial Number', dataIndex: 'serial_number', width: 160 },
            {
              title: 'Status',
              dataIndex: 'condition',
              width: 100,
              render: (v) => (v ? <Tag color={STATUS_COLORS[v] || 'default'}>{v}</Tag> : ''),
            },
          ]}
        />
      </div>
    </div>
  );
}
