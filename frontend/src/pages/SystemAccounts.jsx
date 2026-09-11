import { useEffect, useRef, useState } from 'react';
import { Table, Input, Button, Modal, Form, Select, Space, message, Dropdown, Tooltip, Typography } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  CopyOutlined,
  LinkOutlined,
  HolderOutlined,
} from '@ant-design/icons';
import client from '../api/client';
import ResizableTitle from '../components/ResizableTitle.jsx';

const CATEGORIES = [
  'Cloud/SaaS', 'Domain/DNS', 'SSL Certificate', 'Email', 'Network', 'Network/Server',
  'Database/Hosting', 'Website/CMS', 'Legal/Government', 'Other',
];

// Adapts a single-value Form field to/from the array shape antd's Select
// (mode="tags") needs — lets the user pick from `options` or type a free value,
// while the form still stores a plain string.
const singleTagField = {
  getValueProps: (value) => ({ value: value ? [value] : [] }),
  getValueFromEvent: (vals) => (Array.isArray(vals) ? vals[vals.length - 1] : vals),
};

function CopyableText({ value }) {
  if (!value) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
      <Tooltip title="Copy">
        <Button
          size="small"
          type="text"
          icon={<CopyOutlined />}
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            message.success('Username copied');
          }}
        />
      </Tooltip>
    </div>
  );
}

function PasswordCell({ value }) {
  const [visible, setVisible] = useState(false);
  if (!value) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontFamily: 'monospace', fontSize: 12.5 }}>
        {visible ? value : '•'.repeat(Math.min(value.length, 10))}
      </span>
      <Tooltip title={visible ? 'Hide' : 'Show'}>
        <Button
          size="small"
          type="text"
          icon={visible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
          onClick={() => setVisible((v) => !v)}
        />
      </Tooltip>
      <Tooltip title="Copy">
        <Button
          size="small"
          type="text"
          icon={<CopyOutlined />}
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            message.success('Password copied');
          }}
        />
      </Tooltip>
    </div>
  );
}

export default function SystemAccounts() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const [contextMenu, setContextMenu] = useState(null);
  const [searchText, setSearchText] = useState('');
  const dragIndexRef = useRef(null);

  const categoryOptions = [...new Set([...CATEGORIES, ...rows.map((r) => r.category).filter(Boolean)])];

  const fetchData = (q) => {
    setLoading(true);
    client
      .get('/system-accounts', { params: { q } })
      .then((res) => setRows(res.data))
      .finally(() => setLoading(false));
  };

  const handleRowDrop = async (dropIndex) => {
    const dragIndex = dragIndexRef.current;
    dragIndexRef.current = null;
    if (dragIndex === null || dragIndex === dropIndex) return;

    const next = [...rows];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(dropIndex, 0, moved);
    setRows(next);

    try {
      await client.patch('/system-accounts/reorder', { ids: next.map((r) => r.id) });
    } catch {
      message.error('Could not save the new order');
      fetchData(searchText);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    await client.delete(`/system-accounts/${id}`);
    message.success('Account deleted');
    fetchData();
  };

  const confirmDelete = (record) => {
    Modal.confirm({
      title: 'Delete this system account?',
      content: record.system,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => handleDelete(record.id),
    });
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    Object.keys(values).forEach((key) => {
      if (values[key] === undefined) values[key] = null;
    });
    if (editing) {
      await client.put(`/system-accounts/${editing.id}`, values);
      message.success('Account updated');
    } else {
      await client.post('/system-accounts', values);
      message.success('Account added');
    }
    setModalOpen(false);
    fetchData();
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

  const [columns, setColumns] = useState(() => [
    {
      title: '',
      key: 'drag',
      width: 36,
      fixed: 'left',
      render: () => (
        <Tooltip title={searchText ? 'Clear search to reorder' : 'Drag to reorder'}>
          <HolderOutlined
            style={{
              color: 'var(--text-muted)',
              cursor: searchText ? 'not-allowed' : 'grab',
            }}
          />
        </Tooltip>
      ),
    },
    { title: 'System', dataIndex: 'system', width: 200, ellipsis: true, fixed: 'left' },
    { title: 'Category', dataIndex: 'category', width: 140 },
    {
      title: 'URL',
      dataIndex: 'url',
      width: 90,
      render: (v) =>
        v ? (
          <Tooltip title={v}>
            <a href={v} target="_blank" rel="noreferrer">
              <LinkOutlined />
            </a>
          </Tooltip>
        ) : (
          ''
        ),
    },
    { title: 'Username', dataIndex: 'username', width: 220, render: (v) => <CopyableText value={v} /> },
    { title: 'Password', dataIndex: 'password', width: 180, render: (v) => <PasswordCell value={v} /> },
    { title: 'Permission / Role', dataIndex: 'permission_role', width: 140, ellipsis: true },
    { title: 'PIC', dataIndex: 'pic', width: 100 },
    { title: 'Note', dataIndex: 'note', width: 260, ellipsis: true },
  ]);

  const handleResize = (index) => (_, { size }) => {
    setColumns((cols) => {
      const next = [...cols];
      next[index] = { ...next[index], width: size.width };
      return next;
    });
  };

  const resizableColumns = columns.map((col, index) =>
    col.dataIndex
      ? { ...col, onHeaderCell: (column) => ({ width: column.width, onResize: handleResize(index) }) }
      : col
  );

  return (
    <div>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12.5, marginBottom: 14 }}>
        Admin-only — root and service-level credentials for company infrastructure. Passwords are hidden by
        default; click the eye icon to reveal.
      </Typography.Paragraph>

      <div className="toolbar">
        <div style={{ color: 'var(--text-secondary)', fontSize: 13.5 }}>
          {rows.length.toLocaleString('en-US')} accounts
        </div>
        <Space>
          <Input.Search
            placeholder="Search by system, username, category..."
            allowClear
            style={{ width: 260 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={(q) => fetchData(q)}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add Account
          </Button>
        </Space>
      </div>

      <div className="table-panel">
        <Table
          rowKey="id"
          columns={resizableColumns}
          components={{ header: { cell: ResizableTitle } }}
          dataSource={rows}
          loading={loading}
          size="middle"
          scroll={{ x: 'max-content', y: 'calc(100vh - 320px)' }}
          rowClassName={() => 'row-context-menu'}
          onRow={(record, index) => ({
            onContextMenu: (event) => {
              event.preventDefault();
              setContextMenu({ record, x: event.clientX, y: event.clientY });
            },
            onDoubleClick: () => openEdit(record),
            draggable: !searchText,
            onDragStart: () => {
              dragIndexRef.current = index;
            },
            onDragOver: (event) => event.preventDefault(),
            onDrop: () => handleRowDrop(index),
          })}
          pagination={{ pageSize: 50, showSizeChanger: true }}
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
        title={editing ? 'Edit System Account' : 'Add System Account'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        width="min(640px, 94vw)"
        okText="Save"
        cancelText="Cancel"
      >
        <Form form={form} layout="vertical">
          <Space wrap style={{ width: '100%' }} size="middle">
            <Form.Item name="system" label="System" rules={[{ required: true }]}>
              <Input style={{ width: 220 }} />
            </Form.Item>
            <Form.Item name="category" label="Category" {...singleTagField}>
              <Select
                mode="tags"
                style={{ width: 180 }}
                options={categoryOptions.map((v) => ({ value: v, label: v }))}
                placeholder="Select or type..."
              />
            </Form.Item>
            <Form.Item name="url" label="URL / Link">
              <Input style={{ width: 260 }} />
            </Form.Item>
            <Form.Item name="username" label="Username / Account">
              <Input style={{ width: 220 }} />
            </Form.Item>
            <Form.Item name="password" label="Password">
              <Input style={{ width: 220 }} />
            </Form.Item>
            <Form.Item name="permission_role" label="Permission / Role">
              <Input style={{ width: 180 }} />
            </Form.Item>
            <Form.Item name="pic" label="PIC">
              <Input style={{ width: 140 }} />
            </Form.Item>
          </Space>
          <Form.Item name="note" label="Note">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
