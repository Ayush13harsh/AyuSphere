'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import AppLayout from '../components/AppLayout';
import NotificationBanner from '../components/NotificationBanner';
import { fetchAPI } from '../lib/api';

const AmbulanceTracker = dynamic(() => import('../components/AmbulanceTracker'), {
    ssr: false,
    loading: () => <div className="tracker-overlay"><div className="tracker-modal" style={{ textAlign: 'center', padding: '3rem' }}><h3>Connecting to Dispatch...</h3></div></div>
});

export default function Dashboard() {
    const [alert, setAlert] = useState(null);
    const [loading, setLoading] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);
    const [countdown, setCountdown] = useState(null);
    const [showTracker, setShowTracker] = useState(false);
    const [userCoords, setUserCoords] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);
    const handleSOSRef = useRef(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition && !recognitionRef.current) {
                const rec = new SpeechRecognition();
                rec.continuous = true;
                rec.interimResults = false;
                rec.lang = 'en-US';

                rec.onresult = (event) => {
                    const current = event.resultIndex;
                    const transcript = event.results[current][0].transcript.toLowerCase();
                    if (transcript.includes('help') || transcript.includes('sos') || transcript.includes('emergency')) {
                        if (handleSOSRef.current) handleSOSRef.current();
                        setIsListening(false);
                        rec.stop();
                    }
                };

                recognitionRef.current = rec;
            }
        }
    }, []);

    useEffect(() => {
        if (recognitionRef.current) {
            recognitionRef.current.onend = () => {
                if (isListening) {
                    try { recognitionRef.current.start(); } catch (e) { }
                }
            };
        }
    }, [isListening]);

    const toggleVoice = () => {
        if (!recognitionRef.current) {
            setAlert({ type: 'error', text: 'Voice recognition is not supported in this browser. Try Chrome or Safari.' });
            return;
        }

        if (isListening) {
            setIsListening(false);
            recognitionRef.current.stop();
        } else {
            setIsListening(true);
            try { recognitionRef.current.start(); } catch (e) { }
        }
    };

    useEffect(() => {
        if (countdown === null) return;

        if (countdown === 0) {
            startSOSSequence();
            return;
        }

        const timer = setTimeout(() => {
            setCountdown(prev => prev - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [countdown]);

    const handleSOS = () => {
        setAlert(null);
        setCountdown(5);
    };
    handleSOSRef.current = handleSOS;

    const cancelSOS = () => {
        setCountdown(null);
    };

    const handleShareLocation = () => {
        setAlert(null);
        setLocationLoading(true);

        if (!navigator.geolocation) {
            setAlert({ type: 'error', text: 'Geolocation is not supported by your browser' });
            setLocationLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;
            const message = `🚨 AyuSphere Location Alert\nI'm sharing my current location with you.\n📍 Live Location: ${mapsLink}\n⏰ Time: ${new Date().toLocaleString('en-IN')}`;

            // Try native share (works on mobile and modern browsers)
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'My Live Location — AyuSphere',
                        text: message,
                        url: mapsLink
                    });
                    setAlert({ type: 'success', message: 'Location shared successfully!', mapsLink });
                } catch (err) {
                    if (err.name !== 'AbortError') {
                        // User cancelled, not an error
                        setAlert({ type: 'error', text: 'Sharing was cancelled.' });
                    }
                }
            } else {
                // Fallback: open WhatsApp with the message
                const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                window.open(waUrl, '_blank');
                setAlert({ type: 'success', message: 'Location link opened in WhatsApp!', mapsLink });
            }

            setLocationLoading(false);
        }, () => {
            setAlert({ type: 'error', text: 'Unable to retrieve location. Check permissions.' });
            setLocationLoading(false);
        });
    };

    const startSOSSequence = () => {
        setCountdown(null);
        setLoading(true);

        if (!navigator.geolocation) {
            setAlert({ type: 'error', text: 'Geolocation is not supported by your browser' });
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const data = await fetchAPI('/sos/trigger', {
                    method: 'POST',
                    body: JSON.stringify({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    })
                });

                setAlert({
                    type: 'success',
                    message: data.message,
                    mapsLink: data.maps_link
                });

                setUserCoords({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                setShowTracker(true);

                // Ambulance Call Flow
                setTimeout(() => {
                    if (window.confirm("Emergency SOS activated. Do you want to call ambulance now?")) {
                        window.location.href = 'tel:108';
                    }
                }, 300);

            } catch (error) {
                setAlert({ type: 'error', text: 'Failed to send SOS: ' + error.message });
            } finally {
                setLoading(false);
            }
        }, () => {
            setAlert({ type: 'error', text: 'Unable to retrieve location. Check permissions.' });
            setLoading(false);
        });
    };

    return (
        <AppLayout title="AyuSphere">
            <NotificationBanner />
            <div className="dashboard-layout">
            {countdown !== null && (
                <div className="sos-modal-overlay">
                    <div className="sos-modal">
                        <div className="countdown-circle">
                            <span>{countdown}</span>
                        </div>
                        <h2 style={{ fontSize: '1.4rem', marginBottom: '8px', color: 'var(--primary-red)' }}>Emergency SOS</h2>
                        <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem', fontWeight: 500 }}>Sending alerts in {countdown} seconds...</p>
                        <button onClick={cancelSOS} className="btn btn-outline" style={{ background: 'var(--white)', padding: '1rem', fontSize: '1.1rem' }}>
                            Cancel SOS
                        </button>
                    </div>
                </div>
            )}

            {alert && alert.type === 'error' && (
                <div className="alert alert-error">{alert.text}</div>
            )}
            {alert && alert.type === 'success' && (
                <div className="alert alert-success">
                    <strong>SOS Sent!</strong> {alert.message}
                    <br />
                    <a href={alert.mapsLink} target="_blank" rel="noopener noreferrer"
                        style={{ color: '#03543F', textDecoration: 'underline', marginTop: '8px', display: 'inline-block' }}>
                        View Logged Incident Map
                    </a>
                </div>
            )}

            {/* Welcome Hero Section */}
            <div style={{ textAlign: 'center', marginBottom: '0.25rem', transition: 'opacity 0.5s var(--apple-ease)' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '4px', letterSpacing: '-0.5px' }}>
                    {new Date().getHours() < 12 ? '☀️ Good Morning' : new Date().getHours() < 17 ? '🌤 Good Afternoon' : '🌙 Good Evening'}
                </h2>
                <p style={{ color: 'var(--text-light)', fontSize: '0.95rem', fontWeight: 500 }}>
                    {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
            </div>

            <div className="sos-container" style={{ gap: '3rem', paddingBottom: '1.25rem' }}>
                <button className={`sos-button ${loading ? 'pulse-active' : ''} ${isListening ? 'listening-glow' : ''}`} onClick={handleSOS} disabled={loading}>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <span className="loading-spinner" style={{ width: '24px', height: '24px', borderWidth: '3px', marginBottom: '6px' }}></span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '1px' }}>ALERTING</span>
                        </div>
                    ) : 'SOS'}
                </button>

                <button
                    onClick={toggleVoice}
                    className="health-hub-card"
                    style={{
                        background: isListening ? '#ef4444' : '',
                        color: isListening ? 'white' : 'var(--text-dark)',
                        border: isListening ? 'none' : '',
                        padding: '12px 22px',
                        borderRadius: '30px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        flexShrink: 0,
                        minWidth: '160px'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                            <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
                        </svg>
                        <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>{isListening ? 'Voice Active' : 'Enable Voice SOS'}</span>
                    </div>
                    {!isListening && (
                        <span style={{ fontSize: '0.75rem', opacity: 0.7, fontWeight: 600 }}>Say "Help" to activate</span>
                    )}
                </button>
            </div>

            {/* ── Emergency Actions ── */}
            <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-light)', marginBottom: '0.85rem', fontWeight: 800 }}>
                    🚨 Emergency Actions
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <a href="tel:108" className="premium-gradient-red" style={{
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '1.1rem',
                        borderRadius: '18px', textDecoration: 'none'
                    }}>
                        <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'rgba(255,255,255,0.25)', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                            <svg viewBox="0 0 24 24" width="26" height="26" fill="white"><path d="M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.28-.28.67-.36 1.02-.25 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" /></svg>
                        </div>
                        <div>
                            <div style={{ fontSize: '1rem', fontWeight: 800 }}>Call Ambulance</div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.9, fontWeight: 600 }}>Dial 108 now</div>
                        </div>
                    </a>
                    <button onClick={handleShareLocation} disabled={locationLoading} className="premium-gradient-blue" style={{
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '1.1rem',
                        borderRadius: '18px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left'
                    }}>
                        <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'rgba(255,255,255,0.25)', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                            {locationLoading ? (
                                <span className="loading-spinner" style={{ width: '24px', height: '24px', borderColor: 'rgba(255,255,255,0.4)', borderTopColor: 'white' }}></span>
                            ) : (
                                <svg viewBox="0 0 24 24" width="26" height="26" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
                            )}
                        </div>
                        <div>
                            <div style={{ fontSize: '1rem', fontWeight: 800 }}>{locationLoading ? 'Sharing...' : 'Share Location'}</div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.9, fontWeight: 600 }}>Send via WhatsApp</div>
                        </div>
                    </button>
                </div>
            </div>

            {/* ── Smart Tools ── */}
            <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-light)', marginBottom: '0.85rem', fontWeight: 800 }}>
                    🩺 Smart Tools
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <Link href="/symptom-checker" className="action-card" style={{ padding: '1.25rem 0.5rem' }}>
                        <div className="icon-badge" style={{ background: 'rgba(245,158,11,0.1)' }}>
                            <svg viewBox="0 0 24 24" fill="#f59e0b"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" /></svg>
                        </div>
                        <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>Symptom Check</span>
                    </Link>
                    <Link href="/chatbot" className="action-card" style={{ padding: '1.25rem 0.5rem' }}>
                        <div className="icon-badge" style={{ background: 'rgba(99,102,241,0.1)' }}>
                            <svg viewBox="0 0 24 24" fill="#6366f1"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 11H7V9h2v2zm4 0h-2V9h2v2zm4 0h-2V9h2v2z" /></svg>
                        </div>
                        <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>Dr. AyuSphere</span>
                    </Link>
                    <Link href="/risk-assessment" className="action-card" style={{ padding: '1.25rem 0.5rem' }}>
                        <div className="icon-badge" style={{ background: 'rgba(16,185,129,0.1)' }}>
                            <svg viewBox="0 0 24 24" fill="#10b981"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" /></svg>
                        </div>
                        <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>Risk Analysis</span>
                    </Link>
                </div>
            </div>

            {/* ── Health Hub ── */}
            <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-light)', marginBottom: '0.85rem', fontWeight: 800 }}>
                    💊 Health Hub
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <Link href="/analytics" className="health-hub-card" style={{
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '1.1rem',
                        borderRadius: '18px', textDecoration: 'none', color: 'var(--text-dark)'
                    }}>
                        <div className="icon-badge" style={{ background: 'rgba(236,72,153,0.1)' }}>
                            <svg viewBox="0 0 24 24" width="24" height="24" fill="#ec4899"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" /></svg>
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '1rem' }}>Analytics</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 600 }}>Health trends</div>
                        </div>
                    </Link>
                    <Link href="/medical-id" className="health-hub-card" style={{
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '1.1rem',
                        borderRadius: '18px', textDecoration: 'none', color: 'var(--text-dark)'
                    }}>
                        <div className="icon-badge" style={{ background: 'rgba(14,165,233,0.1)' }}>
                            <svg viewBox="0 0 24 24" width="24" height="24" fill="#0ea5e9"><path d="M20 7h-5V4c0-1.1-.9-2-2-2h-2c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm-9-3h2v5h-2V4zm0 12h-2v-3H7v-2h2V9h2v2h2v2h-2v3z" /></svg>
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '1rem' }}>Medical ID</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 600 }}>Health passport</div>
                        </div>
                    </Link>
                    <Link href="/hospitals" className="health-hub-card" style={{
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '1.1rem',
                        borderRadius: '18px', textDecoration: 'none', color: 'var(--text-dark)'
                    }}>
                        <div className="icon-badge" style={{ background: 'rgba(139,92,246,0.1)' }}>
                            <svg viewBox="0 0 24 24" width="24" height="24" fill="#8b5cf6"><path d="M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" /></svg>
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '1rem' }}>Hospitals</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 600 }}>Near you</div>
                        </div>
                    </Link>
                    <Link href="/profile" className="health-hub-card" style={{
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '1.1rem',
                        borderRadius: '18px', textDecoration: 'none', color: 'var(--text-dark)'
                    }}>
                        <div className="icon-badge" style={{ background: 'rgba(244,63,94,0.1)' }}>
                            <svg viewBox="0 0 24 24" width="24" height="24" fill="#f43f5e"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" /></svg>
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '1rem' }}>My Profile</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 600 }}>Medical info</div>
                        </div>
                    </Link>
                </div>
            </div>
            </div>
            
            <footer className="premium-footer">
                <div className="footer-content">
                    <p className="footer-text">
                        Made by <span className="author-name">AYUSH HARSH</span>
                    </p>
                    <div className="social-links">
                        <a href="https://www.instagram.com/ayustance/" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Instagram">
                            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                        </a>
                        <a href="https://www.linkedin.com/in/ayush13harsh/" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="LinkedIn">
                            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
                        </a>
                        <a href="mailto:ayush13032003harsh@gmail.com" className="social-icon" aria-label="Email">
                            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                        </a>
                    </div>
                </div>
            </footer>

            {showTracker && userCoords && (
                <AmbulanceTracker userLocation={userCoords} onClose={() => setShowTracker(false)} />
            )}
        </AppLayout>
    );
}
