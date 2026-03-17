import React, { useState, useEffect } from 'react';
import { Search, RotateCcw, FileText } from 'lucide-react';
import api from '../api';

const Returns = () => {
    const [searchInvoice, setSearchInvoice] = useState('');
    const [invoice, setInvoice] = useState(null);
    const [returnItems, setReturnItems] = useState([]);
    const [refundMethod, setRefundMethod] = useState('Cash');
    const [notes, setNotes] = useState('');
    const [manualRefund, setManualRefund] = useState(null);
    const [recentReturns, setRecentReturns] = useState([]);

    const fetchRecent = async () => {
        try {
            const res = await api.get('/returns');
            setRecentReturns(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchRecent();
    }, []);

    const handleSearch = async (e) => {
        e.preventDefault();
        try {
            // In a real app we'd have a search by number endpoint. 
            // For now, fetch all and filter client side
            const res = await api.get('/invoices');
            const found = res.data.find(inv => inv.invoice_number.toLowerCase() === searchInvoice.toLowerCase());

            if (found) {
                setInvoice(found);
                setReturnItems(found.items.map(item => ({
                    product_id: item.product_id,
                    product_name: item.product_name,
                    invoiced_qty: item.quantity,
                    return_qty: 0,
                    unit_price: item.unit_price,
                    line_total: item.line_total, // Already reflects quantity
                    reason: ''
                })));
                setManualRefund(null);
            } else {
                alert('Invoice not found');
                setInvoice(null);
            }
        } catch (err) {
            alert('Error searching invoice');
        }
    };

    const updateReturnQty = (productId, qty) => {
        setReturnItems(returnItems.map(item => {
            if (item.product_id === productId) {
                let val = parseFloat(qty) || 0;
                if (val > item.invoiced_qty) val = item.invoiced_qty;
                if (val < 0) val = 0;
                return { ...item, return_qty: val };
            }
            return item;
        }));
    };

    const updateReason = (productId, reason) => {
        setReturnItems(returnItems.map(item =>
            item.product_id === productId ? { ...item, reason } : item
        ));
    };

    const calculateRefundSuggestion = () => {
        if (!invoice) return 0;
        const totalToReturn = returnItems.reduce((acc, item) => {
            if (item.return_qty > 0) {
                // Prorated: (item_total / invoice_subtotal) * invoice_grand_total
                const itemRefund = (item.line_total / invoice.sub_total) * invoice.grand_total;
                return acc + (itemRefund / item.invoiced_qty) * item.return_qty;
            }
            return acc;
        }, 0);
        return parseFloat(totalToReturn.toFixed(2));
    };

    const currentRefund = manualRefund !== null ? manualRefund : calculateRefundSuggestion();

    const handleSubmitReturn = async () => {
        const itemsToReturn = returnItems.filter(item => item.return_qty > 0);
        if (itemsToReturn.length === 0) {
            return alert('Please specify quantity to return for at least one item.');
        }

        try {
            await api.post('/returns', {
                invoice_id: invoice.id,
                items: itemsToReturn.map(item => ({
                    product_id: item.product_id,
                    quantity: item.return_qty,
                    reason: item.reason
                })),
                refund_amount: parseFloat(currentRefund),
                refund_method: refundMethod,
                notes: notes
            });

            alert('Return processed successfully!');
            setInvoice(null);
            setSearchInvoice('');
            setReturnItems([]);
            setNotes('');
            fetchRecent();
        } catch (err) {
            alert(err.response?.data?.detail || 'Error processing return');
        }
    };

    return (
        <div style={{ display: 'flex', gap: '2rem', height: '100%' }}>

            {/* Left side: Process Return */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h1 className="page-title mb-4">Process Return</h1>

                <div className="card mb-4">
                    <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem' }}>
                        <div className="form-group" style={{ flex: 1, marginBottom: 0, position: 'relative' }}>
                            <Search size={20} style={{ position: 'absolute', top: 12, left: 12, color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Enter Invoice Number (e.g. INV-20231024-0001)"
                                style={{ width: '100%', paddingLeft: '2.5rem' }}
                                value={searchInvoice}
                                onChange={e => setSearchInvoice(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary">Find Invoice</button>
                    </form>
                </div>

                {invoice && (
                    <div className="card" style={{ flex: 1, overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                            <div>
                                <h3 style={{ margin: 0, color: 'white' }}>{invoice.invoice_number}</h3>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{formatDateTimeIST(invoice.created_at)}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span className="badge badge-primary">{invoice.payment_method}</span>
                                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', marginTop: '0.5rem', color: 'white' }}>₹{invoice.grand_total.toFixed(2)}</div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <table style={{ width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th style={{ textAlign: 'center' }}>Invoiced Qty</th>
                                        <th style={{ width: '120px' }}>Return Qty</th>
                                        <th>Reason</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {returnItems.map(item => (
                                        <tr key={item.product_id} style={{ backgroundColor: item.return_qty > 0 ? 'rgba(239, 68, 68, 0.1)' : 'transparent' }}>
                                            <td style={{ fontWeight: 500 }}>{item.product_name}</td>
                                            <td style={{ textAlign: 'center' }}>{item.invoiced_qty}</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={item.invoiced_qty}
                                                    step="any"
                                                    style={{ width: '100%', borderColor: item.return_qty > 0 ? 'var(--danger)' : 'var(--border-color)' }}
                                                    value={item.return_qty}
                                                    onChange={e => updateReturnQty(item.product_id, e.target.value)}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    placeholder="Why returned?"
                                                    style={{ width: '100%' }}
                                                    value={item.reason}
                                                    onChange={e => updateReason(item.product_id, e.target.value)}
                                                    disabled={item.return_qty <= 0}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-dark)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1, marginRight: '2rem' }}>
                                    <div className="grid-2">
                                        <div className="form-group mb-0">
                                            <label className="form-label">Refund Mode</label>
                                            <select style={{ width: '100%' }} value={refundMethod} onChange={e => setRefundMethod(e.target.value)}>
                                                <option value="Cash">Cash</option>
                                                <option value="UPI">UPI</option>
                                                <option value="StoreCredit">Store Credit</option>
                                            </select>
                                        </div>
                                        <div className="form-group mb-0">
                                            <label className="form-label">Staff Notes</label>
                                            <input type="text" style={{ width: '100%' }} value={notes} onChange={e => setNotes(e.target.value)} />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ width: '250px', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Refund: ₹</span>
                                        <input 
                                            type="number" 
                                            style={{ width: '120px', fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--danger)', textAlign: 'right' }} 
                                            value={currentRefund}
                                            onChange={(e) => setManualRefund(parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <button
                                        className="btn btn-danger"
                                        style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
                                        onClick={handleSubmitReturn}
                                        disabled={currentRefund <= 0}
                                    >
                                        Confirm Return
                                    </button>
                                </div>
                            </div>
                            <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                * Returned items will be automatically restocked in inventory.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Right side: Recent Returns List */}
            <div style={{ width: '350px', display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <RotateCcw size={20} className="text-primary" /> Recent Returns
                </h2>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {recentReturns.map(r => (
                        <div key={r.id} className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <strong style={{ color: 'white' }}>{r.invoice_number}</strong>
                                <span className="badge badge-danger">₹{r.refund_amount}</span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                                {new Date(r.created_at).toLocaleString()}
                            </div>
                            <div style={{ fontSize: '0.85rem' }}>
                                {r.items.map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', borderBottom: idx < r.items.length - 1 ? '1px dashed var(--border-color)' : 'none' }}>
                                        <span>{item.product_name}</span>
                                        <span style={{ color: 'var(--danger)' }}>x{item.quantity}</span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--primary)', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Processed by {r.processed_by_name}</span>
                                <span>Mode: {r.refund_method}</span>
                            </div>
                        </div>
                    ))}
                    {recentReturns.length === 0 && <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>No recent returns.</div>}
                </div>
            </div>
        </div>
    );
};

export default Returns;
