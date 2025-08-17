"use client";

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminPage() {
    const { isAdmin, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            // Once loading is complete, always redirect from /admin to /admin/users
            // This simplifies the logic and makes /admin/users the default admin page.
            if (isAdmin) {
                router.replace('/admin/users');
            } else {
                // If a non-admin somehow lands here, send them away.
                router.replace('/');
            }
        }
    }, [isAdmin, isLoading, router]);

    // Show a skeleton loader while the auth state is being determined.
    return (
        <div className="p-8">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full mt-6" />
        </div>
    );
}
