
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

export function BottomNav() {
  const pathname = usePathname();
  const { isAdmin } = useAuth();

  const filteredNavItems = navItems.filter(item => item.admin ? isAdmin : !isAdmin);

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-background md:hidden z-50">
      <ul className="flex justify-around">
        {filteredNavItems.map((item) => (
          <li key={item.href} className="flex-1">
            <Link href={item.href}>
              <span
                className={cn(
                  'flex flex-col items-center gap-1 py-2 text-xs text-muted-foreground',
                  (pathname.startsWith(item.href) && item.href !== '/') || pathname === item.href ? 'text-primary' : ''
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
  );
}
