import React, { useState, useEffect } from 'react';
import { PackagePlus, AlertCircle, History } from 'lucide-react';
import api from '../api';

const Stock = () => {
    const [stock, setStock] = useState([]);
    const [history, setHistory] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const [showInForm, setShowInForm] = useState(false);
    const [inData, setInData] = useState({ quantity: '', unit_cost: '', notes: '' });

    const [showAdjustForm, setShowAdjustForm] = useState(false);
    const [adjustData, setAdjustData] = useState({ new_quantity: '', notes: '' });
    
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const fetchStock = async (query = '') => {
        setLoading(true);
        try {
            const res = await api.get(`/stock?search=${query}`);
            setStock(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { 
        const delaySearch = setTimeout(() => {
            fetchStock(search);
        }, 300);
        return () => clearTimeout(delaySearch);
    }, [search]);

    const viewHistory = async (productId) => {
        try {
            const res = await api.get(`/stock/history/${productId}`);
            setHistory(res.data);
            setSelectedProduct(stock.find(p => p.id === productId));
        } catch (err) {
            console.error(err);
        }
    };

    const handleStockIn = async (e) => {
        e.preventDefault();
        try {
            await api.post('/stock/in', {
                product_id: selectedProduct.id,
                quantity: parseFloat(inData.quantity),
                unit_cost: inData.unit_cost ? parseFloat(inData.unit_cost) : 0,
                notes: inData.notes
            });
            setShowInForm(false);
            setInData({ quantity: '', unit_cost: '', notes: '' });
            fetchStock();
            viewHistory(selectedProduct.id);
        } catch (err) {
            alert(err.response?.data?.detail || 'Error adding stock');
        }
    };

    const handleAdjust = async (e) => {
        e.preventDefault();
        try {
            await api.post('/stock/adjust', {
                product_id: selectedProduct.id,
                new_quantity: parseFloat(adjustData.new_quantity),
                notes: adjustData.notes
            });
            setShowAdjustForm(false);
            setAdjustData({ new_quantity: '', notes: '' });
            fetchStock();
            viewHistory(selectedProduct.id);
        } catch (err) {
            alert(err.response?.data?.detail || 'Error adjusting stock');
        }
    };

    return (
        <div style={{ display: 'flex', gap: '2rem', height: '100%' }}>

            {/* Left: Overall Stock View */}
            <div style={{ flex: 2, display: 'flex', flexDirection: 'column' }}>
                <div className="page-header">
                    <h1 className="page-title">Stock Ledger</h1>
                    <div style={{ width: '300px' }}>
                        <input 
                            type="text" 
                            placeholder="Search products..." 
                            style={{ width: '100%' }}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="loading-overlay">
                        <div className="spinner"></div>
                        <p>Loading stock data...</p>
                    </div>
                ) : (
                    <div className="table-container" style={{ flex: 1 }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Current Stock</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stock.map(p => (
                                    <tr key={p.id} className={selectedProduct?.id === p.id ? 'active-row' : ''} style={selectedProduct?.id === p.id ? { backgroundColor: 'var(--primary-light)' } : {}}>
                                        <td>
                                            <div style={{ fontWeight: 500, color: 'white' }}>{p.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.p_id} • {p.category_name || 'No Category'}</div>
                                        </td>
                                        <td style={{ fontSize: '1.1rem', fontWeight: 600 }}>{p.current_stock} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>{p.unit}</span></td>
                                        <td>
                                            {p.is_low_stock ?
                                                <span className="badge badge-danger"><AlertCircle size={12} style={{ marginRight: 4 }} /> Low Stock</span> :
                                                <span className="badge badge-success">Sufficient</span>}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem' }} onClick={() => viewHistory(p.id)}>
                                                <History size={16} /> History
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {stock.length === 0 && (
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                            No products found matching your search.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Right: Actions & History panel */}
            {selectedProduct && (
                <div style={{ flex: 1, backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                    <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{selectedProduct.name}</h2>
                    <div style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Current stock: <strong style={{ color: 'white' }}>{selectedProduct.current_stock} {selectedProduct.unit}</strong></div>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { setShowInForm(true); setShowAdjustForm(false); }}>
                            <PackagePlus size={18} /> Receive Stock
                        </button>
                        {user.role === 'Admin' && (
                            <button className="btn btn-warning" style={{ flex: 1, backgroundColor: 'var(--warning)', color: 'white' }} onClick={() => { setShowAdjustForm(true); setShowInForm(false); }}>
                                Adjust Count
                            </button>
                        )}
                    </div>

                    {/* Form: Stock IN */}
                    {showInForm && (
                        <form onSubmit={handleStockIn} style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-dark)' }}>
                            <h4 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>Receive New Stock</h4>
                            <div className="form-group">
                                <label className="form-label">Quantity to Add</label>
                                <input type="number" step="any" required width="100%" value={inData.quantity} onChange={e => setInData({ ...inData, quantity: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Cost per Unit (Buy Price)</label>
                                <input type="number" step="any" width="100%" placeholder="₹ 0.00" value={inData.unit_cost} onChange={e => setInData({ ...inData, unit_cost: e.target.value })} />
                            </div>
                            <div className="form-group mb-3">
                                <label className="form-label">Notes (Supplier/Batch)</label>
                                <input type="text" width="100%" value={inData.notes} onChange={e => setInData({ ...inData, notes: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button type="submit" className="btn btn-primary">Add</button>
                                <button type="button" className="btn btn-outline" onClick={() => setShowInForm(false)}>Cancel</button>
                            </div>
                        </form>
                    )}

                    {/* Form: ADJUST */}
                    {showAdjustForm && (
                        <form onSubmit={handleAdjust} style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid var(--warning)', borderRadius: '8px', backgroundColor: 'var(--warning-bg)' }}>
                            <h4 style={{ marginBottom: '1rem', color: 'var(--warning)' }}>Manual Correction</h4>
                            <div className="form-group">
                                <label className="form-label">New Absolute Quantity</label>
                                <input type="number" step="any" required width="100%" value={adjustData.new_quantity} onChange={e => setAdjustData({ ...adjustData, new_quantity: e.target.value })} />
                            </div>
                            <div className="form-group mb-3">
                                <label className="form-label">Reason</label>
                                <input type="text" required width="100%" value={adjustData.notes} onChange={e => setAdjustData({ ...adjustData, notes: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button type="submit" className="btn btn-warning" style={{ backgroundColor: 'var(--warning)', color: 'white' }}>Update</button>
                                <button type="button" className="btn btn-outline" onClick={() => setShowAdjustForm(false)}>Cancel</button>
                            </div>
                        </form>
                    )}

                    <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Ledger History</h3>
                    <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
                        {history.map(h => (
                            <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                        <span className={`badge ${h.type === 'IN' || h.type === 'RETURN' ? 'badge-success' : h.type === 'OUT' ? 'badge-info' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                                            {h.type}
                                        </span>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{formatDateTimeIST(h.created_at)}</span>
                                    </div>
                                    <div style={{ fontSize: '0.85rem' }}>By {h.performed_by_name}</div>
                                    {h.notes && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.2rem' }}>"{h.notes}"</div>}
                                </div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: h.type === 'OUT' ? 'var(--danger)' : (h.type === 'IN' || h.type === 'RETURN' ? 'var(--success)' : 'white') }}>
                                    {h.type === 'OUT' ? '-' : (h.type === 'IN' || h.type === 'RETURN' ? '+' : '')}{h.quantity}
                                </div>
                            </div>
                        ))}
                        {history.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', marginTop: '2rem' }}>No history found</div>}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Stock;
