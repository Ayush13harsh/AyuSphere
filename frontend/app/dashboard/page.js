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

            {/* Welcome Greeting — Luminescent Guardian Style */}
            <div className="greeting-section">
                <h2>
                    {new Date().getHours() < 12 ? '☀️ Good Morning' : new Date().getHours() < 17 ? '🌤 Good Afternoon' : '🌙 Good Evening'}
                </h2>
                <p>
                    {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
            </div>

            <div className="sos-container" style={{ gap: '2rem' }}>
                <button 
                  className={`sos-button ${loading ? 'pulse-active' : ''} ${isListening ? 'listening-glow' : ''}`} 
                  onClick={handleSOS} 
                  disabled={loading}
                >
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span className="loading-spinner" style={{ width: '20px', height: '20px', marginBottom: '4px' }}></span>
                            <span style={{ fontSize: '0.8rem', letterSpacing: '0' }}>ALERTING</span>
                        </div>
                    ) : 'SOS'}
                </button>

                <button
                    onClick={toggleVoice}
                    className="premium-card"
                    style={{
                        background: isListening ? 'var(--secondary-guardian)' : 'var(--surface-container-lowest)',
                        color: isListening ? 'white' : 'var(--text-dark)',
                        padding: '1rem 1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        minWidth: '160px',
                        border: isListening ? 'none' : '1px solid var(--outline-variant)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                            <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
                        </svg>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{isListening ? 'Voice Active' : 'Voice SOS'}</span>
                    </div>
                    {!isListening && (
                        <span style={{ fontSize: '0.7rem', opacity: 0.7, fontWeight: 500 }}>Say "Help" to activate</span>
                    )}
                </button>
            </div>

            {/* ── Emergency Actions ── */}
            <div style={{ marginBottom: '2.5rem' }}>
                <span className="section-label">🚨 Emergency Actions</span>
                <div className="action-grid-2">
                    <a href="tel:108" className="premium-card bg-medical-red" style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none' }}>
                        <div className="icon-badge" style={{ background: 'rgba(255,255,255,0.2)' }}>
                            <svg viewBox="0 0 24 24" width="28" height="28" fill="white"><path d="M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.28-.28.67-.36 1.02-.25 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" /></svg>
                        </div>
                        <div>
                            <h3>Ambulance</h3>
                            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Dial 108 now</div>
                        </div>
                    </a>
                    <button onClick={handleShareLocation} disabled={locationLoading} className="premium-card bg-medical-blue" style={{ display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left', border: 'none', cursor: 'pointer' }}>
                        <div className="icon-badge" style={{ background: 'rgba(255,255,255,0.2)' }}>
                            {locationLoading ? (
                                <span className="loading-spinner" style={{ width: '24px', height: '24px' }}></span>
                            ) : (
                                <svg viewBox="0 0 24 24" width="28" height="28" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
                            )}
                        </div>
                        <div>
                            <h3>Location</h3>
                            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>WhatsApp Alert</div>
                        </div>
                    </button>
                </div>
            </div>

            {/* ── Smart Tools ── */}
            <div style={{ marginBottom: '2.5rem' }}>
                <span className="section-label">🩺 Smart Tools</span>
                <div className="action-grid-3">
                    <Link href="/symptom-checker" className="action-card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div className="icon-badge" style={{ marginBottom: '8px' }}>
                            <svg viewBox="0 0 24 24" width="28" height="28" fill="var(--primary-guardian)"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" /></svg>
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Symptom Check</span>
                    </Link>
                    <Link href="/chatbot" className="action-card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div className="icon-badge" style={{ marginBottom: '8px' }}>
                            <svg viewBox="0 0 24 24" width="28" height="28" fill="var(--primary-guardian)"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 11H7V9h2v2zm4 0h-2V9h2v2zm4 0h-2V9h2v2z" /></svg>
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>AyuSphere AI</span>
                    </Link>
                    <Link href="/risk-assessment" className="action-card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div className="icon-badge" style={{ marginBottom: '8px' }}>
                            <svg viewBox="0 0 24 24" width="28" height="28" fill="var(--primary-guardian)"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" /></svg>
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Risk Analysis</span>
                    </Link>
                </div>
            </div>

            {/* ── Health Hub ── */}
            <div style={{ marginBottom: '2rem' }}>
                <span className="section-label">💊 Health Hub</span>
                <div className="action-grid-2">
                    <Link href="/analytics" className="premium-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none' }}>
                        <div className="icon-badge">
                            <svg viewBox="0 0 24 24" width="26" height="26" fill="var(--primary-guardian)"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" /></svg>
                        </div>
                        <div>
                            <h3>Analytics</h3>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Daily Trends</div>
                        </div>
                    </Link>
                    <Link href="/medical-id" className="premium-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none' }}>
                        <div className="icon-badge">
                            <svg viewBox="0 0 24 24" width="26" height="26" fill="var(--primary-guardian)"><path d="M20 7h-5V4c0-1.1-.9-2-2-2h-2c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm-9-3h2v5h-2V4zm0 12h-2v-3H7v-2h2V9h2v2h2v2h-2v3z" /></svg>
                        </div>
                        <div>
                            <h3>Medical ID</h3>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>First-Aid Info</div>
                        </div>
                    </Link>
                    <Link href="/hospitals" className="premium-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none' }}>
                        <div className="icon-badge">
                            <svg viewBox="0 0 24 24" width="26" height="26" fill="var(--primary-guardian)"><path d="M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" /></svg>
                        </div>
                        <div>
                            <h3>Hospitals</h3>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Find ER Units</div>
                        </div>
                    </Link>
                    <Link href="/profile" className="premium-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none' }}>
                        <div className="icon-badge">
                            <svg viewBox="0 0 24 24" width="26" height="26" fill="var(--primary-guardian)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" /></svg>
                        </div>
                        <div>
                            <h3>Profile</h3>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Health Records</div>
                        </div>
                    </Link>
                </div>
            </div>


            {showTracker && userCoords && (
                <AmbulanceTracker userLocation={userCoords} onClose={() => setShowTracker(false)} />
            )}
        </AppLayout>
    );
}
