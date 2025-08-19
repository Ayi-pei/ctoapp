
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
import { ArrowRight, Trash2, LoaderCircle } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCreateOrder = () => {
        setIsSubmitting(true);
        const fromAmountNum = parseFloat(fromAmount);
        const toAmountNum = parseFloat(toAmount);
        if (isNaN(fromAmountNum) || isNaN(toAmountNum) || fromAmountNum <= 0 || toAmountNum <= 0) {
            toast({ variant: "destructive", title: "错误", description: "请输入有效的挂单数量。" });
            setIsSubmitting(false);
            return;
        }

        const success = createOrder({ fromAsset, fromAmount: fromAmountNum, toAsset, toAmount: toAmountNum });
        if(success) {
            setFromAmount("");
            setToAmount("");
        }
        setIsSubmitting(false);
    }
    
    const OrderRow = ({ order, onAction, actionLabel, isMyOrder = false }: { order: SwapOrder, onAction: (id: string) => void, actionLabel: string, isMyOrder?: boolean }) => (
        <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 p-2 border rounded-lg bg-muted/50">
            <div className="flex flex-col items-end text-right">
                <p className="font-bold">{order.fromAmount} <span className="text-xs text-muted-foreground">{order.fromAsset}</span></p>
                <p className="text-xs text-muted-foreground">挂单者: {order.username}</p>
            </div>
            <ArrowRight className="h-5 w-5 text-primary" />
             <div className="flex flex-col items-start">
                <p className="font-bold">{order.toAmount} <span className="text-xs text-muted-foreground">{order.toAsset}</span></p>
                <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
             <AlertDialog>
                <AlertDialogTrigger asChild>
                     <Button 
                        size="sm" 
                        variant={actionLabel === "取消" ? "destructive" : "default"}
                        disabled={(actionLabel === "兑换" && (balances[order.toAsset]?.available || 0) < order.toAmount) || (isMyOrder && order.status !== 'open')}
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
    );

    const MyOrderRow = ({ order }: { order: SwapOrder }) => (
         <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 p-2 border rounded-lg bg-muted/50">
             <div className="flex flex-col items-end text-right">
                <p className="font-bold">{order.fromAmount} <span className="text-xs text-muted-foreground">{order.fromAsset}</span></p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
             <div className="flex flex-col items-start">
                <p className="font-bold">{order.toAmount} <span className="text-xs text-muted-foreground">{order.toAsset}</span></p>
            </div>
            <div className="flex flex-col items-end">
                <Badge variant={order.status === 'filled' ? 'default' : order.status === 'cancelled' ? 'secondary' : 'outline'}>
                    {order.status === 'open' && '挂单中'}
                    {order.status === 'filled' && '已成交'}
                    {order.status === 'cancelled' && '已取消'}
                </Badge>
                {order.status === 'open' && (
                    <Button variant="ghost" size="sm" className="h-auto p-1 mt-1 text-xs text-red-500" onClick={() => cancelOrder(order.id)}>取消</Button>
                )}
            </div>
        </div>
    );


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

                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button className="w-full" disabled={isSubmitting}>
                                     {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                     挂起订单
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>交易规则确认</AlertDialogTitle>
                                    <AlertDialogDescription className="text-left space-y-2 pt-2">
                                        <p>1. 挂单后，您用于卖出的 <strong>{fromAmount} {fromAsset}</strong> 将被暂时冻结。</p>
                                        <p>2. 其他用户接受您的订单后，交易将自动完成。冻结资产将转给对方，您将收到 <strong>{toAmount} {toAsset}</strong>。</p>
                                        <p>3. 在订单被接受前，您可以随时在“我的挂单”中取消。</p>
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setIsSubmitting(false)}>再想想</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleCreateOrder}>我已了解，确定挂单</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardContent>
                </Card>

                 <Tabs defaultValue="market" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="market">兑换市场</TabsTrigger>
                        <TabsTrigger value="my_orders">我的挂单</TabsTrigger>
                    </TabsList>
                    <TabsContent value="market">
                        <Card>
                             <CardContent className="pt-6">
                                <ScrollArea className="h-72">
                                    <div className="space-y-2 pr-4">
                                    {openOrders.length > 0 ? openOrders.map(order => (
                                        <OrderRow key={order.id} order={order} onAction={fulfillOrder} actionLabel="兑换" />
                                    )) : <p className="text-center text-muted-foreground p-8">暂无挂单</p>}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="my_orders">
                       <Card>
                             <CardContent className="pt-6">
                                <ScrollArea className="h-72">
                                    <div className="space-y-2 pr-4">
                                        {myOrders.length > 0 ? myOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(order => (
                                            <MyOrderRow key={order.id} order={order} />
                                        )) : <p className="text-center text-muted-foreground p-8">您还没有挂单</p>}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

            </div>
        </DashboardLayout>
    )
}
