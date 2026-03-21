'use client';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';

export default function AppLayout({ children, title = 'AyuSphere' }) {
    const { logout } = useAuth();
    const [theme, setTheme] = useState('dark');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    return (
        <div className={theme}>
            {/* Stitch Fonts & Symbols */}
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@200;300;400;500;600&display=swap" rel="stylesheet"/>
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>

            <div className="bg-noise" />
            
            <header>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className="relative group">
                        <div style={{ position: 'absolute', inset: 0, background: 'var(--primary)', opacity: 0.2, filter: 'blur(20px)', borderRadius: '9999px' }}></div>
                        <img src="/logo.svg" alt="Logo" width="40" height="40" style={{ position: 'relative', zIndex: 10, borderRadius: '8px' }} />
                    </div>
                    <div>
                        <span style={{ fontSize: '10px', tracking: '0.4em', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 'bold', display: 'block' }}>Protocol Active</span>
                        <h1 className="cinematic-glow" style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)', margin: 0 }}>AYUSPHERE</h1>
                    </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <button className="material-symbols-outlined" style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>notifications</button>
                    <button onClick={logout} className="material-symbols-outlined" style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>logout</button>
                </div>
            </header>

            <main className="app-container">
                {children}
            </main>

            <div className="bottom-nav-container">
                <nav className="bottom-nav">
                    <Link href="/dashboard" className="nav-item active">
                        <span className="material-symbols-outlined">insights</span>
                        <span>PULSE</span>
                    </Link>
                    <Link href="/analytics" className="nav-item">
                        <span className="material-symbols-outlined">analytics</span>
                        <span>STATS</span>
                    </Link>
                    <Link href="/emergency" className="nav-item">
                        <span className="material-symbols-outlined">emergency_home</span>
                        <span>BASE</span>
                    </Link>
                    <Link href="/hospitals" className="nav-item">
                        <span className="material-symbols-outlined">local_hospital</span>
                        <span>PLAN</span>
                    </Link>
                    <Link href="/profile" className="nav-item">
                        <span className="material-symbols-outlined">person</span>
                        <span>AI</span>
                    </Link>
                </nav>
            </div>
        </div>
    );
}
