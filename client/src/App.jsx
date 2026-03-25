import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import Employees from './pages/Employees';
import Products from './pages/Products';
import Sales from './pages/Sales';
import NewSale from './pages/NewSale';
import Reports from './pages/Reports';
import './index.css';

function PrivateRoute({ children, adminOnly = false }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/employee/sales" replace />;
  return <Layout>{children}</Layout>;
}

function DefaultRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/employee/sales'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<DefaultRedirect />} />

          {/* Admin routes */}
          <Route path="/admin/dashboard" element={<PrivateRoute adminOnly><AdminDashboard /></PrivateRoute>} />
          <Route path="/admin/employees" element={<PrivateRoute adminOnly><Employees /></PrivateRoute>} />
          <Route path="/admin/products" element={<PrivateRoute adminOnly><Products /></PrivateRoute>} />
          <Route path="/admin/sales" element={<PrivateRoute adminOnly><Sales /></PrivateRoute>} />
          <Route path="/admin/new-sale" element={<PrivateRoute adminOnly><NewSale /></PrivateRoute>} />
          <Route path="/admin/reports" element={<PrivateRoute adminOnly><Reports /></PrivateRoute>} />

          {/* Employee routes */}
          <Route path="/employee/sales" element={<PrivateRoute><Sales /></PrivateRoute>} />
          <Route path="/employee/new-sale" element={<PrivateRoute><NewSale /></PrivateRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
