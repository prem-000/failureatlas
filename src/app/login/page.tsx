'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error?.message || 'Login failed');
        return;
      }

      // Store the real user data from the response
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
          width: 100%; padding: 11px 14px; border-radius: 10px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: #e5e7eb; font-size: 14px; font-family: 'Inter', sans-serif;
          outline: none; transition: border-color 0.2s ease, background 0.2s ease;
        }
        .input-field:focus { border-color: #ff5f52; background: rgba(255,95,82,0.04); }
        .input-field::placeholder { color: #4b5563; }
        .submit-btn {
          width: 100%; padding: 12px; border-radius: 10px; border: none; cursor: pointer;
          background: linear-gradient(135deg, #ff5f52, #ff8a80);
          color: #fff; font-size: 14px; font-weight: 600; font-family: 'Inter', sans-serif;
          transition: opacity 0.2s ease, transform 0.15s ease;
          position: relative; overflow: hidden;
        }
        .submit-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .submit-btn:active { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .toggle-pw { background: none; border: none; cursor: pointer; color: #6b7280;
          font-size: 16px; padding: 4px; transition: color 0.15s ease; }
        .toggle-pw:hover { color: #e5e7eb; }
      `}</style>

      <div style={{
        minHeight: '100vh', background: '#131313',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Inter, sans-serif', padding: '24px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background glow orbs */}
        <div style={{
          position: 'absolute', top: -200, left: -200,
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,95,82,0.08) 0%, transparent 70%)',
          animation: 'glow 4s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -200, right: -200,
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(167,139,250,0.06) 0%, transparent 70%)',
          animation: 'glow 5s ease-in-out infinite 1s',
          pointerEvents: 'none',
        }} />

        <div className="form-card" style={{ width: '100%', maxWidth: 420 }}>
          {/* Brand */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: 'linear-gradient(135deg, #ff5f52, #ff8a80)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 700, color: '#fff',
              margin: '0 auto 16px', boxShadow: '0 8px 32px rgba(255,95,82,0.3)',
            }}>F</div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
              Welcome back
            </h1>
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>
              Sign in to your FailureAtlas account
            </p>
          </div>

          {/* Card */}
          <div style={{
            background: '#191919',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16, padding: '28px 28px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          }}>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 8, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Email Address
                </label>
                <input
                  id="login-email"
                  type="email"
                  className="input-field"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 8, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    className="input-field"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    className="toggle-pw"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
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
                id="login-submit"
                type="submit"
                className="submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <span style={{
                      width: 16, height: 16, borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      animation: 'spin 0.7s linear infinite',
                      display: 'inline-block',
                    }} />
                    Signing in…
                  </span>
                ) : 'Sign In'}
              </button>
            </form>

            <div style={{
              marginTop: 20, paddingTop: 20,
              borderTop: '1px solid rgba(255,255,255,0.06)',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: 13, color: '#6b7280' }}>
                Don&apos;t have an account?{' '}
                <Link href="/register" style={{ color: '#ff5f52', textDecoration: 'none', fontWeight: 600 }}>
                  Create one →
                </Link>
              </p>
            </div>
          </div>

          {/* Demo hint */}
          <div style={{
            marginTop: 16, padding: '10px 16px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10, textAlign: 'center',
          }}>
            <p style={{ fontSize: 11, color: '#4b5563' }}>
              Demo: <span style={{ color: '#6b7280', fontFamily: 'monospace' }}>test@example.com</span>
              {' / '}
              <span style={{ color: '#6b7280', fontFamily: 'monospace' }}>password123</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
