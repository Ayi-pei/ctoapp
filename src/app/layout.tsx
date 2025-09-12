import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { UnifiedAuthProvider } from "@/context/unified-auth-context";
import { SimpleAuthProvider } from "@/context/simple-custom-auth";
import { SimpleEnhancedLogsProvider } from "@/context/simple-enhanced-logs-context";
import { EnhancedLogsProvider } from "@/context/enhanced-logs-context";
import { OptionsProvider } from "@/context/options-context";
import { RequestsProvider } from "@/context/requests-context";
import { SwapProvider } from "@/context/swap-context";
import { EnhancedSupabaseProvider } from "@/context/enhanced-supabase-context";
import { BalanceProvider } from "@/context/balance-context";
import { EnhancedMarketDataProvider } from "@/context/enhanced-market-data-context";
import { EnhancedSystemSettingsProvider } from "@/context/enhanced-system-settings-context";
import { InvestmentSettingsProvider } from "@/context/investment-settings-context";
import { TasksProvider } from "@/context/tasks-context";
import { ActivitiesProvider } from "@/context/activities-context";
import { AnnouncementsProvider } from "@/context/announcements-context";

// 开发环境下导入系统健康检查
if (process.env.NODE_ENV === "development") {
  import("@/lib/system-health");
}

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
        <UnifiedAuthProvider>
          <SimpleAuthProvider>
            <SimpleEnhancedLogsProvider>
              <EnhancedLogsProvider>
                <OptionsProvider>
                  <EnhancedSupabaseProvider>
                    <EnhancedSystemSettingsProvider>
                      <InvestmentSettingsProvider>
                        <EnhancedMarketDataProvider>
                          <BalanceProvider>
                            <SwapProvider>
                              <RequestsProvider>
                                <TasksProvider>
                                  <ActivitiesProvider>
                                    <AnnouncementsProvider>
                                      {children}
                                      <Toaster />
                                    </AnnouncementsProvider>
                                  </ActivitiesProvider>
                                </TasksProvider>
                              </RequestsProvider>
                            </SwapProvider>
                          </BalanceProvider>
                        </EnhancedMarketDataProvider>
                      </InvestmentSettingsProvider>
                    </EnhancedSystemSettingsProvider>
                  </EnhancedSupabaseProvider>
                </OptionsProvider>
              </EnhancedLogsProvider>
            </SimpleEnhancedLogsProvider>
          </SimpleAuthProvider>
        </UnifiedAuthProvider>
      </body>
    </html>
  );
}
