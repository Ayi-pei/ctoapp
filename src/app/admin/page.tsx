
"use client";

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import AuthLayout from '@/components/auth-layout';
import { LoaderCircle } from 'lucide-react';

export default function AdminPage() {
    const { isAdmin, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            // This page is the designated entry point for admins.
            // If an admin lands here, send them to the default admin page.
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
        <AuthLayout>
            <div className="flex flex-col items-center gap-4">
                <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">正在加载管理员面板...</p>
            </div>
        </AuthLayout>
    );
}
