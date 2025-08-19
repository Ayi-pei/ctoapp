
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './auth-context';
import { useBalance } from './balance-context';
import { useToast } from '@/hooks/use-toast';

const SWAP_ORDERS_STORAGE_KEY = 'tradeflow_swap_orders_v2';

export type SwapOrder = {
    id: string;
    userId: string;
    username: string;
    fromAsset: string;
    fromAmount: number;
    toAsset: string;
    toAmount: number;
    status: 'open' | 'filled' | 'cancelled';
    createdAt: string;
};

interface SwapContextType {
    orders: SwapOrder[];
    openOrders: SwapOrder[];
    myOrders: SwapOrder[];
    createOrder: (params: Omit<SwapOrder, 'id' | 'userId' | 'username' | 'status' | 'createdAt'>) => boolean;
    fulfillOrder: (orderId: string) => void;
    cancelOrder: (orderId: string) => void;
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

    const createOrder = useCallback((params: Omit<SwapOrder, 'id' | 'userId' | 'username' | 'status' | 'createdAt'>): boolean => {
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

        // Freeze the user's `fromAsset` balance
        adjustFrozenBalance(fromAsset, fromAmount, user.id);
        
        setOrders(prev => [...prev, newOrder]);
        toast({ title: "挂单成功", description: "您的兑换订单已成功创建。" });
        return true;
    }, [user, balances, toast, adjustFrozenBalance]);

    const fulfillOrder = useCallback((orderId: string) => {
        if (!user) {
            toast({ variant: "destructive", title: "请先登录" });
            return;
        }

        const order = orders.find(o => o.id === orderId);
        if (!order || order.status !== 'open') {
            toast({ variant: "destructive", title: "兑换失败", description: "订单不存在或已被兑换。" });
            return;
        }
        
        if (order.userId === user.id) {
             toast({ variant: "destructive", title: "操作无效", description: "您不能兑换自己的订单。" });
            return;
        }

        const { toAsset, toAmount, fromAsset, fromAmount } = order;
        if ((balances[toAsset]?.available || 0) < toAmount) {
            toast({ variant: "destructive", title: "兑换失败", description: `您的 ${toAsset} 余额不足。` });
            return;
        }

        // --- Execute the swap ---
        // 1. Taker (current user) pays `toAsset` and receives `fromAsset`
        adjustBalance(user.id, toAsset, -toAmount);
        adjustBalance(user.id, fromAsset, fromAmount);

        // 2. Maker (order creator) has their frozen `fromAsset` balance confirmed (deducted from frozen)
        // and receives `toAsset`
        adjustFrozenBalance(fromAsset, -fromAmount, order.userId); // This "unfreezes" by removing from frozen
        adjustBalance(order.userId, toAsset, toAmount);

        // 3. Update order status
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'filled' } : o));
        
        toast({ title: "兑换成功！" });
    }, [user, orders, balances, toast, adjustBalance, adjustFrozenBalance]);

    const cancelOrder = useCallback((orderId: string) => {
        if (!user) {
            toast({ variant: "destructive", title: "请先登录" });
            return;
        }
        
        const order = orders.find(o => o.id === orderId);
         if (!order || order.userId !== user.id || order.status !== 'open') {
            toast({ variant: "destructive", title: "操作失败", description: "这不是您的可取消订单。" });
            return;
        }

        // Unfreeze the user's `fromAsset` balance by moving it back to available
        adjustFrozenBalance(order.fromAsset, -order.fromAmount, user.id);

        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
        toast({ title: "订单已取消" });
    }, [user, orders, toast, adjustFrozenBalance]);

    const value: SwapContextType = {
        orders,
        openOrders: orders.filter(o => o.status === 'open' && o.userId !== user?.id),
        myOrders: orders.filter(o => o.userId === user?.id),
        createOrder,
        fulfillOrder,
        cancelOrder,
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
