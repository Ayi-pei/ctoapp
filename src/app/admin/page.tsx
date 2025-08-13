
"use client";

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminPage() {
    const { user, isAuthenticated, isAdmin } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Wait until auth state is confirmed
        if (user === undefined) {
            return;
        }

        if (isAuthenticated && isAdmin) {
            router.replace('/admin/users');
        } else if (isAuthenticated && !isAdmin) {
             router.replace('/dashboard');
        }
        else {
            router.replace('/login');
        }
    }, [user, isAuthenticated, isAdmin, router]);

    return (
        <div className="p-8">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full mt-6" />
        </div>
    );
}
