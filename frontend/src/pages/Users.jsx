import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Popconfirm, message, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import client from '../api/client';
import { useAuth } from '../auth.jsx';

export default function Users() {
  const { user: currentUser } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchData = () => {
    setLoading(true);
    client
      .get('/auth/users')
      .then((res) => setRows(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreate = () => {
    form.resetFields();
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    await client.post('/auth/users', values);
    message.success('Account created');
    setModalOpen(false);
    fetchData();
  };

  const handleDelete = async (id) => {
    await client.delete(`/auth/users/${id}`);
    message.success('Account deleted');
    fetchData();
  };

  return (
    <div>
      <div className="toolbar">
        <div style={{ color: 'var(--text-secondary)', fontSize: 13.5 }}>
          {rows.length.toLocaleString('en-US')} accounts
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add Account
        </Button>
      </div>

      <div className="table-panel">
        <Table
          rowKey="id"
          size="middle"
          loading={loading}
          dataSource={rows}
          columns={[
            { title: 'Username', dataIndex: 'username' },
            { title: 'Role', dataIndex: 'role' },
            { title: 'Created At', dataIndex: 'created_at', render: (v) => new Date(v).toLocaleDateString('en-GB') },
            {
              title: '',
              key: 'actions',
              width: 60,
              render: (_, record) =>
                record.id !== currentUser.id && (
                  <Popconfirm title="Delete this account?" onConfirm={() => handleDelete(record.id)}>
                    <Tooltip title="Delete">
                      <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                    </Tooltip>
                  </Popconfirm>
                ),
            },
          ]}
        />
      </div>

      <Modal
        title="Add Account"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText="Create"
        cancelText="Cancel"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="username" label="Username" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, min: 6 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]} initialValue="viewer">
            <Select
              options={[
                { value: 'viewer', label: 'Viewer (read-only)' },
                { value: 'admin', label: 'Admin (full access)' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
