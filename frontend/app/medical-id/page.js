'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '../components/AppLayout';
import { fetchAPI } from '../lib/api';

export default function MedicalID() {
    const [profile, setProfile] = useState(null);
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [flipped, setFlipped] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                const [p, c] = await Promise.all([
                    fetchAPI('/profile/').catch(() => null),
                    fetchAPI('/contacts/').catch(() => [])
                ]);
                setProfile(p);
                setContacts(c);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        }
        load();
    }, []);

    if (loading) {
        return (
            <AppLayout title="Medical ID">
                <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                    <span className="loading-spinner" style={{ width: '32px', height: '32px', borderColor: 'rgba(255,59,59,0.2)', borderTopColor: 'var(--primary-red)' }}></span>
                </div>
            </AppLayout>
        );
    }

    const name = profile?.name || 'AyuSphere User';
    const blood = profile?.blood_type || 'Not Set';
    const allergies = profile?.allergies || 'None reported';
    const medications = profile?.medications || 'None reported';
    const conditions = profile?.medical_conditions || 'None reported';
    const emergencyContact = contacts.length > 0 ? contacts[0] : null;

    return (
        <AppLayout title="Medical ID">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>Digital Medical ID</h2>
                    <p style={{ color: 'var(--text-light)', marginTop: '4px', fontSize: '0.9rem' }}>Your emergency health passport</p>
                </div>
                <Link href="/dashboard" className="btn btn-outline" style={{ padding: '8px 16px', fontSize: '0.9rem', width: 'auto' }}>Back</Link>
            </div>

            {/* Flip Card Container */}
            <div 
                onClick={() => setFlipped(!flipped)}
                style={{ perspective: '1000px', cursor: 'pointer', marginBottom: '1.5rem' }}
            >
                <div style={{
                    position: 'relative', width: '100%', height: '260px',
                    transformStyle: 'preserve-3d',
                    transition: 'transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                }}>
                    {/* FRONT */}
                    <div style={{
                        position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
                        borderRadius: '20px', padding: '1.5rem',
                        background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
                        color: 'white', boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <img src="/logo.svg" alt="AyuSphere" width="22" height="22" style={{ borderRadius: '4px' }} />
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#ef4444' }}>AyuSphere</span>
                                </div>
                                <h3 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '8px 0 0 0', letterSpacing: '-0.5px' }}>{name}</h3>
                            </div>
                            <div style={{
                                background: blood !== 'Not Set' ? '#ef4444' : '#475569',
                                padding: '8px 16px', borderRadius: '12px',
                                fontWeight: 800, fontSize: '1.2rem', letterSpacing: '1px',
                                boxShadow: blood !== 'Not Set' ? '0 4px 12px rgba(239,68,68,0.4)' : 'none'
                            }}>
                                {blood}
                            </div>
                        </div>
                        <div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
                                <div>
                                    <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', marginBottom: '2px' }}>Allergies</p>
                                    <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{allergies.length > 25 ? allergies.substring(0, 25) + '…' : allergies}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', marginBottom: '2px' }}>Medications</p>
                                    <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{medications.length > 25 ? medications.substring(0, 25) + '…' : medications}</p>
                                </div>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1rem', textAlign: 'center' }}>TAP TO FLIP →</p>
                        </div>
                    </div>

                    {/* BACK */}
                    <div style={{
                        position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        borderRadius: '20px', padding: '1.5rem',
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)',
                        color: 'white', boxShadow: '0 20px 40px rgba(239,68,68,0.3)',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                    }}>
                        <div>
                            <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '0.75rem', opacity: 0.8 }}>Emergency Information</p>
                            <div style={{ marginBottom: '0.75rem' }}>
                                <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.7, marginBottom: '2px' }}>Medical Conditions</p>
                                <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>{conditions}</p>
                            </div>
                            <div style={{ marginBottom: '0.75rem' }}>
                                <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.7, marginBottom: '2px' }}>Emergency Contact</p>
                                <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                                    {emergencyContact ? `${emergencyContact.name} — ${emergencyContact.phone}` : 'No contacts saved'}
                                </p>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.7, marginBottom: '2px' }}>Full Allergies List</p>
                                <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>{allergies}</p>
                            </div>
                        </div>
                        <p style={{ fontSize: '0.75rem', opacity: 0.7, textAlign: 'center' }}>← TAP TO FLIP BACK</p>
                    </div>
                </div>
            </div>

            {/* Quick Info Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="card" style={{ textAlign: 'center', marginBottom: 0, borderLeft: '4px solid #ef4444' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '1px' }}>Blood Type</p>
                    <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444' }}>{blood}</p>
                </div>
                <div className="card" style={{ textAlign: 'center', marginBottom: 0, borderLeft: '4px solid #3b82f6' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '1px' }}>Emergency</p>
                    <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-dark)', marginTop: '4px' }}>
                        {emergencyContact ? emergencyContact.name : 'Not Set'}
                    </p>
                    {emergencyContact && (
                        <a href={`tel:${emergencyContact.phone}`} style={{ fontSize: '0.85rem', color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>
                            {emergencyContact.phone}
                        </a>
                    )}
                </div>
            </div>

            {/* Edit Prompt */}
            <div className="card" style={{ background: '#fffbeb', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="#f59e0b"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                <div>
                    <p style={{ fontWeight: 700, color: '#92400e', fontSize: '0.95rem' }}>Keep your ID updated</p>
                    <p style={{ fontSize: '0.85rem', color: '#a16207' }}>
                        <Link href="/profile" style={{ color: '#d97706', fontWeight: 600 }}>Edit your profile</Link> to update your medical info.
                    </p>
                </div>
            </div>
        </AppLayout>
    );
}
