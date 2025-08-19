

import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from '@/context/auth-context';
import { BalanceProvider } from '@/context/balance-context';
import { MarketDataProvider } from '@/context/market-data-context';
import { SettingsProvider } from '@/context/settings-context';
import { SystemSettingsProvider } from '@/context/system-settings-context';
import { RequestsProvider } from '@/context/requests-context';
import { AnnouncementsProvider } from '@/context/announcements-context';
import { InvestmentSettingsProvider } from '@/context/investment-settings-context';
import { TasksProvider } from '@/context/tasks-context';
import { ActivitiesProvider } from '@/context/activities-context';
import { LogsProvider } from '@/context/logs-context';
import { SwapProvider } from '@/context/swap-context';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'SRfinance',
  description: 'A web-app for cryptocurrency trading with live data and AI insights.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased text-foreground">
        <AuthProvider>
          <LogsProvider>
            <SystemSettingsProvider>
              <SettingsProvider>
                <InvestmentSettingsProvider>
                  <MarketDataProvider>
                    <BalanceProvider>
                      <TasksProvider>
                        <RequestsProvider>
                            <ActivitiesProvider>
                              <AnnouncementsProvider>
                                <SwapProvider>
                                  {children}
                                </SwapProvider>
                                <Toaster />
                              </AnnouncementsProvider>
                            </ActivitiesProvider>
                        </RequestsProvider>
                      </TasksProvider>
                    </BalanceProvider>
                  </MarketDataProvider>
                </InvestmentSettingsProvider>
              </SettingsProvider>
            </SystemSettingsProvider>
          </LogsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
    
