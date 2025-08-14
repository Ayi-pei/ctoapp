
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserDetailsDialog } from '@/components/user-details-dialog';
import { useAuth } from '@/context/auth-context';
import type { User as AuthUser } from '@/context/auth-context';
import DashboardLayout from '@/components/dashboard-layout';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';


type UserData = AuthUser & {
    registeredAt: string; 
};

type UserBalance = {
    [key: string]: {
        available: number;
        frozen: number;
    }
}


export default function AdminUsersPage() {
    const { user, isAdmin } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    
    const [users, setUsers] = useState<UserData[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null);
    const [selectedUserBalances, setSelectedUserBalances] = useState<UserBalance | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    
    const loadData = useCallback(async () => {
        if (!isAdmin || !user) return;
        try {
            // Use the secure RPC call to get all users
            const { data, error } = await supabase.rpc('get_all_users_for_admin');
            if (error) throw error;
            
            const formattedUsers = data.map((u: any) => ({
                ...u,
                registeredAt: u.registered_at ? new Date(u.registered_at).toLocaleDateString() : 'N/A'
            }));
            setUsers(formattedUsers);

        } catch (error) {
            console.error("Failed to fetch data from Supabase", error);
            toast({ variant: "destructive", title: "错误", description: "加载用户数据失败。" });
        }
    }, [isAdmin, user, toast]);

    useEffect(() => {
        if (isAdmin === false) {
            router.push('/login');
        } else if (isAdmin === true) {
            loadData();
        }
    }, [isAdmin, router, loadData]);

    
    const filteredUsers = useMemo(() => {
        if (!searchQuery) return users;
        return users.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [users, searchQuery]);

    const handleViewDetails = async (userToView: UserData) => {
        try {
            const { data, error } = await supabase.rpc('get_user_profile_by_id', { user_id_input: userToView.id });
             if (error || !data || data.length === 0) throw error || new Error("User not found");
             setSelectedUser(data[0] as AuthUser);
            
            setSelectedUserBalances({}); // This will be recalculated inside the dialog
        } catch (error) {
             console.error(`Failed to fetch data for user ${userToView.username}`, error);
             setSelectedUser(userToView as AuthUser); // Fallback to existing data
             setSelectedUserBalances(null);
        }
        setIsDetailsOpen(true);
    };


    if (!user || !isAdmin) {
        return (
             <DashboardLayout>
                <div className="p-4 md:p-8 text-center">
                    <p>您需要以管理员身份登录才能访问此页面。</p>
                </div>
            </DashboardLayout>
        )
    }


    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6">
                <h1 className="text-2xl font-bold">用户管理</h1>
                
                <Card>
                    <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div>
                            <CardTitle>用户列表</CardTitle>
                             <CardDescription>查看和管理系统中的所有用户。</CardDescription>
                        </div>
                         <Input 
                            placeholder="搜索用户名..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full md:max-w-sm"
                            name="search-users"
                        />
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>用户名</TableHead>
                                    <TableHead>账户类型</TableHead>
                                    <TableHead>状态</TableHead>
                                    <TableHead className="hidden md:table-cell">注册日期</TableHead>
                                    <TableHead className="text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.map((u) => (
                                    <TableRow key={u.id}>
                                        <TableCell className="font-medium">{u.username}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`font-semibold ${u.is_test_user ? 'border-green-500 text-green-500' : 'border-blue-500 text-blue-500'}`}>
                                                {u.is_test_user ? '测试' : '真实'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={u.is_frozen ? "destructive" : "default"} className={u.is_frozen ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}>
                                                {u.is_frozen ? '冻结' : '正常'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">{u.registeredAt}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={() => handleViewDetails(u)}>
                                                详情
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filteredUsers.length === 0 && (
                                     <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                                            找不到匹配的用户。
                                        </TableCell>
                                    </TableRow>
                                )}
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
                    onUpdate={() => {
                        loadData(); // Reload all users data
                        if (selectedUser) {
                           // Re-fetch the single user's latest data to keep the dialog fresh
                           handleViewDetails(selectedUser as UserData);
                        }
                    }}
                />
            )}
        </DashboardLayout>
    );

    
}
