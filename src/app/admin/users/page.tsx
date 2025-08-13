
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
import { Copy } from 'lucide-react';


type UserData = AuthUser & {
    registeredAt: string; 
};

type UserBalance = {
    [key: string]: {
        available: number;
        frozen: number;
    }
}

const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
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
    const [invitationCode, setInvitationCode] = useState('');
    
    const loadData = useCallback(() => {
        if (!isAdmin) return;
        try {
            // Load users
            const allUsersData: AuthUser[] = JSON.parse(localStorage.getItem('users') || '[]');
            const formattedUsers = allUsersData.map((u: any) => ({
                ...u,
                registeredAt: u.registeredAt ? new Date(u.registeredAt).toLocaleDateString() : 'N/A'
            }));
            setUsers(formattedUsers);

            // Load invitation code
            const storedCode = localStorage.getItem('invitationCode');
            if (storedCode) {
                setInvitationCode(storedCode);
            } else {
                const newCode = generateCode();
                localStorage.setItem('invitationCode', newCode);
                setInvitationCode(newCode);
            }

        } catch (error) {
            console.error("Failed to fetch data from localStorage", error);
        }
    }, [isAdmin]);

    useEffect(() => {
        if (isAdmin === false) {
            router.push('/login');
        } else if (isAdmin === true) {
            loadData();
        }
    }, [isAdmin, router, loadData]);


    const handleGenerateNewCode = () => {
        const newCode = generateCode();
        localStorage.setItem('invitationCode', newCode);
        setInvitationCode(newCode);
        toast({
            title: "成功",
            description: "新的邀请码已生成并生效。",
        });
    }

    const copyToClipboard = () => {
        if (invitationCode) {
            navigator.clipboard.writeText(invitationCode);
            toast({
                title: "已复制",
                description: "邀请码已成功复制到剪贴板。",
            });
        }
    };
    
    const filteredUsers = useMemo(() => {
        if (!searchQuery) return users;
        return users.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [users, searchQuery]);

    const handleViewDetails = (userToView: UserData) => {
        try {
            const allUsersData: AuthUser[] = JSON.parse(localStorage.getItem('users') || '[]');
            const latestUserData = allUsersData.find((u: any) => u.username === userToView.username);
            
            setSelectedUser(latestUserData || null);
            
            const userBalances = JSON.parse(localStorage.getItem(`userBalances_${userToView.username}`) || '{}');
            setSelectedUserBalances(userBalances);
        } catch (error) {
             console.error(`Failed to fetch balances for user ${userToView.username}`, error);
             setSelectedUser(userToView);
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
                    <CardHeader>
                        <CardTitle>邀请码管理</CardTitle>
                        <CardDescription>生成并管理全局唯一的用户注册邀请码。旧的邀请码将在新码生成后立即失效。</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col md:flex-row items-center gap-4">
                        <div className="flex-1 w-full p-4 text-center border-2 border-dashed rounded-lg bg-muted">
                            <span className="text-3xl font-bold tracking-widest">{invitationCode || '...'}</span>
                        </div>
                        <div className="flex gap-2">
                             <Button onClick={copyToClipboard} size="lg" variant="outline">
                                <Copy className="mr-2 h-5 w-5" />
                                复制
                            </Button>
                            <Button onClick={handleGenerateNewCode} size="lg">
                                生成新邀请码
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <CardTitle>用户列表</CardTitle>
                         <Input 
                            placeholder="搜索用户名..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full md:max-w-sm"
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
                                    <TableRow key={u.username}>
                                        <TableCell className="font-medium">{u.username}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`font-semibold ${u.isTestUser ? 'border-green-500 text-green-500' : 'border-blue-500 text-blue-500'}`}>
                                                {u.isTestUser ? '测试' : '真实'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={u.isFrozen ? "destructive" : "default"} className={u.isFrozen ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}>
                                                {u.isFrozen ? '冻结' : '正常'}
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
                        loadData(); 
                        if (selectedUser) {
                           handleViewDetails(selectedUser as UserData); 
                        }
                    }}
                />
            )}
        </DashboardLayout>
    );
}

    

    