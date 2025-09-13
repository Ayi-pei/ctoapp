"use client";

// Disable SSR for this page to avoid context issues
export const dynamic = "force-dynamic";
import { useSimpleAuth } from "@/context/simple-custom-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AuthLayout from "@/components/auth-layout";
import { LoaderCircle } from "lucide-react";

export default function AdminPage() {
  const { isAdmin, isLoading, isAuthenticated } = useSimpleAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        // 未登录，跳转到登录页
        router.replace("/login");
      } else if (!isAdmin) {
        // 已登录但非管理员，跳转到主页
        router.replace("/dashboard");
      } else {
        // 管理员，跳转到用户管理页
        router.replace("/admin/users");
      }
    }
  }, [isAdmin, isLoading, isAuthenticated, router]);

  // Show a skeleton loader while the auth state is being determined.
  return (
    <AuthLayout>
      <div className="flex flex-col items-center gap-4">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">正在加载管理员面板...</p>
      </div>
    </AuthLayout>
  );
}
