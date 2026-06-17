'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const passwordStrength = () => {
    if (password.length === 0) return { level: 0, label: '', color: '' };
    if (password.length < 6) return { level: 1, label: 'Weak', color: '#ef4444' };
    if (password.length < 10) return { level: 2, label: 'Fair', color: '#f59e0b' };
    return { level: 3, label: 'Strong', color: '#22c55e' };
  };

  const strength = passwordStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error?.message || 'Registration failed');
        return;
      }

      // Store the real user data returned from the API
      localStorage.setItem('token', data.data.token.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      router.push('/dashboard');
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes glow { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        .form-card { animation: fadeUp 0.5s ease forwards; }
        .input-field {
          width: 100%; padding: 13px 14px; border-radius: 10px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: #e5e7eb;
          font-size: 16px; font-family: 'Inter', sans-serif;
          outline: none; transition: border-color 0.2s ease, background 0.2s ease;
          min-height: 48px;
        }
        .input-field:focus { border-color: #ff5f52; background: rgba(255,95,82,0.04); }
        .input-field::placeholder { color: #4b5563; }
        .submit-btn {
          width: 100%; padding: 14px; border-radius: 10px; border: none; cursor: pointer;
          background: linear-gradient(135deg, #ff5f52, #ff8a80);
          color: #fff; font-size: 15px; font-weight: 600; font-family: 'Inter', sans-serif;
          transition: opacity 0.2s ease, transform 0.15s ease;
          min-height: 48px;
        }
        .submit-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .toggle-pw { background: none; border: none; cursor: pointer; color: #6b7280;
          font-size: 16px; padding: 4px; transition: color 0.15s ease; }
        .toggle-pw:hover { color: #e5e7eb; }
        .strength-bar { height: 3px; border-radius: 2px; transition: width 0.3s ease, background 0.3s ease; }
      `}</style>

      <div style={{
        minHeight: '100vh', background: '#131313',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Inter, sans-serif', padding: 'clamp(16px, 4vw, 24px)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background orbs */}
        <div style={{
          position: 'absolute', top: -200, right: -200,
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,95,82,0.07) 0%, transparent 70%)',
          animation: 'glow 5s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -150, left: -150,
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,197,94,0.05) 0%, transparent 70%)',
          animation: 'glow 6s ease-in-out infinite 2s',
          pointerEvents: 'none',
        }} />

        <div className="form-card" style={{ width: '100%', maxWidth: 440 }}>
          {/* Brand */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: 'linear-gradient(135deg, #ff5f52, #ff8a80)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 700, color: '#fff',
              margin: '0 auto 16px', boxShadow: '0 8px 32px rgba(255,95,82,0.3)',
            }}>F</div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
              Join Praxis
            </h1>
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>
              Create your account and start practicing smarter
            </p>
          </div>

          {/* Card */}
          <div style={{
            background: '#191919',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16, padding: '28px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          }}>
            <form onSubmit={handleSubmit}>
              {/* Name */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 7, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Full Name
                </label>
                <input
                  id="register-name"
                  type="text"
                  className="input-field"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>

              {/* Email */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 7, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Email Address
                </label>
                <input
                  id="register-email"
                  type="email"
                  className="input-field"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: 6 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 7, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    className="input-field"
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    className="toggle-pw"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Password strength indicator */}
              {password.length > 0 && (
                <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', height: 3, borderRadius: 2 }}>
                    <div
                      className="strength-bar"
                      style={{
                        width: `${(strength.level / 3) * 100}%`,
                        background: strength.color,
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 11, color: strength.color, fontWeight: 600, minWidth: 36 }}>
                    {strength.label}
                  </span>
                </div>
              )}

              {/* Confirm Password */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 7, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Confirm Password
                </label>
                <input
                  id="register-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  style={{
                    borderColor: confirmPassword.length > 0
                      ? password === confirmPassword ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'
                      : undefined,
                  }}
                />
                {confirmPassword.length > 0 && (
                  <p style={{ fontSize: 11, marginTop: 5, color: password === confirmPassword ? '#22c55e' : '#ef4444' }}>
                    {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </p>
                )}
              </div>

              {error && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 14 }}>⚠️</span>
                  <p style={{ fontSize: 13, color: '#ef4444' }}>{error}</p>
                </div>
              )}

              <button
                id="register-submit"
                type="submit"
                className="submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <span style={{
                      width: 16, height: 16, borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                      animation: 'spin 0.7s linear infinite', display: 'inline-block',
                    }} />
                    Creating account…
                  </span>
                ) : 'Create Account'}
              </button>
            </form>

            <div style={{
              marginTop: 20, paddingTop: 20,
              borderTop: '1px solid rgba(255,255,255,0.06)',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: 13, color: '#6b7280' }}>
                Already have an account?{' '}
                <Link href="/login" style={{ color: '#ff5f52', textDecoration: 'none', fontWeight: 600 }}>
                  Sign in →
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
