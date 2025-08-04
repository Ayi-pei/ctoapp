
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LineChart, CandlestickChart, Wallet, User, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';

const navItems = [
  { href: '/dashboard', label: '首页', icon: Home, admin: false },
  { href: '/market', label: '行情', icon: LineChart, admin: false },
  { href: '/trade', label: '交易', icon: CandlestickChart, admin: false },
  { href: '/assets', label: '资产', icon: Wallet, admin: false },
  { href: '/admin', label: '管理', icon: Shield, admin: true },
  { href: '/profile', label: '我的', icon: User, admin: false },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isAdmin } = useAuth();

  const filteredNavItems = navItems.filter(item => item.admin ? isAdmin : !isAdmin);

  return (
    <aside className="w-64 flex-shrink-0 border-r border-border p-4 hidden md:block">
      <nav>
        <ul>
          {filteredNavItems.map((item) => (
            <li key={item.href}>
              <Link href={item.href}>
                <span
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-foreground transition-colors hover:bg-muted',
                    (pathname.startsWith(item.href) && item.href !== '/') || pathname === item.href ? 'bg-primary text-primary-foreground' : ''
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
