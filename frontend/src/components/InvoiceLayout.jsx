import React from 'react';

const InvoiceLayout = React.forwardRef(({ invoice }, ref) => {
    if (!invoice) return null;

    return (
        <div className="invoice-print-container" ref={ref} style={{ backgroundColor: 'white', color: 'black', padding: '2rem', width: '100%', maxWidth: '400px', margin: '0 auto', fontFamily: 'monospace' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h2 style={{ color: 'black', margin: 0, textTransform: 'uppercase' }}>OM Food Products</h2>
                <p style={{ color: '#666', fontSize: '0.9rem', margin: '0.25rem 0' }}>Tax Invoice</p>
                <p style={{ fontSize: '0.85rem', margin: '0.25rem 0' }}>{new Date(invoice.created_at).toLocaleString()}</p>
                <p style={{ fontWeight: 'bold', marginTop: '0.5rem', fontSize: '1.1rem' }}>{invoice.invoice_number}</p>
            </div>

            <div style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                {invoice.customer_name && <div><strong>Customer:</strong> {invoice.customer_name}</div>}
                {invoice.customer_phone && <div><strong>Phone:</strong> {invoice.customer_phone}</div>}
            </div>

            <table style={{ width: '100%', marginBottom: '1.5rem', fontSize: '0.9rem', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid #000' }}>
                        <th style={{ color: 'black', padding: '0.5rem 0', textAlign: 'left' }}>Item</th>
                        <th style={{ color: 'black', textAlign: 'right', padding: '0.5rem 0' }}>Qty</th>
                        <th style={{ color: 'black', textAlign: 'right', padding: '0.5rem 0' }}>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {invoice.items.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '0.5rem 0' }}>{item.product_name}</td>
                            <td style={{ textAlign: 'right', padding: '0.5rem 0' }}>{item.quantity}</td>
                            <td style={{ textAlign: 'right', padding: '0.5rem 0' }}>₹{item.line_total.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div style={{ borderTop: '1px dashed #ccc', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>Subtotal</span><span>₹{invoice.sub_total.toFixed(2)}</span>
                </div>
                {invoice.global_discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#d32f2f' }}>
                        <span>Discount</span><span>-₹{invoice.global_discount.toFixed(2)}</span>
                    </div>
                )}
                {invoice.tax_amount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span>Tax</span><span>₹{invoice.tax_amount.toFixed(2)}</span>
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #000', fontWeight: 'bold', fontSize: '1.2rem' }}>
                    <span>Total</span><span>₹{invoice.grand_total.toFixed(2)}</span>
                </div>

                {invoice.grand_total > invoice.paid_amount && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', color: '#d32f2f', fontWeight: 'bold' }}>
                        <span>Balance (Credit)</span><span>₹{(invoice.grand_total - invoice.paid_amount).toFixed(2)}</span>
                    </div>
                )}
            </div>

            <div style={{ textAlign: 'center', marginTop: '3rem', fontSize: '0.85rem', color: '#666' }}>
                Paid via {invoice.payment_method}
                <br />
                Thank you for shopping!
            </div>
        </div>
    );
});

InvoiceLayout.displayName = 'InvoiceLayout';

export default InvoiceLayout;
