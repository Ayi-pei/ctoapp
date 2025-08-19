
"use client";

import { useState } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSwap, SwapOrder } from "@/context/swap-context";
import { useBalance } from "@/context/balance-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { availablePairs } from "@/types";
import { ArrowRight, Trash2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const availableAssets = [...new Set(availablePairs.flatMap(p => p.split('/')))];

export default function SwapPage() {
    const { user } = useAuth();
    const { openOrders, myOrders, createOrder, fulfillOrder, cancelOrder } = useSwap();
    const { balances } = useBalance();
    const { toast } = useToast();
    
    const [fromAsset, setFromAsset] = useState("USDT");
    const [toAsset, setToAsset] = useState("BTC");
    const [fromAmount, setFromAmount] = useState("");
    const [toAmount, setToAmount] = useState("");

    const handleCreateOrder = () => {
        const fromAmountNum = parseFloat(fromAmount);
        const toAmountNum = parseFloat(toAmount);
        if (isNaN(fromAmountNum) || isNaN(toAmountNum) || fromAmountNum <= 0 || toAmountNum <= 0) {
            toast({ variant: "destructive", title: "错误", description: "请输入有效的挂单数量。" });
            return;
        }
        createOrder({ fromAsset, fromAmount: fromAmountNum, toAsset, toAmount: toAmountNum });
        setFromAmount("");
        setToAmount("");
    }
    
    const OrderRow = ({ order, onAction, actionLabel }: { order: SwapOrder, onAction: (id: string) => void, actionLabel: string }) => (
        <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 p-2 border rounded-lg bg-muted/50">
            <div className="flex flex-col items-end text-right">
                <p className="font-bold">{order.fromAmount} <span className="text-xs text-muted-foreground">{order.fromAsset}</span></p>
                <p className="text-xs text-muted-foreground">挂单者: {order.username}</p>
            </div>
            <ArrowRight className="h-5 w-5 text-primary" />
             <div className="flex flex-col items-start">
                <p className="font-bold">{order.toAmount} <span className="text-xs text-muted-foreground">{order.toAsset}</span></p>
                <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</p>
            </div>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                     <Button 
                        size="sm" 
                        variant={actionLabel === "取消" ? "destructive" : "default"}
                        disabled={actionLabel === "兑换" && balances[order.toAsset]?.available < order.toAmount}
                     >
                        {actionLabel}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认{actionLabel}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            您确定要{actionLabel}这笔兑换订单吗？
                            {actionLabel === "兑换" && `您将用 ${order.toAmount} ${order.toAsset} 兑换 ${order.fromAmount} ${order.fromAsset}。`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>再想想</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onAction(order.id)}>确认</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )

    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6">
                <h1 className="text-2xl font-bold">闪兑中心 (P2P)</h1>
                
                <Card>
                    <CardHeader>
                        <CardTitle>创建兑换挂单</CardTitle>
                        <CardDescription>发起一个兑换订单，等待其他用户来与您成交。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="flex-1 space-y-2">
                                <Label>卖出</Label>
                                <Select value={fromAsset} onValueChange={setFromAsset}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        {availableAssets.map(asset => <SelectItem key={asset} value={asset}>{asset}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Input type="number" placeholder="数量" value={fromAmount} onChange={e => setFromAmount(e.target.value)} />
                                <p className="text-xs text-muted-foreground">可用: {(balances[fromAsset]?.available || 0).toFixed(4)}</p>
                            </div>
                            <ArrowRight className="h-6 w-6 mt-8 text-muted-foreground" />
                            <div className="flex-1 space-y-2">
                                <Label>买入</Label>
                                <Select value={toAsset} onValueChange={setToAsset}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        {availableAssets.map(asset => <SelectItem key={asset} value={asset}>{asset}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                 <Input type="number" placeholder="数量" value={toAmount} onChange={e => setToAmount(e.target.value)} />
                            </div>
                        </div>
                        <Button onClick={handleCreateOrder} className="w-full">挂单</Button>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>兑换市场</CardTitle>
                            <CardDescription>选择一个订单进行兑换</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-72">
                                <div className="space-y-2 pr-4">
                                {openOrders.length > 0 ? openOrders.map(order => (
                                    <OrderRow key={order.id} order={order} onAction={fulfillOrder} actionLabel="兑换" />
                                )) : <p className="text-center text-muted-foreground p-8">暂无挂单</p>}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>我的挂单</CardTitle>
                             <CardDescription>管理您自己创建的订单</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <ScrollArea className="h-72">
                                <div className="space-y-2 pr-4">
                                    {myOrders.length > 0 ? myOrders.map(order => (
                                        <OrderRow key={order.id} order={order} onAction={cancelOrder} actionLabel="取消" />
                                    )) : <p className="text-center text-muted-foreground p-8">您还没有挂单</p>}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </DashboardLayout>
    )
}
