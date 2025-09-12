"use client";
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

// Disable SSR for this page to avoid context issues
export const dynamic = "force-dynamic";

export default function ComingSoonPage() {
  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Card className="max-w-md">
          <CardContent className="p-10">
            <Construction className="h-16 w-16 mx-auto text-primary mb-6" />
            <h1 className="text-3xl font-bold mb-2">功能即将推出</h1>
            <p className="text-muted-foreground">
              我们正在努力开发此功能。请稍后再回来查看！
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
