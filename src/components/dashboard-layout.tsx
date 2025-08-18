
"use client";

import { useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './sidebar';
import { BottomNav } from './bottom-nav';
import { TradeHeader } from './trade-header';
import { cn } from '@/lib/utils';
import { LoaderCircle } from 'lucide-react';

type DashboardLayoutProps = {
  children: React.ReactNode;
};

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        // If logged in and on a public page, redirect to the dashboard.
        if (pathname === '/login' || pathname === '/register') {
          router.replace(isAdmin ? '/admin' : '/dashboard');
        }
      } else {
        // If not logged in and not on a public page, redirect to login.
        if (pathname !== '/login' && pathname !== '/register') {
          router.replace('/login');
        }
      }
    }
  }, [isAuthenticated, isLoading, isAdmin, pathname, router]);

  // Show a full-screen loader while the auth state is being determined,
  // or if we are about to redirect away from a public page.
  if (isLoading || (isAuthenticated && (pathname === '/login' || pathname === '/register'))) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // If not authenticated, let the public pages (login/register) render themselves.
  if (!isAuthenticated) {
     return <>{children}</>;
  }
  
  const isDashboardPage = pathname === '/dashboard';
  const isTradePage = pathname === '/trade';

  return (
    <div className={cn("h-screen w-screen flex flex-col")}>
      <TradeHeader />
      <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className={cn(
            "flex-1 overflow-y-auto pb-16 md:pb-0",
            isDashboardPage && "gold-gradient-background home-background",
            isTradePage && "trade-background"
          )}>
            {children}
          </main>
      </div>
      <BottomNav />
    </div>
  );
};

export default DashboardLayout;
