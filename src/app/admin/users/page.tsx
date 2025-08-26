
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/context/auth-context';
import type { User } from '@/types';
import DashboardLayout from '@/components/dashboard-layout';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Copy, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserDetailsDialog } from '@/components/admin/user-details-dialog';


export default function AdminUsersPage() {
    const { user, isAdmin, getAllUsers } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    
    const [users, setUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [displayedCode, setDisplayedCode] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    
    const loadData = useCallback(async () => {
        if (!isAdmin) return;
        const allUsers = await getAllUsers();
        setUsers(allUsers);
    }, [isAdmin, getAllUsers]);

    useEffect(() => {
        if (isAdmin === false) {
            router.push('/');
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
    
    const showAdminInvitationCode = () => {
        if (user?.invitation_code) {
            setDisplayedCode(user.invitation_code);
        }
    };


    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast({
                title: "已复制",
                description: "邀请码已成功复制到剪贴板。",
            });
        } catch (err) {
            toast({
                variant: "destructive",
                title: "复制失败",
                description: "无法将邀请码复制到剪贴板。",
            });
        }
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
            <div className="p-4 md:p-8 space-y-6 bg-card/80 backdrop-blur-sm">
                <h1 className="text-2xl font-bold">用户管理</h1>
                
                <Card>
                    <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div>
                            <CardTitle>用户列表</CardTitle>
                             <CardDescription>查看和管理系统中的所有用户。</CardDescription>
                        </div>
                        <div className='flex items-center gap-4 w-full md:w-auto'>
                             <div className="flex items-center gap-2">
                                <Button onClick={showAdminInvitationCode} variant="outline">
                                    <Ticket className="mr-2 h-4 w-4" />
                                    我的邀请码
                                </Button>
                                {displayedCode && (
                                    <div className="flex items-center gap-2 p-2 border rounded-md bg-muted h-10">
                                        <span className="font-mono font-semibold text-primary">{displayedCode}</span>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(displayedCode)}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                            <Input 
                                placeholder="搜索用户名..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full md:max-w-xs"
                                name="search-users"
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>用户名</TableHead>
                                    <TableHead>账户类型</TableHead>
                                    <TableHead>状态</TableHead>
                                    <TableHead className="hidden md:table-cell">注册日期</TableHead>
                                    <TableHead className="hidden md:table-cell">活跃时间</TableHead>
                                    <TableHead className="text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.length > 0 ? filteredUsers.map((u) => (
                                    <TableRow key={u.id}>
                                        <TableCell className="font-medium">{u.username}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cn('font-semibold', u.is_test_user ? 'border-green-500 text-green-500' : 'border-blue-500 text-blue-500')}>
                                                {u.is_test_user ? '测试' : '真实'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={u.is_frozen ? "destructive" : "default"} className={u.is_frozen ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}>
                                                {u.is_frozen ? '冻结' : '正常'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell className="hidden md:table-cell text-xs">{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : '暂无记录'}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={() => handleViewDetails(u)}>
                                                详情
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                     <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
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
                    user={selectedUser}
                    isOpen={isDetailsOpen}
                    onOpenChange={setIsDetailsOpen}
                    onUserUpdate={loadData} // Refresh user list on update
                />
            )}
        </DashboardLayout>
    );
}
