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
    const [editingId, setEditingId] = useState(null);

    const loadContacts = async () => {
        try {
            const data = await fetchAPI('/contacts/');
            setContacts(data);
        } catch (err) {
            setError(err.message);
        }
    };

    useEffect(() => { loadContacts(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            if (editingId) {
                await fetchAPI(`/contacts/${editingId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ name, phone, relationship: relationship || 'other' })
                });
                setSuccess('Contact updated successfully!');
            } else {
                await fetchAPI('/contacts/', {
                    method: 'POST',
                    body: JSON.stringify({ name, phone, relationship: relationship || 'other' })
                });
                setSuccess('Contact added successfully!');
            }
            setName(''); setPhone(''); setRelationship(''); setEditingId(null);
            loadContacts();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleEdit = (c) => {
        setName(c.name);
        setPhone(c.phone);
        setRelationship(c.relationship || '');
        setEditingId(c._id);
        setError('');
        setSuccess('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEdit = () => {
        setName(''); setPhone(''); setRelationship(''); setEditingId(null);
        setError('');
        setSuccess('');
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
                <h3 style={{ marginBottom: '1rem' }}>{editingId ? "Update Contact" : "Add Contact"}</h3>
                <form onSubmit={handleSubmit}>
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
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="submit" className="btn btn-primary">{editingId ? "Update Contact" : "Add Contact"}</button>
                        {editingId && (
                            <button type="button" onClick={cancelEdit} className="btn btn-outline">Cancel</button>
                        )}
                    </div>
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
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={() => handleEdit(c)} style={{ background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}>
                                Edit
                            </button>
                            <button onClick={() => handleDelete(c._id)} style={{ background: 'none', border: 'none', color: 'var(--primary-red)', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}>
                                Delete
                            </button>
                        </div>
                    </div>
                ))
            )}
        </AppLayout>
    );
}
