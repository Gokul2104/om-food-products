import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, SlidersHorizontal } from 'lucide-react';
import api from '../api';

const Products = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const initialForm = { p_id: '', name: '', category_id: '', description: '', unit: 'gms', selling_price: '', cost_price: '', tax_rate: '0', min_stock_alert: '5' };
    const [formData, setFormData] = useState(initialForm);
    const [filter, setFilter] = useState('');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchData = async (query = '') => {
        setLoading(true);
        try {
            const [prodRes, catRes] = await Promise.all([
                api.get(`/products?search=${query}`),
                api.get('/categories')
            ]);
            setProducts(prodRes.data);
            setCategories(catRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { 
        const delaySearch = setTimeout(() => {
            fetchData(search);
        }, 300);
        return () => clearTimeout(delaySearch);
    }, [search]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData, category_id: formData.category_id || null };
            if (editingId) {
                await api.put(`/products/${editingId}`, payload);
            } else {
                await api.post('/products', payload);
            }
            setShowForm(false);
            setFormData(initialForm);
            setEditingId(null);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.detail || 'Error saving product');
        }
    };

    const handleEdit = (prod) => {
        setFormData({
            p_id: prod.p_id, name: prod.name,
            category_id: prod.category_id || '',
            description: prod.description || '',
            unit: prod.unit,
            selling_price: prod.selling_price, cost_price: prod.cost_price,
            tax_rate: prod.tax_rate, min_stock_alert: prod.min_stock_alert
        });
        setEditingId(prod.id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this product? It will just be deactivated.')) {
            try {
                await api.delete(`/products/${id}`);
                fetchData();
            } catch (err) {
                alert(err.response?.data?.detail || 'Error deleting product');
            }
        }
    };

    const filtered = products.filter(p => !filter || p.category_id === filter);

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Products</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <input 
                        type="text" 
                        placeholder="Search..." 
                        className="form-select"
                        style={{ width: '200px' }}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <select className="form-select" value={filter} onChange={e => setFilter(e.target.value)}>
                        <option value="">All Categories</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {(user.role === 'Admin' || user.role === 'StockManager') && (
                        <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setFormData(initialForm); setEditingId(null); }}>
                            <Plus size={18} /> Add Product
                        </button>
                    )}
                </div>
            </div>

            {showForm && (
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3>{editingId ? 'Edit Product' : 'New Product'}</h3>
                    <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
                        <div className="grid-3 mb-3">
                            <div className="form-group">
                                <label className="form-label">SKU (Product ID)</label>
                                <input type="text" style={{ width: '100%' }} value={formData.p_id} onChange={e => setFormData({ ...formData, p_id: e.target.value })} required disabled={!!editingId} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Product Name</label>
                                <input type="text" style={{ width: '100%' }} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Category</label>
                                <select style={{ width: '100%' }} value={formData.category_id} onChange={e => setFormData({ ...formData, category_id: e.target.value })}>
                                    <option value="">Select Category...</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Unit</label>
                                <select style={{ width: '100%' }} value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })}>
                                    <option value="mls">mls</option>
                                    <option value="gms">gms</option>
                                    <option value="pkts">pkts</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Selling Price</label>
                                <input type="number" step="any" style={{ width: '100%' }} value={formData.selling_price} onChange={e => setFormData({ ...formData, selling_price: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Cost Price</label>
                                <input type="number" step="any" style={{ width: '100%' }} value={formData.cost_price} onChange={e => setFormData({ ...formData, cost_price: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tax Rate (%)</label>
                                <input type="number" step="any" style={{ width: '100%' }} value={formData.tax_rate} onChange={e => setFormData({ ...formData, tax_rate: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Min Stock Alert</label>
                                <input type="number" style={{ width: '100%' }} value={formData.min_stock_alert} onChange={e => setFormData({ ...formData, min_stock_alert: e.target.value })} required />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button type="submit" className="btn btn-primary">Save Product</button>
                            <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="loading-overlay">
                    <div className="spinner"></div>
                    <p>Loading products...</p>
                </div>
            ) : (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>SKU</th>
                                <th>Product Name</th>
                                <th>Category</th>
                                <th>Price</th>
                                <th>Stock</th>
                                {user.role === 'Admin' && <th style={{ textAlign: 'right' }}>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(p => (
                                <tr key={p.id}>
                                    <td style={{ color: 'var(--text-muted)' }}>{p.p_id}</td>
                                    <td style={{ fontWeight: 500, color: 'white' }}>{p.name}</td>
                                    <td>{p.category_name || '-'}</td>
                                    <td>₹{p.selling_price}</td>
                                    <td>
                                        <span className={`badge ${p.is_low_stock ? 'badge-danger' : 'badge-success'}`}>
                                            {p.current_stock} {p.unit}
                                        </span>
                                    </td>
                                    {user.role === 'Admin' && (
                                        <td style={{ textAlign: 'right' }}>
                                            <button className="btn btn-outline" style={{ padding: '0.4rem', marginRight: '0.5rem' }} onClick={() => handleEdit(p)}><Edit2 size={16} /></button>
                                            <button className="btn btn-danger" style={{ padding: '0.4rem' }} onClick={() => handleDelete(p.id)}><Trash2 size={16} /></button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {filtered.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No products found</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Products;
