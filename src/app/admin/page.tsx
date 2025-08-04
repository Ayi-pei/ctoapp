
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserDetailsDialog } from '@/components/user-details-dialog';
import { useAuth } from '@/context/auth-context';
import type { User as AuthUser } from '@/context/auth-context';
import DashboardLayout from '@/components/dashboard-layout';
import { useRouter } from 'next/navigation';

type UserData = AuthUser & {
    registeredAt: string; // Assuming date is stored as string
    password?: string; // It's good practice to not handle passwords on client-side
};

type UserBalance = {
    [key: string]: {
        available: number;
        frozen: number;
    }
}

export default function AdminPage() {
    const { user, isAdmin } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<UserData[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const [selectedUserBalances, setSelectedUserBalances] = useState<UserBalance | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    
    useEffect(() => {
        if (!isAdmin) {
            router.push('/login');
        }
    }, [isAdmin, router]);

    useEffect(() => {
        // In a real app, you would fetch this from a protected API endpoint.
        // For now, we'll simulate by reading from localStorage.
        try {
            const allUsersData = JSON.parse(localStorage.getItem('users') || '[]');
            // Add a mock registration date
            const formattedUsers = allUsersData.map((u: any) => ({
                ...u,
                registeredAt: new Date().toLocaleDateString() 
            }));
            setUsers(formattedUsers);
        } catch (error) {
            console.error("Failed to fetch users from localStorage", error);
        }
    }, []);

    const handleViewDetails = (userToView: UserData) => {
        setSelectedUser(userToView);
        try {
            const userBalances = JSON.parse(localStorage.getItem(`userBalances_${userToView.username}`) || '{}');
            setSelectedUserBalances(userBalances);
        } catch (error) {
             console.error(`Failed to fetch balances for user ${userToView.username}`, error);
             setSelectedUserBalances(null);
        }
        setIsDetailsOpen(true);
    };

    if (!user || !isAdmin) {
        return (
             <DashboardLayout>
                <div className="p-8 text-center">
                    <p>您需要以管理员身份登录才能访问此页面。</p>
                </div>
            </DashboardLayout>
        )
    }


    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6">
                <h1 className="text-2xl font-bold">后台管理</h1>
                <Card>
                    <CardHeader>
                        <CardTitle>用户列表</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>用户名</TableHead>
                                    <TableHead>账户类型</TableHead>
                                    <TableHead>注册日期</TableHead>
                                    <TableHead className="text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((u) => (
                                    <TableRow key={u.username}>
                                        <TableCell className="font-medium">{u.username}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${u.isTestUser ? 'bg-green-500/20 text-green-500' : 'bg-blue-500/20 text-blue-500'}`}>
                                                {u.isTestUser ? '测试账户' : '真实账户'}
                                            </span>
                                        </TableCell>
                                        <TableCell>{u.registeredAt}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={() => handleViewDetails(u)}>
                                                查看详情
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            {selectedUser && (
                <UserDetailsDialog
                    isOpen={isDetailsOpen}
                    onOpenChange={setIsDetailsOpen}
                    user={selectedUser}
                    balances={selectedUserBalances}
                />
            )}
        </DashboardLayout>
    );
}
