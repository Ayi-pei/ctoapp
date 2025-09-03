"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { ActionLog, AnyRequest, User } from '@/types';
import { useSimpleAuth } from './simple-custom-auth';

const LOGS_STORAGE_KEY = 'tradeflow_action_logs_v3';
const AUDIT_LOGS_STORAGE_KEY = 'tradeflow_audit_logs_v1';
const INTERVENTION_LOGS_STORAGE_KEY = 'tradeflow_intervention_logs_v1';

// 扩展的日志类型
type EnhancedLogParams = {
    entity_type: 'request' | 'task_completion' | 'activity_participation' | 'market_intervention' | 'user_management' | 'system_setting' | 'balance_adjustment';
    entity_id: string;
    action: 'approve' | 'reject' | 'update' | 'delete' | 'create' | 'user_complete' | 'activate' | 'deactivate' | 'freeze' | 'unfreeze' | 'adjust' | 'intervene';
    details: string;
    actor?: User;
    metadata?: Record<string, any>; // 额外的结构化数据
    severity?: 'low' | 'medium' | 'high' | 'critical'; // 操作严重性级别
    ipAddress?: string;
    userAgent?: string;
};

// 审计日志接口
interface AuditLog {
    id: string;
    adminId: string;
    adminUsername: string;
    action: string;
    targetType: string;
    targetId: string;
    before?: Record<string, any>;
    after?: Record<string, any>;
    timestamp: number;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
}

// 市场干预专用日志
interface MarketInterventionLog {
    id: string;
    interventionId: string;
    tradingPair: string;
    adminId: string;
    adminUsername: string;
    action: 'create' | 'modify' | 'delete' | 'activate' | 'deactivate';
    timestamp: number;
    originalPrice?: number;
    adjustedPrice?: number;
    priceDeviation?: number;
    interventionConfig: {
        startTime: string;
        endTime: string;
        minPrice: number;
        maxPrice: number;
        trend: string;
    };
    reason: string;
    duration?: number; // 干预持续时间（毫秒）
}

// 性能监控指标
interface PerformanceMetrics {
    interventionExecutionTime: Map<string, number>;
    priceDeviationHistory: Map<string, number[]>;
    userImpactCount: Map<string, number>;
    systemLoad: {
        timestamp: number;
        cpuUsage?: number;
        memoryUsage?: number;
        activeUsers: number;
        activeInterventions: number;
    }[];
}

interface EnhancedLogsContextType {
    logs: ActionLog[];
    auditLogs: AuditLog[];
    interventionLogs: MarketInterventionLog[];
    performanceMetrics: PerformanceMetrics;
    addLog: (params: EnhancedLogParams) => void;
    addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => void;
    addInterventionLog: (log: Omit<MarketInterventionLog, 'id' | 'timestamp'>) => void;
    trackPerformance: (interventionId: string, executionTime: number, priceImpact?: number) => void;
    getLogsByEntity: (entityType: string, entityId: string) => ActionLog[];
    getAuditLogsByAdmin: (adminId: string) => AuditLog[];
    getInterventionLogsByPair: (tradingPair: string) => MarketInterventionLog[];
    exportLogs: (type: 'action' | 'audit' | 'intervention', startDate?: Date, endDate?: Date) => string;
}

const EnhancedLogsContext = createContext<EnhancedLogsContextType | undefined>(undefined);

export function EnhancedLogsProvider({ children }: { children: ReactNode }) {
    const { user: adminUser } = useSimpleAuth();
    const [logs, setLogs] = useState<ActionLog[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [interventionLogs, setInterventionLogs] = useState<MarketInterventionLog[]>([]);
    const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
        interventionExecutionTime: new Map(),
        priceDeviationHistory: new Map(),
        userImpactCount: new Map(),
        systemLoad: []
    });
    const [isLoaded, setIsLoaded] = useState(false);

    // 获取客户端信息
    const getClientInfo = useCallback(() => {
        if (typeof window === 'undefined') return {};
        return {
            ipAddress: 'client-side', // 在实际应用中应该从服务器获取
            userAgent: navigator.userAgent,
            sessionId: sessionStorage.getItem('sessionId') || `session_${Date.now()}`
        };
    }, []);

    // 加载所有日志数据
    useEffect(() => {
        try {
            // 加载操作日志
            const storedLogs = localStorage.getItem(LOGS_STORAGE_KEY);
            if (storedLogs) {
                setLogs(JSON.parse(storedLogs));
            }

            // 加载审计日志
            const storedAuditLogs = localStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
            if (storedAuditLogs) {
                setAuditLogs(JSON.parse(storedAuditLogs));
            }

            // 加载干预日志
            const storedInterventionLogs = localStorage.getItem(INTERVENTION_LOGS_STORAGE_KEY);
            if (storedInterventionLogs) {
                setInterventionLogs(JSON.parse(storedInterventionLogs));
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
                localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(auditLogs));
                localStorage.setItem(INTERVENTION_LOGS_STORAGE_KEY, JSON.stringify(interventionLogs));
            } catch (error) {
                console.error("Failed to save logs to localStorage", error);
            }
        }
    }, [logs, auditLogs, interventionLogs, isLoaded]);

    // 增强的操作日志记录
    const addLog = useCallback((params: EnhancedLogParams) => {
        const actor = params.actor || adminUser;
        if (!actor) {
            console.warn("Log not added: No actor found.");
            return;
        }

        const clientInfo = getClientInfo();
        const newLog: ActionLog = {
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            entity_type: params.entity_type,
            entity_id: params.entity_id,
            action: params.action,
            details: params.details,
            operator_id: actor.id,
            operator_username: actor.username,
            created_at: new Date().toISOString(),
        };

        setLogs(prev => [newLog, ...prev].slice(0, 5000)); // 保留最近5000条记录

        // 对于高风险操作，同时记录审计日志
        if (params.severity === 'high' || params.severity === 'critical') {
            addAuditLog({
                adminId: actor.id,
                adminUsername: actor.username,
                action: params.action,
                targetType: params.entity_type,
                targetId: params.entity_id,
                description: params.details,
                severity: params.severity,
                ...clientInfo
            });
        }
    }, [adminUser, getClientInfo]);

    // 审计日志记录
    const addAuditLog = useCallback((log: Omit<AuditLog, 'id' | 'timestamp'>) => {
        const newAuditLog: AuditLog = {
            ...log,
            id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
        };

        setAuditLogs(prev => [newAuditLog, ...prev].slice(0, 2000)); // 保留最近2000条审计记录

        // 关键操作实时告警
        if (log.severity === 'critical') {
            console.warn('CRITICAL AUDIT EVENT:', newAuditLog);
            // 在实际应用中，这里应该发送告警通知
        }
    }, []);

    // 市场干预日志记录
    const addInterventionLog = useCallback((log: Omit<MarketInterventionLog, 'id' | 'timestamp'>) => {
        const newInterventionLog: MarketInterventionLog = {
            ...log,
            id: `intervention_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
        };

        setInterventionLogs(prev => [newInterventionLog, ...prev].slice(0, 1000)); // 保留最近1000条干预记录

        // 大幅价格偏差告警
        if (log.priceDeviation && log.priceDeviation > 0.1) {
            console.warn('Large price deviation detected:', newInterventionLog);
        }
    }, []);

    // 性能监控
    const trackPerformance = useCallback((interventionId: string, executionTime: number, priceImpact?: number) => {
        setPerformanceMetrics(prev => {
            const newMetrics = { ...prev };
            
            // 记录执行时间
            newMetrics.interventionExecutionTime.set(interventionId, executionTime);
            
            // 记录价格影响
            if (priceImpact !== undefined) {
                const history = newMetrics.priceDeviationHistory.get(interventionId) || [];
                history.push(priceImpact);
                newMetrics.priceDeviationHistory.set(interventionId, history.slice(-100)); // 保留最近100次记录
            }
            
            // 记录系统负载
            const currentLoad = {
                timestamp: Date.now(),
                activeUsers: 0, // 在实际应用中应该从用户上下文获取
                activeInterventions: interventionLogs.filter(log => 
                    Date.now() - log.timestamp < 24 * 60 * 60 * 1000 // 24小时内的干预
                ).length
            };
            newMetrics.systemLoad = [...newMetrics.systemLoad, currentLoad].slice(-1000); // 保留最近1000个负载记录
            
            return newMetrics;
        });
    }, [interventionLogs]);

    // 查询功能
    const getLogsByEntity = useCallback((entityType: string, entityId: string) => {
        return logs.filter(log => log.entity_type === entityType && log.entity_id === entityId);
    }, [logs]);

    const getAuditLogsByAdmin = useCallback((adminId: string) => {
        return auditLogs.filter(log => log.adminId === adminId);
    }, [auditLogs]);

    const getInterventionLogsByPair = useCallback((tradingPair: string) => {
        return interventionLogs.filter(log => log.tradingPair === tradingPair);
    }, [interventionLogs]);

    // 导出功能
    const exportLogs = useCallback((
        type: 'action' | 'audit' | 'intervention', 
        startDate?: Date, 
        endDate?: Date
    ): string => {
        let dataToExport: Array<Record<string, any>> = [];
        
        switch (type) {
            case 'action':
                dataToExport = logs;
                break;
            case 'audit':
                dataToExport = auditLogs;
                break;
            case 'intervention':
                dataToExport = interventionLogs;
                break;
        }

        // 日期过滤
        if (startDate || endDate) {
            dataToExport = dataToExport.filter(item => {
                const itemDate = new Date(item.created_at || item.timestamp);
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
    }, [logs, auditLogs, interventionLogs]);

    const value: EnhancedLogsContextType = {
        logs,
        auditLogs,
        interventionLogs,
        performanceMetrics,
        addLog,
        addAuditLog,
        addInterventionLog,
        trackPerformance,
        getLogsByEntity,
        getAuditLogsByAdmin,
        getInterventionLogsByPair,
        exportLogs,
    };

    return (
        <EnhancedLogsContext.Provider value={value}>
            {children}
        </EnhancedLogsContext.Provider>
    );
}

export function useEnhancedLogs() {
    const context = useContext(EnhancedLogsContext);
    if (context === undefined) {
        throw new Error('useEnhancedLogs must be used within an EnhancedLogsProvider');
    }
    return context;
}