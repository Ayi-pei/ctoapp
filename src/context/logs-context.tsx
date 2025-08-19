
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { ActionLog, AnyRequest } from '@/types';
import { useAuth } from './auth-context';

const LOGS_STORAGE_KEY = 'tradeflow_action_logs';

type LogParams = {
    entity_type: 'request';
    entity_id: string;
    action: 'approve' | 'reject' | 'update' | 'delete' | 'create';
    details: string;
};

interface LogsContextType {
    logs: ActionLog[];
    addLog: (params: LogParams) => void;
}

const LogsContext = createContext<LogsContextType | undefined>(undefined);

export function LogsProvider({ children }: { children: ReactNode }) {
    const { user, isAdmin } = useAuth();
    const [logs, setLogs] = useState<ActionLog[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from localStorage
    useEffect(() => {
        try {
            const storedLogs = localStorage.getItem(LOGS_STORAGE_KEY);
            if (storedLogs) {
                setLogs(JSON.parse(storedLogs));
            }
        } catch (error) {
            console.error("Failed to load action logs from localStorage", error);
        }
        setIsLoaded(true);
    }, []);

    // Save to localStorage
    useEffect(() => {
        if (isLoaded) {
            try {
                localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs));
            } catch (error) {
                console.error("Failed to save action logs to localStorage", error);
            }
        }
    }, [logs, isLoaded]);

    const addLog = useCallback((params: LogParams) => {
        if (!user || !isAdmin) return;

        const newLog: ActionLog = {
            id: `log_${Date.now()}`,
            ...params,
            operator_id: user.id,
            operator_username: user.username,
            created_at: new Date().toISOString(),
        };

        setLogs(prev => [newLog, ...prev]);

    }, [user, isAdmin]);

    const value = { logs, addLog };

    return (
        <LogsContext.Provider value={value}>
            {children}
        </LogsContext.Provider>
    );
}

export function useLogs() {
    const context = useContext(LogsContext);
    if (context === undefined) {
        throw new Error('useLogs must be used within a LogsProvider');
    }
    return context;
}
