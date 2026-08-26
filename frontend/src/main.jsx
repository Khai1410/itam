import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import App from './App.jsx';
import { AuthProvider } from './auth.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#2a78d6',
          borderRadius: 8,
          fontFamily: '"Lexend Deca", system-ui, -apple-system, "Segoe UI", sans-serif',
          colorBorderSecondary: '#e7e8ec',
        },
        components: {
          Layout: {
            headerBg: '#14161f',
            siderBg: '#14161f',
            bodyBg: '#f4f5f7',
          },
          Table: {
            borderRadius: 10,
            headerBg: '#fcfcfb',
          },
          Button: {
            controlHeight: 36,
            fontWeight: 500,
          },
          Card: {
            borderRadiusLG: 12,
          },
        },
      }}
    >
      <AuthProvider>
        <App />
      </AuthProvider>
    </ConfigProvider>
  </React.StrictMode>
);
