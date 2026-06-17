'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import {
  BookOpen,
  Target,
  TrendingUp,
  BrainCircuit,
} from "lucide-react";

interface UserData {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

interface DashboardStats {
  totalSubmissions: number;
  acceptedSubmissions: number;
  weaknesses: number;
  acceptanceRate: number;
}

interface RecentSubmission {
  id: string;
  problemTitle: string;
  problemSlug: string;
  difficulty: string;
  status: string;
  language: string;
  timestamp: string;
  attemptNumber: number;
}



const DIFFICULTY_COLOR: Record<string, string> = {
  Easy: '#22c55e',
  Medium: '#f59e0b',
  Hard: '#ef4444',
};

const STATUS_COLOR: Record<string, string> = {
  Accepted: '#22c55e',
  'Wrong Answer': '#ef4444',
  'Time Limit Exceeded': '#f59e0b',
  'Runtime Error': '#f97316',
};

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentSubmissions, setRecentSubmissions] = useState<RecentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchStats = useCallback(async (token: string) => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/dashboard/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.data.stats);
        setRecentSubmissions(data.data.recentSubmissions);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
      } catch {
        router.push('/login');
        return;
      }
    } else {
      router.push('/login');
      return;
    }

    setLoading(false);
    fetchStats(token);
  }, [router, fetchStats]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#131313', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: '3px solid #ff5f52', borderTopColor: 'transparent',
            margin: '0 auto 16px',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ color: '#6b7280', fontFamily: 'Inter, sans-serif' }}>Loading...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Submissions',
      value: stats?.totalSubmissions ?? 0,
      icon: <BookOpen className="h-8 w-8" />,
      color: '#60a5fa',
      iconClass: 'bg-blue-500/10 text-blue-400',
    },
    {
      label: 'Accepted',
      value: stats?.acceptedSubmissions ?? 0,
      icon: <Target className="h-8 w-8" />,
      color: '#4ade80',
      iconClass: 'bg-green-500/10 text-green-400',
    },
    {
      label: 'Acceptance Rate',
      value: `${stats?.acceptanceRate ?? 0}%`,
      icon: <TrendingUp className="h-8 w-8" />,
      color: '#c084fc',
      iconClass: 'bg-purple-500/10 text-purple-400',
    },
    {
      label: 'Growth Areas',
      value: stats?.weaknesses ?? 0,
      icon: <BrainCircuit className="h-8 w-8" />,
      color: '#fbbf24',
      iconClass: 'bg-amber-500/10 text-amber-400',
    },
  ];

  return (
    <AppShell fullscreen>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes countUp { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        .stat-card { transition: transform 0.2s ease, box-shadow 0.2s ease; animation: fadeIn 0.4s ease forwards; }
        .stat-card:hover { transform: translateY(-3px); box-shadow: 0 8px 32px rgba(0,0,0,0.4) !important; }
        .nav-link { transition: background 0.15s ease, color 0.15s ease; cursor: pointer; }
        .nav-link:hover { background: rgba(255,255,255,0.06) !important; }
        .submission-row { transition: background 0.15s ease; }
        .submission-row:hover { background: rgba(255,255,255,0.04) !important; }
        .logout-btn { transition: background 0.15s ease, color 0.15s ease; cursor: pointer; border: none; }
        .logout-btn:hover { background: rgba(239,68,68,0.2) !important; color: #ef4444 !important; }
        .avatar-pulse { animation: fadeIn 0.5s ease forwards; }
        ::-webkit-scrollbar { width: 4px; } 
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 4px; }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, color: '#e5e7eb' }}>

          {/* Top Header */}
          <header style={{
          padding: 'clamp(12px, 3vw, 20px) clamp(16px, 4vw, 32px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(25,25,25,0.8)',
            backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            position: 'sticky', top: 0, zIndex: 40,
          }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
                Dashboard
              </h1>
              {user && (
                <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                  Welcome back, <span style={{ color: '#ff5f52', fontWeight: 600 }}>{user.name || user.email}</span>
                </p>
              )}
            </div>

            {/* User Badge in Header */}
            {user && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, padding: '6px 12px',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ff5f52, #ff8a80)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: '#fff',
                }}>
                  {getInitials(user.name || user.email)}
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#e5e7eb' }}>
                    {user.name || 'User'}
                  </p>
                  <p style={{ fontSize: 10, color: '#6b7280' }}>{user.email}</p>
                </div>
              </div>
            )}
          </header>

          <div style={{ padding: 'clamp(16px, 3vw, 32px)', flex: 1 }}>

            {/* ── STAT CARDS ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 12, marginBottom: 24,
            }}>
              {statCards.map((card, i) => (
                <div
                  key={card.label}
                  className="stat-card group"
                  style={{
                    background: '#191919',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 14, padding: '20px 24px',
                    animationDelay: `${i * 0.08}s`,
                    opacity: 0,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, marginBottom: 8 }}>
                        {card.label}
                      </p>
                      {statsLoading ? (
                        <div style={{
                          height: 32, width: 60, borderRadius: 6,
                          background: 'rgba(255,255,255,0.06)',
                          animation: 'spin 1.5s linear infinite',
                        }} />
                      ) : (
                        <p style={{
                          fontSize: 30, fontWeight: 700, color: card.color,
                          lineHeight: 1, animation: 'countUp 0.4s ease forwards',
                        }}>
                          {card.value}
                        </p>
                      )}
                    </div>
                    <div className={`h-14 w-14 rounded-xl flex items-center justify-center group-hover:scale-110 transition-all duration-300 ${card.iconClass}`}>
                      {card.icon}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── RECENT SUBMISSIONS ── */}
            <div style={{
              background: '#191919',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 14, overflowX: 'auto',
            }}>
              <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: '#e5e7eb' }}>Recent Submissions</h2>
                <Link href="/problems" style={{
                  fontSize: 12, color: '#ff5f52', textDecoration: 'none', fontWeight: 500,
                }}>
                  View all →
                </Link>
              </div>

              {statsLoading ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    border: '2px solid #ff5f52', borderTopColor: 'transparent',
                    margin: '0 auto',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                </div>
              ) : recentSubmissions.length === 0 ? (
                <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                  <p style={{ color: '#6b7280', fontSize: 14 }}>No practice sessions yet.</p>
                  <p style={{ color: '#4b5563', fontSize: 12, marginTop: 4 }}>
                    Install the Chrome extension and start solving problems!
                  </p>
                </div>
              ) : (
                <div className="table-scroll-wrapper">
                <div style={{ minWidth: 560 }}>
                  {/* Table Header */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 100px 100px 100px 80px',
                    padding: '10px 24px',
                    background: 'rgba(255,255,255,0.02)',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    {['Problem', 'Difficulty', 'Status', 'Language', 'Time'].map((h) => (
                      <span key={h} style={{ fontSize: 11, color: '#4b5563', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {h}
                      </span>
                    ))}
                  </div>

                  {recentSubmissions.map((sub, i) => (
                    <div
                      key={sub.id}
                      className="submission-row"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 100px 100px 100px 80px',
                        padding: '14px 24px',
                        borderBottom: i < recentSubmissions.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        alignItems: 'center',
                        animation: `fadeIn 0.3s ease ${i * 0.04}s both`,
                      }}
                    >
                      <span style={{ fontSize: 13, color: '#e5e7eb', fontWeight: 500 }}>
                        {sub.problemTitle}
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        color: DIFFICULTY_COLOR[sub.difficulty] || '#9ca3af',
                        padding: '2px 8px', borderRadius: 4,
                        background: `${DIFFICULTY_COLOR[sub.difficulty] || '#9ca3af'}15`,
                        display: 'inline-block',
                      }}>
                        {sub.difficulty}
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        color: STATUS_COLOR[sub.status] || '#9ca3af',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        <span style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: STATUS_COLOR[sub.status] || '#9ca3af',
                          display: 'inline-block',
                        }} />
                        {sub.status}
                      </span>
                      <span style={{ fontSize: 12, color: '#6b7280', fontFamily: 'monospace' }}>
                        {sub.language}
                      </span>
                      <span style={{ fontSize: 11, color: '#4b5563' }}>
                        {timeAgo(sub.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
                </div>
              )}
            </div>

            {/* ── QUICK ACTIONS ── */}
            <div style={{
              marginTop: 24,
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 12,
            }}>
              {[
                { href: '/graph', label: 'View Failure Graph', icon: '⬡', desc: 'Explore weakness patterns' },
                { href: '/diagnosis', label: 'AI Diagnosis', icon: '◈', desc: 'Get personalized insights' },
                { href: '/settings', label: 'API Settings', icon: '⚙', desc: 'Configure integrations' },
              ].map((action) => (
                <Link key={action.href} href={action.href} style={{ textDecoration: 'none' }}>
                  <div
                    className="stat-card"
                    style={{
                      background: '#191919',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 12, padding: '16px 20px',
                      opacity: 0, animationDelay: '0.3s',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{action.icon}</span>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb', marginTop: 8 }}>{action.label}</p>
                    <p style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{action.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
      </div>
    </AppShell>
  );
}
