import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, Tags, Layers, Receipt, RotateCcw, BarChart3, Users, LogOut, Menu, QrCode } from 'lucide-react';
import QRModal from './QRModal';

const MainLayout = () => {
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const [showQR, setShowQR] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const closeSidebar = () => setIsSidebarOpen(false);
    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div className="app-container">
            {/* Sidebar Overlay for Mobile */}
            <div
                className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`}
                onClick={closeSidebar}
            ></div>

            {/* Sidebar */}
            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <Layers className="text-primary" size={28} />
                    <h2>OM Food Products</h2>
                </div>

                <nav className="sidebar-nav">
                    <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end onClick={closeSidebar}>
                        <LayoutDashboard size={20} /> Dashboard
                    </NavLink>

                    {(user.role === 'Admin' || user.role === 'StockManager') && (
                        <>
                            <NavLink to="/products" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
                                <Package size={20} /> Products
                            </NavLink>
                            <NavLink to="/categories" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
                                <Tags size={20} /> Categories
                            </NavLink>
                            <NavLink to="/stock" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
                                <Layers size={20} /> Stock Manager
                            </NavLink>
                        </>
                    )}

                    {(user.role === 'Admin' || user.role === 'Biller') && (
                        <>
                            <NavLink to="/billing" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
                                <Receipt size={20} /> Billing
                            </NavLink>
                            <NavLink to="/invoices" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
                                <Receipt size={20} /> Invoices
                            </NavLink>
                            <NavLink to="/returns" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
                                <RotateCcw size={20} /> Returns
                            </NavLink>
                        </>
                    )}

                    <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
                        <BarChart3 size={20} /> Reports
                    </NavLink>

                    {user.role === 'Admin' && (
                        <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
                            <Users size={20} /> Users
                        </NavLink>
                    )}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info" style={{ marginBottom: '1rem', padding: '0 0.5rem' }}>
                        <div style={{ fontWeight: 500, color: 'white' }}>{user.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.role}</div>
                    </div>
                    <button onClick={handleLogout} className="btn btn-outline" style={{ width: '100%', justifyContent: 'flex-start' }}>
                        <LogOut size={18} /> Logout
                    </button>
                </div>
            </aside>

            {/* Main Area */}
            <main className="main-content">
                <header className="top-header">
                    <button className="btn menu-toggle" onClick={toggleSidebar}>
                        <Menu size={24} />
                    </button>
                    <div className="search-bar" style={{ flex: 1 }}>
                        {/* Global Search placeholder */}
                    </div>
                    <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setShowQR(true)}
                            title="Show UPI QR Code"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                        >
                            <QrCode size={16} /> UPI QR
                        </button>
                        <span className="badge badge-primary">{user.role}</span>
                    </div>
                </header>

                <div className="content-area">
                    <Outlet />
                </div>
            </main>

            {showQR && <QRModal onClose={() => setShowQR(false)} />}
        </div>
    );
};

export default MainLayout;
