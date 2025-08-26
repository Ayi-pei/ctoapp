
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import AuthLayout from '@/components/auth-layout';
import { LoaderCircle } from 'lucide-react';

/**
 * This page now acts as a redirector to the default market settings sub-page.
 */
export default function AdminMarketRedirectPage() {
    const { isAdmin, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && isAdmin) {
            router.replace('/admin/settings/market-crypto');
        } else if (!isLoading && !isAdmin) {
             router.replace('/');
        }
    }, [isAdmin, isLoading, router]);

    // Show a skeleton loader while the auth state is being determined.
    return (
        <AuthLayout>
            <div className="flex flex-col items-center gap-4">
                <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">正在加载市场设置...</p>
            </div>
        </AuthLayout>
    );
}
