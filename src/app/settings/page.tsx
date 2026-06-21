'use client';
import { AppShell } from '@/components/layout/AppShell';
import { useUpdateProfile, useUserProfile, useUserPreferences, useUpdateUserPreferences, type ProfileData } from '@/hooks/usePhase3Queries';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { ExtensionDocs } from './components/ExtensionDocs';

type UserProfile = ProfileData['user'];
type Stats = ProfileData['stats'];

// ─── Sub-components ────────────────────────────────────────────────────────────
function SectionCard({ title, accent = '#ff5f52', children }: { title: string; accent?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#191919', border: '1px solid #1f1f1f', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #1f1f1f', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 3, height: 16, background: accent, borderRadius: 2 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#e4e4e7' }}>{title}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ background: '#141414', border: '1px solid #1f1f1f', borderRadius: 10, padding: '16px 20px' }}>
      <div style={{ fontSize: 10, color: '#52525b', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#ff5f52', letterSpacing: '-0.03em' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#52525b', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div style={{ height: 6, background: '#2a2a2a', borderRadius: 3, overflow: 'hidden', flex: 1 }}>
      <div style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.6s' }} />
    </div>
  );
}

const LANGUAGE_COLORS: Record<string, string> = {
  python: '#3b82f6', python3: '#3b82f6',
  cpp: '#f97316', 'c++': '#f97316',
  java: '#f59e0b',
  javascript: '#eab308', typescript: '#60a5fa',
  go: '#06b6d4', rust: '#ef4444', kotlin: '#a855f7',
};
const DIFFICULTY_COLORS: Record<string, string> = { Easy: '#22c55e', Medium: '#f59e0b', Hard: '#ef4444' };

// ─── Activity Heatmap ──────────────────────────────────────────────────────────
function ActivityHeatmap({ data }: { data: Array<{ date: string; count: number }> }) {
  const max = Math.max(...data.map(d => d.count), 1);
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  const countMap = new Map(data.map(d => [d.date, d.count]));

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {days.map(day => {
          const count = countMap.get(day) || 0;
          const intensity = count > 0 ? Math.max(0.2, count / max) : 0;
          return (
            <div
              key={day}
              title={`${day}: ${count} submission${count !== 1 ? 's' : ''}`}
              style={{
                width: 20, height: 20, borderRadius: 4,
                background: count > 0 ? `rgba(255,95,82,${intensity})` : '#1a1a1a',
                border: '1px solid #1f1f1f',
                cursor: 'default',
                transition: 'background 0.2s',
              }}
            />
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <span style={{ fontSize: 10, color: '#3f3f46' }}>30 days ago</span>
        <span style={{ fontSize: 10, color: '#3f3f46' }}>Today</span>
      </div>
    </div>
  );
}

// ─── API Key Field — with Regenerate button ────────────────────────────────────
function ApiKeyField({ apiKey, onRegenerate }: { apiKey: string | null; onRegenerate: () => void }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied]     = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const copy = async () => {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateClick = () => {
    if (!confirming) {
      // First click: show confirmation state
      setConfirming(true);
      // Auto-cancel after 5 seconds
      setTimeout(() => setConfirming(false), 5000);
      return;
    }
    // Second click: actually regenerate
    setConfirming(false);
    setRegenerating(true);
    onRegenerate();
    setTimeout(() => setRegenerating(false), 2000);
  };

  const masked = apiKey ? `${apiKey.slice(0, 8)}${'•'.repeat(24)}` : 'No API key generated';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Key display row */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{
          flex: 1, background: '#111111', border: '1px solid #2a2a2a', borderRadius: 8,
          padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: '#a1a1aa',
          letterSpacing: '0.05em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {revealed ? apiKey || 'None' : masked}
        </div>
        <button
          onClick={() => setRevealed(r => !r)}
          title={revealed ? 'Hide key' : 'Reveal key'}
          style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 7, padding: '9px 14px', color: '#71717a', cursor: 'pointer', fontSize: 13 }}
        >
          {revealed ? '🙈' : '👁'}
        </button>
        <button
          onClick={copy}
          disabled={!apiKey}
          style={{
            background: copied ? '#052e16' : '#1a1a1a',
            border: `1px solid ${copied ? '#166534' : '#2a2a2a'}`,
            borderRadius: 7, padding: '9px 14px',
            color: copied ? '#22c55e' : '#71717a',
            cursor: 'pointer', fontSize: 12, transition: 'all 0.2s',
          }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      {/* Regenerate button row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={handleRegenerateClick}
          disabled={regenerating}
          style={{
            background: confirming ? '#450a0a' : '#1a1a1a',
            border: `1px solid ${confirming ? '#991b1b' : '#2a2a2a'}`,
            borderRadius: 7, padding: '8px 16px',
            color: confirming ? '#ef4444' : '#71717a',
            cursor: 'pointer', fontSize: 12, fontWeight: 600,
            transition: 'all 0.2s',
          }}
        >
          {regenerating ? '⟳ Regenerating…' : confirming ? '⚠ Click again to confirm' : '↺ Regenerate Key'}
        </button>
        {confirming && (
          <span style={{ fontSize: 11, color: '#ef4444' }}>
            Your current key will stop working immediately.
          </span>
        )}
      </div>
    </div>
  );
}

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

// ─── Daily Coach Preferences ───────────────────────────────────────────────────
function DailyCoachPreferences() {
  const queryClient = useQueryClient();
  const { data: preferences, isLoading: loading, error: fetchError } = useUserPreferences();
  const updatePreferences = useUpdateUserPreferences();

  const [dailyMissionEmail, setDailyMissionEmail] = useState<boolean>(true);
  const [preferredTime, setPreferredTime] = useState<string>('08:00');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state with query data when loaded
  useEffect(() => {
    if (preferences) {
      setDailyMissionEmail(preferences.dailyMissionEmail);
      setPreferredTime(preferences.preferredTime);
    }
  }, [preferences]);

  const save = async () => {
    setError(null);
    try {
      await updatePreferences.mutateAsync({
        dailyMissionEmail,
        preferredTime
      });
      await queryClient.invalidateQueries({ queryKey: ['user', 'preferences'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e.message || 'Failed to update preferences');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 20, color: '#71717a', fontSize: 13 }}>
        Loading coach preferences...
      </div>
    );
  }

  if (fetchError) {
    return (
      <div style={{ padding: 20, color: '#ef4444', fontSize: 13 }}>
        Error loading preferences: {(fetchError as Error).message}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 13, color: '#a1a1aa', lineHeight: 1.6 }}>
        Configure your daily learning coach settings. Praxis automatically computes your roadmap progression and weakness graph to email you personalized missions.
      </div>

      <div style={{ background: '#141414', border: '1px solid #1f1f1f', borderRadius: 8, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#e5e7eb', marginBottom: 4 }}>Enable Daily Mission Emails</div>
          <div style={{ fontSize: 12, color: '#71717a' }}>Receive your personalized problem set, failure predictions, and AI hints every morning.</div>
        </div>
        <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }}>
          <input
            type="checkbox"
            checked={dailyMissionEmail}
            onChange={e => setDailyMissionEmail(e.target.checked)}
            style={{ display: 'none' }}
          />
          <div style={{
            width: 44, height: 24, borderRadius: 12,
            background: dailyMissionEmail ? '#a855f7' : '#27272a',
            position: 'relative', transition: 'background-color 0.2s',
            border: '1px solid #3f3f46'
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: '50%',
              background: '#ffffff', position: 'absolute', top: 2,
              left: dailyMissionEmail ? 22 : 2, transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
            }} />
          </div>
        </label>
      </div>

      <div>
        <label style={{ fontSize: 11, color: '#71717a', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
          Preferred Delivery Time (24h format)
        </label>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            value={preferredTime}
            onChange={e => setPreferredTime(e.target.value)}
            style={{
              background: '#111111', border: '1px solid #2a2a2a', borderRadius: 8,
              padding: '10px 14px', color: '#f4f4f5', fontSize: 13, outline: 'none',
              width: 120, cursor: 'pointer'
            }}
          >
            {Array.from({ length: 24 }).map((_, hour) => {
              const hStr = hour.toString().padStart(2, '0');
              const timeVal = `${hStr}:00`;
              return (
                <option key={timeVal} value={timeVal}>
                  {timeVal} UTC
                </option>
              );
            })}
          </select>
          <span style={{ fontSize: 12, color: '#71717a' }}>Emails will be queued for delivery at this hour daily.</span>
        </div>
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
          background: saved ? '#052e16' : '#a855f7',
          border: 'none', borderRadius: 9, padding: '11px 20px',
          color: '#fff', fontSize: 13, fontWeight: 600,
          cursor: updatePreferences.isPending ? 'wait' : 'pointer',
          transition: 'background 0.2s', alignSelf: 'flex-start',
          boxShadow: saved ? 'none' : '0 4px 10px rgba(168, 85, 247, 0.2)'
        }}
      >
        {updatePreferences.isPending ? 'Saving…' : saved ? '✓ Saved' : 'Save Preferences'}
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
  const [activeTab, setActiveTab]           = useState<'profile' | 'stats' | 'missions' | 'api' | 'extension'>('profile');
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
    { key: 'missions', label: 'Daily Coach' },
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

          {/* ── Daily Coach Tab ── */}
          {activeTab === 'missions' && (
            <SectionCard title="Daily Coach Preferences" accent="#a855f7">
              <DailyCoachPreferences />
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