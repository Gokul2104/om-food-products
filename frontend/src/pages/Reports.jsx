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

    const [data, setData] = useState(null);
    const [summary, setSummary] = useState(null);

    const fetchData = async () => {
        try {
            const summaryRes = await api.get('/reports/stock-summary');
            setSummary(summaryRes.data);

            if (viewState === 'daily') {
                const res = await api.get(`/reports/daily?date=${dateParam}`);
                setData(res.data);
            } else {
                const res = await api.get(`/reports/monthly?year=${yearParam}&month=${monthParam}`);
                setData(res.data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchData();
    }, [viewState, dateParam, monthParam, yearParam]);

    let barData = [];
    let pieData = [];

    if (data) {
        if (viewState === 'daily') {
            barData = Object.entries(data.hourly_sales).map(([k, v]) => ({ name: k, sales: v }));
        } else {
            barData = Object.entries(data.daily_breakdown).map(([k, v]) => ({ name: k.split('-')[2], sales: v.sales }));
        }
        pieData = Object.entries(data.payment_breakdown).map(([k, v]) => ({ name: k, value: v }));
    }

    const exportCSV = () => {
        if (!data) return;
        let csvContent = "data:text/csv;charset=utf-8,";

        if (viewState === 'daily') {
            csvContent += "Invoice,Customer,Amount,Payment Method,Time\n";
            data.invoices.forEach(inv => {
                csvContent += `"${inv.invoice_number}","${inv.customer_name || 'Walk-in'}","${inv.grand_total}","${inv.payment_method}","${formatTimeIST(inv.created_at)}"\n`;
            });
        } else {
            csvContent += "Date,Sales,Invoices\n";
            Object.entries(data.daily_breakdown).forEach(([k, v]) => {
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

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Sales Reports</h1>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
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

                    <button className="btn btn-primary" onClick={exportCSV}>Export CSV</button>
                </div>
            </div>

            {data && (
                <>
                    <div className="kpi-grid">
                        <div className="card kpi-card">
                            <div className="kpi-info" style={{ marginLeft: 0 }}>
                                <h3>{viewState === 'daily' ? "Today's" : "Month's"} Sales</h3>
                                <p>₹{data.total_sales.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="card kpi-card">
                            <div className="kpi-info" style={{ marginLeft: 0 }}>
                                <h3>Total Historical Revenue</h3>
                                <p>₹{summary?.total_sales_price?.toLocaleString() ?? '0'}</p>
                            </div>
                        </div>
                        <div className="card kpi-card">
                            <div className="kpi-info" style={{ marginLeft: 0 }}>
                                <h3>Total Buy Price (Stock)</h3>
                                <p>₹{summary?.total_buy_price?.toLocaleString() ?? '0'}</p>
                            </div>
                        </div>
                        <div className="card kpi-card">
                            <div className="kpi-info" style={{ marginLeft: 0 }}>
                                <h3>Pending Credits</h3>
                                <p style={{ color: 'var(--danger)' }}>₹{summary?.credits_pending?.toLocaleString() ?? '0'}</p>
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
                </>
            )}
        </div>
    );
};

export default Reports;
