
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserDetailsDialog } from '@/components/user-details-dialog';
import { useAuth } from '@/context/auth-context';
import type { User } from '@/types';
import DashboardLayout from '@/components/dashboard-layout';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function AdminUsersPage() {
    const { user, isAdmin } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    
    const [users, setUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    
    const loadData = useCallback(async () => {
        if (!isAdmin) return;
        
        // Mock data since Supabase is removed
        const mockUsers: User[] = [
            { id: 'user1', username: 'testuser1', email: 'testuser1@noemail.app', is_admin: false, is_test_user: true, is_frozen: false, invitation_code: 'TEST1', inviter_id: null, created_at: new Date().toISOString() },
            { id: 'user2', username: 'testuser2', email: 'testuser2@noemail.app', is_admin: false, is_test_user: false, is_frozen: true, invitation_code: 'TEST2', inviter_id: 'user1', created_at: new Date().toISOString() },
            { id: 'user3', username: 'longusername_frozen', email: 'longusername@noemail.app', is_admin: false, is_test_user: false, is_frozen: true, invitation_code: 'TEST3', inviter_id: 'user1', created_at: new Date().toISOString() },
        ];
        setUsers(mockUsers);
    }, [isAdmin]);

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

    const handleViewDetails = (userToView: User) => {
        setSelectedUser(userToView);
        setIsDetailsOpen(true);
    };

    const handleSuccessfulUpdate = useCallback(() => {
        // Mock update - just show a toast
        toast({ title: 'Success', description: 'User data has been updated (mock).' });
        loadData();
    }, [loadData, toast]);


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
                                {filteredUsers.length > 0 ? filteredUsers.map((u) => (
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
                                        <TableCell className="hidden md:table-cell">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={() => handleViewDetails(u)}>
                                                详情
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                     <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                                            暂无用户。
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
                    onUpdate={handleSuccessfulUpdate}
                />
            )}
        </DashboardLayout>
    );

    
}
