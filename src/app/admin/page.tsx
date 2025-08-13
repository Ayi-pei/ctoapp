
"use client";

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminPage() {
    const { isAuthenticated, isAdmin, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) {
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
    }, [isAuthenticated, isAdmin, isLoading, router]);

    return (
        <div className="p-8">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full mt-6" />
        </div>
    );
}
