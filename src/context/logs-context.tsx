
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { ActionLog, AnyRequest } from '@/types';
import { useAuth } from './auth-context';

const LOGS_STORAGE_KEY = 'tradeflow_action_logs_v2';

type LogParams = {
    entity_type: 'request' | 'task_completion' | 'activity_participation';
    entity_id: string;
    action: 'approve' | 'reject' | 'update' | 'delete' | 'create' | 'user_complete';
    details: string;
};

interface LogsContextType {
    logs: ActionLog[];
    addLog: (params: LogParams) => void;
}

const LogsContext = createContext<LogsContextType | undefined>(undefined);

export function LogsProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
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
        if (!user) return; // A log must be associated with a logged-in user

        const newLog: ActionLog = {
            id: `log_${Date.now()}`,
            ...params,
            operator_id: user.id,
            operator_username: user.username,
            created_at: new Date().toISOString(),
        };

        setLogs(prev => [newLog, ...prev].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));

    }, [user]);

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
