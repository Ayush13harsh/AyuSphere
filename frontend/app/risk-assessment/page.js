'use client';
import { useState } from 'react';
import Link from 'next/link';
import AppLayout from '../components/AppLayout';

export default function RiskAssessment() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    // Form Data
    const [formData, setFormData] = useState({
        age: '',
        weight: '',
        height: '',
        systolic: '',
        diastolic: '',
        symptoms: [],
        smoke: false,
        diabetes: false
    });

    const commonSymptoms = [
        "Chest Pain", "Shortness of Breath", "Severe Headache",
        "Dizziness/Fainting", "Unexplained Fatigue", "High Fever"
    ];

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const toggleSymptom = (sym) => {
        setFormData(prev => {
            const current = [...prev.symptoms];
            if (current.includes(sym)) {
                return { ...prev, symptoms: current.filter(s => s !== sym) };
            } else {
                return { ...prev, symptoms: [...current, sym] };
            }
        });
    };

    const calculateRisk = () => {
        setLoading(true);

        setTimeout(() => {
            // Very simplified mock heuristic for demonstration purposes
            let riskScore = 0;
            let factors = [];

            // BMI Calculation (Weight in kg / Height in m^2)
            let bmi = null;
            if (formData.weight && formData.height) {
                const heightM = parseInt(formData.height) / 100;
                bmi = parseInt(formData.weight) / (heightM * heightM);
                if (bmi > 30) {
                    riskScore += 2;
                    factors.push("High BMI (Obesity risk category)");
                }
            }

            // Blood Pressure
            const sys = parseInt(formData.systolic) || 120;
            const dia = parseInt(formData.diastolic) || 80;
            if (sys > 140 || dia > 90) {
                riskScore += 3;
                factors.push("Elevated Blood Pressure (Hypertension risk)");
            } else if (sys > 180 || dia > 120) {
                riskScore += 5; // Hypertensive crisis
            }

            // Age & Lifestyle
            if (parseInt(formData.age) > 60) {
                riskScore += 1;
                factors.push("Age > 60");
            }
            if (formData.smoke) {
                riskScore += 2;
                factors.push("Smoking");
            }
            if (formData.diabetes) {
                riskScore += 2;
                factors.push("Pre-existing Diabetes");
            }

            // Severe Symptoms Weighting
            if (formData.symptoms.includes("Chest Pain") || formData.symptoms.includes("Shortness of Breath")) {
                riskScore += 4;
                factors.push("Critical Symptoms Reported (Chest/Breathing)");
            }
            if (formData.symptoms.includes("Severe Headache") || formData.symptoms.includes("Dizziness/Fainting")) {
                riskScore += 2;
                factors.push("Neurological Symptoms Reported");
            }

            // Categorize Risk
            let category = "Low Risk";
            let color = "#10B981"; // Green
            let percentage = Math.min(Math.max((riskScore / 15) * 100, 10), 100);

            if (riskScore >= 7) {
                category = "High Risk";
                color = "#EF4444"; // Red
            } else if (riskScore >= 4) {
                category = "Moderate Risk";
                color = "#F59E0B"; // Amber
            }

            setResult({
                score: percentage,
                category,
                color,
                factors: factors.length > 0 ? factors : ["No major risk factors detected based on input."],
                bmi: bmi ? bmi.toFixed(1) : null
            });

            setStep(2);
            setLoading(false);
        }, 1500); // Simulate processing time
    };

    return (
        <AppLayout title="Risk Analysis">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>Health Risk Analyzer</h2>
                    <p style={{ color: 'var(--text-light)', marginTop: '2px', fontSize: '0.9rem' }}>AI-driven vitals and symptom evaluation</p>
                </div>
                <Link href="/dashboard" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>Back</Link>
            </div>

            {step === 1 && (
                <div className="card" style={{ animation: 'fade-in 0.4s ease' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Age (Years)</label>
                            <input type="number" name="age" className="form-control" value={formData.age} onChange={handleInputChange} placeholder="e.g., 45" />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Weight (kg)</label>
                            <input type="number" name="weight" className="form-control" value={formData.weight} onChange={handleInputChange} placeholder="e.g., 75" />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Height (cm)</label>
                            <input type="number" name="height" className="form-control" value={formData.height} onChange={handleInputChange} placeholder="e.g., 175" />
                        </div>
                    </div>

                    <h3 style={{ fontSize: '1rem', color: 'var(--text-dark)', marginBottom: '0.8rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Blood Pressure (Approximate)</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Systolic (Upper)</label>
                            <input type="number" name="systolic" className="form-control" value={formData.systolic} onChange={handleInputChange} placeholder="120" />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Diastolic (Lower)</label>
                            <input type="number" name="diastolic" className="form-control" value={formData.diastolic} onChange={handleInputChange} placeholder="80" />
                        </div>
                    </div>

                    <h3 style={{ fontSize: '1rem', color: 'var(--text-dark)', marginBottom: '0.8rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Current Symptoms</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '1.5rem' }}>
                        {commonSymptoms.map(sym => (
                            <button
                                key={sym} type="button" onClick={() => toggleSymptom(sym)}
                                style={{
                                    padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s',
                                    border: `1px solid ${formData.symptoms.includes(sym) ? 'var(--primary-red)' : 'var(--border)'}`,
                                    background: formData.symptoms.includes(sym) ? 'var(--bg-red-light)' : 'transparent',
                                    color: formData.symptoms.includes(sym) ? 'var(--primary-red)' : 'var(--text-dark)',
                                    fontWeight: formData.symptoms.includes(sym) ? 600 : 400
                                }}
                            >
                                {sym}
                            </button>
                        ))}
                    </div>

                    <h3 style={{ fontSize: '1rem', color: 'var(--text-dark)', marginBottom: '0.8rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Pre-existing Conditions</h3>
                    <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="checkbox" name="smoke" checked={formData.smoke} onChange={handleInputChange} style={{ width: '18px', height: '18px', accentColor: 'var(--primary-red)' }} />
                            Smoker / Tobacco Use
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="checkbox" name="diabetes" checked={formData.diabetes} onChange={handleInputChange} style={{ width: '18px', height: '18px', accentColor: 'var(--primary-red)' }} />
                            Diabetes
                        </label>
                    </div>

                    <button
                        onClick={calculateRisk}
                        disabled={loading || !formData.age}
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', background: 'var(--primary-red)', color: 'white', border: 'none' }}>
                        {loading ? <span className="loading-spinner" style={{ width: '24px', height: '24px' }}></span> : 'Analyze Health Risk'}
                    </button>
                </div>
            )}

            {step === 2 && result && (
                <div style={{ animation: 'fade-in 0.5s ease' }}>

                    {/* Massive Gauge Meter Container */}
                    <div className="card" style={{ textAlign: 'center', padding: '1.2rem', marginBottom: '0.8rem', background: '#1e293b', color: 'white' }}>
                        <h3 style={{ textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.8rem' }}>Overall Health Risk</h3>

                        <div style={{
                            position: 'relative', width: '130px', height: '130px', margin: '0 auto',
                            borderRadius: '50%', background: `conic-gradient(${result.color} ${result.score}%, #334155 ${result.score}%)`,
                            display: 'flex', justifyContent: 'center', alignItems: 'center',
                            boxShadow: `0 0 20px ${result.color}40`
                        }}>
                            <div style={{
                                width: '100px', height: '100px', background: '#1e293b', borderRadius: '50%',
                                display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
                            }}>
                                <span style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1, color: result.color }}>{Math.round(result.score)}</span>
                                <span style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '2px' }}>/ 100</span>
                            </div>
                        </div>

                        <h2 style={{ fontSize: '1.4rem', marginTop: '1rem', color: result.color, marginBottom: 0 }}>{result.category}</h2>
                    </div>

                    {/* Breakdown Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                        <div className="card" style={{ borderLeft: `6px solid ${result.color}`, padding: '0.8rem 1rem' }}>
                            <h3 style={{ fontSize: '0.95rem', marginBottom: '0.4rem' }}>Detected Risk Factors</h3>
                            <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-dark)', lineHeight: '1.3', margin: 0, fontSize: '0.85rem' }}>
                                {result.factors.map((factor, i) => (
                                    <li key={i} style={{ marginBottom: '2px' }}>{factor}</li>
                                ))}
                            </ul>
                        </div>

                        {result.bmi && (
                            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '0.8rem 1rem', textAlign: 'center' }}>
                                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: '4px' }}>Calculated BMI</h3>
                                <p style={{ fontWeight: 600, fontSize: '1.2rem', margin: '0 0 6px 0' }}>{result.bmi}</p>
                                <div style={{ background: result.bmi > 25 ? 'var(--bg-red-light)' : '#ecfdf5', color: result.bmi > 25 ? 'var(--primary-red)' : '#059669', padding: '4px 12px', borderRadius: '16px', fontWeight: 700, fontSize: '0.8rem' }}>
                                    {result.bmi > 30 ? 'Obese' : result.bmi > 25 ? 'Overweight' : result.bmi < 18.5 ? 'Underweight' : 'Normal'}
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.8rem', paddingBottom: '90px' }}>
                        <button onClick={() => { setStep(1); setResult(null); }} className="btn btn-outline" style={{ flex: 1, padding: '0.6rem' }}>Recalculate</button>
                        {result.category !== "Low Risk" && (
                            <Link href="/chatbot" className="btn btn-primary" style={{ flex: 1, textAlign: 'center', padding: '0.6rem' }}>Consult Doctor</Link>
                        )}
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
