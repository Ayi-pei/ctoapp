
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import { LoaderCircle } from 'lucide-react';

export default function Home() {
    const { isAuthenticated, isLoading, isAdmin } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            if (isAuthenticated) {
                // If the user is an admin, redirect to the admin page, otherwise to the dashboard.
                if (isAdmin) {
                    router.replace('/admin');
                } else {
                    router.replace('/dashboard');
                }
            } else {
                // If not authenticated, redirect to the login page.
                router.replace('/login');
            }
        }
    }, [isAuthenticated, isLoading, isAdmin, router]);

    // Show a loading skeleton or spinner while the authentication state is being determined.
    return (
        <div className="flex h-screen w-screen items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">正在加载，请稍候...</p>
            </div>
        </div>
    );
}
