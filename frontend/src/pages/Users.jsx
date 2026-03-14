import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Power } from 'lucide-react';
import api from '../api';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'Biller' });
    const [editingId, setEditingId] = useState(null);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users');
            setUsers(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                // Can only update name and role here
                await api.put(`/users/${editingId}`, { name: formData.name, role: formData.role });
            } else {
                await api.post('/users', formData);
            }
            setShowForm(false);
            setFormData({ name: '', email: '', password: '', role: 'Biller' });
            setEditingId(null);
            fetchUsers();
        } catch (err) {
            alert(err.response?.data?.detail || 'Error saving user');
        }
    };

    const handleEdit = (user) => {
        setFormData({ name: user.name, email: user.email, password: '', role: user.role });
        setEditingId(user.id);
        setShowForm(true);
    };

    const toggleActive = async (user) => {
        try {
            await api.put(`/users/${user.id}`, { is_active: !user.is_active });
            fetchUsers();
        } catch (err) {
            alert('Error changing user status');
        }
    };

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Manage Staff & Users</h1>
                <button className="btn btn-primary" onClick={() => {
                    setShowForm(!showForm);
                    setEditingId(null);
                    setFormData({ name: '', email: '', password: '', role: 'Biller' });
                }}>
                    <Plus size={18} /> Add User
                </button>
            </div>

            {showForm && (
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3>{editingId ? 'Edit User Roles' : 'Create New User'}</h3>
                    <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
                        <div className="grid-2 mb-3">
                            <div className="form-group">
                                <label className="form-label">Name</label>
                                <input type="text" style={{ width: '100%' }} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                            </div>

                            {!editingId && (
                                <>
                                    <div className="form-group">
                                        <label className="form-label">Email Address (Login ID)</label>
                                        <input type="email" style={{ width: '100%' }} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Initial Password</label>
                                        <input type="password" style={{ width: '100%' }} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} minLength="6" required />
                                    </div>
                                </>
                            )}

                            <div className="form-group">
                                <label className="form-label">Role</label>
                                <select style={{ width: '100%' }} value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                    <option value="Admin">Admin (Full Access)</option>
                                    <option value="StockManager">Stock Manager (Products & Inventory)</option>
                                    <option value="Biller">Biller (POS & Returns only)</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button type="submit" className="btn btn-primary">Save User</button>
                            <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.5 }}>
                                <td style={{ fontWeight: 500, color: 'white' }}>{u.name}</td>
                                <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                                <td><span className={`badge ${u.role === 'Admin' ? 'badge-danger' : u.role === 'StockManager' ? 'badge-info' : 'badge-success'}`}>{u.role}</span></td>
                                <td>
                                    <span className={`badge ${u.is_active ? 'badge-success' : 'badge-warning'}`}>
                                        {u.is_active ? 'Active' : 'Disabled'}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <button className="btn btn-outline" style={{ padding: '0.4rem', marginRight: '0.5rem' }} onClick={() => handleEdit(u)}>
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        className={u.is_active ? "btn btn-danger" : "btn btn-success"}
                                        style={{ padding: '0.4rem', backgroundColor: u.is_active ? 'var(--danger)' : 'var(--success)', border: 'none', color: 'white' }}
                                        onClick={() => toggleActive(u)}
                                        title={u.is_active ? "Disable Account" : "Enable Account"}
                                    >
                                        <Power size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Users;
