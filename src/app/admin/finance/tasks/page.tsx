
"use client";

import AuthLayout from '@/components/auth-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSimpleAuth } from '@/context/simple-custom-auth';

export default function AdminFinanceTasksPage() {
    const { isAdmin, isLoading } = useSimpleAuth();

    if (isLoading) {
        return <div>Loading...</div>; // Or a proper loader
    }

    if (!isAdmin) {
        // This should ideally be handled by a higher-order component or middleware
        // For now, just rendering null or a message.
        return <div className="p-4">Access Denied. You must be an admin.</div>;
    }

    return (
        <AuthLayout>
            <div className="p-4">
                <h1 className="text-2xl font-bold mb-4">Manage Financial Tasks</h1>
                <Card>
                    <CardHeader>
                        <CardTitle>Task List</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Here you would manage financial tasks such as reviewing transactions, approving payouts, etc.</p>
                        {/* Placeholder for task management UI */}
                        <div className="mt-4 p-8 border-2 border-dashed rounded-lg text-center">
                            <p className="text-muted-foreground">Task management interface will be implemented here.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AuthLayout>
    );
}
