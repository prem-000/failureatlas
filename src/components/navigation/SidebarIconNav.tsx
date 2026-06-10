'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface NavItem {
  href: string;
  icon: string;
  label: string;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', icon: '▦', label: 'Dashboard' },
  { href: '/problems', icon: '⊞', label: 'Problems' },
  { href: '/graph', icon: '⬡', label: 'Graph' },
  { href: '/diagnosis', icon: '◈', label: 'Diagnosis' },
  { href: '/settings', icon: '⚙', label: 'Settings' },
];

export function SidebarIconNav() {
  const pathname = usePathname();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <nav
      style={{
        width: 80,
        minHeight: '100vh',
        background: '#191919',
        borderRight: '1px solid #1f1f1f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px 0',
        gap: 10,
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <div
        style={{
          width: 50,
          height: 50,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #ff5f52, #ff8a80)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          fontWeight: 700,
          color: '#fff',
          marginBottom: 20,
          cursor: 'pointer',
        }}
      >
        F
      </div>

      {/* Nav Items */}
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));

        return (
          <Link key={item.href} href={item.href} style={{ textDecoration: 'none', position: 'relative' }}>
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                background: isActive ? 'rgba(255,95,82,0.12)' : 'transparent',
                color: isActive ? '#ff5f52' : '#9ca3af',
                borderLeft: `3px solid ${isActive ? '#ff5f52' : 'transparent'}`,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={() => setHoveredItem(item.href)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              {item.icon}

              {/* Notification Badge */}
              {item.badge && item.badge > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: -5,
                    right: -5,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {item.badge > 9 ? '9+' : item.badge}
                </div>
              )}
            </div>

            {/* Tooltip */}
            {hoveredItem === item.href && (
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
                {item.label}
              </div>
            )}
          </Link>
        );
      })}
    </nav>
  );
}