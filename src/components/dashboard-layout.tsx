
"use client";

import { useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './sidebar';
import { BottomNav } from './bottom-nav';
import { TradeHeader } from './trade-header';
import { cn } from '@/lib/utils';

type DashboardLayoutProps = {
  children: React.ReactNode;
};

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Redirect to login if auth is not resolved or user is not authenticated.
    // The check for `user === undefined` is removed as the context now handles the redirect on logout.
    // We still keep a check here for initial load protection.
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);


  if (!isAuthenticated) {
    return null; // Or a loading spinner
  }

  const isUserFacingPage = !pathname.startsWith('/admin');


  return (
    <div className={cn("flex h-screen w-screen flex-col", isUserFacingPage ? 'home-background' : 'bg-background')}>
      <div className={cn(isUserFacingPage && "h-full w-full")}>
        <TradeHeader />
        <div className="flex flex-1" style={{height: 'calc(100vh - 4rem)'}}>
          <Sidebar />
          <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
            {children}
          </main>
        </div>
        <BottomNav />
      </div>
    </div>
  );
};

export default DashboardLayout;
