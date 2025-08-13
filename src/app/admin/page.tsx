
"use client";

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminPage() {
    const { user, isAuthenticated, isAdmin } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Wait until the auth state is fully resolved.
        // `user` will be `undefined` on the initial render and `null` or an object after the context has checked localStorage.
        if (user === undefined) {
            return; // Do nothing until the auth context is initialized
        }

        if (isAuthenticated && isAdmin) {
            router.replace('/admin/users');
        } else if (isAuthenticated && !isAdmin) {
             router.replace('/dashboard');
        }
        else {
            // If not authenticated (user is null), redirect to login
            router.replace('/login');
        }
    }, [user, isAuthenticated, isAdmin, router]);

    // Render a loading skeleton while the redirection logic is processing
    return (
        <div className="p-8">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full mt-6" />
        </div>
    );
}
