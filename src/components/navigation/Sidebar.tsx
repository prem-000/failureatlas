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
  { href: '/graph',     icon: GitFork,          label: 'Graph Explorer' },
  { href: '/diagnosis', icon: Stethoscope,      label: 'AI Diagnosis'   },
];

interface SidebarProps {
  user?: { name?: string | null; email: string };
  onSignOut?: () => void;
}

export function Sidebar({ user, onSignOut }: SidebarProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const initial = (user?.name || user?.email || 'U')[0].toUpperCase();

  return (
    <>
      {/* Global styles for the rail */}
      <style>{`
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
      `}</style>

      <aside
        className="nav-rail"
        style={{ width: expanded ? 88 : 72 }}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        {/* Brand Logo */}
        <Link
          href="/dashboard"
          title="FailureAtlas"
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
          }}
        >
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 18 }}>F</span>
        </Link>

        {/* Main nav items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, width: '100%', alignItems: 'center' }}>
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={`nav-rail-item${active ? ' active' : ''}`}
              >
                <span className="active-pip" />
                <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
          {/* Settings */}
          <Link
            href="/settings"
            title="Settings"
            className={`nav-rail-item${pathname === '/settings' ? ' active' : ''}`}
          >
            <span className="active-pip" />
            <Settings size={20} strokeWidth={pathname === '/settings' ? 2.2 : 1.8} />
          </Link>

          {/* Sign Out */}
          <button
            onClick={onSignOut}
            title="Sign Out"
            className="nav-rail-btn danger"
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
              background: 'linear-gradient(135deg, #27272a 0%, #09090b 100%)',
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
            {initial}
          </div>
        </div>
      </aside>
    </>
  );
}
