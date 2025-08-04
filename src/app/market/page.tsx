
"use client";
import DashboardLayout from "@/components/dashboard-layout";

export default function MarketPage() {
    return (
        <DashboardLayout>
            <div className="flex flex-col items-center justify-center h-full">
                <h1 className="text-4xl font-bold">行情</h1>
                <p className="text-muted-foreground">行情信息将在这里显示。</p>
            </div>
        </DashboardLayout>
    );
}
