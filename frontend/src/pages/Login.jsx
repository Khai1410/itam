import { useEffect, useState } from 'react';
import { Form, Input, Button, Alert, Divider, Spin } from 'antd';
import { UserOutlined, LockOutlined, WindowsOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import client from '../api/client';

const ORG_NAME = import.meta.env.VITE_ORG_NAME || 'Your Company';

function initials(name) {
  if (!name) return '?';
  return name.slice(0, 2).toUpperCase();
}

export default function Login() {
  const { login, ssoLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ssoBusy, setSsoBusy] = useState(false);
  const [azureEnabled, setAzureEnabled] = useState(false);

  useEffect(() => {
    client.get('/auth/providers').then((res) => setAzureEnabled(res.data.azure)).catch(() => {});
  }, []);

  useEffect(() => {
    const code = searchParams.get('ssoCode');
    const ssoError = searchParams.get('ssoError');
    if (ssoError) {
      setError('Microsoft sign-in failed. Please try again.');
      navigate('/login', { replace: true });
      return;
    }
    if (!code) return;
    setSsoBusy(true);
    ssoLogin(code)
      .then(() => navigate('/dashboard', { replace: true }))
      .catch((err) => {
        setError(err.response?.data?.error || 'Microsoft sign-in failed');
        navigate('/login', { replace: true });
      })
      .finally(() => setSsoBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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

  if (ssoBusy) {
    return (
      <div className="itam-login-screen">
        <Spin size="large" tip="Signing in with Microsoft..." />
      </div>
    );
  }

  return (
    <div className="itam-login-screen">
      <div className="itam-login-card">
        <div className="itam-login-brand">
          <div className="mark">{initials(ORG_NAME)}</div>
          <div className="title">IT Asset Management</div>
          <div className="subtitle">Sign in to manage {ORG_NAME}'s IT assets</div>
        </div>

        {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 18 }} />}

        {azureEnabled && (
          <>
            <Button
              block
              size="large"
              icon={<WindowsOutlined />}
              onClick={() => {
                window.location.href = '/api/auth/azure/login';
              }}
            >
              Sign in with Microsoft
            </Button>
            <Divider plain style={{ margin: '18px 0', color: 'var(--text-muted)', fontSize: 12.5 }}>
              or
            </Divider>
          </>
        )}

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
