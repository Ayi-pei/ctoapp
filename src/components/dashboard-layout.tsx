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
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // While loading, do nothing.
    if (isLoading) return;
    
    // After loading, if user is not authenticated and not already on a public page, redirect to login.
    const isPublicPage = pathname === '/login' || pathname === '/register';
    if (!isAuthenticated && !isPublicPage) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, pathname, router]);


  // Show a full-screen loader while the auth state is being determined.
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // If not authenticated and on a public page (like /login), don't render the main layout.
  // The child component (the login page itself) will be rendered directly by RootLayout.
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
