
"use client";
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Transaction } from "@/types";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const statusVariant: { [key: string]: "default" | "secondary" | "destructive" } = {
    'pending': 'secondary',
    'approved': 'default',
    'rejected': 'destructive'
}

const statusText: { [key: string]: string } = {
    'pending': '待审核',
    'approved': '已批准',
    'rejected': '已拒绝'
}

export default function AdminFinancePage() {
    const { isAdmin } = useAuth();
    const router = useRouter();
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    useEffect(() => {
        if (!isAdmin) {
            router.push('/login');
        } else {
            try {
                const allTransactions = JSON.parse(localStorage.getItem('transactions') || '[]') as Transaction[];
                setTransactions(allTransactions.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            } catch (error) {
                console.error("Failed to fetch transactions from localStorage", error);
            }
        }
    }, [isAdmin, router]);
    
    if (!isAdmin) {
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
                 <h1 className="text-2xl font-bold">资金管理</h1>
                 <Card>
                    <CardHeader>
                        <CardTitle>所有资金流水</CardTitle>
                    </CardHeader>
                    <CardContent>
                       <Table>
                           <TableHeader>
                               <TableRow>
                                   <TableHead>用户</TableHead>
                                   <TableHead>类型</TableHead>
                                   <TableHead>资产</TableHead>
                                   <TableHead>金额</TableHead>
                                   <TableHead>状态</TableHead>
                                   <TableHead>凭证/地址</TableHead>
                                   <TableHead className="text-right">时间</TableHead>
                               </TableRow>
                           </TableHeader>
                           <TableBody>
                               {transactions.length > 0 ? transactions.map(t => (
                                   <TableRow key={t.id}>
                                       <TableCell className="font-medium">{t.userId}</TableCell>
                                       <TableCell>
                                           <span className={cn("font-semibold", t.type === 'deposit' ? 'text-green-500' : 'text-orange-500')}>
                                               {t.type === 'deposit' ? '充值' : '提现'}
                                            </span>
                                        </TableCell>
                                       <TableCell>{t.asset}</TableCell>
                                       <TableCell>{t.amount.toFixed(2)}</TableCell>
                                       <TableCell>
                                           <Badge variant={statusVariant[t.status]} className={cn(
                                               t.status === 'approved' && 'bg-green-500/20 text-green-500',
                                               t.status === 'pending' && 'bg-yellow-500/20 text-yellow-500',
                                               t.status === 'rejected' && 'bg-red-500/20 text-red-500',
                                           )}>
                                               {statusText[t.status]}
                                           </Badge>
                                       </TableCell>
                                       <TableCell className="text-xs truncate max-w-[150px]">{t.transactionHash || t.address || 'N/A'}</TableCell>
                                       <TableCell className="text-right text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</TableCell>
                                   </TableRow>
                               )) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                                            暂无资金流水记录。
                                        </TableCell>
                                    </TableRow>
                               )}
                           </TableBody>
                       </Table>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
