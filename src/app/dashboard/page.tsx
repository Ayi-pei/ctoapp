
"use client";
import DashboardLayout from "@/components/dashboard-layout";

export default function DashboardPage() {
    return (
        <DashboardLayout>
            <div className="flex flex-col items-center justify-center h-full">
                <h1 className="text-4xl font-bold">欢迎来到 TradeFlow</h1>
                <p className="text-muted-foreground">从左侧或底部导航栏选择一个选项以开始。</p>
            </div>
        </DashboardLayout>
    );
}
