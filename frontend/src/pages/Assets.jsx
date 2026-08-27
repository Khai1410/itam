import { useEffect, useState, useCallback } from 'react';
import { Table, Input, Select, Button, Modal, Form, Space, message, InputNumber, DatePicker, Checkbox, Dropdown, Tag, Upload } from 'antd';
import { PlusOutlined, DownloadOutlined, UploadOutlined, EditOutlined, DeleteOutlined, HistoryOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import client from '../api/client';
import { useAuth } from '../auth.jsx';
import ResizableTitle from '../components/ResizableTitle.jsx';

const DEVICE_TYPES = ['LAPTOP', 'MONITOR', 'MOUSE', 'IPAD', 'SMARTPHONE', 'CABLE', 'SSD', 'RAM', 'CPU', 'ROUTER', 'PRINTER', 'SPEAKER'];
const STATUSES = ['In Use', 'In Stock', 'Damaged', 'Lost', 'Sold', 'Warranty'];
const LOCATIONS = ['HCM', 'HN'];
const BUSINESS_UNITS = ['Project', 'BO', 'CTD', 'AM', 'Undirect IT Staff'];
const JOB_FAMILIES = ['Business Support', 'CEO', 'CTD', 'Data', 'HR', 'Marketing', 'OP', 'Sales', 'Tech'];
const PROJECTS = ['CTD', 'Odoo', 'Operation Team', 'Resource Pool', 'Venture'];
const BRANDS = ['Apple', 'Brother', 'Dell', 'Intel', 'Kingston', 'Lenovo', 'Logitech', 'Oppo', 'SamSung', 'TP-Link', 'Urgeen'];
const CHIPS = ['M1', 'M2', 'M3', 'M4', 'i5', 'i7'];

const STATUS_COLORS = {
  'In Use': '#2a78d6',
  'In Stock': '#1baf7a',
  Damaged: '#fab219',
  Lost: '#d03b3b',
  Sold: '#8b8f9b',
  Warranty: '#4a3aa7',
};

const STATUS_ROW_CLASS = {
  'In Use': 'row-status-in-use',
  'In Stock': 'row-status-in-stock',
  Damaged: 'row-status-damaged',
  Lost: 'row-status-lost',
  Sold: 'row-status-sold',
  Warranty: 'row-status-warranty',
};

const INITIAL_COLUMNS = [
  { title: 'No', dataIndex: 'no', width: 70, fixed: 'left' },
  { title: 'Type', dataIndex: 'device_name', width: 110, fixed: 'left' },
  { title: 'Label', dataIndex: 'label', width: 110, fixed: 'left' },
  { title: 'Old Label', dataIndex: 'old_label', width: 110, fixed: 'left' },
  {
    title: 'Status',
    dataIndex: 'condition',
    width: 110,
    render: (v) => (v ? <Tag color={STATUS_COLORS[v] || 'default'}>{v}</Tag> : ''),
  },
  { title: 'Location', dataIndex: 'location', width: 90 },
  { title: 'Business Unit', dataIndex: 'business_unit', width: 140 },
  { title: 'Job Family', dataIndex: 'job_family', width: 110 },
  { title: 'Project', dataIndex: 'project', width: 110 },
  { title: 'Brand', dataIndex: 'brand', width: 100 },
  { title: 'Chip', dataIndex: 'chip', width: 80 },
  { title: 'Storage', dataIndex: 'storage', width: 90 },
  {
    title: 'License Win 11 Pro',
    dataIndex: 'license_win11',
    width: 140,
    render: (v) => (v ? 'Yes' : 'No'),
  },
  { title: 'Description', dataIndex: 'description', width: 220 },
  { title: 'Serial Number', dataIndex: 'serial_number', width: 150 },
  { title: 'Vendor', dataIndex: 'vendor', width: 110 },
  {
    title: 'Price',
    dataIndex: 'price',
    width: 120,
    render: (v) => (v || v === 0 ? Number(v).toLocaleString('en-US') : ''),
  },
  {
    title: 'Purchase Date',
    dataIndex: 'purchase_date',
    width: 120,
    render: (v) => (v ? new Date(v).toLocaleDateString('en-GB') : ''),
  },
  { title: 'Assigned To', dataIndex: 'employee_name', width: 160 },
  { title: 'Employee Dept', dataIndex: 'employee_dept', width: 130 },
  { title: 'Line Manager', dataIndex: 'line_manager', width: 160 },
  { title: 'Note', dataIndex: 'note', width: 150 },
];

function buildQueryString(params) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value.forEach((v) => usp.append(key, v));
    } else {
      usp.append(key, value);
    }
  });
  return usp.toString();
}

async function downloadExport(format, params) {
  const query = buildQueryString(params);
  const res = await client.get(`/export/assets.${format}?${query}`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `assets.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function Assets() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState(INITIAL_COLUMNS);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const [contextMenu, setContextMenu] = useState(null); // { record, x, y }
  const [employees, setEmployees] = useState([]);
  const [historyAsset, setHistoryAsset] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    client
      .get('/assets', { params: { ...filters, page, pageSize } })
      .then((res) => {
        setRows(res.data.data);
        setTotal(res.data.total);
      })
      .finally(() => setLoading(false));
  }, [filters, page, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    client.get('/employees').then((res) => setEmployees(res.data));
  }, []);

  const handleEmployeeSelect = (name) => {
    const emp = employees.find((e) => e.name === name);
    form.setFieldsValue({
      business_unit: emp?.business_unit ?? null,
      job_family: emp?.job_family ?? null,
      project: emp?.project ?? null,
      employee_dept: emp?.job_family ?? null,
      line_manager: emp?.line_manager ?? null,
    });
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      ...record,
      purchase_date: record.purchase_date ? dayjs(record.purchase_date) : null,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    await client.delete(`/assets/${id}`);
    message.success('Asset deleted');
    fetchData();
  };

  const confirmDelete = (record) => {
    Modal.confirm({
      title: 'Delete this asset?',
      content: `${record.device_name} — ${record.label || record.serial_number || `#${record.id}`}`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => handleDelete(record.id),
    });
  };

  const openHistory = (record) => {
    setHistoryAsset(record);
    setHistoryLoading(true);
    client
      .get(`/assets/${record.id}/history`)
      .then((res) => setHistoryRows(res.data))
      .finally(() => setHistoryLoading(false));
  };

  const contextMenuItems = contextMenu
    ? [
        { key: 'edit', label: 'Edit', icon: <EditOutlined /> },
        { key: 'history', label: 'Assignment History', icon: <HistoryOutlined /> },
        { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true },
      ]
    : [];

  const handleContextMenuClick = ({ key }) => {
    const record = contextMenu?.record;
    setContextMenu(null);
    if (!record) return;
    if (key === 'edit') openEdit(record);
    if (key === 'history') openHistory(record);
    if (key === 'delete') confirmDelete(record);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const payload = {
      ...values,
      purchase_date: values.purchase_date ? values.purchase_date.format('YYYY-MM-DD') : null,
    };
    // A cleared Select/value becomes `undefined`, which JSON.stringify silently drops from
    // the request body — normalize to null so the backend actually receives the clear.
    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) payload[key] = null;
    });
    if (editing) {
      await client.put(`/assets/${editing.id}`, payload);
      message.success('Asset updated');
    } else {
      await client.post('/assets', payload);
      message.success('Asset added');
    }
    setModalOpen(false);
    fetchData();
  };

  const handleImport = async ({ file, onSuccess, onError }) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await client.post('/assets/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onSuccess?.(res.data);
      const { created, updated, skipped, errors } = res.data;
      message.success(`Import done — ${created} added, ${updated} updated${skipped ? `, ${skipped} skipped` : ''}`);
      if (errors?.length) {
        Modal.warning({
          title: `Import finished with ${errors.length} warning(s)`,
          width: 560,
          content: (
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {errors.map((e, i) => (
                <div key={i}>{e}</div>
              ))}
            </div>
          ),
        });
      }
      fetchData();
    } catch (err) {
      onError?.(err);
      message.error(err.response?.data?.error || 'Import failed');
    }
  };

  const handleResize = (index) => (_, { size }) => {
    setColumns((cols) => {
      const next = [...cols];
      next[index] = { ...next[index], width: size.width };
      return next;
    });
  };

  const resizableColumns = columns.map((col, index) => ({
    ...col,
    onHeaderCell: (column) => ({
      width: column.width,
      onResize: handleResize(index),
    }),
  }));

  return (
    <div>
      <div className="toolbar">
        <div style={{ color: 'var(--text-secondary)', fontSize: 13.5 }}>
          {total.toLocaleString('en-US')} assets
        </div>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={() => downloadExport('xlsx', filters)}>
            Export Excel
          </Button>
          <Button icon={<DownloadOutlined />} onClick={() => downloadExport('csv', filters)}>
            Export CSV
          </Button>
          {isAdmin && (
            <>
              <Upload accept=".xlsx" showUploadList={false} customRequest={handleImport}>
                <Button icon={<UploadOutlined />}>Import Excel</Button>
              </Upload>
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                Add Asset
              </Button>
            </>
          )}
        </Space>
      </div>

      <div className="filters-row">
        <Input.Search
          placeholder="Search by label, serial, description, employee..."
          allowClear
          style={{ width: 280 }}
          onSearch={(q) => {
            setPage(1);
            setFilters((f) => ({ ...f, q }));
          }}
        />
        <Select
          mode="multiple"
          maxTagCount="responsive"
          placeholder="Device Type"
          allowClear
          style={{ width: 180 }}
          options={DEVICE_TYPES.map((v) => ({ value: v, label: v }))}
          onChange={(type) => {
            setPage(1);
            setFilters((f) => ({ ...f, type }));
          }}
        />
        <Select
          mode="multiple"
          maxTagCount="responsive"
          placeholder="Status"
          allowClear
          style={{ width: 160 }}
          options={STATUSES.map((v) => ({ value: v, label: v }))}
          onChange={(status) => {
            setPage(1);
            setFilters((f) => ({ ...f, status }));
          }}
        />
        <Select
          mode="multiple"
          maxTagCount="responsive"
          placeholder="Location"
          allowClear
          style={{ width: 140 }}
          options={LOCATIONS.map((v) => ({ value: v, label: v }))}
          onChange={(location) => {
            setPage(1);
            setFilters((f) => ({ ...f, location }));
          }}
        />
        <Select
          mode="multiple"
          maxTagCount="responsive"
          placeholder="Business Unit"
          allowClear
          style={{ width: 190 }}
          options={BUSINESS_UNITS.map((v) => ({ value: v, label: v }))}
          onChange={(businessUnit) => {
            setPage(1);
            setFilters((f) => ({ ...f, businessUnit }));
          }}
        />
        <Select
          mode="multiple"
          maxTagCount="responsive"
          placeholder="Job Family"
          allowClear
          style={{ width: 180 }}
          options={JOB_FAMILIES.map((v) => ({ value: v, label: v }))}
          onChange={(jobFamily) => {
            setPage(1);
            setFilters((f) => ({ ...f, jobFamily }));
          }}
        />
        <Select
          mode="multiple"
          maxTagCount="responsive"
          placeholder="Project"
          allowClear
          style={{ width: 180 }}
          options={PROJECTS.map((v) => ({ value: v, label: v }))}
          onChange={(project) => {
            setPage(1);
            setFilters((f) => ({ ...f, project }));
          }}
        />
        <Select
          mode="multiple"
          maxTagCount="responsive"
          placeholder="Brand"
          allowClear
          style={{ width: 160 }}
          options={BRANDS.map((v) => ({ value: v, label: v }))}
          onChange={(brand) => {
            setPage(1);
            setFilters((f) => ({ ...f, brand }));
          }}
        />
        <Select
          mode="multiple"
          maxTagCount="responsive"
          placeholder="Chip"
          allowClear
          style={{ width: 120 }}
          options={CHIPS.map((v) => ({ value: v, label: v }))}
          onChange={(chip) => {
            setPage(1);
            setFilters((f) => ({ ...f, chip }));
          }}
        />
        <Select
          placeholder="License Win 11 Pro"
          allowClear
          style={{ width: 170 }}
          options={[
            { value: 'true', label: 'Licensed' },
            { value: 'false', label: 'Not Licensed' },
          ]}
          onChange={(license) => {
            setPage(1);
            setFilters((f) => ({ ...f, license }));
          }}
        />
        <Select
          mode="multiple"
          maxTagCount="responsive"
          showSearch
          placeholder="Assigned To"
          allowClear
          style={{ width: 220 }}
          optionFilterProp="label"
          options={employees.map((e) => ({ value: e.name, label: `${e.name} (${e.account || '-'})` }))}
          onChange={(employee) => {
            setPage(1);
            setFilters((f) => ({ ...f, employee }));
          }}
        />
        <Select
          mode="multiple"
          maxTagCount="responsive"
          placeholder="Employee Dept"
          allowClear
          style={{ width: 180 }}
          options={JOB_FAMILIES.map((v) => ({ value: v, label: v }))}
          onChange={(employeeDept) => {
            setPage(1);
            setFilters((f) => ({ ...f, employeeDept }));
          }}
        />
      </div>

      <div className="table-panel">
        <Table
          rowKey="id"
          columns={resizableColumns}
          components={{ header: { cell: ResizableTitle } }}
          dataSource={rows}
          loading={loading}
          size="middle"
          scroll={{ x: 'max-content', y: 'calc(100vh - 340px)' }}
          rowClassName={(record) =>
            [isAdmin ? 'row-context-menu' : '', STATUS_ROW_CLASS[record.condition] || '']
              .filter(Boolean)
              .join(' ')
          }
          onRow={
            isAdmin
              ? (record) => ({
                  onContextMenu: (event) => {
                    event.preventDefault();
                    setContextMenu({ record, x: event.clientX, y: event.clientY });
                  },
                  onDoubleClick: () => openEdit(record),
                })
              : undefined
          }
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </div>

      {contextMenu && (
        <Dropdown
          open
          menu={{ items: contextMenuItems, onClick: handleContextMenuClick }}
          onOpenChange={(open) => !open && setContextMenu(null)}
        >
          <div style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, width: 1, height: 1 }} />
        </Dropdown>
      )}

      <Modal
        title={editing ? 'Edit Asset' : 'Add Asset'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        width="min(720px, 94vw)"
        okText="Save"
        cancelText="Cancel"
      >
        <Form form={form} layout="vertical">
          <Space wrap style={{ width: '100%' }} size="middle">
            <Form.Item name="no" label="No">
              <InputNumber style={{ width: 100 }} />
            </Form.Item>
            <Form.Item name="device_name" label="Device Type" rules={[{ required: true }]}>
              <Select style={{ width: 160 }} options={DEVICE_TYPES.map((v) => ({ value: v, label: v }))} />
            </Form.Item>
            <Form.Item name="condition" label="Status" rules={[{ required: true }]}>
              <Select style={{ width: 140 }} options={STATUSES.map((v) => ({ value: v, label: v }))} />
            </Form.Item>
            <Form.Item name="location" label="Location">
              <Select style={{ width: 120 }} options={LOCATIONS.map((v) => ({ value: v, label: v }))} />
            </Form.Item>
            <Form.Item
              name="business_unit"
              label="Business Unit"
              tooltip="Auto-filled from the assigned employee."
            >
              <Input style={{ width: 170 }} disabled />
            </Form.Item>
            <Form.Item name="job_family" label="Job Family" tooltip="Auto-filled from the assigned employee.">
              <Input style={{ width: 150 }} disabled />
            </Form.Item>
            <Form.Item name="project" label="Project" tooltip="Auto-filled from the assigned employee.">
              <Input style={{ width: 150 }} disabled />
            </Form.Item>
            <Form.Item name="label" label="Label">
              <Input style={{ width: 150 }} />
            </Form.Item>
            <Form.Item name="old_label" label="Old Label">
              <Input style={{ width: 150 }} />
            </Form.Item>
            <Form.Item name="brand" label="Brand">
              <Input style={{ width: 150 }} />
            </Form.Item>
            <Form.Item name="chip" label="Chip">
              <Input style={{ width: 100 }} />
            </Form.Item>
            <Form.Item name="storage" label="Storage">
              <Input style={{ width: 100 }} />
            </Form.Item>
            <Form.Item name="serial_number" label="Serial Number">
              <Input style={{ width: 200 }} />
            </Form.Item>
            <Form.Item name="vendor" label="Vendor">
              <Input style={{ width: 150 }} />
            </Form.Item>
            <Form.Item name="price" label="Price">
              <InputNumber style={{ width: 150 }} />
            </Form.Item>
            <Form.Item name="purchase_date" label="Purchase Date">
              <DatePicker style={{ width: 160 }} />
            </Form.Item>
            <Form.Item
              name="license_win11"
              label="License Win 11 Pro"
              valuePropName="checked"
            >
              <Checkbox />
            </Form.Item>
            <Form.Item name="employee_name" label="Employee Name" tooltip="Select to assign this asset to an employee.">
              <Select
                showSearch
                allowClear
                style={{ width: 220 }}
                placeholder="Select employee..."
                optionFilterProp="label"
                options={employees.map((e) => ({ value: e.name, label: `${e.name} (${e.account || '-'})` }))}
                onChange={handleEmployeeSelect}
              />
            </Form.Item>
            <Form.Item
              name="employee_dept"
              label="Employee Dept"
              tooltip="Auto-filled from the assigned employee."
            >
              <Input style={{ width: 150 }} disabled />
            </Form.Item>
            <Form.Item
              name="line_manager"
              label="Line Manager"
              tooltip="Auto-filled from the assigned employee."
            >
              <Input style={{ width: 200 }} disabled />
            </Form.Item>
          </Space>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="note" label="Note">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          historyAsset
            ? `Assignment History — ${historyAsset.device_name}${historyAsset.label ? ` (${historyAsset.label})` : ''}`
            : 'Assignment History'
        }
        open={!!historyAsset}
        onCancel={() => setHistoryAsset(null)}
        footer={null}
        width="min(640px, 94vw)"
      >
        <Table
          rowKey="id"
          size="small"
          loading={historyLoading}
          dataSource={historyRows}
          pagination={false}
          columns={[
            { title: 'Employee', dataIndex: 'employee_name' },
            {
              title: 'Assigned At',
              dataIndex: 'assigned_at',
              width: 160,
              render: (v) => (v ? new Date(v).toLocaleString('en-GB') : ''),
            },
            {
              title: 'Unassigned At',
              dataIndex: 'unassigned_at',
              width: 160,
              render: (v) => (v ? new Date(v).toLocaleString('en-GB') : <Tag color="#1baf7a">Current</Tag>),
            },
          ]}
          locale={{ emptyText: 'No assignment history yet' }}
        />
      </Modal>
    </div>
  );
}
