
import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from '@/context/auth-context';
import { BalanceProvider } from '@/context/balance-context';
import { MarketDataProvider } from '@/context/market-data-context';
import { SettingsProvider } from '@/context/settings-context';

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
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="font-sans antialiased bg-background text-foreground">
        <AuthProvider>
          <SettingsProvider>
            <MarketDataProvider>
              <BalanceProvider>
                {children}
              </BalanceProvider>
            </MarketDataProvider>
          </SettingsProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}

    