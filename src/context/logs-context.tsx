
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { ActionLog, AnyRequest, User } from '@/types';
import { useAuth } from './auth-context';

const LOGS_STORAGE_KEY = 'tradeflow_action_logs_v2';

type LogParams = {
    entity_type: 'request' | 'task_completion' | 'activity_participation';
    entity_id: string;
    action: 'approve' | 'reject' | 'update' | 'delete' | 'create' | 'user_complete';
    details: string;
    actor?: User; // Optional: specify the user performing the action, defaults to logged-in admin
};

interface LogsContextType {
    logs: ActionLog[];
    addLog: (params: LogParams) => void;
}

const LogsContext = createContext<LogsContextType | undefined>(undefined);

export function LogsProvider({ children }: { children: ReactNode }) {
    const { user: adminUser } = useAuth(); // Renamed to avoid confusion
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
        // The user performing the action can be specified, otherwise it's the logged-in admin
        const actor = params.actor || adminUser;

        if (!actor) {
             console.warn("Log not added: No actor (neither specified nor logged in admin) found.");
             return; 
        }

        const newLog: ActionLog = {
            id: `log_${Date.now()}`,
            entity_type: params.entity_type,
            entity_id: params.entity_id,
            action: params.action,
            details: params.details,
            operator_id: actor.id,
            operator_username: actor.username,
            created_at: new Date().toISOString(),
        };

        setLogs(prev => [newLog, ...prev].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));

    }, [adminUser]);

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
