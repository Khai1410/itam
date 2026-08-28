import { useEffect, useState } from 'react';
import { Table, Input, Button, Modal, Form, Select, Space, message, DatePicker, Dropdown } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import client from '../api/client';
import { useAuth } from '../auth.jsx';
import ResizableTitle from '../components/ResizableTitle.jsx';

const BUSINESS_UNITS = ['Project', 'BO', 'CTD', 'AM', 'Undirect IT Staff'];
const JOB_FAMILIES = ['Business Support', 'CEO', 'CTD', 'Data', 'HR', 'Marketing', 'OP', 'Sales', 'Tech'];
const PROJECTS = ['CTD', 'Odoo', 'Operation Team', 'Resource Pool', 'Venture'];
const LOCATIONS = ['HCM', 'HN'];

// Adapts a single-value Form field to/from the array shape antd's Select
// (mode="tags") needs — lets the user pick from `options` or type a free value,
// while the form still stores a plain string.
const singleTagField = {
  getValueProps: (value) => ({ value: value ? [value] : [] }),
  getValueFromEvent: (vals) => (Array.isArray(vals) ? vals[vals.length - 1] : vals),
};

export default function Employees() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const [contextMenu, setContextMenu] = useState(null); // { record, x, y }
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [managerOptions, setManagerOptions] = useState([]);

  useEffect(() => {
    client.get('/employees').then((res) =>
      setManagerOptions(
        res.data
          .filter((e) => e.name)
          .map((e) => ({ value: e.name, label: e.name, account: e.account }))
      )
    );
  }, []);

  const handleManagerChange = (vals) => {
    const name = Array.isArray(vals) ? vals[vals.length - 1] : vals;
    const match = managerOptions.find((o) => o.value === name);
    form.setFieldsValue({ line_manager_domain: match?.account || null });
  };

  const fetchData = (q) => {
    setLoading(true);
    setSelectedRowKeys([]);
    client
      .get('/employees', { params: { q } })
      .then((res) => setRows(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: 'Active', onboard_date: dayjs() });
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      ...record,
      onboard_date: record.onboard_date ? dayjs(record.onboard_date) : null,
      last_date: record.last_date ? dayjs(record.last_date) : null,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    await client.delete(`/employees/${id}`);
    message.success('Employee deleted');
    fetchData();
  };

  const confirmDelete = (record) => {
    Modal.confirm({
      title: 'Delete this employee?',
      content: `${record.name}${record.account ? ` (${record.account})` : ''}`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => handleDelete(record.id),
    });
  };

  const contextMenuItems = contextMenu
    ? [
        { key: 'edit', label: 'Edit', icon: <EditOutlined /> },
        { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true },
      ]
    : [];

  const handleContextMenuClick = ({ key }) => {
    const record = contextMenu?.record;
    setContextMenu(null);
    if (!record) return;
    if (key === 'edit') openEdit(record);
    if (key === 'delete') confirmDelete(record);
  };

  const selectedEmployees = rows.filter((r) => selectedRowKeys.includes(r.id));

  const confirmBulkDelete = () => {
    Modal.confirm({
      title: `Delete ${selectedRowKeys.length} employee(s)?`,
      content: (
        <div style={{ maxHeight: 240, overflowY: 'auto' }}>
          {selectedEmployees.map((e) => (
            <div key={e.id}>
              {e.name} {e.account ? `(${e.account})` : ''}
            </div>
          ))}
        </div>
      ),
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        await client.post('/employees/bulk-delete', { ids: selectedRowKeys });
        message.success(`Deleted ${selectedRowKeys.length} employee(s)`);
        setSelectedRowKeys([]);
        fetchData();
      },
    });
  };

  const selectAllInactive = () => {
    const inactiveIds = rows.filter((r) => r.status === 'Inactive').map((r) => r.id);
    setSelectedRowKeys(inactiveIds);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const payload = {
      ...values,
      onboard_date: values.onboard_date ? values.onboard_date.format('YYYY-MM-DD') : null,
      last_date: values.last_date ? values.last_date.format('YYYY-MM-DD') : null,
    };
    if (editing) {
      await client.put(`/employees/${editing.id}`, payload);
      message.success('Employee updated');
    } else {
      await client.post('/employees', payload);
      message.success('Employee added (onboarded)');
    }
    setModalOpen(false);
    fetchData();
  };

  const [columns, setColumns] = useState(() => [
    { title: 'Name', dataIndex: 'name', width: 200, ellipsis: true },
    { title: 'Account', dataIndex: 'account', width: 180, ellipsis: true },
    { title: 'Job Title', dataIndex: 'job_title', width: 200, ellipsis: true },
    { title: 'Location', dataIndex: 'location', width: 90 },
    { title: 'Line Manager', dataIndex: 'line_manager', width: 180, ellipsis: true },
    {
      title: 'Onboard Date',
      dataIndex: 'onboard_date',
      width: 120,
      render: (v) => (v ? new Date(v).toLocaleDateString('en-GB') : ''),
    },
    { title: 'Status', dataIndex: 'status', width: 90 },
  ]);

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
          {rows.length.toLocaleString('en-US')} employees
          {selectedRowKeys.length > 0 ? ` — ${selectedRowKeys.length} selected` : ''}
        </div>
        {isAdmin && (
          <Space>
            {selectedRowKeys.length > 0 && (
              <Button danger icon={<DeleteOutlined />} onClick={confirmBulkDelete}>
                Delete Selected ({selectedRowKeys.length})
              </Button>
            )}
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Add Employee (Onboard)
            </Button>
          </Space>
        )}
      </div>

      <div className="filters-row">
        <Input.Search
          placeholder="Search by name or account..."
          allowClear
          style={{ width: 280 }}
          onSearch={fetchData}
        />
        {isAdmin && (
          <Button onClick={selectAllInactive}>Select all Inactive</Button>
        )}
      </div>

      <div className="table-panel">
        <Table
          rowKey="id"
          size="middle"
          loading={loading}
          dataSource={rows}
          columns={resizableColumns}
          components={{ header: { cell: ResizableTitle } }}
          tableLayout="fixed"
          scroll={{ y: 'calc(100vh - 320px)' }}
          rowClassName={() => (isAdmin ? 'row-context-menu' : '')}
          rowSelection={
            isAdmin
              ? {
                  selectedRowKeys,
                  onChange: setSelectedRowKeys,
                }
              : undefined
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
        title={editing ? 'Edit Employee' : 'Add Employee (Onboard)'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        width="min(640px, 94vw)"
        okText="Save"
        cancelText="Cancel"
      >
        <Form form={form} layout="vertical">
          <Space wrap style={{ width: '100%' }} size="middle">
            <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
              <Input style={{ width: 220 }} />
            </Form.Item>
            <Form.Item name="account" label="Account" rules={[{ required: true }]}>
              <Input style={{ width: 160 }} />
            </Form.Item>
            <Form.Item name="job_title" label="Job Title">
              <Input style={{ width: 200 }} />
            </Form.Item>
            <Form.Item name="business_unit" label="Business Unit" {...singleTagField}>
              <Select
                mode="tags"
                style={{ width: 180 }}
                options={BUSINESS_UNITS.map((v) => ({ value: v, label: v }))}
                placeholder="Select or type..."
              />
            </Form.Item>
            <Form.Item name="job_family" label="Job Family" {...singleTagField}>
              <Select
                mode="tags"
                style={{ width: 160 }}
                options={JOB_FAMILIES.map((v) => ({ value: v, label: v }))}
                placeholder="Select or type..."
              />
            </Form.Item>
            <Form.Item name="project" label="Project" {...singleTagField}>
              <Select
                mode="tags"
                style={{ width: 160 }}
                options={PROJECTS.map((v) => ({ value: v, label: v }))}
                placeholder="Select or type..."
              />
            </Form.Item>
            <Form.Item name="location" label="Location" {...singleTagField}>
              <Select
                mode="tags"
                style={{ width: 130 }}
                options={LOCATIONS.map((v) => ({ value: v, label: v }))}
                placeholder="Select or type..."
              />
            </Form.Item>
            <Form.Item name="line_manager" label="Line Manager" {...singleTagField}>
              <Select
                mode="tags"
                style={{ width: 220 }}
                options={managerOptions}
                onChange={handleManagerChange}
                placeholder="Select or type..."
              />
            </Form.Item>
            <Form.Item name="line_manager_domain" label="Line Manager Domain">
              <Input style={{ width: 160 }} />
            </Form.Item>
            <Form.Item name="onboard_date" label="Onboard Date" rules={[{ required: true }]}>
              <DatePicker style={{ width: 160 }} />
            </Form.Item>
            <Form.Item name="last_date" label="Last Working Day (if any)">
              <DatePicker style={{ width: 160 }} />
            </Form.Item>
            <Form.Item name="status" label="Status" rules={[{ required: true }]}>
              <Select
                style={{ width: 140 }}
                options={[
                  { value: 'Active', label: 'Active' },
                  { value: 'Inactive', label: 'Inactive' },
                ]}
              />
            </Form.Item>
          </Space>
          <Form.Item name="note" label="Note">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
