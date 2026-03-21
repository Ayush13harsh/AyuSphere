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

    // ── Voice SOS Logic (Preserved) ──
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
            setAlert({ type: 'error', text: 'Voice recognition not supported.' });
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

    // ── SOS Sequence Logic (Preserved) ──
    useEffect(() => {
        if (countdown === null) return;
        if (countdown === 0) { startSOSSequence(); return; }
        const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown]);

    const handleSOS = () => { setAlert(null); setCountdown(5); };
    handleSOSRef.current = handleSOS;
    const cancelSOS = () => setCountdown(null);

    const handleShareLocation = () => {
        setAlert(null);
        setLocationLoading(true);
        if (!navigator.geolocation) {
            setAlert({ type: 'error', text: 'GPS not supported.' });
            setLocationLoading(false);
            return;
        }
        navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;
            const message = `🚨 AyuSphere Location Alert\nI'm sharing my location.\n📍 Live Location: ${mapsLink}`;
            if (navigator.share) {
                try {
                    await navigator.share({ title: 'My Live Location', text: message, url: mapsLink });
                    setAlert({ type: 'success', message: 'Location shared!' });
                } catch (err) { }
            } else {
                window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
            }
            setLocationLoading(false);
        }, () => {
            setAlert({ type: 'error', text: 'GPS Error.' });
            setLocationLoading(false);
        });
    };

    const startSOSSequence = () => {
        setCountdown(null);
        setLoading(true);
        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const data = await fetchAPI('/sos/trigger', {
                    method: 'POST',
                    body: JSON.stringify({ lat: position.coords.latitude, lng: position.coords.longitude })
                });
                setAlert({ type: 'success', message: data.message, mapsLink: data.maps_link });
                setUserCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
                setShowTracker(true);
                setTimeout(() => { if (window.confirm("Call ambulance now?")) window.location.href = 'tel:108'; }, 300);
            } catch (error) {
                setAlert({ type: 'error', text: 'SOS Failed: ' + error.message });
            } finally { setLoading(false); }
        }, () => { setLoading(false); });
    };

    return (
        <AppLayout>
            <NotificationBanner />
            
            {/* SOS Countdown Modal - Stitch Styled */}
            {countdown !== null && (
                <div className="sos-modal-overlay">
                    <div className="glass-panel" style={{ padding: '3rem', borderRadius: '2rem', textAlign: 'center', maxWidth: '400px', width: '90%' }}>
                        <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '3rem', fontWeight: 'bold', margin: '0 auto 2rem auto', boxShadow: '0 0 40px rgba(255, 61, 0, 0.4)' }}>
                            {countdown}
                        </div>
                        <h2 className="font-headline" style={{ color: 'var(--accent)', marginBottom: '1rem' }}>S.O.S INITIATED</h2>
                        <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>Automatic emergency protocols starting in {countdown}s</p>
                        <button onClick={cancelSOS} className="btn btn-primary" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: 'white' }}>ABORT MISSION</button>
                    </div>
                </div>
            )}

            {/* Cinematic Alerts */}
            {alert && (
                <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', borderRadius: '1rem', borderLeft: `4px solid ${alert.type === 'error' ? 'var(--accent)' : 'var(--primary)'}` }}>
                    <p style={{ fontWeight: 'bold', color: alert.type === 'error' ? 'var(--accent)' : 'var(--primary)' }}>
                        {alert.type === 'error' ? 'SYSTEM ERROR' : 'ALERT SENT'}
                    </p>
                    <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>{alert.text || alert.message}</p>
                </div>
            )}

            <div className="asymmetric-grid">
                {/* ── Left Column: Vital Monitor & AI ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', gridColumn: 'span 7' }}>
                    <div className="glass-panel" style={{ padding: '2.5rem', borderRadius: '2rem', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, right: 0, width: '15rem', height: '15rem', background: 'var(--primary)', opacity: 0.05, filter: 'blur(80px)', marginRight: '-8rem', marginTop: '-8rem' }}></div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 10px var(--primary)' }}></span>
                                    <span className="font-headline" style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 'bold', letterSpacing: '0.3em' }}>Core Vital Monitor</span>
                                </div>
                                <h2 style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 'lighter' }}>Cardiovascular Sync</h2>
                            </div>
                            <span className="material-symbols-outlined" style={{ color: 'var(--primary)', opacity: 0.4 }}>settings_heart</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '2rem' }}>
                            <span className="font-headline" style={{ fontSize: '7rem', lineHeight: 1, fontWeight: 'lighter', letterSpacing: '-0.05em' }}>72</span>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ color: 'var(--primary)', fontWeight: 'bold', letterSpacing: '0.2em', fontSize: '12px' }}>BPM</span>
                                <span style={{ color: '#10b981', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>arrow_upward</span> 2.4%
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '80px', opacity: 0.6 }}>
                            {[45, 55, 42, 70, 85, 60, 50, 95, 65, 55, 45, 55].map((h, i) => (
                                <div key={i} style={{ flex: 1, background: 'var(--primary)', opacity: 0.2 + (h/200), height: `${h}%`, borderRadius: '99px' }}></div>
                            ))}
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '2rem', borderRadius: '2rem', border: '1px solid rgba(124, 77, 255, 0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(124,77,255,0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>psychology</span>
                            </div>
                            <div>
                                <h3 className="font-headline" style={{ fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '0.1em' }}>NEURAL LINK</h3>
                                <p style={{ fontSize: '10px', color: 'var(--muted)' }}>Active Status</p>
                            </div>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem' }}>
                            <p style={{ fontSize: '0.85rem', fontWeight: 'lighter', fontStyle: 'italic', color: 'rgba(124,77,255,0.8)', lineHeight: 1.6 }}>
                                "Recovery patterns optimal. AI suggests prioritizing cardiovascular rest vector today."
                            </p>
                        </div>
                        <Link href="/chatbot" className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--secondary)', color: 'white', textDecoration: 'none' }}>
                            CONSULT AI
                        </Link>
                    </div>
                </div>

                {/* ── Right Column: SOS & Logs ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', gridColumn: 'span 5' }}>
                    <div className="glass-panel" style={{ padding: '2.5rem', borderRadius: '2rem', textAlign: 'center', border: '1px solid rgba(255, 61, 0, 0.1)' }}>
                        <span className="font-headline" style={{ fontSize: '10px', tracking: '0.4em', color: 'var(--accent)', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '2.5rem' }}>Emergency Override</span>
                        
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2.5rem' }}>
                            <button 
                                className={`sos-button-inner ${loading ? 'animate-pulse' : ''}`} 
                                onClick={handleSOS} 
                                style={{ width: '140px', height: '140px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'all 0.5s ease' }}
                            >
                                <span className="font-headline" style={{ fontSize: '3rem', fontWeight: '900', color: 'white', letterSpacing: '-2px' }}>SOS</span>
                                <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.6)', fontWeight: 'bold', letterSpacing: '0.2em' }}>INITIATE</span>
                            </button>
                        </div>
                        
                        <button 
                            onClick={toggleVoice}
                            style={{ background: isListening ? 'rgba(255,61,0,0.1)' : 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: isListening ? 'var(--accent)' : 'var(--muted)', width: '100%', padding: '1rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 'bolder', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>mic</span>
                            {isListening ? 'VOICE PROTOCOL ACTIVE' : 'ENABLE VOICE OVERRIDE'}
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '2rem' }}>
                            <h3 className="font-headline" style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '1rem' }}>INCIDENTS</h3>
                            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '1rem' }}>
                                <p style={{ fontSize: '9px', color: 'var(--accent)', fontWeight: 'bold' }}>HEART SPIKE</p>
                                <span className="font-headline" style={{ fontSize: '1.25rem' }}>118 <span style={{ fontSize: '10px', color: 'var(--muted)' }}>BPM</span></span>
                            </div>
                        </div>
                        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '2rem' }}>
                            <h3 className="font-headline" style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '1rem' }}>VECTOR</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.25rem' }}>8,421</span>
                                <span style={{ fontSize: '8px', color: 'var(--muted)', fontWeight: 'bold' }}>STEPS</span>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h3 className="font-headline" style={{ fontSize: '10px', color: 'var(--muted)' }}>RESPONDERS</h3>
                            <button style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '10px', fontWeight: 'bold' }}>MANAGE</button>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            {[1, 2].map(i => (
                                <div key={i} style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.05)', padding: '2px' }}>
                                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                                        <img src={`https://i.pravatar.cc/150?u=${i}`} alt="user" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%)' }} />
                                    </div>
                                </div>
                            ))}
                            <button style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', border: '1px dashed rgba(255,255,255,0.2)', background: 'none', color: 'rgba(255,255,255,0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <span className="material-symbols-outlined">add</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {showTracker && userCoords && (
                <AmbulanceTracker userLocation={userCoords} onClose={() => setShowTracker(false)} />
            )}
        </AppLayout>
    );
}
