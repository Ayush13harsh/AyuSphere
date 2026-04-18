'use client';
import { useState, useEffect } from 'react';

export default function NotificationBanner() {
    const [notifications, setNotifications] = useState([]);

    // Simulated emergency notifications for demonstration
    useEffect(() => {
        const demoNotifications = [
            { id: 1, type: 'info', message: '🏥 AyuSphere System Active — All emergency services operational', delay: 1500 },
            { id: 2, type: 'emergency', message: '🚨 Emergency Protocol Ready — SOS system armed and monitoring', delay: 8000 },
            { id: 3, type: 'success', message: '✅ Ambulance Network Connected — 3 units available nearby', delay: 15000 },
        ];

        const timers = demoNotifications.map(n => 
            setTimeout(() => {
                setNotifications(prev => {
                    // Only keep max 1 notification at a time
                    return [n];
                });
                // Auto-dismiss after 5 seconds
                setTimeout(() => {
                    setNotifications(prev => prev.filter(p => p.id !== n.id));
                }, 5000);
            }, n.delay)
        );

        return () => timers.forEach(clearTimeout);
    }, []);

    const dismiss = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    if (notifications.length === 0) return null;

    return (
        <>
            {notifications.map(n => (
                <div key={n.id} className={`notification-banner ${n.type}`}>
                    <span className="pulse-indicator"></span>
                    <span style={{ flex: 1 }}>{n.message}</span>
                    <button className="close-btn" onClick={() => dismiss(n.id)}>✕</button>
                </div>
            ))}
        </>
    );
}
