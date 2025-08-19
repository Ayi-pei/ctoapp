
"use client";

import { useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import AuthLayout from '@/components/auth-layout';

/**
 * The root page of the application, now acting as the primary router.
 *
 * It checks the authentication status and redirects the user to the appropriate page,
 * ensuring a single source of truth for initial routing decisions.
 * While checking, it displays a full-screen loading indicator.
 */
export default function Home() {
    const { isAuthenticated, isLoading, isAdmin } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // We only want to redirect when the authentication status is fully determined.
        if (!isLoading) {
            if (isAuthenticated) {
                // If the user is an admin, the single source of truth for their
                // destination is the /admin page, which itself will handle
                // redirecting to a specific sub-page like /admin/users.
                if (isAdmin) {
                    router.replace('/admin');
                } else {
                    // For regular users, the destination is the dashboard.
                    router.replace('/dashboard');
                }
            } else {
                // If not authenticated, the only place to go is the login page.
                router.replace('/login');
            }
        }
    }, [isAuthenticated, isLoading, isAdmin, router]);

    // Display a loading indicator while the auth check is in progress.
    // This prevents any flicker or rendering of incorrect pages during the
    // initial load or after a logout/login action.
    return (
        <AuthLayout>
             <div className="flex flex-col items-center gap-4">
                <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">正在加载，请稍候...</p>
            </div>
        </AuthLayout>
    );
}
