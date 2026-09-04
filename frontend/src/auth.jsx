import { createContext, useContext, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import client from './api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('itam_user');
    return raw ? JSON.parse(raw) : null;
  });

  const applySession = (data) => {
    localStorage.setItem('itam_token', data.token);
    localStorage.setItem('itam_user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const login = async (username, password) => {
    const { data } = await client.post('/auth/login', { username, password });
    applySession(data);
  };

  const ssoLogin = async (code) => {
    const { data } = await client.post('/auth/sso/exchange', { code });
    applySession(data);
  };

  const logout = () => {
    localStorage.removeItem('itam_token');
    localStorage.removeItem('itam_user');
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, login, ssoLogin, logout, isAdmin: user?.role === 'admin' }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export function RequireAuth({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
