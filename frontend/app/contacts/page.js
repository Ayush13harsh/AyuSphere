'use client';
import { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { fetchAPI } from '../lib/api';

export default function Contacts() {
    const [contacts, setContacts] = useState([]);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [relationship, setRelationship] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const loadContacts = async () => {
        try {
            const data = await fetchAPI('/contacts/');
            setContacts(data);
        } catch (err) {
            setError(err.message);
        }
    };

    useEffect(() => { loadContacts(); }, []);

    const handleAdd = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            await fetchAPI('/contacts/', {
                method: 'POST',
                body: JSON.stringify({ name, phone, relationship: relationship || 'other' })
            });
            setSuccess('Contact added!');
            setName(''); setPhone(''); setRelationship('');
            loadContacts();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (id) => {
        try {
            await fetchAPI(`/contacts/${id}`, { method: 'DELETE' });
            loadContacts();
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <AppLayout title="Contacts">
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <div className="card">
                <h3 style={{ marginBottom: '1rem' }}>Add Contact</h3>
                <form onSubmit={handleAdd}>
                    <div className="form-group">
                        <label>Name</label>
                        <input className="form-control" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Phone Number</label>
                        <input className="form-control" value={phone} onChange={e => setPhone(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Relationship</label>
                        <input className="form-control" value={relationship} onChange={e => setRelationship(e.target.value)} placeholder="parent, spouse, friend..." />
                    </div>
                    <button type="submit" className="btn btn-primary">Add Contact</button>
                </form>
            </div>

            <h3 style={{ marginBottom: '1rem' }}>Saved Contacts</h3>
            {contacts.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-light)' }}>No contacts saved yet.</p>
            ) : (
                contacts.map(c => (
                    <div className="list-item" key={c._id}>
                        <div className="list-content">
                            <h3>{c.name}</h3>
                            <p>{c.phone} · {c.relationship}</p>
                        </div>
                        <button onClick={() => handleDelete(c._id)} style={{ background: 'none', border: 'none', color: 'var(--primary-red)', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}>
                            Delete
                        </button>
                    </div>
                ))
            )}
        </AppLayout>
    );
}
