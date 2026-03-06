'use client';
import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';

export default function Home() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isLogin) {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const res = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Login failed');
        
        login(data.access_token, data.refresh_token);
      } else {
        const res = await fetch(`${API_URL}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail[0]?.msg || data.detail || 'Signup failed');

        setSuccess('Account created! Please login.');
        setTimeout(() => {
          setIsLogin(true);
          setSuccess('');
        }, 2000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Premium Header */}
      <header style={{
        background: 'transparent',
        boxShadow: 'none',
        borderBottom: 'none',
        padding: '1.25rem 1.5rem',
        backdropFilter: 'none'
      }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444', fontSize: '1.5rem', fontWeight: 900 }}>
          <img src="/logo.svg" alt="AyuSphere" width="32" height="32" style={{ borderRadius: '8px' }} />
          AyuSphere
        </h1>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          {/* Hero Section */}
          <div style={{ textAlign: 'center', marginBottom: '2rem', animation: 'fade-in 0.5s ease' }}>
            {/* Animated SOS Icon */}
            <div style={{
              width: '80px', height: '80px', borderRadius: '24px', margin: '0 auto 1.25rem auto',
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              boxShadow: '0 12px 35px rgba(239,68,68,0.35)',
              animation: 'float 3s ease-in-out infinite',
              overflow: 'hidden'
            }}>
              <img src="/logo.svg" alt="AyuSphere" width="80" height="80" />
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-dark)', letterSpacing: '-0.5px' }}>
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p style={{ color: 'var(--text-light)', marginTop: '6px', fontSize: '0.95rem' }}>
              {isLogin ? 'Sign in to access your emergency dashboard' : 'Join AyuSphere for instant emergency access'}
            </p>
          </div>

          {/* Premium Glass Card */}
          <div style={{
            background: 'var(--white)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            borderRadius: '24px',
            border: '1px solid var(--border)',
            padding: '2rem',
            boxShadow: '0 20px 60px rgba(0,0,0,0.08), 0 4px 20px rgba(239,68,68,0.06)',
            animation: 'slide-up 0.5s ease'
          }}>
            
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.3px' }}>Email Address</label>
                <input 
                  type="email" 
                  className="form-control" 
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  style={{ padding: '0.9rem 1.1rem', fontSize: '1rem', borderRadius: '14px' }}
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.3px' }}>Password</label>
                <input 
                  type="password" 
                  className="form-control" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  minLength={isLogin ? 1 : 6}
                  style={{ padding: '0.9rem 1.1rem', fontSize: '1rem', borderRadius: '14px' }}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '0.5rem', padding: '1rem', fontSize: '1.05rem', borderRadius: '14px' }}>
                {loading ? <span className="loading-spinner"></span> : (isLogin ? 'Sign In →' : 'Create Account →')}
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '1.5rem 0 1rem 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
              <span style={{ color: 'var(--text-light)', fontSize: '0.8rem', fontWeight: 600 }}>or</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
            </div>
            
            <button 
              onClick={(e) => { e.preventDefault(); setIsLogin(!isLogin); setError(''); }}
              style={{
                width: '100%', padding: '0.9rem',
                borderRadius: '14px', border: '2px solid var(--border)',
                background: 'transparent', color: 'var(--text-dark)',
                fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                transition: 'all 0.3s ease', fontFamily: 'inherit'
              }}
            >
              {isLogin ? '✨ Create a new account' : '← Back to Sign In'}
            </button>
          </div>

          {/* Feature Badges */}
          <div style={{ 
            display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '2rem',
            animation: 'fade-in 0.8s ease'
          }}>
            {[
              { icon: '🔒', text: 'Secure' },
              { icon: '⚡', text: 'Instant' },
              { icon: '🏥', text: 'Medical' },
            ].map((b, i) => (
              <div key={i} style={{ 
                display: 'flex', alignItems: 'center', gap: '6px', 
                fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 600 
              }}>
                <span style={{ fontSize: '1rem' }}>{b.icon}</span>
                {b.text}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Float animation */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}
