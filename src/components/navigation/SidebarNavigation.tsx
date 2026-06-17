'use client';
import React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarNavItem {
  href: string;
  label: string;
  icon: string;
  badge?: number;
}

const NAV_LINKS: SidebarNavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: '▦' },
  { href: '/problems', label: 'Problems', icon: '⊞' },
  { href: '/graph', label: 'Failure Graph', icon: '⬡' },
  { href: '/diagnosis', label: 'AI Diagnosis', icon: '◈' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
];

const BOTTOM_NAV_LINKS: SidebarNavItem[] = [
  { href: '/help', label: 'Help', icon: '?' },
];

interface SidebarNavigationProps {
  isCollapsed?: boolean;
}

export function SidebarNavigation({ isCollapsed = false }: SidebarNavigationProps) {
  const pathname = usePathname();
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  const sidebarWidth = isCollapsed ? 80 : 220;

  const renderNavLink = (link: SidebarNavItem) => {
    const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname?.startsWith(link.href));

    return (
      <Link key={link.href} href={link.href} style={{ textDecoration: 'none', display: 'block', marginBottom: 2 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isCollapsed ? 0 : 10,
            padding: isCollapsed ? '9px 12px' : '9px 12px',
            borderRadius: 8,
            background: isActive ? 'rgba(255,95,82,0.12)' : 'transparent',
            color: isActive ? '#ff5f52' : '#9ca3af',
            fontSize: 13,
            fontWeight: isActive ? 600 : 400,
            borderLeft: `2px solid ${isActive ? '#ff5f52' : 'transparent'}`,
            transition: 'all 0.15s',
            cursor: 'pointer',
            position: 'relative',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
          }}
          onMouseEnter={() => isCollapsed && setShowTooltip(link.href)}
          onMouseLeave={() => setShowTooltip(null)}
        >
          {/* Icon */}
          <span style={{ fontSize: 15, flexShrink: 0 }}>{link.icon}</span>

          {/* Label */}
          {!isCollapsed && <span>{link.label}</span>}

          {/* Badge */}
          {link.badge && !isCollapsed && (
            <span
              style={{
                marginLeft: 'auto',
                background: '#ef4444',
                color: '#fff',
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 10,
              }}
            >
              {link.badge}
            </span>
          )}

          {/* Tooltip for collapsed state */}
          {isCollapsed && showTooltip === link.href && (
            <div
              style={{
                position: 'absolute',
                left: '100%',
                top: '50%',
                transform: 'translateY(-50%)',
                marginLeft: 12,
                background: '#27272a',
                color: '#f8fafc',
                padding: '6px 10px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                whiteSpace: 'nowrap',
                zIndex: 1000,
                border: '1px solid #3f3f46',
              }}
            >
              {link.label}
            </div>
          )}
        </div>
      </Link>
    );
  };

  return (
    <nav
      style={{
        width: sidebarWidth,
        minHeight: '100vh',
        background: '#191919',
        borderRight: '1px solid #1f1f1f',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 100,
        transition: 'width 0.3s ease',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '20px 18px', borderBottom: '1px solid #1f1f1f' }}>
        {!isCollapsed ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                flexShrink: 0,
                background: 'linear-gradient(135deg, #ff5f52, #ff8a80)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                color: '#fff',
              }}
            >
              F
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
              Praxis
            </span>
          </div>
        ) : (
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              flexShrink: 0,
              background: 'linear-gradient(135deg, #ff5f52, #ff8a80)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 700,
              color: '#fff',
              margin: '0 auto',
            }}
          >
            F
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <div style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
        {NAV_LINKS.map(renderNavLink)}
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid #1f1f1f', padding: '10px 8px' }}>
        {BOTTOM_NAV_LINKS.map(renderNavLink)}
      </div>

      {/* Collapse Toggle */}
      <div style={{ padding: '14px 8px', borderTop: '1px solid #1f1f1f' }}>
        <button
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 8,
            background: 'rgba(255,95,82,0.08)',
            color: '#9ca3af',
            fontSize: 12,
            fontWeight: 500,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            gap: 6,
            transition: 'all 0.15s',
          }}
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? '→' : '← Collapse'}
        </button>
      </div>
    </nav>
  );
}