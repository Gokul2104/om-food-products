import React, { useState, useEffect, useRef } from 'react';
import { formatDateIST } from '../utils/dateUtils';
import api from '../api';
import { Search, Filter, Eye, Printer, AlertCircle, X } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import InvoiceLayout from '../components/InvoiceLayout';

const Invoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    
    // Modal state
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
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
        // We need a small delay to ensure the component is rendered with the new inv before printing
        setTimeout(() => {
            handlePrint();
        }, 100);
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
                                                <button 
                                                    className="btn btn-secondary btn-sm" 
                                                    title="View Detail"
                                                    onClick={() => openInvoiceDetail(inv)}
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button 
                                                    className="btn btn-secondary btn-sm" 
                                                    title="Print"
                                                    onClick={(e) => handleQuickPrint(e, inv)}
                                                >
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

            {/* Hidden printable area for quick print */}
            <div style={{ display: 'none' }}>
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
                            <button className="btn btn-primary" onClick={handlePrint}>
                                <Printer size={18} /> Print
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Invoices;
