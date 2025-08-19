"use client";

import { useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './sidebar';
import { BottomNav } from './bottom-nav';
import { TradeHeader } from './trade-header';
import { cn } from '@/lib/utils';
import { LoaderCircle } from 'lucide-react';
import AuthLayout from './auth-layout';

type DashboardLayoutProps = {
  children: React.ReactNode;
};

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        // If not authenticated and not already on a public page, redirect to login.
        if (pathname !== '/login' && pathname !== '/register') {
          router.replace('/login');
        }
      } else {
        // User is authenticated, enforce correct dashboard.
        const isAnAdminPage = pathname.startsWith('/admin');

        if (isAdmin && !isAnAdminPage) {
            // Admin is on a non-admin page, redirect to admin area.
            router.replace('/admin');
        } else if (!isAdmin && isAnAdminPage) {
            // Regular user on an admin page, redirect to user dashboard.
            router.replace('/dashboard');
        }
      }
    }
  }, [isAuthenticated, isLoading, isAdmin, pathname, router]);

  // While loading auth state, show a full-screen loader.
  if (isLoading) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center gap-4">
            <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">正在加载，请稍候...</p>
        </div>
      </AuthLayout>
    );
  }
  
  // If not authenticated and not loading, render children (e.g., login page) without the layout.
  // The effect above handles redirection for protected routes.
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
