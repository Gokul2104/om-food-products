import React, { useState, useEffect, useRef } from 'react';
import { formatDateIST } from '../utils/dateUtils';
import api from '../api';
import { Search, Filter, Eye, Printer, AlertCircle, X, Download, Pencil } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import InvoiceLayout from '../components/InvoiceLayout';
import { downloadAsPDF } from '../utils/pdfUtils';

const Invoices = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdminOrBiller = user.role === 'Admin' || user.role === 'Biller';

    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    // View modal state
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Edit modal state
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [editSaving, setEditSaving] = useState(false);
    const [editError, setEditError] = useState('');

    const printRef = useRef();

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

    const handlePrint = useReactToPrint({
        contentRef: printRef,
    });

    const openInvoiceDetail = (inv) => {
        setSelectedInvoice(inv);
        setIsModalOpen(true);
    };

    const closeInvoiceDetail = () => {
        setIsModalOpen(false);
        setSelectedInvoice(null);
    };

    const handleQuickPrint = (e, inv) => {
        e.stopPropagation();
        setSelectedInvoice(inv);
        setTimeout(() => {
            handlePrint();
        }, 100);
    };

    // --- Edit handlers ---
    const openEdit = (e, inv) => {
        e.stopPropagation();
        setEditForm({
            customer_name: inv.customer_name || '',
            customer_phone: inv.customer_phone || '',
            payment_method: inv.payment_method || 'Cash',
            payment_status: inv.payment_status || 'Paid',
            paid_amount: inv.paid_amount ?? '',
            related_to: inv.related_to || 'Shop',
            invoice_date: new Date(inv.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
        });
        setSelectedInvoice(inv);
        setEditError('');
        setIsEditOpen(true);
    };

    const closeEdit = () => {
        setIsEditOpen(false);
        setEditError('');
    };

    const handleEditSave = async () => {
        setEditSaving(true);
        setEditError('');
        try {
            const payload = {
                customer_name: editForm.customer_name || null,
                customer_phone: editForm.customer_phone || null,
                payment_method: editForm.payment_method,
                paid_amount: editForm.paid_amount !== '' ? parseFloat(editForm.paid_amount) : null,
                related_to: editForm.related_to,
                invoice_date: editForm.invoice_date || null,
            };
            await api.put(`/invoices/${selectedInvoice.id}`, payload);
            closeEdit();
            fetchInvoices();
        } catch (err) {
            setEditError(err.response?.data?.detail || 'Failed to update invoice');
        } finally {
            setEditSaving(false);
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
                                <th>Location</th>
                                <th>Bill Amount</th>
                                <th>Paid</th>
                                <th>Balance (Credit)</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '3rem' }}>Loading invoices...</td></tr>
                            ) : filteredInvoices.length === 0 ? (
                                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '3rem' }}>No invoices found</td></tr>
                            ) : (
                                filteredInvoices.map((inv) => (
                                    <tr key={inv.id}>
                                        <td style={{ fontWeight: 600 }}>{inv.invoice_number}</td>
                                        <td>{formatDateIST(inv.created_at)}</td>
                                        <td>
                                            <div>{inv.customer_name || 'Walking Customer'}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{inv.customer_phone}</div>
                                        </td>
                                        <td>
                                            <span className={`badge ${(inv.related_to || 'Shop') === 'Stall' ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.75rem' }}>
                                                {(inv.related_to || 'Shop') === 'Shop' ? '🏪' : '🏕️'} {inv.related_to || 'Shop'}
                                            </span>
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
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    title="View Detail"
                                                    onClick={() => openInvoiceDetail(inv)}
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                {isAdminOrBiller && (
                                                    <button
                                                        className="btn btn-secondary btn-sm"
                                                        title="Edit Invoice"
                                                        onClick={(e) => openEdit(e, inv)}
                                                    >
                                                        <Pencil size={16} />
                                                    </button>
                                                )}
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    title="Print"
                                                    onClick={(e) => handleQuickPrint(e, inv)}
                                                >
                                                    <Printer size={16} />
                                                </button>
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    title="Download PDF"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedInvoice(inv);
                                                        setTimeout(() => downloadAsPDF(printRef, inv.invoice_number), 100);
                                                    }}
                                                >
                                                    <Download size={16} />
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

            {/* Hidden printable area for quick print and PDF generation */}
            <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '400px', backgroundColor: 'white' }}>
                <InvoiceLayout ref={printRef} invoice={selectedInvoice} />
            </div>

            {/* Modal for detail view */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={closeInvoiceDetail}>
                    <div className="modal-content fadeIn" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h3 style={{ margin: 0 }}>Invoice Details</h3>
                            <button className="close-btn" onClick={closeInvoiceDetail}><X size={24} /></button>
                        </div>
                        <div className="modal-body" style={{ backgroundColor: '#f0f0f0', padding: '1rem' }}>
                            <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                <InvoiceLayout invoice={selectedInvoice} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={closeInvoiceDetail}>Close</button>
                            <button className="btn btn-secondary" onClick={() => downloadAsPDF(printRef, selectedInvoice.invoice_number)}>
                                <Download size={18} /> Download PDF
                            </button>
                            <button className="btn btn-primary" onClick={handlePrint}>
                                <Printer size={18} /> Print
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Invoice Modal */}
            {isEditOpen && selectedInvoice && (
                <div className="modal-overlay" onClick={closeEdit}>
                    <div className="modal-content fadeIn" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h3 style={{ margin: 0 }}>Edit Invoice — {selectedInvoice.invoice_number}</h3>
                            <button className="close-btn" onClick={closeEdit}><X size={22} /></button>
                        </div>
                        <div className="modal-body">
                            {editError && (
                                <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                                    <AlertCircle size={16} /> {editError}
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">Customer Name</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Walking Customer"
                                    value={editForm.customer_name}
                                    onChange={e => setEditForm(f => ({ ...f, customer_name: e.target.value }))}
                                />
                            </div>

                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Customer Phone</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Phone number"
                                        value={editForm.customer_phone}
                                        onChange={e => setEditForm(f => ({ ...f, customer_phone: e.target.value }))}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Invoice Date</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={editForm.invoice_date}
                                        onChange={e => setEditForm(f => ({ ...f, invoice_date: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Payment Method</label>
                                    <select
                                        className="form-control"
                                        value={editForm.payment_method}
                                        onChange={e => setEditForm(f => ({ ...f, payment_method: e.target.value }))}
                                    >
                                        <option value="Cash">Cash</option>
                                        <option value="UPI">UPI</option>
                                        <option value="Credit">Credit</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Paid Amount (₹)</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        min="0"
                                        step="0.01"
                                        placeholder={selectedInvoice.grand_total}
                                        value={editForm.paid_amount}
                                        onChange={e => setEditForm(f => ({ ...f, paid_amount: e.target.value }))}
                                    />
                                    <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                        Bill total: ₹{selectedInvoice.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </small>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Location</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        className={`btn ${editForm.related_to === 'Shop' ? 'btn-primary' : 'btn-secondary'}`}
                                        style={{ flex: 1 }}
                                        onClick={() => setEditForm(f => ({ ...f, related_to: 'Shop' }))}
                                    >
                                        🏪 Shop
                                    </button>
                                    <button
                                        className={`btn ${editForm.related_to === 'Stall' ? 'btn-primary' : 'btn-secondary'}`}
                                        style={{ flex: 1 }}
                                        onClick={() => setEditForm(f => ({ ...f, related_to: 'Stall' }))}
                                    >
                                        🏕️ Stall
                                    </button>
                                </div>
                            </div>

                            {/* Items (read-only summary) */}
                            <div style={{ marginTop: '0.5rem', padding: '1rem', backgroundColor: 'var(--bg-elevated, #f8f9fa)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Items (read-only)</h4>
                                {selectedInvoice.items.map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', fontSize: '0.85rem', borderBottom: idx < selectedInvoice.items.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                                        <span>{item.product_name} × {item.quantity}</span>
                                        <span style={{ fontWeight: 600 }}>₹{item.line_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={closeEdit}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleEditSave} disabled={editSaving}>
                                {editSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Invoices;
