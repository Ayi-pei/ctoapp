import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SimpleAuthProvider } from "@/context/simple-custom-auth";
import { BalanceProvider } from "@/context/balance-context";
import { EnhancedMarketDataProvider } from "@/context/enhanced-market-data-context";
import { EnhancedSystemSettingsProvider } from "@/context/enhanced-system-settings-context";
import { RequestsProvider } from "@/context/requests-context";
import { AnnouncementsProvider } from "@/context/announcements-context";
import { InvestmentSettingsProvider } from "@/context/investment-settings-context";
import { TasksProvider } from "@/context/tasks-context";
import { ActivitiesProvider } from "@/context/activities-context";
import { SimpleEnhancedLogsProvider } from "@/context/simple-enhanced-logs-context";
import { SwapProvider } from "@/context/swap-context";
import { OptionsProvider } from "@/context/options-context";
import { LogsProvider } from "@/context/logs-context";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "SRfinance",
  description:
    "A web-app for cryptocurrency trading with live data and AI insights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="font-sans antialiased text-foreground">
        <SimpleAuthProvider>
          <SimpleEnhancedLogsProvider>
            <LogsProvider>
              <EnhancedSystemSettingsProvider>
                <InvestmentSettingsProvider>
                  <EnhancedMarketDataProvider>
                    <OptionsProvider>
                      <BalanceProvider>
                        <TasksProvider>
                          <RequestsProvider>
                            <ActivitiesProvider>
                              <AnnouncementsProvider>
                                <SwapProvider>
                                  {children}
                                  <Toaster />
                                </SwapProvider>
                              </AnnouncementsProvider>
                            </ActivitiesProvider>
                          </RequestsProvider>
                        </TasksProvider>
                      </BalanceProvider>
                    </OptionsProvider>
                  </EnhancedMarketDataProvider>
                </InvestmentSettingsProvider>
              </EnhancedSystemSettingsProvider>
            </LogsProvider>
          </SimpleEnhancedLogsProvider>
        </SimpleAuthProvider>
      </body>
    </html>
  );
}
