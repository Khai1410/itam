import { useEffect, useState } from 'react';
import { Select, Table, Spin, Descriptions, Tag, Button, message } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import client from '../api/client';
import { VSOL_LOGO_DATA_URI } from '../assets/vsolLogo.js';
import ResizableTitle from '../components/ResizableTitle.jsx';

const INITIAL_ASSET_COLUMNS = [
  { title: 'Type', dataIndex: 'device_name', width: 110 },
  { title: 'Label', dataIndex: 'label', width: 110 },
  { title: 'Description', dataIndex: 'description', width: 220 },
  { title: 'Serial Number', dataIndex: 'serial_number', width: 160 },
  {
    title: 'Status',
    dataIndex: 'condition',
    width: 100,
    render: (v) => (v ? <Tag color={STATUS_COLORS[v] || 'default'}>{v}</Tag> : ''),
  },
];

const STATUS_COLORS = {
  'In Use': '#2a78d6',
  'In Stock': '#1baf7a',
  Damaged: '#fab219',
  Lost: '#d03b3b',
  Sold: '#8b8f9b',
  Warranty: '#4a3aa7',
};

const SENDER = {
  name: 'Nguyễn Viết Khải',
  title: 'Lead IT Support Engineer',
  address: '236/6 Dien Bien Phu St., Gia Dinh Ward, Ho Chi Minh City',
  mobile: '(+84) 916 090 617',
  email: 'khainv@vsol.vn',
  web: 'vsol.vn',
};

const EMAIL_SUBJECT = 'VSOL Asset Assignment Confirmation';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function firstNameOf(fullName) {
  const parts = (fullName || '').trim().split(/\s+/);
  return parts[parts.length - 1] || fullName || '';
}

function buildEmailHtml(employee, assets) {
  const rows = assets.length
    ? assets
        .map(
          (a) => `
      <tr>
        <td style="padding:8px 10px;border:1px solid #d9d9d9;">${escapeHtml(a.label)}</td>
        <td style="padding:8px 10px;border:1px solid #d9d9d9;">${escapeHtml(a.device_name)}</td>
        <td style="padding:8px 10px;border:1px solid #d9d9d9;">${escapeHtml(a.description)}</td>
        <td style="padding:8px 10px;border:1px solid #d9d9d9;">${escapeHtml(a.serial_number)}</td>
        <td style="padding:8px 10px;border:1px solid #d9d9d9;">${escapeHtml(a.location)}</td>
        <td style="padding:8px 10px;border:1px solid #d9d9d9;">${escapeHtml(a.condition)}</td>
      </tr>`
        )
        .join('')
    : `
      <tr><td colspan="6" style="padding:8px 10px;border:1px solid #d9d9d9;">(no devices assigned)</td></tr>`;

  return `
<div style="font-family:'Lexend Deca',Calibri,Arial,sans-serif;font-size:14px;color:#1f1f1f;line-height:1.5;">
  <p style="margin:0 0 12px;">Hi ${escapeHtml(firstNameOf(employee.name))},</p>
  <p style="margin:0 0 12px;">IT confirms that the equipment have been handed over as per the information below:</p>
  <table style="border-collapse:collapse;width:100%;margin:0 0 14px;">
    <thead>
      <tr style="background:#4472C4;color:#ffffff;">
        <th style="padding:8px 10px;border:1px solid #2f5597;text-align:left;">Label</th>
        <th style="padding:8px 10px;border:1px solid #2f5597;text-align:left;">Type</th>
        <th style="padding:8px 10px;border:1px solid #2f5597;text-align:left;">Description</th>
        <th style="padding:8px 10px;border:1px solid #2f5597;text-align:left;">Serial Number</th>
        <th style="padding:8px 10px;border:1px solid #2f5597;text-align:left;">Location</th>
        <th style="padding:8px 10px;border:1px solid #2f5597;text-align:left;">Status</th>
      </tr>
    </thead>
    <tbody>${rows}
    </tbody>
  </table>
  <p style="margin:0 0 16px;">Please review the information above and let us know if any corrections are required.</p>
  <p style="margin:0 0 10px;color:#2E75B6;font-weight:bold;">Thanks and Best Regards,</p>
  <table style="border-collapse:collapse;">
    <tr>
      <td style="vertical-align:middle;padding-right:16px;">
        <img src="${VSOL_LOGO_DATA_URI}" alt="VSOL" width="100" style="display:block;" />
      </td>
      <td style="padding-left:16px;vertical-align:middle;line-height:1.6;">
        <b style="color:#2E75B6;">${escapeHtml(SENDER.name)} | ${escapeHtml(SENDER.title)}</b><br/>
        <b>A:</b> ${escapeHtml(SENDER.address)}<br/>
        <b>M:</b> ${escapeHtml(SENDER.mobile)}<br/>
        <b>E:</b> <a href="mailto:${SENDER.email}" style="color:#2E75B6;">${SENDER.email}</a><br/>
        <b>W:</b> <a href="https://${SENDER.web}" style="color:#2E75B6;">${SENDER.web}</a>
      </td>
    </tr>
  </table>
</div>`;
}

function buildEmailPlainText(employee, assets) {
  const lines = assets.length
    ? assets
        .map(
          (a, i) =>
            `${i + 1}. ${a.label || '-'} | ${a.device_name || '-'} | ${a.description || '-'} | S/N: ${
              a.serial_number || '-'
            } | ${a.location || '-'} | ${a.condition || '-'}`
        )
        .join('\n')
    : '(no devices assigned)';

  return `Hi ${firstNameOf(employee.name)},

IT confirms that the equipment have been handed over as per the information below:

${lines}

Please review the information above and let us know if any corrections are required.

Thanks and Best Regards,

${SENDER.name} | ${SENDER.title}
A: ${SENDER.address}
M: ${SENDER.mobile}
E: ${SENDER.email}
W: ${SENDER.web}`;
}

export default function EmployeeLookup() {
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [assetColumns, setAssetColumns] = useState(INITIAL_ASSET_COLUMNS);

  useEffect(() => {
    client.get('/employees').then((res) => setEmployees(res.data));
  }, []);

  useEffect(() => {
    if (!selected) {
      setResult(null);
      return;
    }
    setLoading(true);
    client
      .get(`/employees/${selected}/assets`)
      .then((res) => setResult(res.data))
      .finally(() => setLoading(false));
  }, [selected]);

  const handleAssetResize = (index) => (_, { size }) => {
    setAssetColumns((cols) => {
      const next = [...cols];
      next[index] = { ...next[index], width: size.width };
      return next;
    });
  };

  const resizableAssetColumns = assetColumns.map((col, index) => ({
    ...col,
    onHeaderCell: (column) => ({
      width: column.width,
      onResize: handleAssetResize(index),
    }),
  }));

  const handleCopy = async () => {
    if (!result) return;
    const html = buildEmailHtml(result.employee, result.assets);
    const text = buildEmailPlainText(result.employee, result.assets);
    try {
      if (window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([text], { type: 'text/plain' }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(text);
      }
      message.success('Copied — paste into Outlook to keep the table & formatting');
    } catch {
      message.error('Could not copy — please copy manually');
    }
  };

  return (
    <div>
      <div className="panel">
        <h3>Select Employee</h3>
        <Select
          showSearch
          placeholder="Search by name or account..."
          style={{ width: 'min(340px, 100%)' }}
          size="large"
          optionFilterProp="label"
          options={employees.map((e) => ({ value: e.id, label: `${e.name} (${e.account || '-'})` }))}
          onChange={setSelected}
          allowClear
        />
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Spin />
        </div>
      )}

      {result && (
        <>
          <div className="panel">
            <h3>Employee Information</h3>
            <Descriptions column={{ xs: 1, sm: 1, md: 2 }} size="small">
              <Descriptions.Item label="Name">{result.employee.name}</Descriptions.Item>
              <Descriptions.Item label="Account">{result.employee.account}</Descriptions.Item>
              <Descriptions.Item label="Job Title">{result.employee.job_title}</Descriptions.Item>
              <Descriptions.Item label="Business Unit">{result.employee.business_unit}</Descriptions.Item>
              <Descriptions.Item label="Project">{result.employee.project}</Descriptions.Item>
              <Descriptions.Item label="Location">{result.employee.location}</Descriptions.Item>
              <Descriptions.Item label="Line Manager">{result.employee.line_manager}</Descriptions.Item>
              <Descriptions.Item label="Status">{result.employee.status}</Descriptions.Item>
            </Descriptions>
          </div>

          <div className="panel">
            <h3>Assigned Assets ({result.assets.length})</h3>
            <Table
              rowKey="id"
              size="small"
              dataSource={result.assets}
              pagination={false}
              tableLayout="fixed"
              columns={resizableAssetColumns}
              components={{ header: { cell: ResizableTitle } }}
            />
          </div>

          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0 }}>Handover Confirmation Email</h3>
              <Button size="small" type="primary" icon={<CopyOutlined />} onClick={handleCopy}>
                Copy
              </Button>
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 10 }}>
              <div>
                <b>To:</b> {result.employee.account || '(no account on file)'}
              </div>
              <div>
                <b>From:</b> {SENDER.email}
              </div>
              <div>
                <b>Subject:</b> {EMAIL_SUBJECT}
              </div>
            </div>
            <div
              style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '18px 20px',
              }}
              dangerouslySetInnerHTML={{ __html: buildEmailHtml(result.employee, result.assets) }}
            />
          </div>
        </>
      )}
    </div>
  );
}
