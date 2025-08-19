"use client";
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Megaphone } from "lucide-react";

export default function AdminAnnouncementsPage() {
    return (
        <DashboardLayout>
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <Card className="max-w-md">
                    <CardContent className="p-10">
                        <Megaphone className="h-16 w-16 mx-auto text-primary mb-6" />
                        <h1 className="text-3xl font-bold mb-2">公告发布</h1>
                        <p className="text-muted-foreground">此功能即将推出。您将在这里发布全平台公告或向特定用户发送消息。</p>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
