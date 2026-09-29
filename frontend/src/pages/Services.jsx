import { useEffect, useRef, useState } from 'react';
import { Table, Input, Button, Modal, Form, InputNumber, DatePicker, Space, message, Dropdown, Tooltip, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, HolderOutlined, NotificationOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import client from '../api/client';
import { useAuth } from '../auth.jsx';
import ResizableTitle from '../components/ResizableTitle.jsx';

function ExpirationCell({ value }) {
  if (!value) return <Tag>Perpetual</Tag>;

  const days = dayjs(value).startOf('day').diff(dayjs().startOf('day'), 'day');
  const dateLabel = new Date(value).toLocaleDateString('en-GB');

  let color = 'default';
  let note = `in ${days}d`;
  if (days < 0) {
    color = 'red';
    note = `expired ${Math.abs(days)}d ago`;
  } else if (days <= 30) {
    color = 'orange';
  } else if (days <= 90) {
    color = 'gold';
  } else {
    color = 'green';
  }

  return (
    <Space size={6}>
      <span>{dateLabel}</span>
      <Tag color={color}>{note}</Tag>
    </Space>
  );
}

export default function Services() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const [contextMenu, setContextMenu] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [alertStatus, setAlertStatus] = useState(null);
  const [checkingAlerts, setCheckingAlerts] = useState(false);
  const dragIndexRef = useRef(null);

  const fetchData = (q) => {
    setLoading(true);
    client
      .get('/services', { params: { q } })
      .then((res) => setRows(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (isAdmin) client.get('/services/alerts/status').then((res) => setAlertStatus(res.data));
  }, [isAdmin]);

  const handleCheckAlertsNow = async () => {
    setCheckingAlerts(true);
    try {
      const res = await client.post('/services/alerts/check-now');
      message.success(
        res.data.sent > 0
          ? `Sent ${res.data.sent} Teams alert(s)`
          : 'No services are due for an alert right now'
      );
    } catch (err) {
      message.error(err.response?.data?.error || 'Could not send Teams alert');
    } finally {
      setCheckingAlerts(false);
    }
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
      await client.patch('/services/reorder', { ids: next.map((r) => r.id) });
    } catch {
      message.error('Could not save the new order');
      fetchData(searchText);
    }
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
      expiration_date: record.expiration_date ? dayjs(record.expiration_date) : null,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    await client.delete(`/services/${id}`);
    message.success('Service deleted');
    fetchData();
  };

  const confirmDelete = (record) => {
    Modal.confirm({
      title: 'Delete this service?',
      content: record.service_name,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => handleDelete(record.id),
    });
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const payload = {
      ...values,
      expiration_date: values.expiration_date ? values.expiration_date.format('YYYY-MM-DD') : null,
    };
    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) payload[key] = null;
    });
    if (editing) {
      await client.put(`/services/${editing.id}`, payload);
      message.success('Service updated');
    } else {
      await client.post('/services', payload);
      message.success('Service added');
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
    { title: '', key: 'drag', width: 36, fixed: 'left', render: () => null },
    { title: 'Service', dataIndex: 'service_name', width: 260, ellipsis: true, fixed: 'left' },
    { title: 'Mount', dataIndex: 'mount', width: 100, render: (v) => (v ?? v === 0 ? v : '') },
    {
      title: 'Expiration Date',
      dataIndex: 'expiration_date',
      width: 220,
      render: (v) => <ExpirationCell value={v} />,
    },
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
      : {
          ...col,
          render: () =>
            isAdmin ? (
              <Tooltip title={searchText ? 'Clear search to reorder' : 'Drag to reorder'}>
                <HolderOutlined
                  style={{ color: 'var(--text-muted)', cursor: searchText ? 'not-allowed' : 'grab' }}
                />
              </Tooltip>
            ) : null,
        }
  );

  return (
    <div>
      <div className="toolbar">
        <div style={{ color: 'var(--text-secondary)', fontSize: 13.5 }}>
          {rows.length.toLocaleString('en-US')} services
        </div>
        <Space>
          <Input.Search
            placeholder="Search by service name..."
            allowClear
            style={{ width: 240 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={(q) => fetchData(q)}
          />
          {isAdmin && alertStatus?.teamsConfigured && (
            <Tooltip title={`Sends a Teams alert for any service expiring within ${alertStatus.alertDays} days`}>
              <Button icon={<NotificationOutlined />} loading={checkingAlerts} onClick={handleCheckAlertsNow}>
                Check Expirations Now
              </Button>
            </Tooltip>
          )}
          {isAdmin && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Add Service
            </Button>
          )}
        </Space>
      </div>

      {isAdmin && alertStatus && !alertStatus.teamsConfigured && (
        <div style={{ color: 'var(--text-muted)', fontSize: 12.5, marginBottom: 10 }}>
          Teams alerts are not configured — set <code>TEAMS_WEBHOOK_URL</code> in <code>.env</code> to get notified{' '}
          {alertStatus.alertDays} days before a service expires.
        </div>
      )}

      <div className="table-panel">
        <Table
          rowKey="id"
          columns={resizableColumns}
          components={{ header: { cell: ResizableTitle } }}
          dataSource={rows}
          loading={loading}
          size="middle"
          scroll={{ x: 'max-content', y: 'calc(100vh - 320px)' }}
          rowClassName={() => (isAdmin ? 'row-context-menu' : '')}
          onRow={
            isAdmin
              ? (record, index) => ({
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
                })
              : undefined
          }
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
        title={editing ? 'Edit Service' : 'Add Service'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        width="min(560px, 94vw)"
        okText="Save"
        cancelText="Cancel"
      >
        <Form form={form} layout="vertical">
          <Space wrap style={{ width: '100%' }} size="middle">
            <Form.Item name="service_name" label="Service" rules={[{ required: true }]}>
              <Input style={{ width: 260 }} />
            </Form.Item>
            <Form.Item name="mount" label="Mount">
              <InputNumber style={{ width: 120 }} />
            </Form.Item>
            <Form.Item
              name="expiration_date"
              label="Expiration Date"
              tooltip="Leave empty for a perpetual license"
            >
              <DatePicker style={{ width: 180 }} format="DD/MM/YYYY" />
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
