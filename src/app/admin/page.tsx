
"use client";

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminPage() {
    const { isAdmin } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isAdmin) {
            router.replace('/admin/users');
        } else {
            router.replace('/login');
        }
    }, [isAdmin, router]);

    return (
        <div className="p-8">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full mt-6" />
        </div>
    );
}
