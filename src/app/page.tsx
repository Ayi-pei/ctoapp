
"use client";

import DashboardLayout from "@/components/dashboard-layout";
import { LoaderCircle } from "lucide-react";

/**
 * The root page of the application.
 *
 * This component establishes the main layout and handles the initial authentication
 * check and redirection logic. It ensures that the loading state is displayed
 * within the correct layout, preventing background inconsistencies.
 */
export default function Home() {
    // The DashboardLayout now contains all the necessary logic for auth checking
    // and redirection. We can simply render a loading state as its child,
    // which will be displayed while the initial auth check runs.
    return (
        <DashboardLayout>
            <div className="flex h-full w-full items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-muted-foreground">正在加载，请稍候...</p>
                </div>
            </div>
        </DashboardLayout>
    );
}
