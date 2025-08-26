
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { ActionLog, User } from '@/types';
import { useAuth } from './auth-context';
import { supabase, isSupabaseEnabled } from '@/lib/supabaseClient';

type LogParams = {
    entity_type: 'request' | 'task_completion' | 'activity_participation' | 'reward';
    entity_id: string;
    action: 'approve' | 'reject' | 'update' | 'delete' | 'create' | 'user_complete';
    details: string;
    actor?: User;
};

interface LogsContextType {
    logs: ActionLog[];
    addLog: (params: LogParams) => Promise<void>;
}

const LogsContext = createContext<LogsContextType | undefined>(undefined);

export function LogsProvider({ children }: { children: ReactNode }) {
    const { user: adminUser } = useAuth();
    const [logs, setLogs] = useState<ActionLog[]>([]);

    const fetchLogs = useCallback(async () => {
        if (!isSupabaseEnabled) return;
        const { data, error } = await supabase.from('action_logs').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error("Error fetching logs:", error);
        } else {
            setLogs(data as ActionLog[]);
        }
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const addLog = async (params: LogParams) => {
        const actor = params.actor || adminUser;
        if (!actor || !isSupabaseEnabled) {
            console.warn("Log not added: No actor or Supabase not enabled.");
            return;
        }

        const newLog: Partial<ActionLog> = {
            entity_type: params.entity_type,
            entity_id: params.entity_id,
            action: params.action,
            details: params.details,
            operator_id: actor.id,
            operator_username: actor.username,
        };

        const { error } = await supabase.from('action_logs').insert(newLog);
        if (error) {
            console.error("Failed to add log:", error);
        } else {
            await fetchLogs(); // Refresh logs after adding a new one
        }
    };

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
