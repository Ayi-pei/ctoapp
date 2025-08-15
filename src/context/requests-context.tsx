

"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { AnyRequest } from '@/types';
import { useAuth } from './auth-context';
import { useBalance } from './balance-context';

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
    approveRequest: (requestId: string) => Promise<void>;
    rejectRequest: (requestId: string) => Promise<void>;
}

const RequestsContext = createContext<RequestsContextType | undefined>(undefined);

export function RequestsProvider({ children }: { children: ReactNode }) {
    const { user, getUserById } = useAuth();
    const { adjustBalance, adjustFrozenBalance, confirmWithdrawal, revertWithdrawal } = useBalance();
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

    const addRequest = useCallback((newRequest: Omit<AnyRequest, 'id' | 'status' | 'created_at'>) => {
        if (!user) return;
        
        const fullRequest: AnyRequest = {
            ...newRequest,
            id: `req_${Date.now()}`,
            user_id: user.id,
            status: 'pending',
            created_at: new Date().toISOString(),
            user: { username: user.username },
        };
        setRequests(prev => [fullRequest, ...prev]);
    }, [user]);

    const addDepositRequest = useCallback((params: DepositRequestParams) => {
        addRequest({
            type: 'deposit',
            ...params
        });
    }, [addRequest]);

    const addWithdrawalRequest = useCallback((params: WithdrawalRequestParams) => {
        addRequest({
            type: 'withdrawal',
            ...params,
        });
        adjustFrozenBalance(params.asset, params.amount);
    }, [addRequest, adjustFrozenBalance]);

    const updateRequestStatus = (requestId: string, status: 'approved' | 'rejected') => {
        setRequests(prev => prev.map(req => 
            req.id === requestId ? { ...req, status } : req
        ));
    };

    const approveRequest = async (requestId: string) => {
        const request = requests.find(r => r.id === requestId);
        if (!request) return;

        if (request.type === 'deposit' && 'asset' in request && 'amount' in request) {
            adjustBalance(request.user_id, request.asset, request.amount);
        } else if (request.type === 'withdrawal' && 'asset' in request && 'amount' in request) {
            confirmWithdrawal(request.asset, request.amount, request.user_id);
        }
        
        updateRequestStatus(requestId, 'approved');
    };

    const rejectRequest = async (requestId: string) => {
        const request = requests.find(r => r.id === requestId);
        if (!request) return;

        if (request.type === 'withdrawal' && 'asset' in request && 'amount' in request) {
            revertWithdrawal(request.asset, request.amount, request.user_id);
        }
        
        updateRequestStatus(requestId, 'rejected');
    };


    const value = { requests, addDepositRequest, addWithdrawalRequest, approveRequest, rejectRequest };

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
