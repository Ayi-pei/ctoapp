
"use client";
import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Transaction } from "@/types";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { EditTransactionDialog } from "@/components/edit-transaction-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useBalance } from "@/context/balance-context";
import { supabase } from "@/lib/supabase";

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

// Define a more specific type for transactions with user data
type TransactionWithUser = Transaction & {
  user: { username: string } | null;
  userId: string;
};


export default function AdminFinancePage() {
    const { isAdmin, user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const { recalculateBalanceForUser } = useBalance();
    const [transactions, setTransactions] = useState<TransactionWithUser[]>([]);

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithUser | null>(null);

    const loadTransactions = useCallback(async () => {
        if (!isAdmin) return;
         try {
            const { data, error } = await supabase
                .from('transactions')
                .select('*, user:users(username)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            const formattedData = data.map((tx: any) => ({
                ...tx,
                userId: tx.user?.username || tx.user_id,
            }));
            
            setTransactions(formattedData as TransactionWithUser[]);
        } catch (error) {
            console.error("Failed to fetch transactions from Supabase", error);
            toast({ variant: "destructive", title: "错误", description: "加载资金流水失败。" });
        }
    }, [isAdmin, toast]);

    useEffect(() => {
        if (isAdmin === false) {
            router.push('/login');
        } else if (isAdmin === true) {
           loadTransactions();
        }
    }, [isAdmin, router, loadTransactions]);
    
    const handleOpenEditDialog = (transaction: TransactionWithUser) => {
        setSelectedTransaction(transaction);
        setIsEditDialogOpen(true);
    };

    const handleOpenDeleteDialog = (transaction: TransactionWithUser) => {
        setSelectedTransaction(transaction);
        setIsDeleteDialogOpen(true);
    }
    
    const handleDeleteTransaction = async () => {
        if (!selectedTransaction) return;
        try {
            const { error } = await supabase.from('transactions').delete().eq('id', selectedTransaction.id);
            if (error) throw error;

            recalculateBalanceForUser(selectedTransaction.user_id);
            
            loadTransactions();
            toast({ title: "成功", description: "交易记录已删除。" });
        } catch (error) {
            toast({ variant: "destructive", title: "错误", description: "删除交易失败。" });
        } finally {
            setIsDeleteDialogOpen(false);
            setSelectedTransaction(null);
        }
    };
    
    const handleSaveTransaction = async (updatedTransaction: Transaction) => {
        try {
            const { error } = await supabase
                .from('transactions')
                .update({
                    type: updatedTransaction.type,
                    asset: updatedTransaction.asset,
                    amount: updatedTransaction.amount,
                    status: updatedTransaction.status,
                    address: updatedTransaction.address,
                    transaction_hash: updatedTransaction.transaction_hash,
                    created_at: updatedTransaction.created_at,
                })
                .eq('id', updatedTransaction.id);
                
            if (error) throw error;
            
            recalculateBalanceForUser(updatedTransaction.user_id);
            
            loadTransactions();
            toast({ title: "成功", description: "交易记录已更新。" });
            
        } catch (error) {
             toast({ variant: "destructive", title: "错误", description: "更新交易失败。" });
        }
    };
    
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
                                   <TableHead>时间</TableHead>
                                   <TableHead className="text-right">操作</TableHead>
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
                                       <TableCell className="text-xs truncate max-w-[150px]">{t.transaction_hash || t.address || 'N/A'}</TableCell>
                                       <TableCell className="text-right text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</TableCell>
                                       <TableCell className="text-right space-x-2">
                                           <Button variant="outline" size="sm" onClick={() => handleOpenEditDialog(t)}>修改</Button>
                                           <Button variant="destructive" size="sm" onClick={() => handleOpenDeleteDialog(t)}>删除</Button>
                                       </TableCell>
                                   </TableRow>
                               )) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                                            暂无资金流水记录。
                                        </TableCell>
                                    </TableRow>
                               )}
                           </TableBody>
                       </Table>
                    </CardContent>
                </Card>
            </div>
            
            {selectedTransaction && (
                <EditTransactionDialog
                    isOpen={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    transaction={selectedTransaction}
                    onSave={handleSaveTransaction}
                />
            )}

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认删除?</AlertDialogTitle>
                        <AlertDialogDescription>
                           此操作无法撤销。这将永久删除该条交易记录。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setSelectedTransaction(null)}>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteTransaction}>确认删除</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </DashboardLayout>
    );
}
    