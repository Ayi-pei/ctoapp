"use client";
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { ListChecks } from "lucide-react";

export default function AdminTasksPage() {
    return (
        <DashboardLayout>
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <Card className="max-w-md">
                    <CardContent className="p-10">
                        <ListChecks className="h-16 w-16 mx-auto text-primary mb-6" />
                        <h1 className="text-3xl font-bold mb-2">日常任务管理</h1>
                        <p className="text-muted-foreground">此功能即将推出。您将在这里创建和管理用户的每日任务、签到奖励等。</p>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
