

"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './auth-context';
import { useBalance } from './balance-context';
import { useToast } from '@/hooks/use-toast';
import { SwapOrder } from '@/types';

export type { SwapOrder } from '@/types';

const SWAP_ORDERS_STORAGE_KEY = 'tradeflow_swap_orders_v3';

interface SwapContextType {
    orders: SwapOrder[];
    createOrder: (params: Omit<SwapOrder, 'id' | 'userId' | 'username' | 'status' | 'createdAt' | 'takerId' | 'takerUsername' | 'paymentProofUrl'>) => boolean;
    acceptOrder: (orderId: string) => void;
    uploadProof: (orderId: string, proofUrl: string) => void;
    confirmCompletion: (orderId: string) => void;
    cancelOrder: (orderId: string) => void;
    relistOrder: (orderId: string) => void;
    withdrawOrder: (orderId: string) => void;
    reportDispute: (orderId: string) => void;
}

const SwapContext = createContext<SwapContextType | undefined>(undefined);

export function SwapProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const { balances, adjustBalance, adjustFrozenBalance } = useBalance();
    const { toast } = useToast();
    const [orders, setOrders] = useState<SwapOrder[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load orders from localStorage
    useEffect(() => {
        try {
            const storedOrders = localStorage.getItem(SWAP_ORDERS_STORAGE_KEY);
            if (storedOrders) {
                setOrders(JSON.parse(storedOrders));
            }
        } catch (e) {
            console.error("Failed to load swap orders", e);
        }
        setIsLoaded(true);
    }, []);

    // Save orders to localStorage
    useEffect(() => {
        if (isLoaded) {
            try {
                localStorage.setItem(SWAP_ORDERS_STORAGE_KEY, JSON.stringify(orders));
            } catch (e) {
                console.error("Failed to save swap orders", e);
            }
        }
    }, [orders, isLoaded]);

    const createOrder = useCallback((params: Omit<SwapOrder, 'id' | 'userId' | 'username' | 'status' | 'createdAt' | 'takerId' | 'takerUsername' | 'paymentProofUrl'>): boolean => {
        if (!user) {
            toast({ variant: "destructive", title: "请先登录" });
            return false;
        }

        const { fromAsset, fromAmount } = params;
        if ((balances[fromAsset]?.available || 0) < fromAmount) {
            toast({ variant: "destructive", title: "挂单失败", description: "您的可用余额不足。" });
            return false;
        }

        const newOrder: SwapOrder = {
            id: `swap-${Date.now()}`,
            userId: user.id,
            username: user.username,
            ...params,
            status: 'open',
            createdAt: new Date().toISOString(),
        };

        adjustFrozenBalance(fromAsset, fromAmount, user.id);
        
        setOrders(prev => [...prev, newOrder]);
        toast({ title: "挂单成功", description: "您的兑换订单已成功创建。" });
        return true;
    }, [user, balances, toast, adjustFrozenBalance]);

    const acceptOrder = useCallback((orderId: string) => {
        if (!user) {
            toast({ variant: "destructive", title: "请先登录" });
            return;
        }

        setOrders(prev => prev.map(o => {
            if (o.id === orderId && o.status === 'open') {
                toast({ title: "订单已接受", description: "请尽快完成支付并上传凭证。" });
                return { 
                    ...o, 
                    status: 'pending_payment',
                    takerId: user.id,
                    takerUsername: user.username,
                };
            }
            return o;
        }));
    }, [user, toast]);

    const uploadProof = useCallback((orderId: string, proofUrl: string) => {
        setOrders(prev => prev.map(o => {
            if (o.id === orderId && o.status === 'pending_payment') {
                return { ...o, status: 'pending_confirmation', paymentProofUrl: proofUrl };
            }
            return o;
        }));
    }, []);

    const confirmCompletion = useCallback((orderId: string) => {
        const order = orders.find(o => o.id === orderId);
        if (!order || order.status !== 'pending_confirmation') return;

        // Finalize asset transfer
        // 1. Unfreeze and debit seller's (maker) `fromAsset`
        adjustFrozenBalance(order.fromAsset, -order.fromAmount, order.userId);

        // 2. Debit buyer's (taker) `toAsset` (This should have been frozen ideally, but for now we debit directly)
        // For a more robust system, we should freeze buyer's asset on `acceptOrder`.
        // We assume buyer has the funds for simplicity here.
        adjustBalance(order.takerId!, order.toAsset, -order.toAmount);

        // 3. Credit seller (maker) with `toAsset`
        adjustBalance(order.userId, order.toAsset, order.toAmount);

        // 4. Credit buyer (taker) with `fromAsset`
        adjustBalance(order.takerId!, order.fromAsset, order.fromAmount);

        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'completed' } : o));
        toast({ title: "交易完成", description: "资产已成功交换。" });
    }, [orders, adjustBalance, adjustFrozenBalance, toast]);

    const cancelOrder = useCallback((orderId: string) => {
        if (!user) return;
        const order = orders.find(o => o.id === orderId);
        if (!order || order.userId !== user.id || order.status !== 'open') return;

        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
        toast({ title: "订单已暂停", description: "您可以选择重新挂单或撤销以解冻资产。" });
    }, [user, orders, toast]);

    const relistOrder = useCallback((orderId: string) => {
        setOrders(prev => prev.map(o => o.id === orderId && o.status === 'cancelled' ? { ...o, status: 'open' } : o));
        toast({ title: "订单已重新挂出" });
    }, [toast]);
    
    const withdrawOrder = useCallback((orderId: string) => {
        const order = orders.find(o => o.id === orderId);
        if (!order || order.status !== 'cancelled') return;
        
        adjustFrozenBalance(order.fromAsset, -order.fromAmount, order.userId);
        
        // Effectively remove the order or mark it as withdrawn to hide it
        setOrders(prev => prev.filter(o => o.id !== orderId));
        toast({ title: "订单已撤销", description: "冻结的资产已返还。" });
    }, [orders, adjustFrozenBalance, toast]);

    const reportDispute = useCallback((orderId: string) => {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'disputed' } : o));
        toast({ title: "申诉已提交", description: "管理员将会介入处理，请留意站内信。", variant: "destructive" });
    }, [toast]);

    const value: SwapContextType = {
        orders,
        createOrder,
        acceptOrder,
        uploadProof,
        confirmCompletion,
        cancelOrder,
        relistOrder,
        withdrawOrder,
        reportDispute,
    };

    return (
        <SwapContext.Provider value={value}>
            {children}
        </SwapContext.Provider>
    );
}

export function useSwap() {
    const context = useContext(SwapContext);
    if (context === undefined) {
        throw new Error('useSwap must be used within a SwapProvider');
    }
    return context;
}
