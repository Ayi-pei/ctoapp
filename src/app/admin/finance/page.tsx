
"use client";

import { useEffect } from 'react';
import { useSimpleAuth } from '@/context/simple-custom-auth';
import { useRouter } from 'next/navigation';
import AuthLayout from '@/components/auth-layout';
import { LoaderCircle } from 'lucide-react';


// Disable SSR for this page to avoid context issues
export const dynamic = 'force-dynamic';
/**
 * This page now acts as a redirector to the default finance sub-page.
 */
export default function AdminFinanceRedirectPage() {
    const { isAdmin, isLoading } = useSimpleAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            if (isAdmin) {
                router.replace('/admin/finance/dashboard');
            } else {
                router.replace('/login');
            }
        }
    }, [isLoading, isAdmin, router]);

    return (
        <AuthLayout>
            <div className="flex items-center justify-center h-full">
                <LoaderCircle className="w-8 h-8 animate-spin" />
            </div>
        </AuthLayout>
    );
}
