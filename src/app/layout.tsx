
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
import { TradeDataProvider } from '@/context/trade-data-context';
import { ThemeProvider } from '@/context/theme-context';
import { AdminSettingsProvider } from '@/context/admin-settings-context';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'TradeFlow',
  description: 'A dashboard for cryptocurrency trading with live data and AI insights.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased text-foreground">
        <ThemeProvider>
          <AuthProvider>
            <SystemSettingsProvider>
              <SettingsProvider>
                <InvestmentSettingsProvider>
                  <TradeDataProvider>
                    <AdminSettingsProvider>
                      <MarketDataProvider>
                        <BalanceProvider>
                          <RequestsProvider>
                            <AnnouncementsProvider>
                              {children}
                            </AnnouncementsProvider>
                          </RequestsProvider>
                        </BalanceProvider>
                      </MarketDataProvider>
                    </AdminSettingsProvider>
                  </TradeDataProvider>
                </InvestmentSettingsProvider>
              </SettingsProvider>
            </SystemSettingsProvider>
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
    