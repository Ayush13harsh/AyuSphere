'use client';
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';

// ── Fix Leaflet default marker icons (webpack/Next.js compatibility) ──
// Instead of loading from external CDNs (blocked by CSP), use inline SVG data URIs
const createSvgIcon = (color) => {
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="25" height="41">
      <path fill="${color}" d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.774-39.464 0z"/>
      <circle fill="white" cx="192" cy="192" r="70"/>
    </svg>`;
    return L.divIcon({
        html: svg,
        className: 'leaflet-custom-marker',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
    });
};

const userIcon = createSvgIcon('#3b82f6');   // Blue for user
const hospitalIcon = createSvgIcon('#ef4444'); // Red for hospitals

// ── Auto-fit bounds to show all markers ──
function FitBounds({ userLocation, hospitals }) {
    const map = useMap();

    useEffect(() => {
        if (!userLocation) return;

        const points = [[userLocation.lat, userLocation.lng]];
        hospitals.forEach(h => {
            if (h.lat && h.lng) points.push([h.lat, h.lng]);
        });

        if (points.length > 1) {
            const bounds = L.latLngBounds(points);
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        }
    }, [map, userLocation, hospitals]);

    return null;
}

export default function LeafletMap({ userLocation, hospitals }) {
    if (!userLocation) return null;

    return (
        <MapContainer
            center={[userLocation.lat, userLocation.lng]}
            zoom={13}
            style={{ height: '100%', width: '100%', borderRadius: 'inherit' }}
            zoomControl={true}
            attributionControl={true}
        >
            {/* OpenStreetMap tiles — no CSP issues since we whitelist *.tile.openstreetmap.org */}
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Auto-fit map to show all markers */}
            <FitBounds userLocation={userLocation} hospitals={hospitals} />

            {/* User location marker (blue) */}
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                <Popup>
                    <div style={{ textAlign: 'center', padding: '4px 0' }}>
                        <strong style={{ fontSize: '1em', color: '#3b82f6' }}>📍 Your Location</strong>
                    </div>
                </Popup>
            </Marker>

            {/* Hospital markers (red) */}
            {hospitals.map((h, idx) => (
                <Marker key={idx} position={[h.lat, h.lng]} icon={hospitalIcon}>
                    <Popup>
                        <div style={{ minWidth: '180px', padding: '2px 0' }}>
                            <strong style={{ fontSize: '1.05em', display: 'block', marginBottom: '6px', color: '#1e293b' }}>
                                🏥 {h.name}
                            </strong>
                            {h.address && (
                                <p style={{ margin: '0 0 6px 0', fontSize: '0.85em', color: '#64748b', lineHeight: 1.4 }}>
                                    {h.address}
                                </p>
                            )}
                            <p style={{ margin: '0 0 10px 0', fontSize: '0.9em', fontWeight: '600', color: '#334155' }}>
                                📍 {h.distance} &bull; ⭐ {h.rating}
                            </p>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                {h.phone !== 'N/A' && (
                                    <a href={`tel:${h.phone}`}
                                       style={{ flex: 1, padding: '7px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', textDecoration: 'none', borderRadius: '8px', textAlign: 'center', fontSize: '0.85em', fontWeight: 'bold' }}>
                                        📞 Call
                                    </a>
                                )}
                                <a href={`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`}
                                   target="_blank" rel="noopener noreferrer"
                                   style={{ flex: 1, padding: '7px', border: '2px solid #ef4444', color: '#ef4444', textDecoration: 'none', borderRadius: '8px', textAlign: 'center', fontSize: '0.85em', fontWeight: 'bold' }}>
                                    🗺️ Route
                                </a>
                            </div>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
