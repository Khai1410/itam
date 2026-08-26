import { useState } from 'react';
import { Form, Input, Button, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

const ORG_NAME = import.meta.env.VITE_ORG_NAME || 'Your Company';

function initials(name) {
  if (!name) return '?';
  return name.slice(0, 2).toUpperCase();
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setError(null);
    setLoading(true);
    try {
      await login(values.username, values.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="itam-login-screen">
      <div className="itam-login-card">
        <div className="itam-login-brand">
          <div className="mark">{initials(ORG_NAME)}</div>
          <div className="title">IT Asset Management</div>
          <div className="subtitle">Sign in to manage {ORG_NAME}'s IT assets</div>
        </div>

        {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 18 }} />}

        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item name="username" label="Username" rules={[{ required: true, message: 'Enter your username' }]}>
            <Input prefix={<UserOutlined style={{ color: 'var(--text-muted)' }} />} autoFocus size="large" />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Enter your password' }]}>
            <Input.Password prefix={<LockOutlined style={{ color: 'var(--text-muted)' }} />} size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading} size="large" style={{ marginTop: 6 }}>
            Sign in
          </Button>
        </Form>
      </div>
    </div>
  );
}
