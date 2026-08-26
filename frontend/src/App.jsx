import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RequireAuth } from './auth.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Assets from './pages/Assets.jsx';
import EmployeeLookup from './pages/EmployeeLookup.jsx';
import Employees from './pages/Employees.jsx';
import Users from './pages/Users.jsx';

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
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="assets" element={<Assets />} />
          <Route path="employee-lookup" element={<EmployeeLookup />} />
          <Route path="employees" element={<Employees />} />
          <Route path="users" element={<Users />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
