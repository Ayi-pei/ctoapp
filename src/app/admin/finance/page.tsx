
"use client";

import { useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import AuthLayout from '@/components/auth-layout';
import { LoaderCircle } from 'lucide-react';

/**
 * This page now acts as a redirector to the default finance sub-page.
 */
export default function AdminFinanceRedirectPage() {
    const { isAdmin, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && isAdmin) {
            // Redirect to the first available sub-page, e.g., promotions or benefits.
            // As per nav-config, it currently points to /admin/settings.
            router.replace('/admin/settings');
        } else if (!isLoading && !isAdmin) {
             router.replace('/');
        }
    }, [isAdmin, isLoading, router]);

    // Show a skeleton loader while the auth state is being determined.
    return (
        <AuthLayout>
            <div className="flex flex-col items-center gap-4">
                <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">正在加载运营中心...</p>
            </div>
        </AuthLayout>
    );
}
