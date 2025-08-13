
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
    
    const loadData = useCallback(async () => {
        if (!isAdmin || !user) return;
        try {
            const { data, error } = await supabase.from('users').select('*');
            if (error) throw error;
            
            const formattedUsers = data.map((u: any) => ({
                ...u,
                is_test_user: u.is_test_user,
                is_frozen: u.is_frozen,
                registeredAt: u.registered_at ? new Date(u.registered_at).toLocaleDateString() : 'N/A'
            }));
            setUsers(formattedUsers);

            const { data: adminData, error: adminError } = await supabase
                .from('users')
                .select('invitation_code')
                .eq('id', user.id)
                .single();

            if (adminError) throw adminError;
            
            if (adminData && adminData.invitation_code) {
                setInvitationCode(adminData.invitation_code);
            } else {
                const newCode = generateCode();
                const { error: updateError } = await supabase
                    .from('users')
                    .update({ invitation_code: newCode })
                    .eq('id', user.id);
                if (updateError) throw updateError;
                setInvitationCode(newCode);
            }

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


    const handleGenerateNewCode = async () => {
        if (!user) return;
        const newCode = generateCode();
        const { error } = await supabase.from('users').update({ invitation_code: newCode }).eq('id', user.id);

        if (error) {
            toast({ variant: "destructive", title: "错误", description: "生成新邀请码失败。" });
        } else {
            setInvitationCode(newCode);
            toast({
                title: "成功",
                description: "新的邀请码已生成并生效。",
            });
        }
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

    const handleViewDetails = async (userToView: UserData) => {
        try {
            const { data: latestUserData, error: userError } = await supabase.from('users').select('*').eq('id', userToView.id).single();
            if (userError) throw userError;
            
            setSelectedUser(latestUserData as AuthUser);
            
            // Note: Balances are calculated dynamically in the context,
            // we'll pass null here and let the dialog fetch it if needed or rely on context.
            // For simplicity, we can just pass an empty object.
            setSelectedUserBalances({}); 
        } catch (error) {
             console.error(`Failed to fetch data for user ${userToView.username}`, error);
             setSelectedUser(userToView as AuthUser);
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
