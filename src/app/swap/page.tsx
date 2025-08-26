
"use client";

import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSwap } from "@/context/swap-context";
import type { SwapOrder } from "@/types";
import { useBalance } from "@/context/balance-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { availablePairs } from "@/types";
import { ArrowRight, LoaderCircle, Upload, Eye, CheckCircle, AlertTriangle } from "lucide-react";
import { useSimpleAuth } from '@/context/simple-custom-auth';
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
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";
import { useEnhancedMarket } from "@/context/enhanced-market-data-context";

const availableAssets = [...new Set(availablePairs.flatMap(p => p.split('/')))];

const getStatusBadge = (status: SwapOrder['status']) => {
    switch (status) {
        case 'open': return <Badge variant="outline">开放中</Badge>;
        case 'pending_payment': return <Badge className="bg-yellow-500/20 text-yellow-500">待支付</Badge>;
        case 'pending_confirmation': return <Badge className="bg-blue-500/20 text-blue-500">待确认</Badge>;
        case 'completed': return <Badge className="bg-green-500/20 text-green-500">已完成</Badge>;
        case 'cancelled': return <Badge variant="secondary">已取消</Badge>;
        case 'disputed': return <Badge variant="destructive">申诉中</Badge>;
        default: return <Badge variant="secondary">{status}</Badge>;
    }
}

export default function SwapPage() {
    const { user } = useSimpleAuth();
    const { 
        orders,
        createOrder, 
        acceptOrder,
        cancelOrder,
        relistOrder,
        withdrawOrder,
        uploadProof,
        confirmCompletion,
        reportDispute
    } = useSwap();
    const { balances } = useBalance();
    const { summaryData } = useEnhancedMarket();
    const { toast } = useToast();
    
    const [fromAsset, setFromAsset] = useState("USDT");
    const [toAsset, setToAsset] = useState("BTC");
    const [fromAmount, setFromAmount] = useState("");
    const [toAmount, setToAmount] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lastEdited, setLastEdited] = useState<'from' | 'to'>('from');
    
    const [proofImage, setProofImage] = useState<string | null>(null);
    const [isProofDialogOpen, setIsProofDialogOpen] = useState(false);

    const priceMap = useMemo(() => {
        return summaryData.reduce((acc, item) => {
            const base = item.pair.split('/')[0];
            acc[base] = item.price; // Price is in USDT
            return acc;
        }, {} as Record<string, number>);
    }, [summaryData]);

    useEffect(() => {
        if (lastEdited === 'from') {
            const fromPrice = fromAsset === 'USDT' ? 1 : priceMap[fromAsset];
            const toPrice = toAsset === 'USDT' ? 1 : priceMap[toAsset];
            const fromAmountNum = parseFloat(fromAmount);

            if (fromPrice && toPrice && !isNaN(fromAmountNum) && fromAmountNum > 0) {
                const totalUsdtValue = fromAmountNum * fromPrice;
                const newToAmount = totalUsdtValue / toPrice;
                setToAmount(newToAmount.toFixed(8));
            } else if (fromAmount === "") {
                setToAmount("");
            }
        }
    }, [fromAmount, fromAsset, toAsset, priceMap, lastEdited]);
    
     useEffect(() => {
        if (lastEdited === 'to') {
            const fromPrice = fromAsset === 'USDT' ? 1 : priceMap[fromAsset];
            const toPrice = toAsset === 'USDT' ? 1 : priceMap[toAsset];
            const toAmountNum = parseFloat(toAmount);

            if (fromPrice && toPrice && !isNaN(toAmountNum) && toAmountNum > 0) {
                const totalUsdtValue = toAmountNum * toPrice;
                const newFromAmount = totalUsdtValue / fromPrice;
                setFromAmount(newFromAmount.toFixed(8));
            } else if (toAmount === "") {
                setFromAmount("");
            }
        }
    }, [toAmount, fromAsset, toAsset, priceMap, lastEdited]);

    const handleFromAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFromAmount(e.target.value);
        setLastEdited('from');
    };

    const handleToAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setToAmount(e.target.value);
        setLastEdited('to');
    };


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, orderId: string) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                uploadProof(orderId, reader.result as string);
                toast({ title: '凭证已上传', description: '卖家将会审核您的支付凭证。'});
            };
            reader.readAsDataURL(file);
        }
    };
    
    const openProofDialog = (url: string) => {
        setProofImage(url);
        setIsProofDialogOpen(true);
    }

    const handleCreateOrder = () => {
        setIsSubmitting(true);
        const fromAmountNum = parseFloat(fromAmount);
        const toAmountNum = parseFloat(toAmount);
        if (isNaN(fromAmountNum) || isNaN(toAmountNum) || fromAmountNum <= 0 || toAmountNum <= 0) {
            toast({ variant: "destructive", title: "错误", description: "请输入有效的挂单数量。" });
            setIsSubmitting(false);
            return;
        }

        createOrder({ from_asset: fromAsset, from_amount: fromAmountNum, to_asset: toAsset, to_amount: toAmountNum }).then(success => {
            if(success) {
                setFromAmount("");
                setToAmount("");
            }
        });
        
        setIsSubmitting(false);
    }

    const OrderRow = ({ order }: { order: SwapOrder }) => (
        <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 p-3 border rounded-lg bg-muted/50">
            <div className="flex flex-col items-end text-right">
                <p className="font-bold">{order.from_amount} <span className="text-xs text-muted-foreground">{order.from_asset}</span></p>
                <p className="text-xs text-muted-foreground">挂单者: {order.username}</p>
            </div>
            <ArrowRight className="h-5 w-5 text-primary" />
             <div className="flex flex-col items-start">
                <p className="font-bold">{order.to_amount} <span className="text-xs text-muted-foreground">{order.to_asset}</span></p>
                <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
            </div>
             <Button size="sm" onClick={() => acceptOrder(order.id)}>兑换</Button>
        </div>
    );
    
    const MyOrderRow = ({ order }: { order: SwapOrder }) => (
         <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 p-3 border rounded-lg bg-muted/50">
             <div className="flex flex-col items-end text-right">
                <p className="font-bold">{order.from_amount} <span className="text-xs text-muted-foreground">{order.from_asset}</span></p>
                <p className="text-xs text-muted-foreground">兑换为</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
             <div className="flex flex-col items-start">
                <p className="font-bold">{order.to_amount} <span className="text-xs text-muted-foreground">{order.to_asset}</span></p>
                <p className="text-xs text-muted-foreground">对方: {order.taker_username || '等待中...'}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
                {getStatusBadge(order.status)}
                {order.status === 'open' && (
                    <Button variant="ghost" size="sm" className="h-auto p-1 text-xs text-red-500" onClick={() => cancelOrder(order.id)}>取消挂单</Button>
                )}
                 {order.status === 'cancelled' && (
                    <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="h-auto p-1 text-xs" onClick={() => relistOrder(order.id)}>重新挂单</Button>
                        <Button variant="destructive" size="sm" className="h-auto p-1 text-xs" onClick={() => withdrawOrder(order.id)}>撤销</Button>
                    </div>
                )}
            </div>
        </div>
    );

    const PendingOrderRow = ({ order }: { order: SwapOrder }) => {
        const isBuyer = user?.id === order.taker_id;
        const isSeller = user?.id === order.user_id;
        
        return (
            <div className="flex flex-col gap-3 p-3 border rounded-lg bg-muted/50">
                <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
                    <div className="flex flex-col items-end text-right">
                        <p className="font-bold">{order.from_amount} <span className="text-xs text-muted-foreground">{order.from_asset}</span></p>
                        <p className="text-xs text-muted-foreground">卖家: {order.username}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                     <div className="flex flex-col items-start">
                        <p className="font-bold">{order.to_amount} <span className="text-xs text-muted-foreground">{order.to_asset}</span></p>
                        <p className="text-xs text-muted-foreground">买家: {order.taker_username}</p>
                    </div>
                    {getStatusBadge(order.status)}
                </div>
                <div className="flex justify-end gap-2 items-center">
                    {isBuyer && order.status === 'pending_payment' && (
                        <>
                            <Label htmlFor={`proof-upload-${order.id}`} className="text-sm text-primary cursor-pointer hover:underline">请上传支付凭证</Label>
                            <Input id={`proof-upload-${order.id}`} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, order.id)} />
                        </>
                    )}
                    {isSeller && order.status === 'pending_confirmation' && (
                        <>
                            <p className="text-sm text-blue-500 mr-auto">请核验交易凭证</p>
                            <Button variant="secondary" size="sm" onClick={() => openProofDialog(order.payment_proof_url!)}><Eye className="mr-1 h-4 w-4" />查看</Button>
                            <Button variant="default" size="sm" onClick={() => confirmCompletion(order.id)}><CheckCircle className="mr-1 h-4 w-4"/>成交</Button>
                            <Button variant="destructive" size="sm" onClick={() => reportDispute(order.id)}><AlertTriangle className="mr-1 h-4 w-4"/>申诉</Button>
                        </>
                    )}
                </div>
            </div>
        )
    };


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
                                <Input type="number" placeholder="数量" value={fromAmount} onChange={handleFromAmountChange} />
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
                                 <Input type="number" placeholder="数量" value={toAmount} onChange={handleToAmountChange} />
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
                                        <p>2. 其他用户接受您的订单后，交易将进入待支付/待确认环节，成功后资产才会转移。</p>
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
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="market">兑换市场</TabsTrigger>
                        <TabsTrigger value="pending">待处理</TabsTrigger>
                        <TabsTrigger value="my_orders">我的订单</TabsTrigger>
                    </TabsList>
                    <TabsContent value="market">
                        <Card>
                             <CardContent className="pt-6">
                                <ScrollArea className="h-72">
                                    <div className="space-y-2 pr-4">
                                    {orders.filter(o => o.status === 'open' && o.user_id !== user?.id).length > 0 ? 
                                        orders.filter(o => o.status === 'open' && o.user_id !== user?.id).map(order => (
                                            <OrderRow key={order.id} order={order} />
                                        )) : <p className="text-center text-muted-foreground p-8">暂无挂单</p>
                                    }
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="pending">
                        <Card>
                             <CardContent className="pt-6">
                                <ScrollArea className="h-72">
                                    <div className="space-y-3 pr-4">
                                    {orders.filter(o => (o.status === 'pending_payment' || o.status === 'pending_confirmation') && (o.user_id === user?.id || o.taker_id === user?.id)).length > 0 ? 
                                        orders.filter(o => (o.status === 'pending_payment' || o.status === 'pending_confirmation') && (o.user_id === user?.id || o.taker_id === user?.id)).map(order => (
                                            <PendingOrderRow key={order.id} order={order} />
                                        )) : <p className="text-center text-muted-foreground p-8">没有待处理的订单</p>
                                    }
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
                                        {orders.filter(o => o.user_id === user?.id).length > 0 ? 
                                            orders.filter(o => o.user_id === user?.id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(order => (
                                            <MyOrderRow key={order.id} order={order} />
                                        )) : <p className="text-center text-muted-foreground p-8">您还没有挂单</p>}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                <Dialog open={isProofDialogOpen} onOpenChange={setIsProofDialogOpen}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>支付凭证</DialogTitle></DialogHeader>
                        {proofImage && <Image src={proofImage} alt="Payment Proof" width={500} height={500} className="w-full h-auto object-contain" />}
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    )
}

    