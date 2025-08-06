
"use client";
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function AdminSettingsPage() {
    return (
        <DashboardLayout>
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <Card className="max-w-md">
                    <CardContent className="p-10">
                        <Settings className="h-16 w-16 mx-auto text-primary mb-6" />
                        <h1 className="text-3xl font-bold mb-2">系统设置</h1>
                        <p className="text-muted-foreground">该功能正在开发中，将用于配置站点参数、管理系统日志以及执行维护任务。请稍后回来查看！</p>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
