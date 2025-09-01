
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { AnyRequest, PasswordResetRequest, Transaction } from '@/types';
import { useSimpleAuth } from './simple-custom-auth';
import { useBalance } from './balance-context';
import { useSimpleEnhancedLogs } from './simple-enhanced-logs-context';
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
    const { user, updateUser } = useSimpleAuth();
    const { adjustBalance } = useBalance();
    const { addLog } = useSimpleEnhancedLogs();
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
        if (!isSupabaseEnabled) return;
        
        const channel = supabase
            .channel('requests-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, fetchAllRequests)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
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
        }
        // No need to fetch, realtime will update
    
    }, [user]);

    const addDepositRequest = useCallback((params: DepositRequestParams) => {
        addRequest({
            type: 'deposit',
            ...params
        });
    }, [addRequest]);

    const addWithdrawalRequest = useCallback(async (params: WithdrawalRequestParams) => {
        if (!user) return;
        
        // This function now only submits the request. The balance adjustment will be a separate call.
        await addRequest({
            type: 'withdrawal',
            ...params,
        });

        // The adjust_balance function with is_frozen=true will handle freezing the balance
        await adjustBalance(user.id, params.asset, -params.amount, true);
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

        // The logic for balance adjustment is now much simpler.
        // The backend function will handle the details based on the request type.
        if (action === 'approve') {
            if (request.type === 'deposit' && 'asset' in request && 'amount' in request) {
                await adjustBalance(request.user_id, request.asset, request.amount);
            } else if (request.type === 'withdrawal' && 'asset' in request && 'amount' in request) {
                // Confirm the withdrawal by debiting the frozen balance. isDebitFrozen = true
                await adjustBalance(request.user_id, request.asset, request.amount, true, true);
            } else if (request.type === 'password_reset' && 'new_password' in request && request.new_password) {
                await updateUser(request.user_id, { password: request.new_password });
            }
        } else { // 'reject' action for withdrawal
             if (request.type === 'withdrawal' && 'asset' in request && 'amount' in request) {
                // Revert the frozen amount back to available balance. amount is positive, isFrozen is false, isDebitFrozen is true.
                await adjustBalance(request.user_id, request.asset, -request.amount, true, true);
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
        }
    }, [requests, adjustBalance, updateUser, addLog]);


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

    