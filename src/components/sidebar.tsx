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
    <aside className="w-64 flex-shrink-0 border-r border-border p-4 hidden md:block bg-background">
      <nav>
        <ul className="space-y-2">
          {navItems.map((item) => {
            if (item.subItems) {
              const isParentActive = !!(item.href && pathname.startsWith(item.href));
              return (
                <li key={item.label}>
                  <Collapsible defaultOpen={isParentActive}>
                    <CollapsibleTrigger 
                      className={cn(
                        "group flex w-full items-center justify-between rounded-md px-3 py-2 text-foreground transition-colors hover:bg-muted",
                        isParentActive && 'bg-muted'
                      )}
                    >
                        <item.icon className="h-5 w-5" />
                        <span className="flex-1 text-left ml-3">{item.label}</span>
                        <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="py-1 pl-6 space-y-1">
                      {item.subItems.map(subItem => {
                        const isSubActive = pathname === subItem.href;
                        return (
                          <Link 
                            key={subItem.label} 
                            href={subItem.href}
                            className={cn(
                              'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                              isSubActive
                                ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                          >
                            <subItem.icon className="h-4 w-4" />
                            <span>{subItem.label}</span>
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
                  <Link 
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  );
}
