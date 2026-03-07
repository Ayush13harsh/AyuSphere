'use client';
import { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { fetchAPI } from '../lib/api';
import { useRouter } from 'next/navigation';

export default function Profile() {
    const [profile, setProfile] = useState({ name: '', blood_type: '', allergies: '', medications: '', medical_conditions: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

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

    const handleDeleteAccount = async () => {
        const confirmDelete = window.confirm(
            "DANGER: Are you absolutely sure you want to delete your account? \n\nThis action is permanent and will instantly erase your profile, emergency contacts, and SOS incident history. This cannot be undone."
        );

        if (!confirmDelete) return;

        setIsDeleting(true);
        setError('');

        try {
            await fetchAPI('/auth/account', {
                method: 'DELETE'
            });

            // Clear local storage tokens and redirect
            localStorage.removeItem('token');
            localStorage.removeItem('refresh_token');
            router.push('/');
        } catch (err) {
            setError(err.message || "Failed to delete account");
            setIsDeleting(false);
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
                        <input className="form-control" value={profile.name || ''} onChange={e => setProfile({ ...profile, name: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Blood Type</label>
                        <input className="form-control" value={profile.blood_type || ''} onChange={e => setProfile({ ...profile, blood_type: e.target.value })} placeholder="A+, B-, O+..." />
                    </div>
                    <div className="form-group">
                        <label>Allergies</label>
                        <input className="form-control" value={profile.allergies || ''} onChange={e => setProfile({ ...profile, allergies: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Medications</label>
                        <input className="form-control" value={profile.medications || ''} onChange={e => setProfile({ ...profile, medications: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Medical Conditions</label>
                        <input className="form-control" value={profile.medical_conditions || ''} onChange={e => setProfile({ ...profile, medical_conditions: e.target.value })} />
                    </div>
                    <button type="submit" className="btn btn-primary">Save Profile</button>
                </form>
            </div>

            {/* Danger Zone */}
            <div className="card" style={{ marginTop: '2rem', border: '1px solid #fee2e2', background: '#fff1f2' }}>
                <h3 style={{ color: '#ef4444', marginBottom: '10px', fontSize: '1.2rem', fontWeight: 600 }}>Danger Zone</h3>
                <p style={{ color: '#991b1b', fontSize: '0.9rem', marginBottom: '20px' }}>
                    Permanently delete your account and all associated data. This action cannot be reversed.
                </p>
                <button
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    style={{
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        cursor: isDeleting ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        transition: 'background 0.2s',
                        opacity: isDeleting ? 0.7 : 1
                    }}
                >
                    {isDeleting ? 'Deleting Account...' : 'Delete My Account'}
                </button>
            </div>
        </AppLayout>
    );
}
