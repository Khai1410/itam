import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RequireAuth, RequireAdmin, useAuth } from './auth.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Assets from './pages/Assets.jsx';
import MyAssets from './pages/MyAssets.jsx';
import EmployeeLookup from './pages/EmployeeLookup.jsx';
import Employees from './pages/Employees.jsx';
import Users from './pages/Users.jsx';
import SystemAccounts from './pages/SystemAccounts.jsx';
import Services from './pages/Services.jsx';

function IndexRedirect() {
  const { isAdmin } = useAuth();
  return <Navigate to={isAdmin ? '/dashboard' : '/my-assets'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<IndexRedirect />} />
          <Route path="dashboard" element={<RequireAdmin><Dashboard /></RequireAdmin>} />
          <Route path="assets" element={<RequireAdmin><Assets /></RequireAdmin>} />
          <Route path="my-assets" element={<MyAssets />} />
          <Route path="employee-lookup" element={<RequireAdmin><EmployeeLookup /></RequireAdmin>} />
          <Route path="employees" element={<RequireAdmin><Employees /></RequireAdmin>} />
          <Route path="users" element={<RequireAdmin><Users /></RequireAdmin>} />
          <Route path="system-accounts" element={<RequireAdmin><SystemAccounts /></RequireAdmin>} />
          <Route path="services" element={<RequireAdmin><Services /></RequireAdmin>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
