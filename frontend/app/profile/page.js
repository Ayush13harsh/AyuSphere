'use client';
import { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { fetchAPI } from '../lib/api';

export default function Profile() {
    const [profile, setProfile] = useState({ name: '', blood_type: '', allergies: '', medications: '', medical_conditions: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const data = await fetchAPI('/profile/');
                setProfile(data);
            } catch (err) {
                // Profile not found is OK for new users
            }
        };
        loadProfile();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            const data = await fetchAPI('/profile/', {
                method: 'PUT',
                body: JSON.stringify(profile)
            });
            setProfile(data);
            setSuccess('Profile saved!');
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <AppLayout title="My Profile">
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <div className="card">
                <form onSubmit={handleSave}>
                    <div className="form-group">
                        <label>Full Name</label>
                        <input className="form-control" value={profile.name || ''} onChange={e => setProfile({...profile, name: e.target.value})} />
                    </div>
                    <div className="form-group">
                        <label>Blood Type</label>
                        <input className="form-control" value={profile.blood_type || ''} onChange={e => setProfile({...profile, blood_type: e.target.value})} placeholder="A+, B-, O+..." />
                    </div>
                    <div className="form-group">
                        <label>Allergies</label>
                        <input className="form-control" value={profile.allergies || ''} onChange={e => setProfile({...profile, allergies: e.target.value})} />
                    </div>
                    <div className="form-group">
                        <label>Medications</label>
                        <input className="form-control" value={profile.medications || ''} onChange={e => setProfile({...profile, medications: e.target.value})} />
                    </div>
                    <div className="form-group">
                        <label>Medical Conditions</label>
                        <input className="form-control" value={profile.medical_conditions || ''} onChange={e => setProfile({...profile, medical_conditions: e.target.value})} />
                    </div>
                    <button type="submit" className="btn btn-primary">Save Profile</button>
                </form>
            </div>
        </AppLayout>
    );
}
