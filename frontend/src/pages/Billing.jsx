import React, { useState, useEffect, useRef } from 'react';
import { Search, ShoppingCart, Plus, Minus, Trash2, Printer, Download } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import api from '../api';
import InvoiceLayout from '../components/InvoiceLayout';
import { downloadAsPDF } from '../utils/pdfUtils';

const Billing = () => {
    const [products, setProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    const [cart, setCart] = useState([]);
    const [customer, setCustomer] = useState({ name: '', phone: '' });
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [paidAmount, setPaidAmount] = useState('');
    const [globalDiscount, setGlobalDiscount] = useState('');

    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const printRef = useRef();

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const res = await api.get('/products');
                // Only active products with stock > 0
                setProducts(res.data.filter(p => p.is_active && p.current_stock > 0));
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    const addToCart = (product) => {
        const existing = cart.find(item => item.product_id === product.id);
        if (existing) {
            if (existing.quantity >= product.current_stock) {
                alert("Cannot add more than available stock!");
                return;
            }
            setCart(cart.map(item =>
                item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
            ));
        } else {
            setCart([...cart, {
                product_id: product.id,
                name: product.name,
                price: product.selling_price,
                tax_rate: product.tax_rate,
                quantity: 1,
                maxStock: product.current_stock
            }]);
        }
    };

    const updateQuantity = (id, delta) => {
        setCart(cart.map(item => {
            if (item.product_id === id) {
                const newQty = item.quantity + delta;
                if (newQty > 0 && newQty <= item.maxStock) {
                    return { ...item, quantity: newQty };
                }
            }
            return item;
        }));
    };

    // Removed updateDiscount for per-item

    const removeFromCart = (id) => {
        setCart(cart.filter(item => item.product_id !== id));
    };

    const subTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountVal = parseFloat(globalDiscount) || 0;

    // Calculate tax based on discounted subtotal
    // Step 1: Get original tax amount
    const originalTax = cart.reduce((sum, item) => {
        const lineVal = item.price * item.quantity;
        return sum + (lineVal * (item.tax_rate / 100));
    }, 0);

    // Step 2: Calculate effective tax proportionally based on discount
    const taxTotal = subTotal > 0
        ? Math.max(0, (subTotal - discountVal) * (originalTax / subTotal))
        : 0;

    const grandTotal = Math.max(0, subTotal - discountVal + taxTotal);

    const handleCheckout = async () => {
        if (cart.length === 0) return alert('Cart is empty!');

        try {
            const payload = {
                customer_name: customer.name || null,
                customer_phone: customer.phone || null,
                items: cart.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity
                })),
                global_discount: discountVal,
                payment_method: paymentMethod,
                payment_status: 'Paid',
                paid_amount: paidAmount !== '' ? parseFloat(paidAmount) : grandTotal
            };

            const res = await api.post('/invoices', payload);
            setInvoice(res.data);

            // Reset POS
            setCart([]);
            setCustomer({ name: '', phone: '' });
            setPaidAmount('');
            setGlobalDiscount('');

            // Sync stock levels directly from the invoice response
            setProducts(prevProducts => {
                const updatedProducts = [...prevProducts];
                res.data.items.forEach(soldItem => {
                    const idx = updatedProducts.findIndex(p => p.id === soldItem.product_id);
                    if (idx !== -1) {
                        updatedProducts[idx] = { 
                            ...updatedProducts[idx], 
                            current_stock: soldItem.remaining_stock 
                        };
                    }
                });
                return updatedProducts.filter(p => p.current_stock > 0);
            });

        } catch (err) {
            alert(err.response?.data?.detail || 'Checkout failed');
        }
    };

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        onAfterPrint: () => setInvoice(null) // clear after print
    });

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.p_id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (invoice) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '2rem' }}>
                <div className="card" style={{ padding: 0 }} ref={printRef}>
                    <InvoiceLayout invoice={invoice} />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                    <button className="btn btn-primary" onClick={handlePrint}><Printer size={18} /> Print Invoice</button>
                    <button className="btn btn-secondary" onClick={() => downloadAsPDF(printRef, invoice.invoice_number)}>
                        <Download size={18} /> Download PDF
                    </button>
                    <button className="btn btn-outline" onClick={() => setInvoice(null)}>New Bill</button>
                </div>
            </div>
        );
    }

    return (
        <div className="billing-container">
            {/* POS Left: Products Grid */}
            <div className="billing-catalog">
                <div className="form-group" style={{ position: 'relative' }}>
                    <Search size={20} style={{ position: 'absolute', top: 12, left: 12, color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Search by name or SKU..."
                        style={{ width: '100%', paddingLeft: '2.5rem', height: '44px', fontSize: '1rem' }}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                
                {loading ? (
                    <div className="loading-overlay" style={{ flex: 1 }}>
                        <div className="spinner"></div>
                        <p>Loading catalog...</p>
                    </div>
                ) : (
                    <div className="products-grid">
                        {filteredProducts.map(p => (
                            <div key={p.id} className="card" style={{ padding: '1rem', cursor: 'pointer', transition: 'transform 0.1s', userSelect: 'none' }} onClick={() => addToCart(p)} onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'} onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{p.p_id}</div>
                                <h4 style={{ margin: 0, marginBottom: '0.5rem' }}>{p.name}</h4>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                                    <span style={{ fontWeight: 600, color: 'var(--primary)' }}>₹{p.selling_price}</span>
                                    <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>{p.current_stock} in stock</span>
                                </div>
                            </div>
                        ))}
                        {filteredProducts.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>No matching products with stock available</div>}
                    </div>
                )}
            </div>

            {/* POS Right: Cart Checkout */}
            <div className="billing-cart">
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShoppingCart className="text-primary" />
                    <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Current Bill</h2>
                </div>

                <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="grid-2">
                        <div>
                            <input type="text" placeholder="Customer Name (optional)" style={{ width: '100%', fontSize: '0.85rem' }} value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} />
                        </div>
                        <div>
                            <input type="text" placeholder="Phone (optional)" style={{ width: '100%', fontSize: '0.85rem' }} value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} />
                        </div>
                    </div>
                </div>

                <div className="cart-items-container">
                    {cart.map(item => (
                        <div key={item.product_id} className="cart-item">
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <strong style={{ fontSize: '1.05rem' }}>{item.name}</strong>
                                <button style={{ color: 'var(--danger)', background: 'none' }} onClick={() => removeFromCart(item.product_id)}><Trash2 size={16} /></button>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>₹{item.price} x {item.quantity}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: 'var(--bg-dark)', borderRadius: '4px', padding: '0.25rem' }}>
                                    <button style={{ padding: '0.25rem', color: 'white', background: 'none' }} onClick={() => updateQuantity(item.product_id, -1)}><Minus size={14} /></button>
                                    <span style={{ width: '2rem', textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</span>
                                    <button style={{ padding: '0.25rem', color: 'white', background: 'none' }} onClick={() => updateQuantity(item.product_id, 1)} disabled={item.quantity >= item.maxStock}><Plus size={14} color={item.quantity >= item.maxStock ? 'gray' : 'white'} /></button>
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '0.5rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Line Total</span>
                                <strong style={{ color: 'var(--primary)' }}>₹{(item.price * item.quantity).toFixed(2)}</strong>
                            </div>
                        </div>
                    ))}
                    {cart.length === 0 && (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexDirection: 'column', gap: '1rem' }}>
                            <ShoppingCart size={48} opacity={0.2} />
                            <span>Cart is empty</span>
                        </div>
                    )}
                </div>

                <div style={{ padding: '1.5rem', backgroundColor: 'rgba(0,0,0,0.2)', borderTop: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: 'var(--text-muted)' }}>
                        <span>Subtotal</span><span>₹{subTotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Discount (₹)</span>
                        <input
                            type="number"
                            style={{ width: '100px', textAlign: 'right' }}
                            placeholder="0.00"
                            value={globalDiscount}
                            onChange={e => setGlobalDiscount(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: 'var(--text-muted)' }}>
                        <span>Tax</span><span>₹{taxTotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>
                        <span>Total</span><span style={{ color: 'var(--primary)' }}>₹{grandTotal.toFixed(2)}</span>
                    </div>

                    <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
                        <div className="form-group mb-0">
                            <label className="form-label" style={{ fontSize: '0.8rem' }}>Payment Mode</label>
                            <select style={{ width: '100%' }} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                                <option value="Cash">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="Credit">Credit</option>
                            </select>
                        </div>
                        <div className="form-group mb-0">
                            <label className="form-label" style={{ fontSize: '0.8rem' }}>Received (Partial)</label>
                            <input type="number" placeholder="Full amount if empty" style={{ width: '100%' }} value={paidAmount} onChange={e => setPaidAmount(e.target.value)} />
                        </div>
                    </div>

                    <button className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }} onClick={handleCheckout} disabled={cart.length === 0}>
                        Checkout & Print Bill
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Billing;
