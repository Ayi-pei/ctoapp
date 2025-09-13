"use client";

import { useEffect } from "react";
import { useSimpleAuth } from "@/context/simple-custom-auth";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import AuthLayout from "@/components/auth-layout";

// Disable SSR for this page to avoid context issues
export const dynamic = "force-dynamic";

/**
 * The root page of the application, acting as the ultimate route guard.
 *
 * It checks the authentication status and redirects the user to the appropriate page,
 * ensuring a single source of truth for initial routing decisions.
 * While checking, it displays a full-screen loading indicator.
 * For unauthenticated users, it provides a clear message before redirecting.
 */
export default function Home() {
  const { isAuthenticated, isLoading, isAdmin } = useSimpleAuth();
  const router = useRouter();

  useEffect(() => {
    // We only want to redirect when the authentication status is fully determined.
    if (!isLoading) {
      if (isAuthenticated) {
        // If the user is an admin, the single source of truth for their
        // destination is the /admin page, which itself will handle
        // redirecting to a specific sub-page.
        if (isAdmin) {
          router.replace("/admin");
        } else {
          // For regular users, the destination is the dashboard.
          router.replace("/dashboard");
        }
      } else {
        // If not authenticated, redirect immediately to login
        router.replace("/login");
      }
    }
  }, [isAuthenticated, isLoading, isAdmin, router]);

  // Display a loading indicator while the auth check is in progress or before redirect.
  // This prevents any flicker or rendering of incorrect pages.
  return (
    <AuthLayout>
      <div className="flex flex-col items-center gap-4">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">正在加载，请稍候...</p>
      </div>
    </AuthLayout>
  );
}
