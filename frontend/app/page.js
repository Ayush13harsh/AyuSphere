'use client';
import { useState, useEffect, Suspense } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useSearchParams } from 'next/navigation';
import { API_URL, fetchWithRetry, getNetworkErrorMessage } from './lib/api';

function HomeContent() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
  const [authMode, setAuthMode] = useState(initialMode); // login | signup | forgot
  const [isOtpSent, setIsOtpSent] = useState(false);

  useEffect(() => {
    if (searchParams.get('mode') === 'signup') {
      setAuthMode('signup');
    }
  }, [searchParams]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const parseResponse = async (res) => {
    const text = await res.text();
    try { return JSON.parse(text); } catch { throw new Error(text || 'Unexpected server response'); }
  };

  const resetState = (mode) => {
    setAuthMode(mode);
    setIsOtpSent(false);
    setError('');
    setSuccess('');
    setOtp('');
    if (mode === 'login') { setPassword(''); setNewPassword(''); }
    else if (mode === 'forgot') { setPassword(''); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (authMode === 'login') {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);
        const res = await fetchWithRetry(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData
        });
        const data = await parseResponse(res);
        if (!res.ok) throw new Error(data.detail || 'Login failed');
        login(data.access_token, data.refresh_token);
      } else if (authMode === 'signup') {
        if (!isOtpSent) {
          const res = await fetchWithRetry(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          const data = await parseResponse(res);
          if (!res.ok) throw new Error(data.detail || 'Signup failed');
          setIsOtpSent(true);
          setSuccess('OTP sent to your email!');
        } else {
          const res = await fetchWithRetry(`${API_URL}/auth/verify-signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, otp })
          });
          const data = await parseResponse(res);
          if (!res.ok) throw new Error(data.detail || 'Verification failed');
          setSuccess('Account created!');
          login(data.access_token, data.refresh_token);
        }
      } else if (authMode === 'forgot') {
        if (!isOtpSent) {
          const res = await fetchWithRetry(`${API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });
          const data = await parseResponse(res);
          if (!res.ok) throw new Error(data.detail || 'Failed to send reset email');
          setIsOtpSent(true);
          setSuccess('OTP sent to your email.');
        } else {
          const res = await fetchWithRetry(`${API_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp, new_password: newPassword })
          });
          const data = await parseResponse(res);
          if (!res.ok) throw new Error(data.detail || 'Password reset failed');
          setSuccess('Password updated!');
          setTimeout(() => resetState('login'), 2000);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#050608' }}>
      <div className="bg-noise" />
      
      {/* Cinematic Header */}
      <header style={{ padding: '2rem 3rem', background: 'transparent' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'var(--primary)', opacity: 0.2, filter: 'blur(15px)', borderRadius: '50%' }}></div>
            <img src="/logo.svg" alt="AyuSphere" width="40" height="40" style={{ position: 'relative', zIndex: 10, borderRadius: '8px' }} />
          </div>
          <h1 className="font-headline cinematic-glow" style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)', letterSpacing: '0.2em' }}>
            AYUSPHERE
          </h1>
        </div>
      </header>

      {/* Auth UI */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative' }}>
        {/* Glow backdrop */}
        <div style={{ position: 'absolute', width: '30vw', height: '30vw', background: 'var(--primary)', opacity: 0.05, filter: 'blur(100px)', zIndex: 0 }}></div>
        
        <div style={{ width: '100%', maxWidth: '440px', position: 'relative', zIndex: 10 }}>
          <div className="glass-panel" style={{ padding: '3rem', borderRadius: '2.5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <span style={{ fontSize: '10px', tracking: '0.4em', color: 'var(--muted)', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Security Protocol</span>
              <h2 className="font-headline" style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>
                {authMode === 'login' ? 'ACCESS UNIT' : 'CORE ENROLL'}
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                {authMode === 'login' ? 'Authorize credentials to enter' : 'Initialize your biometric profile'}
              </p>
            </div>

            {error && <div style={{ background: 'rgba(255,61,0,0.1)', color: 'var(--accent)', padding: '1rem', borderRadius: '1rem', marginBottom: '1.5rem', fontSize: '0.8rem', border: '1px solid rgba(255,61,0,0.2)' }}>{error}</div>}
            {success && <div style={{ background: 'rgba(0,229,255,0.1)', color: 'var(--primary)', padding: '1rem', borderRadius: '1rem', marginBottom: '1.5rem', fontSize: '0.8rem', border: '1px solid rgba(0,229,255,0.2)' }}>{success}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Data Terminal</label>
                <input
                  type="email"
                  placeholder="USER_ID@NET"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '1.25rem', borderRadius: '1rem', color: 'white', outline: 'none', transition: 'all 0.3s' }}
                />
              </div>

              {(!isOtpSent || authMode === 'login') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Access Key</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '1.25rem', borderRadius: '1rem', color: 'white', outline: 'none' }}
                  />
                </div>
              )}

              {isOtpSent && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>OTP Token</label>
                  <input
                    type="text"
                    placeholder="CODE_000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '1.25rem', borderRadius: '1rem', color: 'white', textAlign: 'center', letterSpacing: '0.5em', outline: 'none' }}
                  />
                </div>
              )}

              <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '1rem', width: '100%' }}>
                {loading ? 'AUTHORIZING...' : authMode === 'login' ? 'STRIKE SYSTEM →' : 'INITIALIZE →'}
              </button>
            </form>

            <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
              <button
                onClick={() => resetState(authMode === 'login' ? 'signup' : 'login')}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em' }}
              >
                {authMode === 'login' ? 'Switch to Neural Enroll' : 'Return to Core Terminal'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
