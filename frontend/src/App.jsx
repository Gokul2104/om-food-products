import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Stock from './pages/Stock';
import Billing from './pages/Billing';
import Returns from './pages/Returns';
import Reports from './pages/Reports';
import Invoices from './pages/Invoices';
import Users from './pages/Users';
import Expenses from './pages/Expenses';
import MainLayout from './components/MainLayout';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />; // fallback if no permission
  }

  return children;
};

// Role bundles for easier routing
const ROLES = {
  ADMIN: 'Admin',
  STOCK: 'StockManager',
  BILLER: 'Biller'
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Protected Routes inside MainLayout */}
        <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />

          <Route path="products" element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.STOCK]}><Products /></ProtectedRoute>
          } />

          <Route path="categories" element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.STOCK]}><Categories /></ProtectedRoute>
          } />

          <Route path="stock" element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.STOCK]}><Stock /></ProtectedRoute>
          } />

          <Route path="billing" element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.BILLER]}><Billing /></ProtectedRoute>
          } />

          <Route path="returns" element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.BILLER]}><Returns /></ProtectedRoute>
          } />

          <Route path="invoices" element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.BILLER]}><Invoices /></ProtectedRoute>
          } />

          <Route path="reports" element={
            <ProtectedRoute><Reports /></ProtectedRoute> // All roles can see some reports
          } />

          <Route path="users" element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN]}><Users /></ProtectedRoute>
          } />

          <Route path="expenses" element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN]}><Expenses /></ProtectedRoute>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
