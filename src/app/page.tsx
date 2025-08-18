"use client";

import { useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import AuthLayout from '@/components/auth-layout';

/**
 * The root page of the application.
 *
 * It checks the authentication status and redirects the user to the appropriate page.
 * While checking, it displays a full-screen loading indicator.
 */
export default function Home() {
    const { isAuthenticated, isLoading, isAdmin } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            if (isAuthenticated) {
                // If authenticated, redirect to the appropriate dashboard
                router.replace(isAdmin ? '/admin' : '/dashboard');
            } else {
                // If not authenticated, redirect to the login page
                router.replace('/login');
            }
        }
    }, [isAuthenticated, isLoading, isAdmin, router]);

    // Display a loading indicator while the auth check is in progress
    return (
        <AuthLayout>
             <div className="flex flex-col items-center gap-4">
                <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">正在加载，请稍候...</p>
            </div>
        </AuthLayout>
    );
}