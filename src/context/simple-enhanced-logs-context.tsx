"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { ActionLog, User } from '@/types';

const LOGS_STORAGE_KEY = 'tradeflow_action_logs_v3';

// 简化的日志参数类型
type SimpleLogParams = {
    entity_type: 'request' | 'task_completion' | 'activity_participation' | 'market_intervention' | 'user_management' | 'system_setting' | 'balance_adjustment';
    entity_id: string;
    action: 'approve' | 'reject' | 'update' | 'delete' | 'create' | 'user_complete' | 'activate' | 'deactivate' | 'freeze' | 'unfreeze' | 'adjust' | 'intervene';
    details: string;
    actor?: User;
    severity?: 'low' | 'medium' | 'high' | 'critical';
};

interface SimpleEnhancedLogsContextType {
    logs: ActionLog[];
    addLog: (params: SimpleLogParams) => void;
    getLogsByEntity: (entityType: string, entityId: string) => ActionLog[];
    exportLogs: (startDate?: Date, endDate?: Date) => string;
}

const SimpleEnhancedLogsContext = createContext<SimpleEnhancedLogsContextType | undefined>(undefined);

export function SimpleEnhancedLogsProvider({ children }: { children: ReactNode }) {
    const [logs, setLogs] = useState<ActionLog[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // 加载日志数据
    useEffect(() => {
        try {
            const storedLogs = localStorage.getItem(LOGS_STORAGE_KEY);
            if (storedLogs) {
                setLogs(JSON.parse(storedLogs));
            }
        } catch (error) {
            console.error("Failed to load logs from localStorage", error);
        }
        setIsLoaded(true);
    }, []);

    // 保存日志数据
    useEffect(() => {
        if (isLoaded) {
            try {
                localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs));
            } catch (error) {
                console.error("Failed to save logs to localStorage", error);
            }
        }
    }, [logs, isLoaded]);

    // 添加日志记录
    const addLog = useCallback((params: SimpleLogParams) => {
        const newLog: ActionLog = {
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            entity_type: params.entity_type,
            entity_id: params.entity_id,
            action: params.action,
            details: params.details,
            operator_id: params.actor?.id || 'system',
            operator_username: params.actor?.username || 'System',
            created_at: new Date().toISOString(),
        };

        setLogs(prev => [newLog, ...prev].slice(0, 1000)); // 保留最近1000条记录

        // 对于高风险操作，输出到控制台
        if (params.severity === 'high' || params.severity === 'critical') {
            console.warn(`[${params.severity.toUpperCase()}] ${params.details}`, newLog);
        }
    }, []);

    // 查询功能
    const getLogsByEntity = useCallback((entityType: string, entityId: string) => {
        return logs.filter(log => log.entity_type === entityType && log.entity_id === entityId);
    }, [logs]);

    // 导出功能
    const exportLogs = useCallback((startDate?: Date, endDate?: Date): string => {
        let dataToExport = logs;

        // 日期过滤
        if (startDate || endDate) {
            dataToExport = logs.filter(item => {
                const itemDate = new Date(item.created_at);
                if (startDate && itemDate < startDate) return false;
                if (endDate && itemDate > endDate) return false;
                return true;
            });
        }

        // 转换为CSV格式
        if (dataToExport.length === 0) return '';
        
        const headers = Object.keys(dataToExport[0]).join(',');
        const rows = dataToExport.map(item => 
            Object.values(item).map(value => 
                typeof value === 'object' ? JSON.stringify(value) : String(value)
            ).join(',')
        );
        
        return [headers, ...rows].join('\n');
    }, [logs]);

    const value: SimpleEnhancedLogsContextType = {
        logs,
        addLog,
        getLogsByEntity,
        exportLogs,
    };

    return (
        <SimpleEnhancedLogsContext.Provider value={value}>
            {children}
        </SimpleEnhancedLogsContext.Provider>
    );
}

export function useSimpleEnhancedLogs() {
    const context = useContext(SimpleEnhancedLogsContext);
    if (context === undefined) {
        throw new Error('useSimpleEnhancedLogs must be used within a SimpleEnhancedLogsProvider');
    }
    return context;
}