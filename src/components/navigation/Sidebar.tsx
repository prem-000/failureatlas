'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ListChecks,
  GitFork,
  Stethoscope,
  Settings,
  LogOut,
} from 'lucide-react';
import { useState } from 'react';

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/problems',  icon: ListChecks,      label: 'Problems'   },
  { href: '/graph',     icon: GitFork,          label: 'Graph'      },
  { href: '/diagnosis', icon: Stethoscope,      label: 'Diagnosis'  },
  { href: '/settings',  icon: Settings,         label: 'Settings'   },
];

interface SidebarProps {
  user?: { name?: string | null; email: string; image?: string | null };
  onSignOut?: () => void;
}

export function Sidebar({ user, onSignOut }: SidebarProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const initial = (user?.name || user?.email || 'U')[0].toUpperCase();

  return (
    <>
      <style>{`
        /* ─── Desktop floating pill rail ─────────────────────── */
        .nav-rail {
          position: fixed;
          left: 16px;
          top: 16px;
          bottom: 16px;
          z-index: 50;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px 0;
          border-radius: 32px;
          background: rgba(15, 15, 18, 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
          transition: width 300ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Hide rail on mobile — show bottom nav instead */
        @media (max-width: 767px) {
          .nav-rail {
            display: none;
          }
        }

        /* ─── Shared nav item styles ─────────────────────────── */
        .nav-rail-item {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 14px;
          transition: all 200ms ease;
          text-decoration: none;
          color: #71717a;
        }
        .nav-rail-item:hover {
          color: #e4e4e7;
          background: rgba(255, 255, 255, 0.05);
        }
        .nav-rail-item.active {
          color: #ff5f52;
          background: rgba(255, 95, 82, 0.1);
          box-shadow: 0 0 12px rgba(255, 95, 82, 0.2);
        }
        .nav-rail-item.active .active-pip {
          display: block;
        }
        .active-pip {
          display: none;
          position: absolute;
          left: 0;
          width: 3px;
          height: 16px;
          border-radius: 0 4px 4px 0;
          background: #ff5f52;
          box-shadow: 0 0 8px #ff5f52;
        }
        .nav-rail-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 14px;
          border: none;
          background: transparent;
          color: #71717a;
          cursor: pointer;
          transition: all 200ms ease;
        }
        .nav-rail-btn:hover {
          color: #e4e4e7;
          background: rgba(255, 255, 255, 0.05);
        }
        .nav-rail-btn.danger:hover {
          color: #f87171;
          background: rgba(239, 68, 68, 0.1);
        }

        /* ─── Mobile bottom tab bar ──────────────────────────── */
        .mobile-tab-bar {
          display: none;
        }

        @media (max-width: 767px) {
          .mobile-tab-bar {
            display: flex;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 100;
            background: rgba(13, 13, 15, 0.92);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-top: 1px solid rgba(255, 255, 255, 0.07);
            height: calc(64px + env(safe-area-inset-bottom, 0px));
            padding: 0 2px;
            padding-bottom: env(safe-area-inset-bottom, 0px);
            align-items: center;
            justify-content: space-around;
            animation: slide-up-nav 0.3s ease;
          }
        }

        .mobile-tab-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          flex: 1;
          height: 100%;
          border-radius: 12px;
          text-decoration: none;
          color: #52525b;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.02em;
          transition: color 150ms ease, background 150ms ease, box-shadow 150ms ease;
          min-height: 44px;
          min-width: 44px;
          border: none;
          background: transparent;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          position: relative;
        }
        .mobile-tab-item.active {
          color: #ff5f52;
        }
        .mobile-tab-item.active::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 28px;
          height: 2px;
          border-radius: 0 0 2px 2px;
          background: #ff5f52;
          box-shadow: 0 0 8px #ff5f52;
        }
        .mobile-tab-item:active {
          background: rgba(255, 255, 255, 0.04);
        }

        .mobile-tab-active-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #ff5f52;
          box-shadow: 0 0 6px #ff5f52;
          margin-top: 2px;
          opacity: 0;
          transition: opacity 200ms ease;
        }
        .mobile-tab-item.active .mobile-tab-active-dot {
          opacity: 1;
        }

        @keyframes slide-up-nav {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      {/* ─── Desktop floating pill rail ─────────────────────────────── */}
      <aside
        className="nav-rail"
        style={{ width: expanded ? 88 : 72 }}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        {/* Brand Logo */}
        <Link
          href="/dashboard"
          title="Praxis"
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #ff5f52 0%, #d32f2f 100%)',
            boxShadow: '0 4px 14px rgba(255,95,82,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 40,
            textDecoration: 'none',
            flexShrink: 0,
            minHeight: 'unset',
            minWidth: 'unset',
          }}
        >
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 18 }}>F</span>
        </Link>

        {/* Main nav items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, width: '100%', alignItems: 'center' }}>
          {NAV_ITEMS.filter(i => i.href !== '/settings').map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={`nav-rail-item${active ? ' active' : ''}`}
                style={{ minHeight: 'unset', minWidth: 'unset' }}
              >
                <span className="active-pip" />
                <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
          <Link
            href="/settings"
            title="Settings"
            className={`nav-rail-item${pathname === '/settings' ? ' active' : ''}`}
            style={{ minHeight: 'unset', minWidth: 'unset' }}
          >
            <span className="active-pip" />
            <Settings size={20} strokeWidth={pathname === '/settings' ? 2.2 : 1.8} />
          </Link>

          <button
            onClick={onSignOut}
            title="Sign Out"
            className="nav-rail-btn danger"
            style={{ minHeight: 'unset', minWidth: 'unset' }}
          >
            <LogOut size={18} strokeWidth={1.8} />
          </button>

          {/* Avatar */}
          <div
            title={user?.email}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: user?.image ? `url(${user.image}) center/cover` : 'linear-gradient(135deg, #27272a 0%, #09090b 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: 12,
              userSelect: 'none',
              flexShrink: 0,
            }}
          >
            {!user?.image && initial}
          </div>
        </div>
      </aside>

      {/* ─── Mobile bottom tab bar ──────────────────────────────────── */}
      <nav className="mobile-tab-bar" aria-label="Main navigation">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`mobile-tab-item${active ? ' active' : ''}`}
              aria-label={label}
            >
              <Icon size={19} strokeWidth={active ? 2.2 : 1.7} />
              <span style={{ fontSize: 10 }}>{label}</span>
              <span className="mobile-tab-active-dot" aria-hidden="true" />
            </Link>
          );
        })}
        <button
          onClick={onSignOut}
          className="mobile-tab-item"
          aria-label="Sign out"
        >
          <LogOut size={19} strokeWidth={1.7} />
          <span style={{ fontSize: 10 }}>Sign out</span>
          <span className="mobile-tab-active-dot" style={{ opacity: 0 }} aria-hidden="true" />
        </button>
      </nav>
    </>
  );
}
