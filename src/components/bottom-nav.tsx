
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LineChart, CandlestickChart, Wallet, User, Landmark, FileText, Users, Settings, Bell, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';

const userNavItems = [
  { href: '/dashboard', label: '首页', icon: Home },
  { href: '/market', label: '行情', icon: LineChart },
  { href: '/trade', label: '交易', icon: CandlestickChart },
  { href: '/assets', label: '资产', icon: Wallet },
  { href: '/profile', label: '我的', icon: User },
];

const adminNavItems = [
    { href: '/admin/users', label: '用户管理', icon: Users },
    { href: '/admin/requests', label: '审核请求', icon: Bell },
    { href: '/admin/finance', label: '资金管理', icon: Landmark },
    { href: '/admin/orders', label: '订单详情', icon: FileText },
    { href: '/admin/settings', label: '系统设置', icon: Settings },
]


export function BottomNav() {
  const pathname = usePathname();
  const { isAdmin } = useAuth();

  const navItems = isAdmin && pathname.startsWith('/admin') ? adminNavItems : userNavItems;
  
  const itemsToShow = navItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-background md:hidden z-50">
      <ul className="flex justify-around">
        {itemsToShow.slice(0, 5).map((item) => ( // Show max 5 items on mobile
          <li key={item.label} className="flex-1">
            <Link href={item.href}>
              <span
                className={cn(
                  'flex flex-col items-center gap-1 py-2 text-xs text-muted-foreground',
                  (pathname.startsWith(item.href) && item.href !== '/') || (pathname === '/' && item.href === '/dashboard') ? 'text-primary' : ''
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
