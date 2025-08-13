
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LineChart, CandlestickChart, Wallet, User, Shield, Landmark, FileText, Users, Settings, Bell, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';

const userNavItems = [
  { href: '/dashboard', label: '首页', icon: Home },
  { href: '/market', label: '行情', icon: LineChart },
  { href: '/trade', label: '交易', icon: CandlestickChart },
  { href: '/finance', label: '理财', icon: Landmark },
  { href: '/download', label: '下载', icon: Download },
  { href: '/profile', label: '我的', icon: User },
];

const adminNavItems = [
    { href: '/admin/users', label: '用户管理', icon: Users },
    { href: '/admin/requests', label: '审核请求', icon: Bell },
    { href: '/admin/finance', label: '资金管理', icon: Landmark },
    { href: '/admin/orders', label: '订单详情', icon: FileText },
    { href: '/admin/settings', label: '系统设置', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname();
  const { isAdmin } = useAuth();

  const isUserSection = !pathname.startsWith('/admin');
  const navItems = isAdmin && !isUserSection ? adminNavItems : userNavItems;
  
  if (isAdmin && isUserSection) {
      // If admin is logged in but not in admin section, show a specific menu
      // For now, we can just show user menu or a limited menu.
      // Or we can redirect them to /admin. For now, we just show user items.
  }


  return (
    <aside className="w-64 flex-shrink-0 border-r border-border p-4 hidden md:block">
      <nav>
        <ul>
          {navItems.map((item, index) => {
            let isActive = false;
            const basePath = isAdmin && !isUserSection ? adminNavItems[0].href : userNavItems[0].href;

            if (index === 0) { // First item in the list
                isActive = pathname === basePath;
            } else {
                isActive = pathname.startsWith(item.href);
            }
             // User nav has a different logic for the first item
            if (!isAdmin || isUserSection) {
                isActive = (item.href === '/dashboard' && pathname === item.href) || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            }


            return (
                 <li key={item.label}>
                  <Link href={item.href}>
                    <span
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-foreground transition-colors hover:bg-muted',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : ''
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </span>
                  </Link>
                </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  );
}
