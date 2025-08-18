
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
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);


  if (!isAuthenticated) {
    return null; // Or a loading spinner
  }

  return (
    <div className={cn("h-screen w-screen flex flex-col")}>
      <TradeHeader />
      <div className="flex flex-1 overflow-hidden">
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
