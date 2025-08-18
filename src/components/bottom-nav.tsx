
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

  // Return null if there are no items to show, which might happen during auth loading
  if (itemsToShow.length === 0) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden z-50 bg-gradient-to-r from-indigo-950 via-purple-900 to-purple-800 border-t border-purple-700/50">
      <ul className="flex justify-around items-center h-16 px-1">
        {itemsToShow.map((item) => {
             const isActive = (item.href === '/dashboard' && pathname === item.href) ||
                             (item.href === '/admin/users' && pathname === item.href) ||
                             (item.href !== '/dashboard' && item.href !== '/admin/users' && pathname.startsWith(item.href));
            
            return (
              <li key={item.label} className="flex-1">
                <Link href={item.href} className="flex justify-center">
                  <div
                    className={cn(
                      'flex flex-col items-center justify-center gap-1 text-xs w-16 h-14 rounded-lg transition-all',
                      isActive ? 'text-amber-300 bg-black/20' : 'text-amber-300'
                    )}
                  >
                    <item.icon className={cn("h-5 w-5", "text-amber-400")} />
                    <span className="text-amber-300">{item.label}</span>
                  </div>
                </Link>
              </li>
            )
        })}
      </ul>
    </nav>
  );
}
