
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LineChart, CandlestickChart, Wallet, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: '首页', icon: Home },
  { href: '/market', label: '行情', icon: LineChart },
  { href: '/trade', label: '交易', icon: CandlestickChart },
  { href: '/finance', label: '理财', icon: ShoppingBag },
  { href: '/assets', label: '资产', icon: Wallet },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-background md:hidden z-50">
      <ul className="flex justify-around">
        {navItems.map((item) => (
          <li key={item.href} className="flex-1">
            <Link href={item.href}>
              <span
                className={cn(
                  'flex flex-col items-center gap-1 py-2 text-xs text-muted-foreground',
                  pathname === item.href ? 'text-primary' : ''
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
