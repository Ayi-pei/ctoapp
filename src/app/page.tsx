
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import AuthLayout from '@/components/auth-layout';
import { useToast } from '@/hooks/use-toast';

/**
 * The root page of the application, acting as the ultimate route guard.
 *
 * It checks the authentication status and redirects the user to the appropriate page,
 * ensuring a single source of truth for initial routing decisions.
 * While checking, it displays a full-screen loading indicator.
 * For unauthenticated users, it provides a clear message before redirecting.
 */
export default function Home() {
    const { isAuthenticated, isLoading, isAdmin } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [redirectMessage, setRedirectMessage] = useState<string | null>(null);

    useEffect(() => {
        // We only want to redirect when the authentication status is fully determined.
        if (!isLoading) {
            if (isAuthenticated) {
                // If the user is an admin, the single source of truth for their
                // destination is the /admin page, which itself will handle
                // redirecting to a specific sub-page.
                if (isAdmin) {
                    router.replace('/admin');
                } else {
                    // For regular users, the destination is the dashboard.
                    router.replace('/dashboard');
                }
            } else {
                // If not authenticated, show a message and then redirect.
                setRedirectMessage("当前用户不存在请检查用户名或者密码");
                toast({
                    variant: "destructive",
                    title: "认证失败",
                    description: "当前用户不存在，请重新登录。",
                });
                // Delay redirect to allow user to see the message
                const timer = setTimeout(() => {
                    router.replace('/login');
                }, 2000); 
                return () => clearTimeout(timer);
            }
        }
    }, [isAuthenticated, isLoading, isAdmin, router, toast]);

    // Display a loading indicator while the auth check is in progress or before redirect.
    // This prevents any flicker or rendering of incorrect pages.
    return (
        <AuthLayout>
             <div className="flex flex-col items-center gap-4">
                <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">
                    {redirectMessage || "正在加载，请稍候..."}
                </p>
            </div>
        </AuthLayout>
    );
}
