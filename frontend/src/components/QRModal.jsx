import React, { useEffect } from 'react';
import { X, QrCode } from 'lucide-react';
import qrImage from '../assets/om-appalam-qr.jpeg';

const QRModal = ({ onClose }) => {
    useEffect(() => {
        document.body.classList.add('bright-mode');
        return () => document.body.classList.remove('bright-mode');
    }, []);

    return (
        <div
            className="modal-overlay"
            onClick={onClose}
            style={{ zIndex: 9999 }}
        >
            <div
                className="modal-content fadeIn"
                onClick={e => e.stopPropagation()}
                style={{ maxWidth: '360px', textAlign: 'center' }}
            >
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <QrCode size={20} />
                        <h3 style={{ margin: 0 }}>UPI Payment QR</h3>
                    </div>
                    <button className="close-btn" onClick={onClose}><X size={22} /></button>
                </div>
                <div className="modal-body" style={{ padding: '1.5rem' }}>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                        Scan to pay via any UPI app
                    </p>
                    <div style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '1rem',
                        display: 'inline-block',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                    }}>
                        <img
                            src={qrImage}
                            alt="OM Food Products UPI QR Code"
                            style={{ width: '240px', height: '240px', objectFit: 'contain', display: 'block' }}
                        />
                    </div>
                    <p style={{ color: 'var(--text-muted)', marginTop: '1rem', fontSize: '0.8rem' }}>
                        OM Food Products
                    </p>
                </div>
            </div>
        </div>
    );
};

export default QRModal;
