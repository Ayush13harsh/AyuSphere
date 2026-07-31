'use client';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchAPI, warmUpBackend } from '../lib/api';

const LeafletMap = dynamic(() => import('../components/LeafletMap'), { ssr: false });

export default function Hospitals() {
    const [hospitals, setHospitals] = useState([]);
    const [userLocation, setUserLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchingCity, setSearchingCity] = useState(false);
    const [error, setError] = useState('');
    const [infoNotice, setInfoNotice] = useState('');
    const [loadingMessage, setLoadingMessage] = useState('Resolving location...');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCityName, setActiveCityName] = useState('');

    const fetchHospitalsForCoords = async (coords, noticeText = '', cityName = '') => {
        setUserLocation(coords);
        if (noticeText) setInfoNotice(noticeText);
        else setInfoNotice('');
        if (cityName) setActiveCityName(cityName);

        setLoading(true);
        setLoadingMessage('Loading nearby facilities...');
        try {
            const specialty = new URLSearchParams(window.location.search).get('specialty');
            const endpoint = `/hospitals?lat=${coords.lat}&lng=${coords.lng}${specialty ? `&specialty=${specialty}` : ''}`;
            const data = await fetchAPI(endpoint);
            setHospitals(data);
            setError('');
        } catch (err) {
            let errorMsg = 'Failed to load hospitals: ' + err.message;
            if (err.message.includes('timed out')) {
                errorMsg = 'The server is starting up. Please wait a moment and refresh the page.';
            }
            setError(errorMsg);
        } finally {
            setLoading(false);
            setLoadingMessage('');
        }
    };

    const resolveLocationAndLoad = () => {
        warmUpBackend();
        setLoading(true);
        setLoadingMessage('Finding your location...');

        if (!navigator.geolocation) {
            fallbackToIpOrDefault('Geolocation not supported by browser.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const currentLoc = { lat: position.coords.latitude, lng: position.coords.longitude };
                fetchHospitalsForCoords(currentLoc, '', 'Your GPS Location');
            },
            async (geoErr) => {
                console.warn('[Hospitals] Geolocation failed or denied:', geoErr.message);
                await fallbackToIpOrDefault('Browser GPS unavailable. Using estimated city location.');
            },
            {
                enableHighAccuracy: true,
                maximumAge: 60000,
                timeout: 7000
            }
        );
    };

    const fallbackToIpOrDefault = async (reasonNotice) => {
        setLoadingMessage('Detecting location via IP network...');
        try {
            const ipResp = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
            if (ipResp.ok) {
                const ipData = await ipResp.json();
                if (ipData.latitude && ipData.longitude) {
                    const coords = { lat: parseFloat(ipData.latitude), lng: parseFloat(ipData.longitude) };
                    const city = ipData.city || 'your area';
                    fetchHospitalsForCoords(coords, `${reasonNotice} Showing facilities near ${city}.`, city);
                    return;
                }
            }
        } catch (e) {
            console.warn('[Hospitals] IP lookup failed:', e.message);
        }

        // Tier 3 Default: New Delhi
        const defaultLoc = { lat: 28.6139, lng: 77.2090 };
        fetchHospitalsForCoords(defaultLoc, `${reasonNotice} Showing facilities near New Delhi. Type your city above to search.`, 'New Delhi');
    };

    useEffect(() => {
        resolveLocationAndLoad();
    }, []);

    const handleCitySearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setSearchingCity(true);
        setError('');
        setInfoNotice('');

        try {
            const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery.trim())}&format=json&limit=1`;
            const resp = await fetch(geocodeUrl, { headers: { 'User-Agent': 'AyuSphere/1.0' } });
            const data = await resp.json();

            if (data && data.length > 0) {
                const matched = data[0];
                const coords = { lat: parseFloat(matched.lat), lng: parseFloat(matched.lon) };
                const label = matched.display_name.split(',')[0] || searchQuery;
                fetchHospitalsForCoords(coords, `Showing facilities near ${label}.`, label);
                setSearchQuery('');
            } else {
                setError(`Location "${searchQuery}" not found. Try entering a city name or PIN code.`);
            }
        } catch (err) {
            setError('Failed to search location. Please check your internet connection.');
        } finally {
            setSearchingCity(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <header>
                <h1>
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
                    </svg>
                    Hospitals
                </h1>
                <Link href="/dashboard" style={{ color: 'var(--primary-red)', fontWeight: 700, textDecoration: 'none' }}>Back</Link>
            </header>

            {/* City / Area / PIN Code Search Bar */}
            <div style={{ padding: '0.8rem 1rem', background: '#1e293b', zIndex: 20 }}>
                <form onSubmit={handleCitySearch} style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="🔍 Search City, Area, or PIN code..."
                        style={{
                            flex: 1, padding: '10px 14px', borderRadius: '12px',
                            border: 'none', outline: 'none', fontSize: '0.9rem',
                            background: 'white', color: '#1e293b'
                        }}
                    />
                    <button
                        type="submit"
                        disabled={searchingCity || !searchQuery.trim()}
                        className="btn btn-primary"
                        style={{ padding: '0 16px', fontSize: '0.85rem', borderRadius: '12px', whiteSpace: 'nowrap' }}>
                        {searchingCity ? 'Searching...' : 'Search'}
                    </button>
                    <button
                        type="button"
                        onClick={resolveLocationAndLoad}
                        title="Use Current GPS Location"
                        style={{
                            background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none',
                            borderRadius: '12px', padding: '0 12px', cursor: 'pointer', fontSize: '1rem'
                        }}>
                        📍
                    </button>
                </form>
            </div>

            {/* Full Bleed Expanding Map Overlay */}
            {userLocation && (
                <div style={{ width: '100%', height: '40vh', position: 'relative', zIndex: 1 }}>
                    <LeafletMap userLocation={userLocation} hospitals={hospitals} />
                </div>
            )}

            {/* Bottom Sheet Sleek List view */}
            <main style={{
                flex: 1,
                marginTop: userLocation ? '-4vh' : '0',
                position: 'relative',
                zIndex: 10,
                background: 'var(--white)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRadius: userLocation ? '30px 30px 0 0' : '0',
                boxShadow: userLocation ? '0 -10px 40px rgba(0,0,0,0.1)' : 'none',
                paddingTop: '1.5rem',
                paddingBottom: '80px'
            }}>
                <div style={{ width: '40px', height: '5px', background: 'var(--border)', borderRadius: '10px', margin: '0 auto 1rem auto' }}></div>
                
                <h2 style={{ marginBottom: '0.5rem', textAlign: 'center', fontSize: '1.3rem' }}>
                    Facilities Near {activeCityName || 'You'} ({hospitals.length})
                </h2>

                {infoNotice && (
                    <div className="alert alert-info" style={{ margin: '0 1.5rem 1rem 1.5rem', fontSize: '0.82rem', padding: '8px 12px', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                        ℹ️ {infoNotice}
                    </div>
                )}

                {error && <div className="alert alert-error" style={{ margin: '0 1.5rem 1rem 1.5rem', fontSize: '0.85rem' }}>{error}</div>}

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <span className="loading-spinner" style={{ width: '30px', height: '30px', borderWidth: '4px', borderColor: 'rgba(255,59,59,0.2)', borderTopColor: 'var(--primary-red)' }}></span>
                        <p style={{ marginTop: '1rem', color: 'var(--text-light)' }}>{loadingMessage}</p>
                    </div>
                ) : hospitals.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)' }}>
                        <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>No hospitals found nearby.</p>
                        <p style={{ fontSize: '0.85rem' }}>Try typing a city name in the search bar above.</p>
                    </div>
                ) : (
                    hospitals.map((h, idx) => (
                        <div className="card" key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '0 1rem 1rem 1rem' }}>
                            <h3>{h.name}</h3>
                            <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>{h.address}</p>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                                📍 {h.distance} &bull; ⭐ {h.rating} &bull; 📞 {h.phone}
                            </p>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                {h.phone && !h.phone.includes('Emergency') && (
                                    <a href={`tel:${h.phone}`} className="btn btn-primary" style={{ flex: 1, fontSize: '0.85rem', padding: '0.5rem', textAlign: 'center' }}>Call</a>
                                )}
                                <a href={`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ flex: 1, fontSize: '0.85rem', padding: '0.5rem', textAlign: 'center' }}>Directions</a>
                            </div>
                        </div>
                    ))
                )}
            </main>

            <nav className="bottom-nav">
                <Link href="/dashboard" className="nav-item">
                    <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
                    Home
                </Link>
                <Link href="/contacts" className="nav-item">
                    <svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>
                    Contacts
                </Link>
                <Link href="/profile" className="nav-item">
                    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" /></svg>
                    Profile
                </Link>
            </nav>
        </div>
    );
}
