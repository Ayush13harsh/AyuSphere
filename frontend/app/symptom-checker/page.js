'use client';
import { useState } from 'react';
import Link from 'next/link';
import AppLayout from '../components/AppLayout';
import { fetchAPI } from '../lib/api';
import dynamic from 'next/dynamic';

const LeafletMap = dynamic(() => import('../components/LeafletMap'), { ssr: false });

export default function SymptomChecker() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Form State
    const [symptomsText, setSymptomsText] = useState('');
    const [duration, setDuration] = useState('');
    const [painLevel, setPainLevel] = useState(5);
    const [fever, setFever] = useState(false);
    const [ageGroup, setAgeGroup] = useState('adult');
    const [existingConditions, setExistingConditions] = useState('');
    
    // Results
    const [result, setResult] = useState(null);
    const [hospitals, setHospitals] = useState([]);
    const [userLocation, setUserLocation] = useState(null);

    const presetSymptoms = [
        "Headache", "Fever", "Cough", "Chest Pain", "Stomach Ache", 
        "Nausea", "Vomiting", "Skin Rash", "Joint Pain", "Shortness of breath"
    ];

    const toggleSymptom = (sym) => {
        if (symptomsText.includes(sym)) {
            setSymptomsText(symptomsText.replace(sym, '').replace(/,\s*$/, '').trim());
        } else {
            setSymptomsText(symptomsText ? `${symptomsText}, ${sym}` : sym);
        }
    };

    const handleNext = () => setStep(step + 1);
    const handleBack = () => setStep(step - 1);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!symptomsText.trim()) {
            setError("Please describe or select your symptoms.");
            return;
        }
        
        setLoading(true);
        setError('');

        try {
            // 1. Get Symptom Analysis
            const analysis = await fetchAPI('/symptoms/check', {
                method: 'POST',
                body: JSON.stringify({
                    symptoms_text: symptomsText,
                    duration,
                    pain_level: parseInt(painLevel),
                    fever,
                    age_group: ageGroup,
                    existing_conditions: existingConditions
                })
            });
            
            setResult(analysis);
            setStep(3); // Result Step

            // 2. Fetch User Location and Find Specialists
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(async (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    setUserLocation({ lat, lng });

                    try {
                        const hospData = await fetchAPI(`/hospitals?lat=${lat}&lng=${lng}&specialty=${analysis.specialty_keyword}`);
                        setHospitals(hospData);
                    } catch (err) {
                        console.error("Failed to load hospitals", err);
                    } finally {
                        setLoading(false);
                    }
                }, () => {
                    setError('Unable to retrieve location to find nearby specialists.');
                    setLoading(false);
                });
            } else {
                setLoading(false);
            }

        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <header>
                <h1>
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
                    </svg>
                    Symptom Checker
                </h1>
                <Link href="/dashboard" style={{ color: 'var(--primary-red)', fontWeight: 700, textDecoration: 'none' }}>Back</Link>
            </header>

            <main>
                {/* Progress Bar */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '2rem' }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} style={{
                            flex: 1, 
                            height: '6px', 
                            borderRadius: '3px',
                            background: step >= i ? 'var(--primary-red)' : 'var(--border)',
                            transition: 'background 0.3s'
                        }} />
                    ))}
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                {/* Step 1: Symptoms Selection */}
                {step === 1 && (
                    <div className="card">
                        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>What symptoms are you experiencing?</h2>
                        
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '1.5rem' }}>
                            {presetSymptoms.map(sym => (
                                <button 
                                    key={sym}
                                    type="button"
                                    onClick={() => toggleSymptom(sym)}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: '20px',
                                        border: `1px solid ${symptomsText.includes(sym) ? 'var(--primary-red)' : 'var(--border)'}`,
                                        background: symptomsText.includes(sym) ? 'var(--primary-red)' : 'transparent',
                                        color: symptomsText.includes(sym) ? 'white' : 'var(--text-dark)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    {sym}
                                </button>
                            ))}
                        </div>

                        <div className="form-group">
                            <label>Or type your symptoms (natural language)</label>
                            <textarea 
                                className="form-control"
                                rows="3"
                                placeholder="I have been having a severe headache and slight dizziness since yesterday..."
                                value={symptomsText}
                                onChange={e => setSymptomsText(e.target.value)}
                            ></textarea>
                        </div>
                        
                        <button onClick={handleNext} disabled={!symptomsText.trim()} className="btn btn-primary">Continue</button>
                    </div>
                )}

                {/* Step 2: Additional Details */}
                {step === 2 && (
                    <div className="card">
                        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Additional Details</h2>
                        
                        <div className="form-group">
                            <label>How long have you had these symptoms?</label>
                            <select className="form-control" value={duration} onChange={e => setDuration(e.target.value)}>
                                <option value="">Select duration...</option>
                                <option value="Less than 24 hours">Less than 24 hours</option>
                                <option value="1-3 days">1-3 days</option>
                                <option value="1 week">About a week</option>
                                <option value="More than a week">More than a week</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Pain Level (1-10): {painLevel}</label>
                            <input 
                                type="range" 
                                min="1" max="10" 
                                value={painLevel} 
                                onChange={e => setPainLevel(parseInt(e.target.value))}
                                style={{ width: '100%', accentColor: 'var(--primary-red)' }} 
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '4px' }}>
                                <span>1 (Mild)</span>
                                <span>10 (Severe)</span>
                            </div>
                        </div>

                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input type="checkbox" id="fever" checked={fever} onChange={e => setFever(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--primary-red)' }} />
                            <label htmlFor="fever" style={{ margin: 0 }}>I have a fever / high temperature</label>
                        </div>

                        <div className="form-group">
                            <label>Age Group</label>
                            <select className="form-control" value={ageGroup} onChange={e => setAgeGroup(e.target.value)}>
                                <option value="adult-young">Young Adult (18-24)</option>
                                <option value="adult">Adult (25-64)</option>
                                <option value="senior">Senior (65+)</option>
                                <option value="child">Child (4-17)</option>
                                <option value="infant">Infant/Toddler (0-3)</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '2rem' }}>
                            <button onClick={handleBack} className="btn btn-outline" style={{ flex: 1 }}>Back</button>
                            <button onClick={handleSubmit} disabled={loading} className="btn btn-primary" style={{ flex: 2 }}>
                                {loading ? <span className="loading-spinner" style={{width: '20px', height: '20px', borderWidth: '3px'}}></span> : 'Analyze Symptoms'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Analysis Results */}
                {step === 3 && result && (
                    <div className="results-container">
                        <div className="alert alert-error" style={{ background: '#FFFBEB', color: '#B45309', border: '1px solid #FEF3C7', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                            <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 16h2v2h-2zm0-6h2v4h-2z"/></svg>
                                Disclaimer
                            </strong>
                            {result.disclaimer}
                        </div>

                        <div className="card" style={{ background: 'linear-gradient(145deg, var(--white), #fff5f5)', borderLeft: '4px solid var(--primary-red)' }}>
                            <h3 style={{ color: 'var(--text-light)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Health Suggestion</h3>
                            <h2 style={{ color: 'var(--primary-red)', marginBottom: '1rem', fontSize: '1.4rem' }}>
                                {result.possible_conditions.join(' / ')}
                            </h2>
                            
                            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1rem 0' }} />
                            
                            <h3 style={{ color: 'var(--text-light)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Recommended Specialist</h3>
                            <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--primary-red)"><path d="M18 17h-2v-1h-2v1h-2v-1h-2v1h-2v-1H8v1H6v-2h12v2zm-6-8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm3.84 0c-.81 1.2-2.18 2-3.84 2s-3.03-.8-3.84-2H6v4h12V9h-2.16zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
                                {result.recommended_specialist}
                            </h2>
                        </div>

                        <h3 style={{ margin: '2rem 0 1rem 0' }}>Nearby Specialists</h3>
                        
                        {loading && !hospitals.length ? (
                            <div style={{ textAlign: 'center', padding: '2rem' }}>
                                <span className="loading-spinner" style={{width: '30px', height: '30px', borderWidth: '4px', borderColor: 'var(--primary-red)'}}></span>
                                <p style={{ marginTop: '1rem', color: 'var(--text-light)' }}>Locating nearby {result.recommended_specialist}s...</p>
                            </div>
                        ) : (
                            <>
                                {userLocation && hospitals.length > 0 && (
                                    <div style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '1.5rem', height: '250px', border: '1px solid var(--border)' }}>
                                        <LeafletMap userLocation={userLocation} hospitals={hospitals} />
                                    </div>
                                )}
                                
                                {hospitals.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: 'var(--text-light)' }}>No matching specialists found nearby.</p>
                                ) : (
                                    hospitals.map((h, idx) => (
                                        <div className="card" key={idx} style={{ padding: '1rem' }}>
                                            <h4 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{h.name}</h4>
                                            <p style={{ color: 'var(--text-light)', fontSize: '0.85rem', marginBottom: '8px' }}>{h.address}</p>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                                                📍 {h.distance} &bull; ⭐ {h.rating} &bull; 📞 {h.phone}
                                            </p>
                                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                                                {h.phone !== 'N/A' && (
                                                    <a href={`tel:${h.phone}`} className="btn btn-primary" style={{ padding: '0.6rem', fontSize: '0.85rem' }}>Call Clinic</a>
                                                )}
                                                <a href={`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ padding: '0.6rem', fontSize: '0.85rem' }}>Directions</a>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </>
                        )}
                        
                        <button onClick={() => { setStep(1); setSymptomsText(''); setResult(null); }} className="btn btn-outline" style={{ marginTop: '1rem' }}>Start New Check</button>
                    </div>
                )}
            </main>
        </div>
    );
}
