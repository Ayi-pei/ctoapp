
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { adminNavItems, userNavItems } from '@/lib/nav-config';


export function Sidebar() {
  const pathname = usePathname();
  const { isAdmin } = useAuth();

  // Determine which nav items to display.
  // If the user is an admin AND they are on a path that starts with /admin, show admin items.
  // Otherwise, show the regular user items. This ensures that when an admin navigates to
  // a shared page like /coming-soon from an admin page, the correct admin sidebar persists.
  const navItems = isAdmin && pathname.startsWith('/admin') ? adminNavItems : userNavItems;
  
  return (
    <aside className="w-64 flex-shrink-0 border-r border-border p-4 hidden md:block">
      <nav>
        <ul>
          {navItems.map((item) => {
            // More robust active link logic
             const isActive = (item.href === '/dashboard' && pathname === item.href) ||
                             (item.href === '/admin/users' && pathname === item.href) ||
                             (item.href !== '/dashboard' && item.href !== '/admin/users' && pathname.startsWith(item.href));

            return (
                 <li key={item.label}>
                  <Link href={item.href}>
                    <span
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-foreground transition-colors hover:bg-muted',
                        isActive
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                          : 'hover:bg-muted'
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
