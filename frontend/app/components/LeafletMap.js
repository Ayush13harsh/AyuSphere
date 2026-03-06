'use client';
import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

export default function LeafletMap({ userLocation, hospitals }) {
    if (!userLocation) return null;

    const redIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    return (
        <MapContainer center={[userLocation.lat, userLocation.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            <Marker position={[userLocation.lat, userLocation.lng]}>
                <Popup>Your Location</Popup>
            </Marker>
            {hospitals.map((h, idx) => (
                <Marker key={idx} position={[h.lat, h.lng]} icon={redIcon}>
                    <Popup>
                        <div style={{ minWidth: '150px' }}>
                            <strong style={{ fontSize: '1.1em', display: 'block', marginBottom: '4px' }}>{h.name}</strong>
                            <p style={{ margin: '0 0 8px 0', fontSize: '0.9em', color: '#666' }}>{h.address}</p>
                            <p style={{ margin: '0 0 12px 0', fontSize: '0.9em', fontWeight: 'bold' }}>📍 {h.distance}</p>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                {h.phone !== 'N/A' && (
                                    <a href={`tel:${h.phone}`} style={{ flex: 1, padding: '6px', background: '#e11d48', color: 'white', textDecoration: 'none', borderRadius: '4px', textAlign: 'center', fontSize: '0.9em', fontWeight: 'bold' }}>Call</a>
                                )}
                                <a href={`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: '6px', border: '1px solid #e11d48', color: '#e11d48', textDecoration: 'none', borderRadius: '4px', textAlign: 'center', fontSize: '0.9em', fontWeight: 'bold' }}>Route</a>
                            </div>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
