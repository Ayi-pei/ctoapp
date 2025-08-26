
"use client";

import { useEffect } from 'react';
import { useSimpleAuth } from '@/context/simple-custom-auth';
import { useRouter } from 'next/navigation';
import AuthLayout from '@/components/auth-layout';
import { LoaderCircle } from 'lucide-react';

/**
 * This page now acts as a redirector to the default finance sub-page.
 */
export default function AdminFinanceRedirectPage() {
    const { isAdmin, isLoading } = useSimpleAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && isAdmin) {
            // Redirect to the new data dashboard by default
            router.replace('/admin/finance/dashboard');
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
