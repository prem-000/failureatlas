'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ListChecks,
  GitFork,
  Stethoscope,
  SlidersHorizontal,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/problems', icon: ListChecks, label: 'Problems' },
  { href: '/graph', icon: GitFork, label: 'Failure Graph' },
  { href: '/diagnosis', icon: Stethoscope, label: 'AI Diagnosis' },
];

interface SidebarProps {
  user?: { name?: string | null; email: string };
  onSignOut?: () => void;
}

export function Sidebar({ user, onSignOut }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const initial = (user?.name || user?.email || 'U')[0].toUpperCase();

  return (
    <aside
      className="fixed left-0 top-0 h-screen flex flex-col items-center py-5 z-50"
      style={{
        width: 72,
        background: '#0f0f0f',
        borderRight: '0.5px solid #2a2a2a',
      }}
    >
      {/* Logo */}
      <Link
        href="/dashboard"
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-8 select-none"
        style={{ background: '#ff5f52' }}
        title="FailureAtlas"
      >
        <span className="text-white font-bold text-lg leading-none">F</span>
      </Link>

      {/* Nav items */}
      <nav className="flex flex-col items-center gap-2 flex-1">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                'w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150',
                active
                  ? 'text-[#ff5f52]'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'
              )}
              style={
                active
                  ? { background: 'rgba(255,95,82,0.12)', color: '#ff5f52' }
                  : {}
              }
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="flex flex-col items-center gap-3 mt-auto">
        <Link
          href="/settings"
          title="Settings"
          className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150',
            pathname === '/settings'
              ? 'text-[#ff5f52]'
              : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'
          )}
          style={
            pathname === '/settings'
              ? { background: 'rgba(255,95,82,0.12)', color: '#ff5f52' }
              : {}
          }
        >
          <SlidersHorizontal size={20} strokeWidth={1.8} />
        </Link>

        <button
          onClick={onSignOut}
          title="Sign Out"
          className="w-11 h-11 rounded-xl flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
        >
          <LogOut size={18} strokeWidth={1.8} />
        </button>

        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm select-none"
          style={{ background: '#ff5f52' }}
          title={user?.email}
        >
          {initial}
        </div>
      </div>
    </aside>
  );
}
