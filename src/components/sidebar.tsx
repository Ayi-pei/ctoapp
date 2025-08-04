
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LineChart, CandlestickChart, Wallet, User, Shield, Landmark, FileText, Users, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';

const userNavItems = [
  { href: '/dashboard', label: '首页', icon: Home },
  { href: '/market', label: '行情', icon: LineChart },
  { href: '/trade', label: '交易', icon: CandlestickChart },
  { href: '/finance', label: '理财', icon: Landmark },
  { href: '/assets', label: '资产', icon: Wallet },
  { href: '/profile', label: '我的', icon: User },
];

const adminNavItems = [
    { href: '/admin', label: '用户管理', icon: Users },
    { href: '/coming-soon', label: '资金管理', icon: Landmark },
    { href: '/coming-soon', label: '订单详情', icon: FileText },
    { href: '/coming-soon', label: '系统设置', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname();
  const { isAdmin } = useAuth();

  const navItems = isAdmin && pathname.startsWith('/admin') ? adminNavItems : userNavItems;
  
  if (isAdmin && !pathname.startsWith('/admin')) {
      // If admin is logged in but not in admin section, show a specific menu
      // For now, we can just show user menu or a limited menu.
      // Or we can redirect them to /admin. For now, we just show user items.
  }


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
                    // Exact match for admin base, startsWith for others
                    (pathname === item.href) ? 'bg-primary text-primary-foreground' : ''
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
