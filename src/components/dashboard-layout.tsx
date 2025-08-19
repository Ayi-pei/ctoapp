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
    // This component's primary job is to protect routes.
    // If auth state is loading, we wait.
    // If not loading and not authenticated, we redirect to login.
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // While loading auth state, or if we are about to redirect, show a full-screen loader.
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
