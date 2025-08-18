
"use client";

import DashboardLayout from "@/components/dashboard-layout";
import AuthRedirect from "@/components/auth-redirect";

/**
 * The root page of the application.
 *
 * This component establishes the main layout and handles the initial authentication
 * check and redirection logic. It ensures that the loading state is displayed
 * within the correct layout, preventing background inconsistencies.
 */
export default function Home() {
    return (
        <DashboardLayout>
            <AuthRedirect />
        </DashboardLayout>
    );
}
