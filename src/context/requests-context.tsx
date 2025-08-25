
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { AnyRequest, PasswordResetRequest, Transaction } from '@/types';
import { useAuth } from './auth-context';
import { useBalance } from './balance-context';
import { useLogs } from './logs-context';
import { supabase, isSupabaseEnabled } from '@/lib/supabaseClient';

type DepositRequestParams = {
    asset: string;
    amount: number;
    transaction_hash: string;
};

type WithdrawalRequestParams = {
    asset: string;
    amount: number;
    address: string;
};

interface RequestsContextType {
    requests: AnyRequest[];
    addDepositRequest: (params: DepositRequestParams) => void;
    addWithdrawalRequest: (params: WithdrawalRequestParams) => void;
    addPasswordResetRequest: (newPassword: string) => Promise<void>;
    approveRequest: (requestId: string) => Promise<void>;
    rejectRequest: (requestId: string) => Promise<void>;
    deleteRequest: (requestId: string) => Promise<void>;
    updateRequest: (requestId: string, updates: Partial<AnyRequest>) => Promise<void>;
}

const RequestsContext = createContext<RequestsContextType | undefined>(undefined);

export function RequestsProvider({ children }: { children: ReactNode }) {
    const { user, updateUser } = useAuth();
    const { adjustBalance } = useBalance();
    const { addLog } = useLogs();
    const [requests, setRequests] = useState<AnyRequest[]>([]);

    const fetchAllRequests = useCallback(async () => {
        if (!isSupabaseEnabled) return;
        const { data, error } = await supabase
            .from('requests')
            .select('*, user:profiles(username)')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching requests:", error);
        } else {
            setRequests(data as AnyRequest[]);
        }
    }, []);

    useEffect(() => {
        fetchAllRequests();
    }, [fetchAllRequests]);


    const addRequest = useCallback(async (newRequestData: Omit<AnyRequest, 'id' | 'status' | 'created_at' | 'user' | 'user_id'>) => {
        if (!user || !isSupabaseEnabled) return;
    
        const fullRequest = {
            ...newRequestData,
            user_id: user.id,
            status: 'pending' as const,
        };

        const { error } = await supabase.from('requests').insert(fullRequest);
        if (error) {
            console.error("Failed to add request:", error);
        } else {
            await fetchAllRequests(); // Refresh list after adding
        }
    
    }, [user, fetchAllRequests]);

    const addDepositRequest = useCallback((params: DepositRequestParams) => {
        addRequest({
            type: 'deposit',
            ...params
        });
    }, [addRequest]);

    const addWithdrawalRequest = useCallback((params: WithdrawalRequestParams) => {
        if (!user) return;
        addRequest({
            type: 'withdrawal',
            ...params,
        });
        // Freeze balance on request
        adjustBalance(user.id, params.asset, -params.amount); // Decrease available
        adjustBalance(user.id, params.asset, params.amount, true); // Increase frozen
    }, [user, addRequest, adjustBalance]);

    const addPasswordResetRequest = useCallback(async (newPassword: string) => {
        if (!user) {
           throw new Error("User not logged in.");
        }
        const request: Omit<PasswordResetRequest, 'id' | 'status' | 'created_at' | 'user_id' | 'user'> = {
            type: 'password_reset',
            new_password: newPassword,
        };
        await addRequest(request);
    }, [user, addRequest]);


    const processRequest = useCallback(async (requestId: string, action: 'approve' | 'reject') => {
        const request = requests.find(r => r.id === requestId);
        if (!request || request.status !== 'pending' || !isSupabaseEnabled) return;

        const newStatus = action === 'approve' ? 'approved' : 'rejected';

        if (action === 'approve') {
            if (request.type === 'deposit' && 'asset' in request && 'amount' in request) {
                await adjustBalance(request.user_id, request.asset, request.amount);
            } else if (request.type === 'withdrawal' && 'asset' in request && 'amount' in request) {
                 // The frozen amount just needs to be removed.
                await adjustBalance(request.user_id, request.asset, -request.amount, true);
            } else if (request.type === 'password_reset' && 'new_password' in request && request.new_password) {
                await updateUser(request.user_id, { password: request.new_password });
            }
        } else { // 'reject' action
             if (request.type === 'withdrawal' && 'asset' in request && 'amount' in request) {
                // Return amount from frozen to available
                await adjustBalance(request.user_id, request.asset, -request.amount, true); // Decrease frozen
                await adjustBalance(request.user_id, request.asset, request.amount); // Increase available
            }
        }

        const { error } = await supabase.from('requests').update({ status: newStatus }).eq('id', requestId);

        if (error) {
            console.error("Failed to update request status:", error);
            // TODO: Add logic to revert balance changes if status update fails
        } else {
             addLog({
                entity_type: 'request',
                entity_id: requestId,
                action: action,
                details: `Request for user ${request.user?.username || request.user_id} was ${newStatus}.`
            });
            await fetchAllRequests();
        }
    }, [requests, adjustBalance, updateUser, addLog, fetchAllRequests]);


    const approveRequest = async (requestId: string) => {
        await processRequest(requestId, 'approve');
    };

    const rejectRequest = async (requestId: string) => {
        await processRequest(requestId, 'reject');
    };

    const deleteRequest = async (requestId: string) => {
        const { error } = await supabase.from('requests').delete().eq('id', requestId);
        if (error) console.error("Failed to delete request:", error);
        else await fetchAllRequests();
    }
    
    const updateRequest = async (requestId: string, updates: Partial<AnyRequest>) => {
        const { user, ...updateData } = updates; // 'user' is a joined field, cannot be updated directly
        const { error } = await supabase.from('requests').update(updateData).eq('id', requestId);
         if (error) console.error("Failed to update request:", error);
        else await fetchAllRequests();
    }


    const value = { requests, addDepositRequest, addWithdrawalRequest, approveRequest, rejectRequest, addPasswordResetRequest, deleteRequest, updateRequest };

    return (
        <RequestsContext.Provider value={value}>
            {children}
        </RequestsContext.Provider>
    );
}

export function useRequests() {
    const context = useContext(RequestsContext);
    if (context === undefined) {
        throw new Error('useRequests must be used within a RequestsProvider');
    }
    return context;
}
