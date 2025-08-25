
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './auth-context';
import { useBalance } from './balance-context';
import { useToast } from '@/hooks/use-toast';
import type { SwapOrder } from '@/types';
import { supabase, isSupabaseEnabled } from '@/lib/supabaseClient';

interface SwapContextType {
    orders: SwapOrder[];
    createOrder: (params: Omit<SwapOrder, 'id' | 'userId' | 'username' | 'status' | 'createdAt' | 'takerId' | 'takerUsername' | 'paymentProofUrl'>) => Promise<boolean>;
    acceptOrder: (orderId: string) => Promise<void>;
    uploadProof: (orderId: string, proofUrl: string) => Promise<void>;
    confirmCompletion: (orderId: string) => Promise<void>;
    cancelOrder: (orderId: string) => Promise<void>;
    relistOrder: (orderId: string) => Promise<void>;
    withdrawOrder: (orderId: string) => Promise<void>;
    reportDispute: (orderId: string) => Promise<void>;
}

const SwapContext = createContext<SwapContextType | undefined>(undefined);

export function SwapProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const { balances, adjustBalance } = useBalance();
    const { toast } = useToast();
    const [orders, setOrders] = useState<SwapOrder[]>([]);

    const fetchOrders = useCallback(async () => {
        if (!isSupabaseEnabled) return;
        const { data, error } = await supabase.from('swap_orders').select('*').order('createdAt', { ascending: false });
        if (error) {
            console.error("Error fetching swap orders:", error);
        } else {
            setOrders(data as SwapOrder[]);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);
    
    // Realtime subscription
    useEffect(() => {
        if (!isSupabaseEnabled) return;
        const channel = supabase.channel('swap_orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'swap_orders' }, () => {
                fetchOrders();
            })
            .subscribe();
            
        return () => {
            supabase.removeChannel(channel);
        }
    }, [fetchOrders]);

    const createOrder = async (params: Omit<SwapOrder, 'id' | 'userId' | 'username' | 'status' | 'createdAt' | 'takerId' | 'takerUsername' | 'paymentProofUrl'>): Promise<boolean> => {
        if (!user || !isSupabaseEnabled) {
            toast({ variant: "destructive", title: "请先登录" });
            return false;
        }

        const { fromAsset, fromAmount } = params;
        if ((balances[fromAsset]?.available || 0) < fromAmount) {
            toast({ variant: "destructive", title: "挂单失败", description: "您的可用余额不足。" });
            return false;
        }

        const newOrder: Omit<SwapOrder, 'id' | 'createdAt'> = {
            userId: user.id,
            username: user.username,
            ...params,
            status: 'open',
        };

        await adjustBalance(user.id, fromAsset, -fromAmount);
        await adjustBalance(user.id, fromAsset, fromAmount, true);

        const { error } = await supabase.from('swap_orders').insert(newOrder);
        if (error) {
            console.error("Error creating swap order:", error);
            // Revert balance change
            await adjustBalance(user.id, fromAsset, fromAmount);
            await adjustBalance(user.id, fromAsset, -fromAmount, true);
            return false;
        }

        toast({ title: "挂单成功", description: "您的兑换订单已成功创建。" });
        return true;
    };

    const acceptOrder = async (orderId: string) => {
        if (!user || !isSupabaseEnabled) {
            toast({ variant: "destructive", title: "请先登录" });
            return;
        }
        
        const { error } = await supabase.from('swap_orders').update({
            status: 'pending_payment',
            takerId: user.id,
            takerUsername: user.username,
        }).eq('id', orderId).eq('status', 'open');

        if (error) {
            console.error("Error accepting order:", error);
            toast({ variant: 'destructive', title: '操作失败', description: '订单可能已被他人接受。' });
        } else {
             toast({ title: "订单已接受", description: "请尽快完成支付并上传凭证。" });
        }
    };

    const uploadProof = async (orderId: string, proofUrl: string) => {
        if (!isSupabaseEnabled) return;
        const { error } = await supabase.from('swap_orders').update({
            status: 'pending_confirmation',
            paymentProofUrl: proofUrl
        }).eq('id', orderId).eq('status', 'pending_payment');
        if (error) console.error("Error uploading proof:", error);
    };

    const confirmCompletion = async (orderId: string) => {
        const order = orders.find(o => o.id === orderId);
        if (!order || order.status !== 'pending_confirmation' || !isSupabaseEnabled) return;

        // Unfreeze and debit seller's `fromAsset`
        await adjustBalance(order.userId, order.fromAsset, -order.fromAmount, true);

        // Credit buyer with `fromAsset`
        if (order.takerId) {
            await adjustBalance(order.takerId, order.fromAsset, order.fromAmount);
        }

        // Credit seller with `toAsset`
        await adjustBalance(order.userId, order.toAsset, order.toAmount);

        // Buyer pays, but this part is off-chain.
        // We assume payment happened.

        const { error } = await supabase.from('swap_orders').update({ status: 'completed' }).eq('id', orderId);
        if (error) {
            console.error("Error confirming completion:", error);
            // TODO: Add logic to revert transfers if status update fails
        } else {
             toast({ title: "交易完成", description: "资产已成功交换。" });
        }
    };

    const cancelOrder = async (orderId: string) => {
        if (!user || !isSupabaseEnabled) return;
        const order = orders.find(o => o.id === orderId);
        if (!order || order.userId !== user.id || order.status !== 'open') return;

        const { error } = await supabase.from('swap_orders').update({ status: 'cancelled' }).eq('id', orderId);
        if (error) console.error("Error cancelling order:", error);
        else toast({ title: "订单已暂停", description: "您可以选择重新挂单或撤销以解冻资产。" });
    };

    const relistOrder = async (orderId: string) => {
        if (!isSupabaseEnabled) return;
        const { error } = await supabase.from('swap_orders').update({ status: 'open' }).eq('id', orderId).eq('status', 'cancelled');
        if (error) console.error("Error relisting order:", error);
        else toast({ title: "订单已重新挂出" });
    };
    
    const withdrawOrder = async (orderId: string) => {
        const order = orders.find(o => o.id === orderId);
        if (!order || order.status !== 'cancelled' || !isSupabaseEnabled) return;
        
        await adjustBalance(order.userId, order.fromAsset, order.fromAmount);
        await adjustBalance(order.userId, order.fromAsset, -order.fromAmount, true);
        
        const { error } = await supabase.from('swap_orders').delete().eq('id', orderId);
        if (error) console.error("Error withdrawing/deleting order:", error);
        else toast({ title: "订单已撤销", description: "冻结的资产已返还。" });
    };

    const reportDispute = async (orderId: string) => {
        if (!isSupabaseEnabled) return;
        const { error } = await supabase.from('swap_orders').update({ status: 'disputed' }).eq('id', orderId);
        if (error) console.error("Error reporting dispute:", error);
        else toast({ title: "申诉已提交", description: "管理员将会介入处理，请留意站内信。", variant: "destructive" });
    };

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
