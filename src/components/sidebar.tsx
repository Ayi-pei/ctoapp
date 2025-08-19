"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { adminNavItems, userNavItems } from '@/lib/nav-config';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronRight } from 'lucide-react';


export function Sidebar() {
  const pathname = usePathname();
  const { isAdmin } = useAuth();

  const navItems = isAdmin && pathname.startsWith('/admin') ? adminNavItems : userNavItems;
  
  return (
    <aside className="w-64 flex-shrink-0 border-r border-border p-4 hidden md:block">
      <nav>
        <ul className="space-y-2">
          {navItems.map((item) => {
            if (item.subItems) {
              const isParentActive = item.href && pathname.startsWith(item.href);
              return (
                <li key={item.label}>
                  <Collapsible defaultOpen={isParentActive}>
                    <CollapsibleTrigger className="w-full">
                      <div
                        className={cn(
                          'flex items-center justify-between gap-3 rounded-md px-3 py-2 text-foreground transition-colors hover:bg-muted',
                           isParentActive && 'bg-muted'
                        )}
                      >
                         <div className="flex items-center gap-3">
                            <item.icon className="h-5 w-5" />
                            <span>{item.label}</span>
                         </div>
                         <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="py-1 pl-6 space-y-1">
                      {item.subItems.map(subItem => {
                        const isSubActive = pathname === subItem.href;
                        return (
                          <Link key={subItem.label} href={subItem.href}>
                            <span
                              className={cn(
                                'flex items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted',
                                isSubActive
                                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                                  : 'hover:bg-muted text-muted-foreground'
                              )}
                            >
                              <subItem.icon className="h-4 w-4" />
                              <span>{subItem.label}</span>
                            </span>
                          </Link>
                        )
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                </li>
              )
            }
            
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
