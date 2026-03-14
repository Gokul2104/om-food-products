import React, { useState, useEffect } from 'react';
import api from '../api';
import { Search, Filter, Eye, Printer, AlertCircle } from 'lucide-react';

const Invoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const response = await api.get('/invoices');
            setInvoices(response.data);
            setLoading(false);
        } catch (err) {
            setError('Failed to fetch invoices');
            setLoading(false);
        }
    };

    const filteredInvoices = invoices.filter(inv => {
        const matchesSearch = 
            inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (inv.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (inv.customer_phone || '').includes(searchTerm);
        
        const matchesStatus = filterStatus === '' || inv.payment_status === filterStatus;
        
        return matchesSearch && matchesStatus;
    });

    const getStatusType = (status) => {
        switch (status) {
            case 'Paid': return 'success';
            case 'Partial': return 'warning';
            case 'Pending': return 'error';
            default: return 'primary';
        }
    };

    return (
        <div className="page-container fadeIn">
            <div className="page-header">
                <div>
                    <h1>Invoices & Credits</h1>
                    <p className="text-muted">History of all bills and pending payments</p>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <div className="card-body" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: 1, minWidth: '250px', marginBottom: 0 }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input 
                                type="text" 
                                placeholder="Search by number, customer, phone..." 
                                className="form-control"
                                style={{ paddingLeft: '2.5rem' }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="form-group" style={{ minWidth: '200px', marginBottom: 0 }}>
                        <select 
                            className="form-control" 
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="">All Statuses</option>
                            <option value="Paid">Paid Only</option>
                            <option value="Partial">Partial (Credits)</option>
                            <option value="Pending">Pending (Credits)</option>
                        </select>
                    </div>
                    <button className="btn btn-secondary" onClick={fetchInvoices}>
                        Refresh
                    </button>
                </div>
            </div>

            {error && (
                <div className="alert alert-error" style={{ marginBottom: '2rem' }}>
                    <AlertCircle size={20} /> {error}
                </div>
            )}

            <div className="card">
                <div className="table-responsive">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Invoice #</th>
                                <th>Date</th>
                                <th>Customer</th>
                                <th>Bill Amount</th>
                                <th>Paid</th>
                                <th>Balance (Credit)</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '3rem' }}>Loading invoices...</td></tr>
                            ) : filteredInvoices.length === 0 ? (
                                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '3rem' }}>No invoices found</td></tr>
                            ) : (
                                filteredInvoices.map((inv) => (
                                    <tr key={inv.id}>
                                        <td style={{ fontWeight: 600 }}>{inv.invoice_number}</td>
                                        <td>{new Date(inv.created_at).toLocaleDateString()}</td>
                                        <td>
                                            <div>{inv.customer_name || 'Walking Customer'}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{inv.customer_phone}</div>
                                        </td>
                                        <td>₹{inv.grand_total.toLocaleString()}</td>
                                        <td>₹{inv.paid_amount.toLocaleString()}</td>
                                        <td style={{ color: inv.grand_total - inv.paid_amount > 0 ? 'var(--error)' : 'inherit', fontWeight: 600 }}>
                                            ₹{(inv.grand_total - inv.paid_amount).toLocaleString()}
                                        </td>
                                        <td>
                                            <span className={`badge badge-${getStatusType(inv.payment_status)}`}>
                                                {inv.payment_status}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button className="btn btn-secondary btn-sm" title="View Detail">
                                                    <Eye size={16} />
                                                </button>
                                                <button className="btn btn-secondary btn-sm" title="Print">
                                                    <Printer size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Invoices;
