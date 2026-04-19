import React, { useState, useEffect } from 'react';
import api from '../api';
import { formatDateIST, formatDateTimeIST } from '../utils/dateUtils';
import { Plus, Pencil, Trash2, AlertCircle, X, IndianRupee } from 'lucide-react';

const DEFAULT_CATEGORIES = [
    "Rent", "EB Bill", "Water Bill", "Internet", "Salary",
    "Transport", "Packaging", "Maintenance", "Cleaning",
    "Marketing", "Miscellaneous"
];

const today = () => new Date().toISOString().split('T')[0];

const emptyForm = { category: '', description: '', amount: '', expense_date: today() };

const Expenses = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.role === 'Admin';

    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [suggestions, setSuggestions] = useState(DEFAULT_CATEGORIES);

    // Filter state
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [showAll, setShowAll] = useState(false);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    // Delete confirm
    const [deleteId, setDeleteId] = useState(null);

    useEffect(() => {
        fetchSuggestions();
    }, []);

    useEffect(() => {
        fetchExpenses();
    }, [filterMonth, filterYear, showAll]);

    const fetchSuggestions = async () => {
        try {
            const res = await api.get('/expenses/categories');
            setSuggestions(res.data);
        } catch (_) {}
    };

    const fetchExpenses = async () => {
        try {
            setLoading(true);
            setError('');
            const params = showAll ? {} : { month: filterMonth, year: filterYear };
            const res = await api.get('/expenses', { params });
            setExpenses(res.data);
        } catch (err) {
            setError('Failed to fetch expenses');
        } finally {
            setLoading(false);
        }
    };

    const openAdd = () => {
        setEditingId(null);
        setForm(emptyForm);
        setFormError('');
        setIsModalOpen(true);
    };

    const openEdit = (e) => {
        setEditingId(e.id);
        setForm({
            category: e.category,
            description: e.description || '',
            amount: e.amount,
            // Convert stored UTC ISO back to YYYY-MM-DD in IST for the date input
            expense_date: new Date(e.expense_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
        });
        setFormError('');
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setForm(emptyForm);
    };

    const handleSave = async () => {
        if (!form.category.trim()) return setFormError('Category is required');
        if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) return setFormError('Enter a valid amount');
        if (!form.expense_date) return setFormError('Date is required');

        setSaving(true);
        setFormError('');
        try {
            const payload = { ...form, amount: Number(form.amount) };
            if (editingId) {
                await api.put(`/expenses/${editingId}`, payload);
            } else {
                await api.post('/expenses', payload);
            }
            closeModal();
            fetchExpenses();
        } catch (err) {
            setFormError(err.response?.data?.detail || 'Failed to save expense');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/expenses/${deleteId}`);
            setDeleteId(null);
            fetchExpenses();
        } catch (err) {
            setError('Failed to delete expense');
            setDeleteId(null);
        }
    };

    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

    return (
        <div className="page-container fadeIn">
            <div className="page-header">
                <div>
                    <h1>Expenses</h1>
                    <p className="text-muted">Track operational expenses like rent, EB, salary and more</p>
                </div>
                {isAdmin && (
                    <button className="btn btn-primary" onClick={openAdd}>
                        <Plus size={18} /> Add Expense
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-body" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                        <input
                            type="checkbox"
                            checked={showAll}
                            onChange={e => setShowAll(e.target.checked)}
                            style={{ width: '16px', height: '16px' }}
                        />
                        Show all time
                    </label>

                    {!showAll && (
                        <>
                            <select
                                className="form-control"
                                style={{ width: 'auto' }}
                                value={filterMonth}
                                onChange={e => setFilterMonth(parseInt(e.target.value))}
                            >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                    <option key={m} value={m}>
                                        {new Date(2000, m - 1).toLocaleString('en-IN', { month: 'long' })}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="number"
                                className="form-control"
                                style={{ width: '90px' }}
                                min="2020"
                                max="2050"
                                value={filterYear}
                                onChange={e => setFilterYear(parseInt(e.target.value))}
                            />
                        </>
                    )}

                    {/* Total */}
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '1.1rem', color: 'var(--danger, #ef4444)' }}>
                        <IndianRupee size={18} />
                        Total: ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                </div>
            </div>

            {error && (
                <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
                    <AlertCircle size={18} /> {error}
                </div>
            )}

            {/* Table */}
            <div className="card">
                <div className="table-responsive">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Category</th>
                                <th>Description</th>
                                <th>Amount</th>
                                <th>Added By</th>
                                {isAdmin && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>Loading...</td></tr>
                            ) : expenses.length === 0 ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No expenses found</td></tr>
                            ) : (
                                expenses.map(e => (
                                    <tr key={e.id}>
                                        <td style={{ whiteSpace: 'nowrap' }}>{formatDateIST(e.expense_date)}</td>
                                        <td>
                                            <span className="badge badge-primary" style={{ fontSize: '0.8rem' }}>{e.category}</span>
                                        </td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                            {e.description || '—'}
                                        </td>
                                        <td style={{ fontWeight: 700, color: 'var(--danger, #ef4444)' }}>
                                            ₹{e.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{e.created_by_name}</td>
                                        {isAdmin && (
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(e)} title="Edit">
                                                        <Pencil size={15} />
                                                    </button>
                                                    <button className="btn btn-sm" style={{ background: 'var(--danger,#ef4444)', color: 'white', border: 'none' }} onClick={() => setDeleteId(e.id)} title="Delete">
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add / Edit Modal */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content fadeIn" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                        <div className="modal-header">
                            <h3 style={{ margin: 0 }}>{editingId ? 'Edit Expense' : 'Add Expense'}</h3>
                            <button className="close-btn" onClick={closeModal}><X size={22} /></button>
                        </div>
                        <div className="modal-body">
                            {formError && (
                                <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                                    <AlertCircle size={16} /> {formError}
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">Category *</label>
                                {/* datalist gives autocomplete suggestions but allows free text */}
                                <input
                                    list="expense-categories"
                                    className="form-control"
                                    placeholder="e.g. Rent, EB Bill..."
                                    value={form.category}
                                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                />
                                <datalist id="expense-categories">
                                    {suggestions.map(s => <option key={s} value={s} />)}
                                </datalist>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Optional details..."
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Amount (₹) *</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="form-control"
                                    placeholder="0.00"
                                    value={form.amount}
                                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Date *</label>
                                <input
                                    type="date"
                                    className="form-control"
                                    value={form.expense_date}
                                    onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving...' : editingId ? 'Update' : 'Add Expense'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {deleteId && (
                <div className="modal-overlay" onClick={() => setDeleteId(null)}>
                    <div className="modal-content fadeIn" onClick={e => e.stopPropagation()} style={{ maxWidth: '380px' }}>
                        <div className="modal-header">
                            <h3 style={{ margin: 0 }}>Delete Expense</h3>
                            <button className="close-btn" onClick={() => setDeleteId(null)}><X size={22} /></button>
                        </div>
                        <div className="modal-body">
                            <p>Are you sure you want to delete this expense? This cannot be undone.</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
                            <button className="btn" style={{ background: 'var(--danger,#ef4444)', color: 'white' }} onClick={handleDelete}>
                                <Trash2 size={16} /> Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Expenses;
