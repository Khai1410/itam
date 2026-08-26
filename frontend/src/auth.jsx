import { createContext, useContext, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import client from './api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('vam_user');
    return raw ? JSON.parse(raw) : null;
  });

  const login = async (username, password) => {
    const { data } = await client.post('/auth/login', { username, password });
    localStorage.setItem('vam_token', data.token);
    localStorage.setItem('vam_user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('vam_token');
    localStorage.removeItem('vam_user');
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, login, logout, isAdmin: user?.role === 'admin' }),
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
