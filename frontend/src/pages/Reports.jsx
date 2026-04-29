import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../api';
import { formatTimeIST } from '../utils/dateUtils';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const Reports = () => {
    const [viewState, setViewState] = useState('daily'); // 'daily' or 'monthly'
    const [dateParam, setDateParam] = useState(new Date().toISOString().split('T')[0]);
    const [monthParam, setMonthParam] = useState(new Date().getMonth() + 1);
    const [yearParam, setYearParam] = useState(new Date().getFullYear());
    const [locationFilter, setLocationFilter] = useState('All');

    const [data, setData] = useState(null);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const summaryRes = await api.get('/reports/stock-summary');
            setSummary(summaryRes.data);

            const locationParam = locationFilter !== 'All' ? `&related_to=${locationFilter}` : '';

            if (viewState === 'daily') {
                const res = await api.get(`/reports/daily?date=${dateParam}${locationParam}`);
                setData(res.data);
            } else {
                const res = await api.get(`/reports/monthly?year=${yearParam}&month=${monthParam}${locationParam}`);
                setData(res.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [viewState, dateParam, monthParam, yearParam, locationFilter]);

    let barData = [];
    let pieData = [];

    if (data) {
        if (viewState === 'daily') {
            barData = Object.entries(data.hourly_sales || {}).map(([k, v]) => ({ name: k, sales: v }));
        } else {
            barData = Object.entries(data.daily_breakdown || {}).map(([k, v]) => ({ name: k.split('-')[2], sales: v.sales }));
        }
        pieData = Object.entries(data.payment_breakdown || {}).map(([k, v]) => ({ name: k, value: v }));
    }

    const exportCSV = () => {
        if (!data) return;
        let csvContent = "data:text/csv;charset=utf-8,";

        if (viewState === 'daily') {
            csvContent += "Invoice,Customer,Amount,Payment Method,Location,Time\n";
            data.invoices.forEach(inv => {
                csvContent += `"${inv.invoice_number}","${inv.customer_name || 'Walk-in'}","${inv.grand_total}","${inv.payment_method}","${inv.related_to || 'Shop'}","${formatTimeIST(inv.created_at)}"\n`;
            });
        } else {
            csvContent += "Date,Sales,Invoices\n";
            Object.entries(data.daily_breakdown || {}).forEach(([k, v]) => {
                csvContent += `"${k}","${v.sales}","${v.count}"\n`;
            });
        }

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `sales_report_${viewState}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const locationLabel = locationFilter === 'All' ? '' : ` — ${locationFilter === 'Shop' ? '🏪 Shop' : '🏕️ Stall'}`;

    return (
        <div style={{ position: 'relative', minHeight: '400px' }}>
            {loading && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 17, 21, 0.7)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    zIndex: 50, borderRadius: 'var(--border-radius)',
                    gap: '1rem'
                }}>
                    <div className="spinner" style={{ width: '48px', height: '48px' }}></div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Loading report...</p>
                </div>
            )}

            <div className="page-header">
                <h1 className="page-title">Sales Reports{locationLabel}</h1>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select className="form-select" value={viewState} onChange={e => setViewState(e.target.value)}>
                        <option value="daily">Daily Report</option>
                        <option value="monthly">Monthly Report</option>
                    </select>

                    {viewState === 'daily' ? (
                        <input type="date" value={dateParam} onChange={e => setDateParam(e.target.value)} />
                    ) : (
                        <>
                            <select className="form-select" value={monthParam} onChange={e => setMonthParam(parseInt(e.target.value))}>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>Month {m}</option>)}
                            </select>
                            <input type="number" min="2020" max="2050" value={yearParam} onChange={e => setYearParam(parseInt(e.target.value))} style={{ width: '80px' }} />
                        </>
                    )}

                    <select
                        className="form-select"
                        value={locationFilter}
                        onChange={e => setLocationFilter(e.target.value)}
                        style={{ minWidth: '130px' }}
                    >
                        <option value="All">📍 All Locations</option>
                        <option value="Shop">🏪 Shop</option>
                        <option value="Stall">🏕️ Stall</option>
                    </select>

                    <button className="btn btn-primary" onClick={exportCSV}>Export CSV</button>
                </div>
            </div>

            {data && (
                <>
                    {/* Profit Summary Cards */}
                    <div className="kpi-grid">
                        <div className="card kpi-card">
                            <div className="kpi-info" style={{ marginLeft: 0 }}>
                                <h3>Total Selling Price</h3>
                                <p style={{ color: 'var(--primary)' }}>₹{(data.total_selling_price ?? data.total_sales ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                            </div>
                        </div>
                        <div className="card kpi-card">
                            <div className="kpi-info" style={{ marginLeft: 0 }}>
                                <h3>Total Cost Price <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-muted)' }}>(COGS)</span></h3>
                                <p style={{ color: 'var(--warning, #f59e0b)' }}>₹{(data.total_cost_price ?? data.cogs ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                            </div>
                        </div>
                        <div className="card kpi-card">
                            <div className="kpi-info" style={{ marginLeft: 0 }}>
                                <h3>Total Profit <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-muted)' }}>(Selling − Cost)</span></h3>
                                <p style={{ color: (data.total_profit ?? 0) >= 0 ? 'var(--success, #10b981)' : 'var(--danger)' }}>
                                    ₹{(data.total_profit ?? data.gross_profit ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                        <div className="card kpi-card">
                            <div className="kpi-info" style={{ marginLeft: 0 }}>
                                <h3>Total Expenses</h3>
                                <p style={{ color: 'var(--danger, #ef4444)' }}>₹{(data.total_expenses ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                            </div>
                        </div>
                    </div>

                    {/* Final Profit — highlighted card */}
                    <div style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
                        <div className="card" style={{
                            background: (data.final_profit ?? data.net_profit ?? 0) >= 0
                                ? 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.03) 100%)'
                                : 'linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.03) 100%)',
                            border: `1px solid ${(data.final_profit ?? data.net_profit ?? 0) >= 0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                            padding: '1.5rem',
                            textAlign: 'center'
                        }}>
                            <h3 style={{ margin: 0, marginBottom: '0.5rem', fontSize: '1rem', color: 'var(--text-muted)' }}>
                                Final Profit <span style={{ fontSize: '0.8rem' }}>(Total Profit − Expenses)</span>
                            </h3>
                            <p style={{
                                margin: 0,
                                fontSize: '2rem',
                                fontWeight: 800,
                                color: (data.final_profit ?? data.net_profit ?? 0) >= 0 ? 'var(--success, #10b981)' : 'var(--danger, #ef4444)'
                            }}>
                                ₹{(data.final_profit ?? data.net_profit ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>

                    {/* Additional info row */}
                    <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
                        <div className="card kpi-card">
                            <div className="kpi-info" style={{ marginLeft: 0 }}>
                                <h3>{viewState === 'daily' ? "Today's" : "Month's"} Invoices</h3>
                                <p>{data.total_invoices}</p>
                            </div>
                        </div>
                        <div className="card kpi-card">
                            <div className="kpi-info" style={{ marginLeft: 0 }}>
                                <h3>Total Discount</h3>
                                <p>₹{(data.total_discount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                            </div>
                        </div>
                        <div className="card kpi-card">
                            <div className="kpi-info" style={{ marginLeft: 0 }}>
                                <h3>Total Tax</h3>
                                <p>₹{(data.total_tax ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                            </div>
                        </div>
                        <div className="card kpi-card">
                            <div className="kpi-info" style={{ marginLeft: 0 }}>
                                <h3>Pending Credits</h3>
                                <p style={{ color: 'var(--danger)' }}>₹{summary?.credits_pending?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) ?? '0.00'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid-2">
                        <div className="card">
                            <h3 style={{ marginBottom: '1.5rem' }}>Sales Graph</h3>
                            <div style={{ height: '300px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={barData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                                        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)', borderRadius: '8px' }} itemStyle={{ color: 'var(--text-main)' }} />
                                        <Bar dataKey="sales" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="card">
                            <h3 style={{ marginBottom: '1.5rem' }}>Payment Methods</h3>
                            <div style={{ height: '300px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                                            {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)', borderRadius: '8px' }} itemStyle={{ color: 'var(--text-main)' }} />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Monthly expense breakdown */}
                    {viewState === 'monthly' && data.expense_breakdown && Object.keys(data.expense_breakdown).length > 0 && (
                        <div className="card" style={{ marginTop: '1.5rem' }}>
                            <h3 style={{ marginBottom: '1rem' }}>Expense Breakdown</h3>
                            <div className="table-responsive">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Category</th>
                                            <th style={{ textAlign: 'right' }}>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(data.expense_breakdown || {}).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                                            <tr key={cat}>
                                                <td><span className="badge badge-primary">{cat}</span></td>
                                                <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--danger, #ef4444)' }}>
                                                    ₹{amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        ))}
                                        <tr style={{ borderTop: '2px solid var(--border-color)' }}>
                                            <td style={{ fontWeight: 700 }}>Total</td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger, #ef4444)' }}>
                                                ₹{(data.total_expenses ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Reports;
