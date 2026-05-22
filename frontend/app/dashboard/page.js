'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useSpring, animated } from '@react-spring/web';
import AppLayout from '../components/AppLayout';
import NotificationBanner from '../components/NotificationBanner';
import { fetchAPI } from '../lib/api';

const AmbulanceTracker = dynamic(() => import('../components/AmbulanceTracker'), {
    ssr: false,
    loading: () => <div className="tracker-overlay"><div className="tracker-modal" style={{ textAlign: 'center', padding: '3rem' }}><h3>Connecting to Dispatch...</h3></div></div>
});

// 3D scene dynamic imports removed in favor of clean CSS styling

export default function Dashboard() {
    const [alert, setAlert] = useState(null);
    const [loading, setLoading] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);
    const [countdown, setCountdown] = useState(null);
    const [showTracker, setShowTracker] = useState(false);
    const [userCoords, setUserCoords] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [emergencyContacts, setEmergencyContacts] = useState([]);
    const [showCallModal, setShowCallModal] = useState(false);
    const recognitionRef = useRef(null);
    const handleSOSRef = useRef(null);

    const [pageReady, setPageReady] = useState(false);
    const ambulanceRef = useRef(null);
    const locationRef = useRef(null);

    useEffect(() => {
        const timer = setTimeout(() => setPageReady(true), 100);
        return () => clearTimeout(timer);
    }, []);

    const handleMagneticMove = (e, ref) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = (e.clientX - centerX) * 0.12;
        const deltaY = (e.clientY - centerY) * 0.12;
        ref.current.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    };

    const handleMagneticLeave = (ref) => {
        if (!ref.current) return;
        ref.current.style.transform = 'translate(0px, 0px)';
        ref.current.style.transition = 'transform 0.5s cubic-bezier(0.175,0.885,0.32,1.275)';
    };

    const handleTilt = (e) => {
        if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) return;
        const el = e.currentTarget;
        const rect = el.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
        const y = ((e.clientY - rect.top) / rect.height - 0.5) * -20;
        el.style.transform = `perspective(600px) rotateX(${y}deg) rotateY(${x}deg) translateZ(8px)`;
    };

    const handleTiltReset = (e) => {
        if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) return;
        const el = e.currentTarget;
        el.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
        el.style.transition = 'transform 0.6s cubic-bezier(0.175,0.885,0.32,1.275)';
    };

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

        return () => {};
    }, [countdown]);

    // Separate effect for the countdown timer
    useEffect(() => {
        if (countdown === null || countdown === 0) return;

        const timer = setTimeout(() => {
            setCountdown(prev => prev - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [countdown]);

    const handleSOS = () => {
        setAlert(null);
        setCountdown(5);

        // Pre-fetch contacts during the 5-second countdown so they're ready instantly
        fetchAPI('/contacts/').then(data => {
            setEmergencyContacts(data || []);
        }).catch(() => {
            setEmergencyContacts([]);
        });
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

        // ⚡ INSTANTLY show the call modal — no waiting for APIs
        setShowCallModal(true);

        // 🔄 Everything below runs in the background, non-blocking
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
            <AnimatePresence>
                {!pageReady && (
                    <motion.div
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 1000,
                            background: '#04040f',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <motion.div
                            animate={{ scale: [1, 1.15, 1], opacity: [1, 0.7, 1] }}
                            transition={{ repeat: Infinity, duration: 1.2 }}
                            style={{
                                color: '#ff1f3d',
                                fontSize: '2rem',
                                fontWeight: 900,
                                letterSpacing: '0.2em',
                                textShadow: '0 0 30px rgba(255,31,61,0.7)'
                            }}
                        >
                            AYU
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <NotificationBanner />

            {/* Dynamic CSS Backdrop Glows */}
            <div className="backdrop-glow-container">
                <div className="backdrop-glow backdrop-glow-red" />
                <div className="backdrop-glow backdrop-glow-blue" />
            </div>

            {/* Scrollable UI Layer */}
            <div className="dashboard-layout" style={{ position: 'relative', zIndex: 10 }}>
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
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 120, damping: 18, delay: 0.5 }}
                style={{ textAlign: 'center', marginBottom: '0.25rem' }}
            >
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '4px', letterSpacing: '-0.5px' }}>
                    {new Date().getHours() < 12 ? '☀️ Good Morning' : new Date().getHours() < 17 ? '🌤 Good Afternoon' : '🌙 Good Evening'}
                </h2>
                <p style={{ color: 'var(--text-light)', fontSize: '0.95rem', fontWeight: 500 }}>
                    {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
            </motion.div>

            {/* SOS CONTAINER */}
            <motion.div
                className="sos-container"
                initial={{ opacity: 0, scale: 0.5, y: -100 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 180, damping: 18, delay: 0.8 }}
                style={{
                    gap: '3rem',
                    paddingBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column'
                }}
            >
                <div className="sos-sphere-container">
                    <button
                        onClick={handleSOS}
                        disabled={loading}
                        className={`sos-button ${loading ? 'pulse-active' : ''} ${isListening ? 'listening-glow' : ''}`}
                        aria-label="Emergency SOS Button"
                    >
                        {loading ? (
                            <span className="loading-spinner" style={{ width: '36px', height: '36px', borderWidth: '4px' }}></span>
                        ) : (
                            'SOS'
                        )}
                    </button>
                </div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2 }}
                >
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
                </motion.div>
            </motion.div>

            {/* ── Emergency Actions ── */}
            <motion.div
                style={{ marginBottom: '1.5rem' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4 }}
            >
                <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-light)', opacity: 0.8, marginBottom: '0.85rem', fontWeight: 800 }}>
                    🚨 Emergency Actions
                </h3>
                <div className="emergency-grid" style={{ gap: '1rem' }}>
                    <motion.div
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.96 }}
                        style={{ display: 'block', width: '100%' }}
                    >
                        <motion.a
                            ref={ambulanceRef}
                            href="tel:108"
                            className="premium-gradient-red"
                            onMouseMove={(e) => handleMagneticMove(e, ambulanceRef)}
                            onMouseLeave={() => handleMagneticLeave(ambulanceRef)}
                            whileHover={{ boxShadow: '0 0 50px rgba(255, 31, 61, 0.55)' }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '12px', padding: '1.1rem',
                                borderRadius: '18px', textDecoration: 'none',
                                boxShadow: '0 0 25px rgba(255,31,61,0.35), 0 8px 24px rgba(255,31,61,0.25)',
                                transition: 'all 0.3s ease, box-shadow 0.3s ease',
                                width: '100%'
                            }}
                        >
                            <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'rgba(255,255,255,0.25)', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                                <svg viewBox="0 0 24 24" width="26" height="26" fill="white"><path d="M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.28-.28.67-.36 1.02-.25 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" /></svg>
                            </div>
                            <div>
                                <div style={{ fontSize: '1rem', fontWeight: 800 }}>Call Ambulance</div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.9, fontWeight: 600 }}>Dial 108 now</div>
                            </div>
                        </motion.a>
                    </motion.div>
                    
                    <motion.div
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.96 }}
                        style={{ display: 'block', width: '100%' }}
                    >
                        <motion.button
                            ref={locationRef}
                            onClick={handleShareLocation}
                            disabled={locationLoading}
                            className="premium-gradient-blue"
                            onMouseMove={(e) => handleMagneticMove(e, locationRef)}
                            onMouseLeave={() => handleMagneticLeave(locationRef)}
                            whileHover={{ boxShadow: '0 0 50px rgba(0, 71, 255, 0.55)' }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '12px', padding: '1.1rem',
                                borderRadius: '18px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                                boxShadow: '0 0 25px rgba(0,71,255,0.35), 0 8px 24px rgba(0,71,255,0.25)',
                                transition: 'all 0.3s ease, box-shadow 0.3s ease',
                                width: '100%'
                            }}
                        >
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
                        </motion.button>
                    </motion.div>
                </div>
            </motion.div>

            {/* ── Smart Tools ── */}
            <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-light)', opacity: 0.8, marginBottom: '0.85rem', fontWeight: 800 }}>
                    🩺 Smart Tools
                </h3>
                <motion.div
                    className="smart-tools-grid"
                    style={{ gap: '1rem' }}
                    variants={{
                        hidden: {},
                        visible: { transition: { staggerChildren: 0.1 } }
                    }}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.3 }}
                >
                    <motion.div
                        variants={{
                            hidden: { opacity: 0, y: 50 },
                            visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }
                        }}
                        onMouseMove={handleTilt}
                        onMouseLeave={handleTiltReset}
                        style={{ display: 'block', height: '100%', willChange: 'transform' }}
                    >
                        <Link href="/symptom-checker" className="action-card" style={{ padding: '1.25rem 0.5rem', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                            <div className="icon-badge" style={{ background: 'rgba(245,158,11,0.1)' }}>
                                <svg viewBox="0 0 24 24" fill="#f59e0b"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" /></svg>
                            </div>
                            <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>Symptom Check</span>
                        </Link>
                    </motion.div>

                    <motion.div
                        variants={{
                            hidden: { opacity: 0, y: 50 },
                            visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }
                        }}
                        onMouseMove={handleTilt}
                        onMouseLeave={handleTiltReset}
                        style={{ display: 'block', height: '100%', willChange: 'transform' }}
                    >
                        <Link href="/chatbot" className="action-card" style={{ padding: '1.25rem 0.5rem', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                            <div className="icon-badge" style={{ background: 'rgba(99,102,241,0.1)' }}>
                                <svg viewBox="0 0 24 24" fill="#6366f1"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 11H7V9h2v2zm4 0h-2V9h2v2zm4 0h-2V9h2v2z" /></svg>
                            </div>
                            <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>Dr. AyuSphere</span>
                        </Link>
                    </motion.div>

                    <motion.div
                        variants={{
                            hidden: { opacity: 0, y: 50 },
                            visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }
                        }}
                        onMouseMove={handleTilt}
                        onMouseLeave={handleTiltReset}
                        style={{ display: 'block', height: '100%', willChange: 'transform' }}
                    >
                        <Link href="/risk-assessment" className="action-card" style={{ padding: '1.25rem 0.5rem', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                            <div className="icon-badge" style={{ background: 'rgba(16,185,129,0.1)' }}>
                                <svg viewBox="0 0 24 24" fill="#10b981"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" /></svg>
                            </div>
                            <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>Risk Analysis</span>
                        </Link>
                    </motion.div>
                </motion.div>
            </div>

            {/* ── Health Hub ── */}
            <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-light)', opacity: 0.8, marginBottom: '0.85rem', fontWeight: 800 }}>
                    💊 Health Hub
                </h3>
                <motion.div
                    className="health-hub-grid"
                    style={{ gap: '1rem' }}
                    variants={{
                        hidden: {},
                        visible: { transition: { staggerChildren: 0.08 } }
                    }}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.3 }}
                >
                    <motion.div
                        variants={{
                            hidden: { opacity: 0, y: 50 },
                            visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }
                        }}
                        whileHover={{ y: -6, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={{ display: 'block', height: '100%' }}
                    >
                        <Link href="/analytics" className="health-hub-card" style={{
                            display: 'flex', alignItems: 'center', gap: '12px', padding: '1.1rem',
                            borderRadius: '18px', textDecoration: 'none', color: 'var(--text-dark)',
                            height: '100%'
                        }}>
                            <div className="icon-badge" style={{ background: 'rgba(236,72,153,0.1)' }}>
                                <svg viewBox="0 0 24 24" width="24" height="24" fill="#ec4899"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" /></svg>
                            </div>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '1rem' }}>Analytics</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 600 }}>Health trends</div>
                            </div>
                        </Link>
                    </motion.div>

                    <motion.div
                        variants={{
                            hidden: { opacity: 0, y: 50 },
                            visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }
                        }}
                        whileHover={{ y: -6, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={{ display: 'block', height: '100%' }}
                    >
                        <Link href="/medical-id" className="health-hub-card" style={{
                            display: 'flex', alignItems: 'center', gap: '12px', padding: '1.1rem',
                            borderRadius: '18px', textDecoration: 'none', color: 'var(--text-dark)',
                            height: '100%'
                        }}>
                            <div className="icon-badge" style={{ background: 'rgba(14,165,233,0.1)' }}>
                                <svg viewBox="0 0 24 24" width="24" height="24" fill="#0ea5e9"><path d="M20 7h-5V4c0-1.1-.9-2-2-2h-2c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm-9-3h2v5h-2V4zm0 12h-2v-3H7v-2h2V9h2v2h2v2h-2v3z" /></svg>
                            </div>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '1rem' }}>Medical ID</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 600 }}>Health passport</div>
                            </div>
                        </Link>
                    </motion.div>

                    <motion.div
                        variants={{
                            hidden: { opacity: 0, y: 50 },
                            visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }
                        }}
                        whileHover={{ y: -6, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={{ display: 'block', height: '100%' }}
                    >
                        <Link href="/hospitals" className="health-hub-card" style={{
                            display: 'flex', alignItems: 'center', gap: '12px', padding: '1.1rem',
                            borderRadius: '18px', textDecoration: 'none', color: 'var(--text-dark)',
                            height: '100%'
                        }}>
                            <div className="icon-badge" style={{ background: 'rgba(139,92,246,0.1)' }}>
                                <svg viewBox="0 0 24 24" width="24" height="24" fill="#8b5cf6"><path d="M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" /></svg>
                            </div>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '1rem' }}>Hospitals</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 600 }}>Near you</div>
                            </div>
                        </Link>
                    </motion.div>

                    <motion.div
                        variants={{
                            hidden: { opacity: 0, y: 50 },
                            visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }
                        }}
                        whileHover={{ y: -6, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={{ display: 'block', height: '100%' }}
                    >
                        <Link href="/profile" className="health-hub-card" style={{
                            display: 'flex', alignItems: 'center', gap: '12px', padding: '1.1rem',
                            borderRadius: '18px', textDecoration: 'none', color: 'var(--text-dark)',
                            height: '100%'
                        }}>
                            <div className="icon-badge" style={{ background: 'rgba(244,63,94,0.1)' }}>
                                <svg viewBox="0 0 24 24" width="24" height="24" fill="#f43f5e"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" /></svg>
                            </div>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '1rem' }}>My Profile</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 600 }}>Medical info</div>
                            </div>
                        </Link>
                    </motion.div>
                </motion.div>
            </div>
            </div>
            
            <footer className="premium-footer">
                <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true" focusable="false">
                    <defs>
                        <linearGradient id="igGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#f09433" />
                            <stop offset="25%" stopColor="#e6683c" />
                            <stop offset="50%" stopColor="#dc2743" />
                            <stop offset="75%" stopColor="#cc2366" />
                            <stop offset="100%" stopColor="#bc1888" />
                        </linearGradient>
                    </defs>
                </svg>
                <div className="footer-content">
                    <p className="footer-text">
                        Made by <span className="author-name">AYUSH HARSH</span>
                    </p>
                    <div className="social-links">
                        <a href="https://www.instagram.com/ayustance/" target="_blank" rel="noopener noreferrer" className="social-icon icon-instagram" aria-label="Instagram">
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                            </svg>
                        </a>
                        <a href="https://www.linkedin.com/in/ayush13harsh/" target="_blank" rel="noopener noreferrer" className="social-icon icon-linkedin" aria-label="LinkedIn">
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                            </svg>
                        </a>
                        <a href="https://mail.google.com/mail/?view=cm&fs=1&to=ayush13032003harsh@gmail.com" target="_blank" rel="noopener noreferrer" className="social-icon icon-email" aria-label="Email (Gmail)">
                            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                            </svg>
                        </a>
                    </div>
                </div>
            </footer>

            {showTracker && userCoords && (
                <AmbulanceTracker userLocation={userCoords} onClose={() => setShowTracker(false)} />
            )}

            {/* Emergency Call Modal */}
            {showCallModal && (
                <div className="sos-modal-overlay" onClick={() => setShowCallModal(false)}>
                    <div className="sos-modal" style={{ padding: '1.5rem', maxWidth: '400px', width: '92%' }} onClick={e => e.stopPropagation()}>
                        <div style={{ marginBottom: '1.25rem' }}>
                            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, #ef4444, #dc2626)', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 1rem auto', boxShadow: '0 8px 24px rgba(239,68,68,0.35)' }}>
                                <svg viewBox="0 0 24 24" width="28" height="28" fill="white"><path d="M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.28-.28.67-.36 1.02-.25 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                            </div>
                            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '4px' }}>Emergency Call</h2>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>SOS activated — call for help now</p>
                        </div>

                        {/* Ambulance (always shown) */}
                        <a href="tel:108" style={{
                            display: 'flex', alignItems: 'center', gap: '14px', padding: '1rem 1.25rem',
                            background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white',
                            borderRadius: '16px', textDecoration: 'none', marginBottom: '0.75rem',
                            boxShadow: '0 6px 18px rgba(239,68,68,0.35)', transition: 'transform 0.2s'
                        }}>
                            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, fontSize: '1.3rem' }}>🚑</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 800, fontSize: '1rem' }}>Call Ambulance</div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>Dial 108 — Emergency Services</div>
                            </div>
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.28-.28.67-.36 1.02-.25 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                        </a>

                        {/* Saved Contacts */}
                        {emergencyContacts.length > 0 && (
                            <>
                                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '0.5rem', marginTop: '0.25rem' }}>Your Emergency Contacts</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                                    {emergencyContacts.map((c, idx) => (
                                        <a key={c._id || idx} href={`tel:${c.phone}`} style={{
                                            display: 'flex', alignItems: 'center', gap: '12px', padding: '0.85rem 1rem',
                                            background: 'var(--white)', border: '1.5px solid var(--border)',
                                            borderRadius: '14px', textDecoration: 'none', color: 'var(--text-dark)',
                                            transition: 'all 0.2s'
                                        }}>
                                            <div style={{
                                                width: '38px', height: '38px', borderRadius: '50%',
                                                background: `hsl(${(idx * 60 + 200) % 360}, 70%, 95%)`,
                                                display: 'flex', justifyContent: 'center', alignItems: 'center',
                                                fontWeight: 800, fontSize: '0.9rem', flexShrink: 0,
                                                color: `hsl(${(idx * 60 + 200) % 360}, 60%, 40%)`
                                            }}>
                                                {c.name?.charAt(0)?.toUpperCase() || '?'}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{c.name}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>{c.phone} · {c.relationship || 'Contact'}</div>
                                            </div>
                                            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#10b981', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                                                <svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.28-.28.67-.36 1.02-.25 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </>
                        )}

                        {emergencyContacts.length === 0 && (
                            <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-light)', padding: '0.5rem 0' }}>No saved contacts. <a href="/contacts" style={{ color: 'var(--primary-red)', fontWeight: 600 }}>Add contacts</a></p>
                        )}

                        <button onClick={() => setShowCallModal(false)} className="btn btn-outline" style={{ marginTop: '1rem', padding: '0.7rem', fontSize: '0.9rem', width: '100%' }}>Dismiss</button>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
