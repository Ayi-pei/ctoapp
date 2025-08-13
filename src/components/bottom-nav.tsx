
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { adminNavItems, userNavItems } from '@/lib/nav-config';


export function BottomNav() {
  const pathname = usePathname();
  const { isAdmin } = useAuth();

  const navItems = isAdmin && pathname.startsWith('/admin') ? adminNavItems : userNavItems;
  
  const itemsToShow = navItems.slice(0, 5);

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-background md:hidden z-50">
      <ul className="flex justify-around">
        {itemsToShow.map((item) => {
             const isActive = (item.href === '/dashboard' && pathname === item.href) ||
                             (item.href === '/admin/users' && pathname === item.href) ||
                             (item.href !== '/dashboard' && item.href !== '/admin/users' && pathname.startsWith(item.href));
            
            return (
              <li key={item.label} className="flex-1">
                <Link href={item.href}>
                  <span
                    className={cn(
                      'flex flex-col items-center gap-1 py-2 text-xs text-muted-foreground',
                      isActive ? 'text-primary' : ''
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
  );
}
