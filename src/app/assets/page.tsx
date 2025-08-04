
"use client";
import DashboardLayout from "@/components/dashboard-layout";

export default function AssetsPage() {
    return (
        <DashboardLayout>
            <div className="flex flex-col items-center justify-center h-full">
                <h1 className="text-4xl font-bold">资产</h1>
                <p className="text-muted-foreground">用户资产将在这里显示。</p>
            </div>
        </DashboardLayout>
    );
}
