'use client';
import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';

// Smoothly re-center map as ambulance moves
function MapUpdater({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) map.panTo(center, { animate: true, duration: 0.5 });
    }, [center, map]);
    return null;
}

// Generate intermediate waypoints with slight random curve
function generateRoute(start, end, steps) {
    const points = [];
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        // Add slight curve via sine for realism
        const curveFactor = Math.sin(t * Math.PI) * 0.003;
        points.push({
            lat: start.lat + (end.lat - start.lat) * t + curveFactor,
            lng: start.lng + (end.lng - start.lng) * t - curveFactor * 0.5
        });
    }
    return points;
}

// Random driver names
const DRIVERS = [
    { name: 'Rajesh Kumar', vehicle: 'MH-12-AB-4567', unit: 'Unit #A-14' },
    { name: 'Sunil Verma', vehicle: 'DL-08-CK-2290', unit: 'Unit #B-07' },
    { name: 'Amit Singh', vehicle: 'KA-03-MN-8891', unit: 'Unit #C-22' },
    { name: 'Priya Sharma', vehicle: 'UP-16-DX-1234', unit: 'Unit #D-05' },
];

export default function AmbulanceTracker({ userLocation, onClose }) {
    const [ambulanceLoc, setAmbulanceLoc] = useState(null);
    const [routePoints, setRoutePoints] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [driver] = useState(() => DRIVERS[Math.floor(Math.random() * DRIVERS.length)]);
    const [status, setStatus] = useState('dispatching'); // dispatching → en_route → arriving → arrived
    const [distanceRemaining, setDistanceRemaining] = useState(null);
    const totalSteps = 60; // 60 steps = ~2 minutes
    const intervalRef = useRef(null);

    useEffect(() => {
        if (!userLocation) return;

        // Spawn ambulance 2-4km away
        const angle = Math.random() * 2 * Math.PI;
        const dist = 0.02 + Math.random() * 0.02; // ~2-4km
        const startLoc = {
            lat: userLocation.lat + dist * Math.cos(angle),
            lng: userLocation.lng + dist * Math.sin(angle)
        };

        const route = generateRoute(startLoc, userLocation, totalSteps);
        setRoutePoints(route);
        setAmbulanceLoc(startLoc);

        // Calculate initial distance
        const initDist = haversine(startLoc.lat, startLoc.lng, userLocation.lat, userLocation.lng);
        setDistanceRemaining(initDist);

        // Simulate dispatch delay (2 seconds)
        setTimeout(() => {
            setStatus('en_route');

            intervalRef.current = setInterval(() => {
                setCurrentStep(prev => {
                    const next = prev + 1;
                    if (next >= totalSteps) {
                        clearInterval(intervalRef.current);
                        setStatus('arrived');
                        setDistanceRemaining(0);
                        return totalSteps;
                    }

                    const newPos = route[next];
                    setAmbulanceLoc(newPos);

                    const remaining = haversine(newPos.lat, newPos.lng, userLocation.lat, userLocation.lng);
                    setDistanceRemaining(remaining);

                    if (next >= totalSteps - 5) setStatus('arriving');

                    return next;
                });
            }, 2000); // Move every 2 seconds
        }, 2000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [userLocation]);

    const handleCancel = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (onClose) onClose();
    };

    if (!userLocation) return null;

    const etaSeconds = (totalSteps - currentStep) * 2;
    const etaMinutes = Math.ceil(etaSeconds / 60);

    const ambulanceIcon = new L.DivIcon({
        html: `<div style="
            background: #ef4444; width: 36px; height: 36px; border-radius: 50%;
            display: flex; justify-content: center; align-items: center;
            box-shadow: 0 4px 12px rgba(239,68,68,0.5); border: 3px solid white;
            font-size: 18px;
        ">🚑</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        className: ''
    });

    const userIcon = new L.DivIcon({
        html: `<div style="
            background: #3b82f6; width: 32px; height: 32px; border-radius: 50%;
            display: flex; justify-content: center; align-items: center;
            box-shadow: 0 4px 12px rgba(59,130,246,0.5); border: 3px solid white;
            animation: blink 1.5s infinite;
        "><div style="width:12px;height:12px;background:white;border-radius:50%"></div></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        className: ''
    });

    // Past route (already traveled) + remaining route
    const traveledRoute = routePoints.slice(0, currentStep + 1).map(p => [p.lat, p.lng]);
    const remainingRoute = routePoints.slice(currentStep).map(p => [p.lat, p.lng]);

    const statusConfig = {
        dispatching: { label: 'Dispatching...', color: '#f59e0b', icon: '📡' },
        en_route: { label: 'En Route', color: '#3b82f6', icon: '🚑' },
        arriving: { label: 'Almost There!', color: '#8b5cf6', icon: '⚡' },
        arrived: { label: 'Arrived!', color: '#10b981', icon: '✅' },
    };

    const sc = statusConfig[status];

    return (
        <div className="tracker-overlay">
            <div className="tracker-modal" style={{ maxWidth: '520px', padding: 0, overflow: 'hidden' }}>
                {/* Header Bar */}
                <div style={{
                    background: 'linear-gradient(135deg, #1e293b, #334155)',
                    color: 'white', padding: '1.25rem 1.5rem',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.5rem' }}>{sc.icon}</span>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Emergency Response</h3>
                            <div style={{
                                display: 'inline-block', marginTop: '4px',
                                padding: '2px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700,
                                background: sc.color, color: 'white'
                            }}>{sc.label}</div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1 }}>
                            {status === 'arrived' ? '0:00' : `${Math.floor(etaSeconds / 60)}:${String(etaSeconds % 60).padStart(2, '0')}`}
                        </div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '2px' }}>ETA</div>
                    </div>
                </div>

                {/* Map */}
                <div style={{ height: '250px', width: '100%' }}>
                    {ambulanceLoc && (
                        <MapContainer
                            center={[userLocation.lat, userLocation.lng]}
                            zoom={14}
                            style={{ height: '100%', width: '100%' }}
                            zoomControl={false}
                        >
                            <TileLayer
                                attribution='&copy; CartoDB'
                                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            />
                            <MapUpdater center={[ambulanceLoc.lat, ambulanceLoc.lng]} />

                            {/* Remaining route (dashed blue) */}
                            {remainingRoute.length > 1 && (
                                <Polyline
                                    positions={remainingRoute}
                                    pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.6, dashArray: '10 6' }}
                                />
                            )}
                            {/* Traveled route (solid green) */}
                            {traveledRoute.length > 1 && (
                                <Polyline
                                    positions={traveledRoute}
                                    pathOptions={{ color: '#10b981', weight: 4, opacity: 0.9 }}
                                />
                            )}

                            {/* User marker */}
                            <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                                <Popup>📍 Your Location</Popup>
                            </Marker>

                            {/* Ambulance marker */}
                            <Marker position={[ambulanceLoc.lat, ambulanceLoc.lng]} icon={ambulanceIcon}>
                                <Popup>🚑 Ambulance — {driver.name}</Popup>
                            </Marker>
                        </MapContainer>
                    )}
                </div>

                {/* Driver Info + Stats Panel */}
                <div style={{ padding: '1.25rem 1.5rem', background: 'var(--white-solid)' }}>
                    {/* Driver Card */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '14px',
                        padding: '1rem', background: '#f8fafc', borderRadius: '14px',
                        border: '1px solid #e2e8f0', marginBottom: '1rem'
                    }}>
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                            display: 'flex', justifyContent: 'center', alignItems: 'center',
                            fontSize: '1.4rem', flexShrink: 0
                        }}>🧑‍⚕️</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>{driver.name}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{driver.unit} • {driver.vehicle}</div>
                        </div>
                        <a href="tel:108" style={{
                            width: '42px', height: '42px', borderRadius: '50%',
                            background: '#10b981', display: 'flex', justifyContent: 'center', alignItems: 'center',
                            textDecoration: 'none', boxShadow: '0 4px 10px rgba(16,185,129,0.3)'
                        }}>
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.28-.28.67-.36 1.02-.25 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                        </a>
                    </div>

                    {/* Stats Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                        <div style={{ textAlign: 'center', padding: '0.75rem', background: '#f0fdf4', borderRadius: '12px' }}>
                            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#16a34a', fontWeight: 700 }}>Distance</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#15803d' }}>
                                {distanceRemaining !== null ? `${distanceRemaining.toFixed(1)} km` : '—'}
                            </div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '0.75rem', background: '#eff6ff', borderRadius: '12px' }}>
                            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#2563eb', fontWeight: 700 }}>ETA</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1d4ed8' }}>
                                {status === 'arrived' ? 'Arrived' : `${etaMinutes} min`}
                            </div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '0.75rem', background: '#fef3c7', borderRadius: '12px' }}>
                            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#d97706', fontWeight: 700 }}>Speed</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#b45309' }}>
                                {status === 'arrived' ? '0' : `${Math.round(40 + Math.random() * 20)}`} km/h
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginBottom: '6px' }}>
                            <span>Progress</span>
                            <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
                        </div>
                        <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{
                                height: '100%', borderRadius: '4px',
                                background: status === 'arrived'
                                    ? '#10b981'
                                    : 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                                width: `${(currentStep / totalSteps) * 100}%`,
                                transition: 'width 1.5s ease'
                            }}></div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        {status !== 'arrived' ? (
                            <>
                                <button onClick={handleCancel} style={{
                                    flex: 1, padding: '0.9rem', borderRadius: '12px',
                                    border: '2px solid #ef4444', background: 'transparent',
                                    color: '#ef4444', fontWeight: 700, fontSize: '0.95rem',
                                    cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit'
                                }}>
                                    Cancel Emergency
                                </button>
                                <a href="tel:108" style={{
                                    flex: 1, padding: '0.9rem', borderRadius: '12px',
                                    background: '#ef4444', color: 'white', fontWeight: 700,
                                    fontSize: '0.95rem', textDecoration: 'none', textAlign: 'center',
                                    boxShadow: '0 4px 12px rgba(239,68,68,0.3)'
                                }}>
                                    📞 Call Ambulance
                                </a>
                            </>
                        ) : (
                            <button onClick={handleCancel} style={{
                                flex: 1, padding: '0.9rem', borderRadius: '12px',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                color: 'white', fontWeight: 700, fontSize: '0.95rem',
                                cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                                boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
                            }}>
                                ✅ Ambulance Has Arrived — Close
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371.0;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
}
