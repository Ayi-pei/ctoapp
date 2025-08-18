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
    // This effect handles redirection for users who are already logged in
    // or are not logged in and trying to access a protected page.
    if (!isLoading) {
      if (isAuthenticated) {
        // If logged in and on a public page like login/register, redirect away.
        if (pathname === '/login' || pathname === '/register') {
          router.replace(isAdmin ? '/admin' : '/dashboard');
        }
      } else {
        // If not logged in, redirect to the login page.
        // The root page ('/') will handle the initial redirect to '/login'.
        // This handles cases where user tries to access other protected routes directly.
        if (pathname !== '/login' && pathname !== '/register') {
          router.replace('/login');
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
  
  // If not authenticated and not loading, the user should be on login/register.
  // The effect above will handle redirection if they aren't.
  // We return null here to let the login/register pages render themselves without the layout.
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
