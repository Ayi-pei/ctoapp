"use client";

// Disable SSR for this page to avoid context issues
export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSimpleAuth } from "@/context/simple-custom-auth";
import AuthLayout from "@/components/auth-layout";
import { LoaderCircle } from "lucide-react";

/**
 * This page now acts as a redirector to the default market settings sub-page.
 */
export default function AdminMarketRedirectPage() {
  const { isAdmin, isLoading, isAuthenticated } = useSimpleAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace("/login");
      } else if (!isAdmin) {
        router.replace("/dashboard");
      } else {
        router.replace("/admin/settings/market-crypto");
      }
    }
  }, [isAdmin, isLoading, isAuthenticated, router]);

  // Show a skeleton loader while the auth state is being determined.
  return (
    <AuthLayout>
      <div className="flex flex-col items-center gap-4">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">正在加载市场设置...</p>
      </div>
    </AuthLayout>
  );
}
