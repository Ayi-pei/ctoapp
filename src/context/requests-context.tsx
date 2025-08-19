
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { AnyRequest, PasswordResetRequest, Transaction } from '@/types';
import { useAuth } from './auth-context';
import { useBalance } from './balance-context';
import { useLogs } from './logs-context';

const REQUESTS_STORAGE_KEY = 'tradeflow_requests';

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
    const { user, getUserById, updateUser } = useAuth();
    const { adjustBalance, adjustFrozenBalance, confirmWithdrawal, revertWithdrawal } = useBalance();
    const { addLog } = useLogs();
    const [requests, setRequests] = useState<AnyRequest[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from localStorage
    useEffect(() => {
        try {
            const storedRequests = localStorage.getItem(REQUESTS_STORAGE_KEY);
            if (storedRequests) {
                const parsed = JSON.parse(storedRequests);
                // Attach user info to requests on load
                const requestsWithUsers = parsed.map((req: AnyRequest) => ({
                    ...req,
                    user: getUserById(req.user_id) || { username: req.user_id }
                }));
                setRequests(requestsWithUsers);
            }
        } catch (error) {
            console.error("Failed to load requests from localStorage", error);
        }
        setIsLoaded(true);
    }, [getUserById]);

    // Save to localStorage
    useEffect(() => {
        if (isLoaded) {
            try {
                // Don't save the 'user' object to avoid circular dependencies in JSON
                const requestsToStore = requests.map(({ user, ...rest }) => rest);
                localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(requestsToStore));
            } catch (error) {
                console.error("Failed to save requests to localStorage", error);
            }
        }
    }, [requests, isLoaded]);

    const addRequest = useCallback((newRequest: Omit<AnyRequest, 'id' | 'status' | 'created_at' | 'user' | 'user_id'>) => {
        if (!user) return;
    
        const fullRequest = {
            ...newRequest,
            id: `req_${Date.now()}`,
            user_id: user.id,
            status: 'pending' as const,
            created_at: new Date().toISOString(),
            user: { username: user.username },
        };
    
        setRequests(prev => [fullRequest as AnyRequest, ...prev]);
    
    }, [user]);

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
        adjustFrozenBalance(params.asset, params.amount, user.id);
    }, [user, addRequest, adjustFrozenBalance]);

    const addPasswordResetRequest = useCallback(async (newPassword: string) => {
        return new Promise<void>((resolve, reject) => {
            if (!user) {
                reject(new Error("User not logged in."));
                return;
            }
            const request: Omit<PasswordResetRequest, 'id' | 'status' | 'created_at' | 'user_id' | 'user'> = {
                type: 'password_reset',
                new_password: newPassword,
            };
            addRequest(request);
            resolve();
        });
    }, [user, addRequest]);


    const updateRequestStatus = (requestId: string, status: 'approved' | 'rejected') => {
        const request = requests.find(r => r.id === requestId);
        if (!request) return;

        setRequests(prev => prev.map(req => 
            req.id === requestId ? { ...req, status } : req
        ));
        addLog({
            entity_type: 'request',
            entity_id: requestId,
            action: status === 'approved' ? 'approve' : 'reject',
            details: `Request for user ${request.user?.username || request.user_id} was ${status}.`
        });
    };

    const approveRequest = async (requestId: string) => {
        const request = requests.find(r => r.id === requestId);
        if (!request || request.status !== 'pending') return;

        if (request.type === 'deposit' && 'asset' in request && 'amount' in request) {
            adjustBalance(request.user_id, request.asset, request.amount);
        } else if (request.type === 'withdrawal' && 'asset' in request && 'amount' in request) {
            confirmWithdrawal(request.asset, request.amount, request.user_id);
        } else if (request.type === 'password_reset' && 'new_password' in request && request.new_password) {
            await updateUser(request.user_id, { password: request.new_password });
        }
        
        updateRequestStatus(requestId, 'approved');
    };

    const rejectRequest = async (requestId: string) => {
        const request = requests.find(r => r.id === requestId);
        if (!request || request.status !== 'pending') return;

        if (request.type === 'withdrawal' && 'asset' in request && 'amount' in request) {
            revertWithdrawal(request.asset, request.amount, request.user_id);
        }
        
        updateRequestStatus(requestId, 'rejected');
    };

    const deleteRequest = async (requestId: string) => {
        const request = requests.find(r => r.id === requestId);
        if (!request) return;

        setRequests(prev => prev.filter(r => r.id !== requestId));
        addLog({
            entity_type: 'request',
            entity_id: requestId,
            action: 'delete',
            details: `Request for user ${request.user?.username || request.user_id} was deleted.`
        });
    }
    
    const updateRequest = async (requestId: string, updates: Partial<AnyRequest>) => {
        const originalRequest = requests.find(r => r.id === requestId);
        if (!originalRequest) return;
        
        setRequests(prev => prev.map(r => r.id === requestId ? { ...r, ...updates } : r ));

        addLog({
            entity_type: 'request',
            entity_id: requestId,
            action: 'update',
            details: `Request for user ${originalRequest.user?.username || originalRequest.user_id} was updated.`
        });
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
