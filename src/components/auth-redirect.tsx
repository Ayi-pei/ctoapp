
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { LoaderCircle } from 'lucide-react';

/**
 * @deprecated This component is no longer needed. The logic has been consolidated
 * into the `DashboardLayout` for a more streamlined and efficient auth flow.
 * Keeping the file to avoid breaking imports, but it should be considered for removal.
 */
export default function AuthRedirect() {
    const { isAuthenticated, isLoading, isAdmin } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // This logic is now primarily handled by the DashboardLayout.
        // This component is kept for safety but should be phased out.
        if (!isLoading) {
            if (isAuthenticated) {
                router.replace(isAdmin ? '/admin' : '/dashboard');
            } else {
                router.replace('/login');
            }
        }
    }, [isAuthenticated, isLoading, isAdmin, router]);

    return (
        <div className="flex h-full w-full items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">正在加载，请稍候...</p>
            </div>
        </div>
    );
}
