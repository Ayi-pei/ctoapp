
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LineChart, CandlestickChart, Wallet, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: '首页', icon: Home },
  { href: '/market', label: '行情', icon: LineChart },
  { href: '/trade', label: '交易', icon: CandlestickChart },
  { href: '/assets', label: '资产', icon: Wallet },
  { href: '/profile', label: '我的', icon: User },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 border-r border-border p-4 hidden md:block">
      <nav>
        <ul>
          {navItems.map((item) => (
            <li key={item.href}>
              <Link href={item.href}>
                <span
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-foreground transition-colors hover:bg-muted',
                    pathname === item.href ? 'bg-primary text-primary-foreground' : ''
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
