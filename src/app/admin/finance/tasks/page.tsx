"use client";

import AuthLayout from "@/components/auth-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSimpleAuth } from "@/context/simple-custom-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoaderCircle } from "lucide-react";

// Disable SSR for this page to avoid context issues
export const dynamic = "force-dynamic";
export default function AdminFinanceTasksPage() {
  const { isAdmin, isLoading, isAuthenticated } = useSimpleAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace("/login");
      } else if (!isAdmin) {
        router.replace("/dashboard");
      }
    }
  }, [isAdmin, isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center gap-4">
          <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">正在加载，请稍候...</p>
        </div>
      </AuthLayout>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground">
            您需要以管理员身份登录才能访问此页面。
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Manage Financial Tasks</h1>
        <Card>
          <CardHeader>
            <CardTitle>Task List</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Here you would manage financial tasks such as reviewing
              transactions, approving payouts, etc.
            </p>
            {/* Placeholder for task management UI */}
            <div className="mt-4 p-8 border-2 border-dashed rounded-lg text-center">
              <p className="text-muted-foreground">
                Task management interface will be implemented here.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthLayout>
  );
}
