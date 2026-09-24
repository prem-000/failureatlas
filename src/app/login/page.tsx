'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Logo } from '@/components/ui/logo';
import { PraxisLoginIllustration } from '@/components/auth/PraxisLoginIllustration';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    signIn('google', { callbackUrl: '/auth/sync' });
  };

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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes glow { 0%,100% { opacity: 0.35; transform: scale(1); } 50% { opacity: 0.65; transform: scale(1.08); } }
        
        .login-page-root {
          min-height: 100vh;
          min-height: 100svh;
          background: #131313;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          padding: clamp(14px, 3vw, 32px);
          position: relative;
          overflow-x: hidden;
          width: 100%;
        }

        .login-layout-wrapper {
          width: 100%;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 24px;
          position: relative;
          z-index: 2;
        }

        /* Large Desktop (>= 1536px) */
        @media (min-width: 1536px) {
          .login-layout-wrapper {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            max-width: 1520px;
            gap: clamp(48px, 5vw, 84px);
            padding: 0 24px;
          }
          .illustration-section {
            flex: 1 1 0%;
            width: 100%;
            max-width: 980px;
            display: flex !important;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            animation: fadeUp 0.6s ease forwards;
          }
          .illustration-card-frame {
            width: 100%;
          }
          .form-section {
            flex: 0 0 420px;
            max-width: 420px;
            width: 100%;
            animation: fadeUp 0.5s ease forwards;
          }
          .mobile-brand-header {
            display: none !important;
          }
        }

        /* Desktop & Laptop (1280px to 1535px) */
        @media (min-width: 1280px) and (max-width: 1535px) {
          .login-layout-wrapper {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            max-width: 1340px;
            gap: clamp(36px, 4vw, 64px);
            padding: 0 20px;
          }
          .illustration-section {
            flex: 1 1 0%;
            width: 100%;
            max-width: 840px;
            display: flex !important;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            animation: fadeUp 0.6s ease forwards;
          }
          .illustration-card-frame {
            width: 100%;
          }
          .form-section {
            flex: 0 0 410px;
            max-width: 410px;
            width: 100%;
            animation: fadeUp 0.5s ease forwards;
          }
          .mobile-brand-header {
            display: none !important;
          }
        }

        /* Laptop & Small Desktop (1024px to 1279px) */
        @media (min-width: 1024px) and (max-width: 1279px) {
          .login-layout-wrapper {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            max-width: 1140px;
            gap: 36px;
            padding: 0 16px;
          }
          .illustration-section {
            flex: 1 1 0%;
            width: 100%;
            max-width: 660px;
            display: flex !important;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            animation: fadeUp 0.6s ease forwards;
          }
          .illustration-card-frame {
            width: 100%;
          }
          .form-section {
            flex: 0 0 390px;
            max-width: 390px;
            width: 100%;
            animation: fadeUp 0.5s ease forwards;
          }
          .mobile-brand-header {
            display: none !important;
          }
        }

        /* Tablet (768px to 1023px) */
        @media (min-width: 768px) and (max-width: 1023px) {
          .login-layout-wrapper {
            max-width: 580px;
            gap: 28px;
          }
          .illustration-section {
            width: 100%;
            max-width: 520px;
            margin: 0 auto;
            animation: fadeUp 0.5s ease forwards;
          }
          .form-section {
            width: 100%;
            max-width: 420px;
            animation: fadeUp 0.6s ease forwards;
          }
          .desktop-illustration-footer {
            display: none !important;
          }
          .desktop-brand-header {
            display: none !important;
          }
        }

        /* Mobile (< 768px) */
        @media (max-width: 767px) {
          .login-layout-wrapper {
            max-width: 430px;
            gap: 20px;
          }
          .illustration-section {
            width: 100%;
            max-width: 380px;
            margin: 0 auto;
            animation: fadeUp 0.5s ease forwards;
          }
          .form-section {
            width: 100%;
            max-width: 100%;
            animation: fadeUp 0.6s ease forwards;
          }
          .desktop-illustration-footer {
            display: none !important;
          }
          .desktop-brand-header {
            display: none !important;
          }
        }

        /* Small Mobile (< 480px) */
        @media (max-width: 479px) {
          .illustration-section {
            max-width: 100%;
          }
        }

        .illustration-card-frame {
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .input-field {
          width: 100%; padding: 13px 14px; border-radius: 10px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: #e5e7eb;
          /* 16px prevents iOS auto-zoom on focus */
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
          position: relative; overflow: hidden; min-height: 48px;
        }
        .submit-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .submit-btn:active { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .toggle-pw { background: none; border: none; cursor: pointer; color: #6b7280;
          font-size: 16px; padding: 4px; transition: color 0.15s ease; }
        .toggle-pw:hover { color: #e5e7eb; }
        .google-btn {
          width: 100%; padding: 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); cursor: pointer;
          background: rgba(255,255,255,0.05); color: #fff; font-size: 15px; font-weight: 600; font-family: 'Inter', sans-serif;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          transition: background 0.2s ease, transform 0.15s ease;
          min-height: 48px;
        }
        .google-btn:hover:not(:disabled) { background: rgba(255,255,255,0.08); transform: translateY(-1px); }
        .google-btn:active { transform: translateY(0); }
        .google-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .divider {
          display: flex; align-items: center; text-align: center; margin: 22px 0; color: #6b7280; font-size: 13px;
        }
        .divider::before, .divider::after {
          content: ''; flex: 1; border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .divider:not(:empty)::before { margin-right: .25em; }
        .divider:not(:empty)::after { margin-left: .25em; }
      `}</style>

      <div className="login-page-root">
        <div className="login-layout-wrapper">
          {/* Mobile-only brand logo at very top */}
          <div className="mobile-brand-header" style={{ textAlign: 'center', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <Logo variant="mark" size={54} className="text-brand" animation="idle" />
            </div>
          </div>

          {/* Left Column (Desktop) / Second Item (Mobile): Praxis Illustration */}
          <div className="illustration-section">
            <div className="illustration-card-frame">
              <PraxisLoginIllustration
                style={{
                  width: '100%',
                }}
              />
            </div>

            {/* Desktop-only subtle brand tagline under illustration */}
            <div className="desktop-illustration-footer" style={{ marginTop: 20, textAlign: 'center', maxWidth: 580 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', letterSpacing: '-0.01em' }}>
                Competitive Programming Failure Intelligence
              </p>
              <p style={{ fontSize: 12, color: '#71717a', marginTop: 4, lineHeight: 1.4 }}>
                Diagnose edge cases, detect test regressions, and master algorithmic problem solving.
              </p>
            </div>
          </div>

          {/* Right Column (Desktop) / Third Item (Mobile): Login Form */}
          <div className="form-section">
            {/* Form Header (Brand on Desktop, Welcome on both) */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div className="desktop-brand-header" style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <Logo variant="mark" size={60} className="text-brand" animation="idle" />
              </div>
              <h1 style={{ fontSize: 'clamp(20px, 4vw, 24px)', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
                Welcome back to Praxis
              </h1>
              <p style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>
                Sign in to continue your learning journey
              </p>
            </div>

            {/* Login Card */}
            <div style={{
              background: '#191919',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
              padding: 'clamp(20px, 4vw, 28px)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
              width: '100%',
            }}>
              <button
                onClick={handleGoogleLogin}
                disabled={googleLoading || loading}
                className="google-btn"
              >
                {googleLoading ? (
                  <span style={{
                    width: 16, height: 16, borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                {googleLoading ? 'Connecting...' : 'Continue with Google'}
              </button>

              <div className="divider">OR</div>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label htmlFor="login-email" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 8, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
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
                  <label htmlFor="login-password" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 8, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
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
      </div>
    </>
  );
}

