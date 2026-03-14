import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import api from '../api';

const Categories = () => {
    const [categories, setCategories] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', description: '' });
    const [editingId, setEditingId] = useState(null);
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const fetchCategories = async () => {
        try {
            const res = await api.get('/categories');
            setCategories(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/categories/${editingId}`, formData);
            } else {
                await api.post('/categories', formData);
            }
            setShowForm(false);
            setFormData({ name: '', description: '' });
            setEditingId(null);
            fetchCategories();
        } catch (err) {
            alert(err.response?.data?.detail || 'Error saving category');
        }
    };

    const handleEdit = (cat) => {
        setFormData({ name: cat.name, description: cat.description || '' });
        setEditingId(cat.id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this category?')) {
            try {
                await api.delete(`/categories/${id}`);
                fetchCategories();
            } catch (err) {
                alert(err.response?.data?.detail || 'Error deleting category');
            }
        }
    };

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Categories</h1>
                {(user.role === 'Admin' || user.role === 'StockManager') && (
                    <button className="btn btn-primary" onClick={() => {
                        setShowForm(!showForm);
                        setEditingId(null);
                        setFormData({ name: '', description: '' });
                    }}>
                        <Plus size={18} /> Add Category
                    </button>
                )}
            </div>

            {showForm && (
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3>{editingId ? 'Edit Category' : 'New Category'}</h3>
                    <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Category Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description (optional)</label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button type="submit" className="btn btn-primary">Save</button>
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
                            <th>Description</th>
                            <th>Date Added</th>
                            {user.role === 'Admin' && <th style={{ textAlign: 'right' }}>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map((cat) => (
                            <tr key={cat.id}>
                                <td style={{ fontWeight: 500, color: 'white' }}>{cat.name}</td>
                                <td>{cat.description || '-'}</td>
                                <td>{new Date(cat.created_at).toLocaleDateString()}</td>
                                {user.role === 'Admin' && (
                                    <td style={{ textAlign: 'right' }}>
                                        <button className="btn btn-outline" style={{ padding: '0.4rem', marginRight: '0.5rem' }} onClick={() => handleEdit(cat)}>
                                            <Edit2 size={16} />
                                        </button>
                                        <button className="btn btn-danger" style={{ padding: '0.4rem' }} onClick={() => handleDelete(cat.id)}>
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                        {categories.length === 0 && (
                            <tr>
                                <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No categories found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Categories;
