
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { LoaderCircle } from 'lucide-react';

/**
 * AuthRedirect is a client component responsible for handling the initial
 * authentication check and redirecting the user accordingly. It displays a
 * loading spinner while verifying the auth state. This component is intended
 * to be rendered within a layout that provides the desired page background.
 */
export default function AuthRedirect() {
    const { isAuthenticated, isLoading, isAdmin } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            if (isAuthenticated) {
                if (isAdmin) {
                    router.replace('/admin');
                } else {
                    router.replace('/dashboard');
                }
            } else {
                router.replace('/login');
            }
        }
    }, [isAuthenticated, isLoading, isAdmin, router]);

    // This loading spinner will be displayed on top of the background
    // provided by the parent layout (e.g., DashboardLayout).
    return (
        <div className="flex h-full w-full items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">正在加载，请稍候...</p>
            </div>
        </div>
    );
}
