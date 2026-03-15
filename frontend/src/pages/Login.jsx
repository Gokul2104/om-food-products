import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Loader2 } from 'lucide-react';
import api from '../api';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);

            const response = await api.post('/auth/login', formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            localStorage.setItem('token', response.data.access_token);
            localStorage.setItem('user', JSON.stringify(response.data.user));

            navigate('/');
        } catch (err) {
            setError(err.response?.data?.detail || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="glass-panel login-box">
                <div className="login-logo">
                    <Layers size={48} className="text-primary" style={{ margin: '0 auto 1rem' }} />
                    <h1>OM Food Products</h1>
                    <p>Stock & Billing Management</p>
                </div>

                {error && (
                    <div style={{ padding: '0.75rem', marginBottom: '1.5rem', borderRadius: '8px', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', fontSize: '0.9rem', textAlign: 'center' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input
                            type="email"
                            required
                            style={{ width: '100%' }}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@omshop.com"
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '2rem' }}>
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            required
                            style={{ width: '100%' }}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '0.8rem' }}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
