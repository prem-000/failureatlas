'use client';
import { AppShell } from '@/components/layout/AppShell';
import { signIn } from 'next-auth/react';
import { useUpdateProfile, useUserProfile, useUserPreferences, useUpdateUserPreferences, type ProfileData } from '@/hooks/usePhase3Queries';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { ExtensionDocs } from './components/ExtensionDocs';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatTile } from './components/StatTile';
import { MiniBar } from './components/MiniBar';
import { ActivityHeatmap } from './components/ActivityHeatmap';
import { ApiKeyField } from './components/ApiKeyField';

type UserProfile = ProfileData['user'];
type Stats = ProfileData['stats'];

const LANGUAGE_COLORS: Record<string, string> = {
  python: '#3b82f6', python3: '#3b82f6',
  cpp: '#f97316', 'c++': '#f97316',
  java: '#f59e0b',
  javascript: '#eab308', typescript: '#60a5fa',
  go: '#06b6d4', rust: '#ef4444', kotlin: '#a855f7',
};
const DIFFICULTY_COLORS: Record<string, string> = { Easy: '#22c55e', Medium: '#f59e0b', Hard: '#ef4444' };


// ─── Profile Editor ────────────────────────────────────────────────────────────
function ProfileEditor({ user }: { user: UserProfile }) {
  const queryClient  = useQueryClient();
  const updateProfile = useUpdateProfile();
  const [name, setName]         = useState(user.name || '');
  const [username, setUsername] = useState(user.username || '');
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const save = async () => {
    setError(null);
    try {
      await updateProfile.mutateAsync({ name, username });
      await queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      
      {/* Profile Photo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
        {user.image ? (
          <img src={user.image} alt="Profile" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ff5f52', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: '#fff' }}>
            {(user.name || user.email || '?')[0].toUpperCase()}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f4f4f5' }}>Profile Photo</div>
          <div style={{ fontSize: 11, color: '#71717a' }}>Managed by your authentication provider</div>
        </div>
      </div>

      <div className="settings-grid">
        <div>
          <label style={{ fontSize: 11, color: '#71717a', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
            Display Name
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={user.provider === 'google'}
            placeholder="Your name"
            style={{ width: '100%', background: user.provider === 'google' ? '#0a0a0a' : '#111111', border: '1px solid #2a2a2a', borderRadius: 8, padding: '10px 14px', color: user.provider === 'google' ? '#52525b' : '#f4f4f5', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, color: '#71717a', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
            Authentication Provider
          </label>
          <div style={{ width: '100%', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 8, padding: '10px 14px', color: '#52525b', fontSize: 13, boxSizing: 'border-box', textTransform: 'capitalize' }}>
            {user.provider || 'Email/Password'}
          </div>
        </div>
      </div>

      <div>
        <label style={{ fontSize: 11, color: '#71717a', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
          Email
        </label>
        <input
          value={user.email}
          disabled
          style={{ width: '100%', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 8, padding: '10px 14px', color: '#52525b', fontSize: 13, boxSizing: 'border-box' }}
        />
      </div>
      {error && (
        <div style={{ fontSize: 12, color: '#ef4444', background: '#450a0a', border: '1px solid #991b1b', borderRadius: 6, padding: '8px 12px' }}>
          {error}
        </div>
      )}
      <button
        onClick={save}
        disabled={updateProfile.isPending}
        style={{
          background: saved ? '#052e16' : '#ff5f52',
          border: 'none', borderRadius: 9, padding: '11px 20px',
          color: '#fff', fontSize: 13, fontWeight: 600,
          cursor: updateProfile.isPending ? 'wait' : 'pointer',
          transition: 'background 0.2s', alignSelf: 'flex-start',
        }}
      >
        {updateProfile.isPending ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
      </button>
    </div>
  );
}

// ─── Email Notifications Card (read-only) ──────────────────────────────────────
const EMAIL_NOTIFICATION_TYPES = [
  { label: 'Welcome Email',          detail: null },
  { label: 'Daily Mission',          detail: null },
  { label: 'SM-2 Practice Reminder', detail: null },
  {
    label:  'Daily Failure Summary',
    detail: 'Only when you have failed submissions',
  },
  {
    label:  'Engagement Reminder',
    detail: "Only when you don't practice for a day",
  },
  { label: 'Weekly Progress Report', detail: null },
] as const;

function EmailNotificationsCard({ user }: { user: UserProfile }) {
  const isGoogle = user.provider === 'google';

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* ── Account identity row ─────────────────────────────────────────── */}
      <div style={{
        background: isGoogle
          ? 'linear-gradient(135deg, rgba(66,133,244,0.06) 0%, rgba(66,133,244,0.02) 100%)'
          : '#141414',
        border: `1px solid ${isGoogle ? 'rgba(66,133,244,0.2)' : '#1f1f1f'}`,
        borderRadius: 12,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}>
        {/* envelope icon */}
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: isGoogle ? 'rgba(66,133,244,0.12)' : '#1a1a1a',
          border: `1px solid ${isGoogle ? 'rgba(66,133,244,0.25)' : '#2a2a2a'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>
          📧
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, color: '#52525b',
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            Connected Google Account
          </span>
          <span style={{
            fontSize: 14, fontWeight: 700,
            color: isGoogle ? '#e5e7eb' : '#52525b',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {user.email}
          </span>
        </div>

        {/* Status badge */}
        {isGoogle ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(66,133,244,0.1)',
            border: '1px solid rgba(66,133,244,0.25)',
            borderRadius: 20, padding: '5px 12px', flexShrink: 0,
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#4285f4',
              boxShadow: '0 0 6px rgba(66,133,244,0.8)',
            }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#4285f4' }}>
              Google Connected
            </span>
          </div>
        ) : (
          <span style={{
            fontSize: 11, fontWeight: 600, color: '#52525b',
            background: '#1a1a1a', border: '1px solid #2a2a2a',
            borderRadius: 20, padding: '5px 12px', flexShrink: 0,
          }}>
            Not Connected
          </span>
        )}
      </div>

      {isGoogle ? (
        <>
          {/* ── Description ──────────────────────────────────────────────── */}
          <div style={{
            background: '#141414',
            border: '1px solid #1f1f1f',
            borderRadius: 10,
            padding: '14px 18px',
          }}>
            <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: '#e5e7eb' }}>
              Automatic email delivery — no setup required
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#71717a', lineHeight: 1.65 }}>
              Praxis automatically sends personalized learning emails to your connected Google
              account. You don&apos;t need to enable anything manually.
            </p>
          </div>

          {/* ── Notification checklist ────────────────────────────────────── */}
          <div>
            <p style={{
              margin: '0 0 10px',
              fontSize: 11, fontWeight: 600, color: '#52525b',
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              You&apos;ll automatically receive
            </p>

            <div style={{
              border: '1px solid #1f1f1f',
              borderRadius: 12,
              overflow: 'hidden',
            }}>
              {EMAIL_NOTIFICATION_TYPES.map((item, idx) => (
                <div
                  key={item.label}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                    padding: '14px 20px',
                    background: idx % 2 === 0 ? '#111111' : '#141414',
                    borderBottom:
                      idx < EMAIL_NOTIFICATION_TYPES.length - 1
                        ? '1px solid #1a1a1a'
                        : 'none',
                  }}
                >
                  {/* Check circle */}
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                    background: 'rgba(34,197,94,0.1)',
                    border: '1px solid rgba(34,197,94,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 800, lineHeight: 1 }}>✓</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb' }}>
                      {item.label}
                    </span>
                    {item.detail && (
                      <span style={{ fontSize: 11, color: '#52525b' }}>
                        {item.detail}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Footer ────────────────────────────────────────────────────── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px',
            background: '#0d0d0d',
            border: '1px solid #1a1a1a',
            borderRadius: 8,
          }}>
            <span style={{ fontSize: 13, flexShrink: 0 }}>🔒</span>
            <span style={{ fontSize: 12, color: '#3f3f46' }}>
              Emails are securely delivered using Google&apos;s infrastructure.
            </span>
          </div>
        </>
      ) : (
        /* ── Non-Google upgrade prompt ─────────────────────────────────── */
        <div style={{
          background: '#141414',
          border: '1px solid #1f1f1f',
          borderRadius: 12,
          padding: '28px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          textAlign: 'center',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'rgba(168,85,247,0.1)',
            border: '1px solid rgba(168,85,247,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
          }}>
            ✉️
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 400 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#e5e7eb' }}>
              Email notifications are currently unavailable
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#71717a', lineHeight: 1.65 }}>
              Personalized Praxis learning emails are available exclusively for
              Google-connected accounts. To receive them, sign in or connect using
              your Google account.
            </p>
          </div>

          <button
            onClick={() => signIn('google', { callbackUrl: '/auth/sync' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#4285f4',
              border: 'none',
              borderRadius: 9,
              padding: '10px 22px',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(66,133,244,0.3)',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            {/* Minimal Google G */}
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#fff" fillOpacity=".9"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#fff" fillOpacity=".8"/>
              <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#fff" fillOpacity=".7"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#fff" fillOpacity=".9"/>
            </svg>
            Connect Google Account
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Connected Accounts Editor ──────────────────────────────────────────────────
function ConnectedAccountsEditor() {
  const queryClient = useQueryClient();
  const { data: preferences, isLoading: loading, error: fetchError } = useUserPreferences();
  const updatePreferences = useUpdateUserPreferences();

  const [leetcodeUsername, setLeetcodeUsername] = useState('');
  const [codeforcesUsername, setCodeforcesUsername] = useState('');
  const [codechefUsername, setCodechefUsername] = useState('');
  const [atcoderUsername, setAtcoderUsername] = useState('');

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state with query data when loaded
  useEffect(() => {
    if (preferences) {
      setLeetcodeUsername(preferences.leetcodeUsername || '');
      setCodeforcesUsername(preferences.codeforcesUsername || '');
      setCodechefUsername(preferences.codechefUsername || '');
      setAtcoderUsername(preferences.atcoderUsername || '');
    }
  }, [preferences]);

  const save = async () => {
    setError(null);
    try {
      await updatePreferences.mutateAsync({
        leetcodeUsername: leetcodeUsername.trim() || null,
        codeforcesUsername: codeforcesUsername.trim() || null,
        codechefUsername: codechefUsername.trim() || null,
        atcoderUsername: atcoderUsername.trim() || null,
      });
      await queryClient.invalidateQueries({ queryKey: ['user', 'preferences'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e.message || 'Failed to update connected accounts');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 20, color: '#71717a', fontSize: 13 }}>
        Loading connected accounts...
      </div>
    );
  }

  if (fetchError) {
    return (
      <div style={{ padding: 20, color: '#ef4444', fontSize: 13 }}>
        Error loading connected accounts: {(fetchError as Error).message}
      </div>
    );
  }

  const platforms = [
    { key: 'leetcode', label: 'LeetCode', color: '#ffa116', value: leetcodeUsername, setter: setLeetcodeUsername, placeholder: 'LeetCode Username' },
    { key: 'codeforces', label: 'Codeforces', color: '#1f85de', value: codeforcesUsername, setter: setCodeforcesUsername, placeholder: 'Codeforces Username' },
    { key: 'codechef', label: 'CodeChef', color: '#5b4638', value: codechefUsername, setter: setCodechefUsername, placeholder: 'CodeChef Username' },
    { key: 'atcoder', label: 'AtCoder', color: '#ffffff', value: atcoderUsername, setter: setAtcoderUsername, placeholder: 'AtCoder Username' },
  ];

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ fontSize: 13, color: '#a1a1aa', lineHeight: 1.6 }}>
        Connect your competitive programming accounts. Once connected, your solved problems and submission events from these platforms will automatically enter the Praxis pipeline. Note that these are profile metadata only and do not perform synchronization.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="settings-grid">
        {platforms.map(platform => (
          <div key={platform.key} style={{ background: '#141414', border: '1px solid #1f1f1f', borderRadius: 12, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: platform.color }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e5e7eb' }}>{platform.label}</div>
              {platform.value && (
                <span style={{ fontSize: 10, color: '#22c55e', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 4, padding: '1px 6px', marginLeft: 'auto' }}>
                  Connected
                </span>
              )}
            </div>
            <input
              value={platform.value}
              onChange={e => platform.setter(e.target.value)}
              placeholder={platform.placeholder}
              style={{ width: '100%', background: '#111111', border: '1px solid #2a2a2a', borderRadius: 8, padding: '10px 14px', color: '#f4f4f5', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        ))}
      </div>

      {error && (
        <div style={{ fontSize: 12, color: '#ef4444', background: '#450a0a', border: '1px solid #991b1b', borderRadius: 6, padding: '8px 12px' }}>
          {error}
        </div>
      )}

      <button
        onClick={save}
        disabled={updatePreferences.isPending}
        style={{
          background: saved ? '#052e16' : '#ffa116',
          border: 'none', borderRadius: 9, padding: '11px 20px',
          color: '#fff', fontSize: 13, fontWeight: 600,
          cursor: updatePreferences.isPending ? 'wait' : 'pointer',
          transition: 'background 0.2s', alignSelf: 'flex-start',
          boxShadow: saved ? 'none' : '0 4px 10px rgba(255, 161, 22, 0.2)'
        }}
      >
        {updatePreferences.isPending ? 'Saving…' : saved ? '✓ Saved' : 'Save Connections'}
      </button>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading: loading, error: queryError } = useUserProfile();
  const user  = data?.user  ?? null;
  const stats = data?.stats ?? null;
  const error = queryError ? (queryError as Error).message : null;
  const [activeTab, setActiveTab]           = useState<'profile' | 'stats' | 'missions' | 'accounts' | 'api' | 'extension'>('profile');
  const [regenError,   setRegenError]       = useState<string | null>(null);
  const [regenSuccess, setRegenSuccess]     = useState(false);

  // ── Regenerate API key ──────────────────────────────────────────────────────
  const handleRegenerate = async () => {
    setRegenError(null);
    setRegenSuccess(false);
    try {
      const res = await fetch('/api/auth/regenerate-key', { method: 'POST' });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setRegenError(body?.error?.message || 'Failed to regenerate key');
        return;
      }
      // Refresh profile so the new key appears
      await queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
      setRegenSuccess(true);
      setTimeout(() => setRegenSuccess(false), 3000);
    } catch (e: unknown) {
      setRegenError(e instanceof Error ? e.message : 'Network error');
    }
  };

  if (loading) return (
    <AppShell>
      <div style={{ display: 'flex', height: '100vh', background: '#131313', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 36, height: 36, border: '3px solid #2a2a2a', borderTopColor: '#ff5f52', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ color: '#52525b', fontSize: 14 }}>Loading profile…</span>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </AppShell>
  );

  if (error || !user || !stats) return (
    <AppShell>
      <div style={{ display: 'flex', height: '100vh', background: '#131313', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <span style={{ color: '#ef4444', fontSize: 14 }}>{error || 'Failed to load profile'}</span>
      </div>
    </AppShell>
  );

  const TABS = [
    { key: 'profile', label: 'Profile' },
    { key: 'stats',   label: 'Statistics' },
    { key: 'missions', label: 'Email Notifications' },
    { key: 'accounts', label: 'Connected Accounts' },
    { key: 'api',     label: 'API Access' },
    { key: 'extension', label: 'Extension Setup' },
  ] as const;

  const maxLang = Math.max(...(stats?.languageDistribution.map(l => l.count) ?? [1]), 1);
  const maxDiff = Math.max(...(stats?.difficultyDistribution.map(d => d.count) ?? [1]), 1);

  return (
    <AppShell>
      <style>{`
        .settings-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 640px) {
          .settings-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      <div style={{ width: '100%', minHeight: '100vh', background: '#131313' }}>

        {/* Header */}
        <div style={{ padding: 'clamp(14px, 3vw, 20px) clamp(16px, 4vw, 32px)', borderBottom: '1px solid #1f1f1f', background: '#161616' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5f52', boxShadow: '0 0 8px #ff5f52' }} />
            <span style={{ fontSize: '17px', fontWeight: 700, color: '#f4f4f5', letterSpacing: '-0.02em' }}>Settings</span>
          </div>

          {/* User Avatar Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            {user.image ? (
              <img 
                src={user.image} 
                alt={user.name || 'User avatar'} 
                style={{ width: 52, height: 52, borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }} 
              />
            ) : (
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'linear-gradient(135deg, #ff5f52, #a855f7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {(user.name || user.email || '?')[0].toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#f4f4f5' }}>{user.name || 'Anonymous'}</div>
              <div style={{ fontSize: 12, color: '#52525b' }}>{user.email}</div>
              <div style={{ fontSize: 11, color: '#3f3f46', marginTop: 2 }}>
                Member since {new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flexShrink: 0,
                  background: activeTab === tab.key ? '#ff5f52' : 'transparent',
                  border: `1px solid ${activeTab === tab.key ? '#ff5f52' : '#2a2a2a'}`,
                  borderRadius: 8, padding: '7px 18px', fontSize: 13, fontWeight: 600,
                  color: activeTab === tab.key ? '#fff' : '#71717a', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: 'clamp(16px, 3vw, 28px) clamp(16px, 4vw, 32px)', maxWidth: activeTab === 'extension' ? 1200 : 900, margin: '0 auto' }}>

          {/* ── Profile Tab ── */}
          {activeTab === 'profile' && (
            <SectionCard title="Profile Information" accent="#ff5f52">
              <ProfileEditor user={user} />
            </SectionCard>
          )}

          {/* ── Email Notifications Tab (read-only) ── */}
          {activeTab === 'missions' && (
            <SectionCard title="Email Notifications" accent="#4285f4">
              <EmailNotificationsCard user={user} />
            </SectionCard>
          )}

          {/* ── Connected Accounts Tab ── */}
          {activeTab === 'accounts' && (
            <SectionCard title="Connected Accounts" accent="#ffa116">
              <ConnectedAccountsEditor />
            </SectionCard>
          )}

          {/* ── Stats Tab ── */}
          {activeTab === 'stats' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                <StatTile label="Total Submissions" value={stats.totalSubmissions} />
                <StatTile label="Accepted" value={stats.acceptedSubmissions} sub={`${stats.acceptanceRate}% acceptance rate`} />
                <StatTile label="Problems Attempted" value={stats.uniqueProblems} />
              </div>

              <SectionCard title="30-Day Activity" accent="#3b82f6">
                <ActivityHeatmap data={stats.activityTimeline} />
              </SectionCard>

              {stats.languageDistribution.length > 0 && (
                <SectionCard title="Language Distribution" accent="#f59e0b">
                  <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {stats.languageDistribution.map(l => {
                      const color = LANGUAGE_COLORS[l.language.toLowerCase()] || '#71717a';
                      return (
                        <div key={l.language} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 12, color: '#a1a1aa', minWidth: 90, fontWeight: 500 }}>{l.language}</span>
                          <MiniBar value={l.count} max={maxLang} color={color} />
                          <span style={{ fontSize: 12, color: '#52525b', minWidth: 30, textAlign: 'right' }}>{l.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </SectionCard>
              )}

              {stats.difficultyDistribution.length > 0 && (
                <SectionCard title="Difficulty Distribution" accent="#22c55e">
                  <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {stats.difficultyDistribution.map(d => (
                      <div key={d.difficulty} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 12, color: DIFFICULTY_COLORS[d.difficulty] || '#71717a', minWidth: 70, fontWeight: 600 }}>{d.difficulty}</span>
                        <MiniBar value={d.count} max={maxDiff} color={DIFFICULTY_COLORS[d.difficulty] || '#71717a'} />
                        <span style={{ fontSize: 12, color: '#52525b', minWidth: 30, textAlign: 'right' }}>{d.count}</span>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {stats.topWeaknesses.length > 0 && (
                <SectionCard title="Top Systemic Weaknesses" accent="#a855f7">
                  <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {stats.topWeaknesses.map((w, i) => (
                      <div key={w.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 11, color: '#52525b', minWidth: 18, fontWeight: 700 }}>#{i + 1}</span>
                        <span style={{ fontSize: 12, color: '#d8b4fe', flex: 1 }}>
                          {w.name.split('-').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}
                        </span>
                        <span style={{ fontSize: 11, color: '#52525b' }}>{w.frequency}×</span>
                        <span style={{ fontSize: 10, color: '#71717a', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 4, padding: '2px 7px' }}>
                          PR: {w.pageRankScore.toFixed(3)}
                        </span>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}
            </div>
          )}

          {/* ── API Tab ── */}
          {activeTab === 'api' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              <SectionCard title="Extension API Key" accent="#f59e0b">
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ fontSize: 13, color: '#a1a1aa', lineHeight: 1.6 }}>
                    Use this key to authenticate the Praxis Chrome Extension with your account.
                    Keep it secret — it has full access to submit data on your behalf.
                  </div>

                  <ApiKeyField apiKey={user.apiKey} onRegenerate={handleRegenerate} />

                  {/* Regen feedback */}
                  {regenError && (
                    <div style={{ fontSize: 12, color: '#ef4444', background: '#450a0a', border: '1px solid #991b1b', borderRadius: 6, padding: '8px 12px' }}>
                      {regenError}
                    </div>
                  )}
                  {regenSuccess && (
                    <div style={{ fontSize: 12, color: '#22c55e', background: '#052e16', border: '1px solid #166534', borderRadius: 6, padding: '8px 12px' }}>
                      ✓ New API key generated — update your Chrome Extension with the new key.
                    </div>
                  )}
                </div>
              </SectionCard>

              <SectionCard title="Extension Status" accent="#22c55e">
                <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 12, height: 12, borderRadius: '50%',
                      background: stats.lastSubmissionAt ? '#22c55e' : '#71717a',
                      boxShadow: stats.lastSubmissionAt ? '0 0 10px #22c55e' : 'none'
                    }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#e5e7eb' }}>
                        {stats.lastSubmissionAt ? 'Connected' : 'Not Connected'}
                      </div>
                      <div style={{ fontSize: 12, color: '#a1a1aa' }}>
                        {stats.lastSubmissionAt 
                          ? `Last Submission: ${new Date(stats.lastSubmissionAt).toLocaleString()}` 
                          : 'No submissions yet'}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#52525b' }}>
                    Status is determined by recent submissions
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="API Reference" accent="#52525b">
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { method: 'POST', path: '/api/submissions',        desc: 'Submit a new problem attempt for analysis' },
                    { method: 'GET',  path: '/api/submissions',        desc: 'List all your submissions with pagination' },
                    { method: 'GET',  path: '/api/submissions/:id',    desc: 'Fetch full detail for one submission' },
                    { method: 'GET',  path: '/api/graph/subgraph',     desc: 'Get your learning knowledge graph' },
                    { method: 'GET',  path: '/api/graph/weaknesses',   desc: 'Get ranked systemic weaknesses' },
                    { method: 'POST', path: '/api/diagnosis/generate', desc: 'Generate AI diagnosis for a submission' },
                    { method: 'GET',  path: '/api/user/profile',       desc: 'Fetch your profile and aggregated stats' },
                    { method: 'POST', path: '/api/auth/verify-key',    desc: 'Verify an Extension API Key (used by the extension)' },
                    { method: 'POST', path: '/api/auth/regenerate-key',desc: 'Issue a new API key (invalidates the old one)' },
                  ].map(ep => (
                    <div key={`${ep.method}-${ep.path}`} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1a1a1a' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4, minWidth: 46, textAlign: 'center',
                        color: ep.method === 'POST' ? '#f59e0b' : '#3b82f6',
                        background: ep.method === 'POST' ? '#2d1f00' : '#1e3a5f',
                      }}>
                        {ep.method}
                      </span>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#a1a1aa', minWidth: 240 }}>{ep.path}</span>
                      <span style={{ fontSize: 12, color: '#52525b' }}>{ep.desc}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>

            </div>
          )}

          {/* ── Extension Docs Tab ── */}
          {activeTab === 'extension' && <ExtensionDocs />}
        </div>
      </div>
    </AppShell>
  );
}