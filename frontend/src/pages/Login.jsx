import { useState } from 'react';
import { Form, Input, Button, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

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
    <div className="vam-login-screen">
      <div className="vam-login-card">
        <div className="vam-login-brand">
          <div className="mark">VS</div>
          <div className="title">VSOL Asset Management</div>
          <div className="subtitle">Sign in to manage IT assets</div>
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
