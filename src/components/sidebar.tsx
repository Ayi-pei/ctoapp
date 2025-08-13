
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { adminNavItems, userNavItems } from '@/lib/nav-config';


export function Sidebar() {
  const pathname = usePathname();
  const { isAdmin } = useAuth();

  const isUserSection = !pathname.startsWith('/admin');
  const navItems = isAdmin && !isUserSection ? adminNavItems : userNavItems;
  
  return (
    <aside className="w-64 flex-shrink-0 border-r border-border p-4 hidden md:block">
      <nav>
        <ul>
          {navItems.map((item) => {
            // More robust active link logic
            const isActive = item.href === '/dashboard' 
                ? pathname === item.href
                : pathname.startsWith(item.href);

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
