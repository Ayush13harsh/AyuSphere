'use client';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useJsApiLoader } from '@react-google-maps/api';

const LeafletMap = dynamic(() => import('../components/LeafletMap'), { ssr: false });

export default function Hospitals() {
    const [hospitals, setHospitals] = useState([]);
    const [userLocation, setUserLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const isGoogleMapEnabled = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.includes('ADD_');

    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: isGoogleMapEnabled ? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY : '' 
    });

    useEffect(() => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            const currentLoc = { lat: position.coords.latitude, lng: position.coords.longitude };
            setUserLocation(currentLoc);

            try {
                const response = await fetch(`http://localhost:8000/api/v1/hospitals?lat=${currentLoc.lat}&lng=${currentLoc.lng}`);
                if (!response.ok) throw new Error("Server returned " + response.status);
                const data = await response.json();
                setHospitals(data);
            } catch (err) {
                setError('Failed to load hospitals: ' + err.message);
            } finally {
                setLoading(false);
            }
        }, () => {
            setError('Unable to retrieve location.');
            setLoading(false);
        });
    }, []);

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <header>
                <h1>
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
                    </svg>
                    Hospitals
                </h1>
                <Link href="/dashboard" style={{ color: 'var(--primary-red)', fontWeight: 700, textDecoration: 'none' }}>Back</Link>
            </header>

            {/* Full Bleed Expanding Map Overlay */}
            {userLocation && (
                <div style={{ width: '100%', height: '45vh', position: 'relative', zIndex: 1 }}>
                    <LeafletMap userLocation={userLocation} hospitals={hospitals} />
                </div>
            )}

            {/* Bottom Sheet Sleek List view */}
            <main style={{ 
                flex: 1, 
                marginTop: userLocation ? '-5vh' : '0', 
                position: 'relative', 
                zIndex: 10, 
                background: 'var(--white)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRadius: userLocation ? '30px 30px 0 0' : '0',
                boxShadow: userLocation ? '0 -10px 40px rgba(0,0,0,0.1)' : 'none',
                paddingTop: '2rem'
            }}>
                <div style={{ width: '40px', height: '5px', background: 'var(--border)', borderRadius: '10px', margin: '0 auto 1.5rem auto' }}></div>
                <h2 style={{ marginBottom: '1.5rem', textAlign: 'center', fontSize: '1.4rem' }}>Closest Facilities ({hospitals.length})</h2>

                {error && <div className="alert alert-error" style={{ margin: '0 1.5rem 1.5rem 1.5rem' }}>{error}</div>}

                {loading ? (
                    <p style={{ textAlign: 'center' }}>Loading hospitals...</p>
                ) : hospitals.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-light)' }}>No hospitals found nearby.</p>
                ) : (
                    hospitals.map((h, idx) => (
                        <div className="card" key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <h3>{h.name}</h3>
                            <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>{h.address}</p>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                                📍 {h.distance} &bull; ⭐ {h.rating} &bull; 📞 {h.phone}
                            </p>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                {h.phone !== 'N/A' && (
                                    <a href={`tel:${h.phone}`} className="btn btn-primary" style={{ flex: 1, fontSize: '0.85rem', padding: '0.5rem' }}>Call</a>
                                )}
                                <a href={`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ flex: 1, fontSize: '0.85rem', padding: '0.5rem' }}>Directions</a>
                            </div>
                        </div>
                    ))
                )}
            </main>

            <nav className="bottom-nav">
                <Link href="/dashboard" className="nav-item">
                    <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
                    Home
                </Link>
                <Link href="/contacts" className="nav-item">
                    <svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                    Contacts
                </Link>
                <Link href="/profile" className="nav-item">
                    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
                    Profile
                </Link>
            </nav>
        </div>
    );
}
