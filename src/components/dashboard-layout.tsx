
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
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // The DashboardLayout's main responsibility is to protect routes.
    // If auth state isn't loaded yet, we wait.
    // If it is loaded and the user is NOT authenticated, we redirect to login.
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // While loading, or if the user is not authenticated (and about to be redirected),
  // show a full-screen loader. This prevents showing a flash of the dashboard.
  if (isLoading || !isAuthenticated) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center gap-4">
            <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">正在加载，请稍候...</p>
        </div>
      </AuthLayout>
    );
  }
  
  const getBackgroundClass = () => {
    if (pathname === '/dashboard') return "gold-gradient-background home-background";
    if (pathname === '/trade') return "trade-background";
    if (pathname.startsWith('/admin')) return "admin-background";
    return "";
  }

  return (
    <div className={cn("h-screen w-screen flex flex-col")}>
       <div className={cn("fixed inset-0 -z-10", getBackgroundClass())} />
      <TradeHeader />
      <div className="flex flex-1 overflow-hidden bg-transparent">
          <Sidebar />
          <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
            {children}
          </main>
      </div>
      <BottomNav />
    </div>
  );
};

export default DashboardLayout;
