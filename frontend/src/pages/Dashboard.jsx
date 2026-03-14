import React, { useState, useEffect } from 'react';
import { DollarSign, Package, AlertTriangle, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api';

const Dashboard = () => {
    const [data, setData] = useState({
        total_sales: 0,
        total_stock_value: 0,
        total_buy_price: 0,
        total_sales_price: 0,
        credits_pending: 0,
        low_stock_count: 0,
        total_invoices: 0,
        hourly_sales: {}
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [dailyRes, stockRes] = await Promise.all([
                    api.get('/reports/daily'),
                    api.get('/reports/stock-summary')
                ]);

                setData({
                    total_sales: dailyRes.data.total_sales,
                    total_invoices: dailyRes.data.total_invoices,
                    hourly_sales: dailyRes.data.hourly_sales,
                    total_stock_value: stockRes.data.total_stock_value,
                    total_buy_price: stockRes.data.total_buy_price,
                    total_sales_price: stockRes.data.total_sales_price,
                    credits_pending: stockRes.data.credits_pending,
                    low_stock_count: stockRes.data.low_stock_count
                });
            } catch (err) {
                console.error("Error fetching dashboard data", err);
            }
        };
        fetchData();
    }, []);

    const chartData = Object.entries(data.hourly_sales).map(([time, amount]) => ({
        time,
        amount
    }));

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Dashboard</h1>
            </div>

            <div className="kpi-grid">
                <div className="card kpi-card">
                    <div className="kpi-icon"><DollarSign size={24} /></div>
                    <div className="kpi-info">
                        <h3>Today's Sales</h3>
                        <p>₹{data.total_sales.toLocaleString()}</p>
                    </div>
                </div>

                <div className="card kpi-card">
                    <div className="kpi-icon" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>
                        <TrendingUp size={24} />
                    </div>
                    <div className="kpi-info">
                        <h3>Invoices Today</h3>
                        <p>{data.total_invoices}</p>
                    </div>
                </div>

                <div className="card kpi-card">
                    <div className="kpi-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--info)' }}>
                        <Package size={24} />
                    </div>
                    <div className="kpi-info">
                        <h3>Total Stock Value</h3>
                        <p>₹{data.total_stock_value.toLocaleString()}</p>
                    </div>
                </div>

                <div className="card kpi-card">
                    <div className="kpi-icon" style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }}>
                        <AlertTriangle size={24} />
                    </div>
                    <div className="kpi-info">
                        <h3>Low Stock Items</h3>
                        <p>{data.low_stock_count}</p>
                    </div>
                </div>
            </div>

            <div className="grid-2">
                <div className="card">
                    <h3 style={{ marginBottom: '1.5rem' }}>Today's Sales Trend</h3>
                    <div style={{ height: '300px' }}>
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                    <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                                        itemStyle={{ color: 'var(--text-main)' }}
                                    />
                                    <Area type="monotone" dataKey="amount" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                No sales data yet today
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
