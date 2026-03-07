'use client';
import { useState, useEffect, Suspense } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useSearchParams } from 'next/navigation';

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

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ayusphere-backend.onrender.com/api/v1';

  const resetState = (mode) => {
    setAuthMode(mode);
    setIsOtpSent(false);
    setError('');
    setSuccess('');
    setOtp('');
    if (mode === 'login') {
      setPassword('');
      setNewPassword('');
    } else if (mode === 'forgot') {
      setPassword('');
    }
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

        const res = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Login failed');

        login(data.access_token, data.refresh_token);

      } else if (authMode === 'signup') {
        if (!isOtpSent) {
          // Step 1: Request OTP
          const res = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          const data = await res.json();
          if (!res.ok) {
            if (Array.isArray(data.detail)) throw new Error(data.detail[0]?.msg || 'Signup failed');
            throw new Error(data.detail || 'Signup failed');
          }

          setIsOtpSent(true);
          setSuccess('OTP sent to your email! (Check spam folder too)');
        } else {
          // Step 2: Verify OTP
          const res = await fetch(`${API_URL}/auth/verify-signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, otp })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.detail || 'Verification failed');

          setSuccess('Account created and verified!');
          login(data.access_token, data.refresh_token);
        }
      } else if (authMode === 'forgot') {
        if (!isOtpSent) {
          // Step 1: Request Reset OTP
          const res = await fetch(`${API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.detail || 'Failed to send reset email');

          setIsOtpSent(true);
          setSuccess('If the account exists, an OTP has been sent to your email.');
        } else {
          // Step 2: Reset Password
          const res = await fetch(`${API_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp, new_password: newPassword })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.detail || 'Password reset failed');

          setSuccess('Password updated successfully! Please login.');
          setTimeout(() => resetState('login'), 2000);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (authMode === 'login') return 'Welcome Back';
    if (authMode === 'signup' && !isOtpSent) return 'Create Account';
    if (authMode === 'signup' && isOtpSent) return 'Verify Email';
    if (authMode === 'forgot' && !isOtpSent) return 'Reset Password';
    return 'Create New Password';
  };

  const getSubtitle = () => {
    if (authMode === 'login') return 'Sign in to access your emergency dashboard';
    if (authMode === 'signup' && !isOtpSent) return 'Join AyuSphere for instant emergency access';
    if (authMode === 'signup' && isOtpSent) return 'Enter the 6-digit code sent to your email';
    if (authMode === 'forgot' && !isOtpSent) return 'Enter your email to receive a reset code';
    return 'Enter the code and your new password';
  };

  const getButtonText = () => {
    if (authMode === 'login') return 'Sign In →';
    if (authMode === 'signup' && !isOtpSent) return 'Continue →';
    if (authMode === 'signup' && isOtpSent) return 'Verify & Create Account →';
    if (authMode === 'forgot' && !isOtpSent) return 'Send Reset Code →';
    return 'Update Password →';
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
              {getTitle()}
            </h2>
            <p style={{ color: 'var(--text-light)', marginTop: '6px', fontSize: '0.95rem' }}>
              {getSubtitle()}
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

            {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
            {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{success}</div>}

            <form onSubmit={handleSubmit}>

              {(!isOtpSent || authMode === 'login') && (
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.3px', display: 'block', marginBottom: '0.5rem' }}>Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    readOnly={isOtpSent}
                    style={{ padding: '0.9rem 1.1rem', fontSize: '1rem', borderRadius: '14px', background: isOtpSent ? '#f3f4f6' : 'white', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              {(authMode === 'login' || (authMode === 'signup' && !isOtpSent)) && (
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.3px' }}>Password</label>
                    {authMode === 'login' && (
                      <button
                        type="button"
                        onClick={() => resetState('forgot')}
                        style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={authMode === 'login' ? 1 : 6}
                    style={{ padding: '0.9rem 1.1rem', fontSize: '1rem', borderRadius: '14px', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              {isOtpSent && (authMode === 'signup' || authMode === 'forgot') && (
                <div className="form-group" style={{ animation: 'fade-in 0.4s ease' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.3px', display: 'block', marginBottom: '0.5rem' }}>6-Digit Code</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    maxLength={6}
                    style={{ padding: '0.9rem 1.1rem', fontSize: '1rem', borderRadius: '14px', letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              {isOtpSent && authMode === 'forgot' && (
                <div className="form-group" style={{ animation: 'fade-in 0.4s ease' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.3px', display: 'block', marginBottom: '0.5rem' }}>New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    style={{ padding: '0.9rem 1.1rem', fontSize: '1rem', borderRadius: '14px', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '0.5rem', padding: '1rem', fontSize: '1.05rem', borderRadius: '14px', width: '100%' }}>
                {loading ? <span className="loading-spinner"></span> : getButtonText()}
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '1.5rem 0 1rem 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
              <span style={{ color: 'var(--text-light)', fontSize: '0.8rem', fontWeight: 600 }}>or</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
            </div>

            <button
              onClick={(e) => {
                e.preventDefault();
                if (authMode === 'login') resetState('signup');
                else resetState('login');
              }}
              style={{
                width: '100%', padding: '0.9rem',
                borderRadius: '14px', border: '2px solid var(--border)',
                background: 'transparent', color: 'var(--text-dark)',
                fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                transition: 'all 0.3s ease', fontFamily: 'inherit'
              }}
            >
              {authMode === 'login' ? '✨ Create a new account' : '← Back to Sign In'}
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

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
