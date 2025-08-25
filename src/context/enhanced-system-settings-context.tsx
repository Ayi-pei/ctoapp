"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { availablePairs } from '@/types';
// import { useEnhancedLogs } from './enhanced-logs-context'; // 临时注释避免循环依赖

const SETTINGS_STORAGE_KEY = 'tradeflow_system_settings_v5';

// 增强的交易对设置
export type EnhancedTradingPairSettings = {
    isTradingHalted: boolean; 
    baseProfitRate: number;
    maxDailyVolume?: number;
    priceFluctuationLimit?: number; // 价格波动限制百分比
    emergencyStop?: boolean; // 紧急停止开关
};

// 增强的市场干预规则
export type EnhancedMarketIntervention = {
    id: string;
    tradingPair: string;
    startTime: string; // HH:MM
    endTime: string;   // HH:MM
    startDate?: string; // YYYY-MM-DD
    endDate?: string;   // YYYY-MM-DD
    minPrice: number;
    maxPrice: number;
    trend: 'up' | 'down' | 'random';
    priority: number; // 1-10, 数字越大优先级越高
    conflictResolution: 'override' | 'blend' | 'ignore';
    timezone?: string;
    recurring?: {
        type: 'daily' | 'weekly' | 'monthly';
        days?: number[]; // 0=Sunday, 1=Monday, etc.
        interval?: number; // 每N天/周/月重复一次
    };
    isActive: boolean;
    createdBy: string;
    createdAt: string;
    lastModifiedBy?: string;
    lastModifiedAt?: string;
    description?: string;
    maxPriceDeviation?: number; // 最大允许价格偏差
    smoothTransition?: boolean; // 是否启用平滑过渡
    transitionDuration?: number; // 过渡持续时间（毫秒）
};

// 风险控制设置
export type RiskControlSettings = {
    maxInterventionsPerDay: number;
    maxPriceDeviationGlobal: number; // 全局最大价格偏差
    autoStopLossThreshold: number; // 自动止损阈值
    emergencyContactEmail?: string;
    alertThresholds: {
        largeVolumeAlert: number;
        rapidPriceChangeAlert: number;
        systemLoadAlert: number;
    };
};

// 系统监控设置
export type SystemMonitoringSettings = {
    enableRealTimeMonitoring: boolean;
    logRetentionDays: number;
    performanceMetricsEnabled: boolean;
    alertNotificationsEnabled: boolean;
    autoBackupEnabled: boolean;
    backupIntervalHours: number;
};

export type EnhancedSystemSettings = {
    depositAddresses: {
        USDT: string;
        ETH: string;
        BTC: string;
        USD: string;
    };
    contractTradingEnabled: boolean;
    marketSettings: { [key: string]: EnhancedTradingPairSettings };
    marketInterventions: EnhancedMarketIntervention[];
    riskControl: RiskControlSettings;
    systemMonitoring: SystemMonitoringSettings;
    lastBackupTime?: string;
    systemVersion: string;
};

interface EnhancedSystemSettingsContextType {
    systemSettings: EnhancedSystemSettings;
    updateDepositAddress: (asset: keyof EnhancedSystemSettings['depositAddresses'], value: string) => void;
    updateSetting: <K extends keyof Omit<EnhancedSystemSettings, 'marketSettings' | 'marketInterventions' | 'riskControl' | 'systemMonitoring'>>(key: K, value: EnhancedSystemSettings[K]) => void;
    updatePairSettings: (pair: string, newSettings: Partial<EnhancedTradingPairSettings>) => void;
    updateRiskControlSettings: (newSettings: Partial<RiskControlSettings>) => void;
    updateSystemMonitoringSettings: (newSettings: Partial<SystemMonitoringSettings>) => void;
    
    // 增强的干预管理功能
    addMarketIntervention: (intervention?: Partial<EnhancedMarketIntervention>) => string;
    removeMarketIntervention: (id: string) => void;
    updateMarketIntervention: (id: string, updates: Partial<EnhancedMarketIntervention>) => void;
    activateIntervention: (id: string) => void;
    deactivateIntervention: (id: string) => void;
    
    // 时间逻辑验证
    isInterventionActiveNow: (intervention: EnhancedMarketIntervention) => boolean;
    getActiveInterventions: (tradingPair?: string) => EnhancedMarketIntervention[];
    resolveInterventionConflicts: (interventions: EnhancedMarketIntervention[]) => EnhancedMarketIntervention | null;
    
    // 验证和安全
    validateInterventionSettings: (intervention: Partial<EnhancedMarketIntervention>) => { valid: boolean; errors: string[] };
    exportSettings: () => string;
    importSettings: (settingsJson: string) => { success: boolean; error?: string };
    createBackup: () => void;
    restoreFromBackup: (backupData: string) => { success: boolean; error?: string };
}

// 默认设置
const getDefaultPairSettings = (): EnhancedTradingPairSettings => ({
    isTradingHalted: false,
    baseProfitRate: 0.85,
    maxDailyVolume: 1000000,
    priceFluctuationLimit: 0.1,
    emergencyStop: false,
});

const defaultRiskControlSettings: RiskControlSettings = {
    maxInterventionsPerDay: 10,
    maxPriceDeviationGlobal: 0.2,
    autoStopLossThreshold: 0.15,
    alertThresholds: {
        largeVolumeAlert: 100000,
        rapidPriceChangeAlert: 0.05,
        systemLoadAlert: 0.8,
    },
};

const defaultSystemMonitoringSettings: SystemMonitoringSettings = {
    enableRealTimeMonitoring: true,
    logRetentionDays: 30,
    performanceMetricsEnabled: true,
    alertNotificationsEnabled: true,
    autoBackupEnabled: true,
    backupIntervalHours: 24,
};

const defaultMarketSettings: { [key: string]: EnhancedTradingPairSettings } = availablePairs.reduce((acc, pair) => {
    acc[pair] = getDefaultPairSettings();
    return acc;
}, {} as { [key: string]: EnhancedTradingPairSettings });

const defaultEnhancedSystemSettings: EnhancedSystemSettings = {
    depositAddresses: {
        USDT: "",
        ETH: "",
        BTC: "",
        USD: "",
    },
    contractTradingEnabled: true,
    marketSettings: defaultMarketSettings,
    marketInterventions: [],
    riskControl: defaultRiskControlSettings,
    systemMonitoring: defaultSystemMonitoringSettings,
    systemVersion: "2.0.0",
};

// 增强的时间逻辑函数
const isTimeInRange = (currentTime: Date, startTime: string, endTime: string): boolean => {
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    // 处理跨日情况 (例如: 23:00 - 01:00)
    if (startMinutes > endMinutes) {
        return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
    
    // 正常情况 (例如: 09:00 - 17:00)
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};

const isDateInRange = (currentDate: Date, startDate?: string, endDate?: string): boolean => {
    if (!startDate && !endDate) return true;
    
    const current = currentDate.toISOString().split('T')[0];
    
    if (startDate && current < startDate) return false;
    if (endDate && current > endDate) return false;
    
    return true;
};

const isRecurringActive = (currentDate: Date, recurring?: EnhancedMarketIntervention['recurring']): boolean => {
    if (!recurring) return true;
    
    const currentDay = currentDate.getDay(); // 0=Sunday, 1=Monday, etc.
    
    switch (recurring.type) {
        case 'daily':
            return true; // 每日重复总是活跃
        case 'weekly':
            return !recurring.days || recurring.days.includes(currentDay);
        case 'monthly':
            // 简化的月度重复逻辑
            const currentDayOfMonth = currentDate.getDate();
            return !recurring.days || recurring.days.includes(currentDayOfMonth);
        default:
            return true;
    }
};

const EnhancedSystemSettingsContext = createContext<EnhancedSystemSettingsContextType | undefined>(undefined);

export function EnhancedSystemSettingsProvider({ children }: { children: ReactNode }) {
    const [systemSettings, setSystemSettings] = useState<EnhancedSystemSettings>(defaultEnhancedSystemSettings);
    const [isLoaded, setIsLoaded] = useState(false);
    // const { addAuditLog, addLog } = useEnhancedLogs(); // 临时注释避免循环依赖

    // 加载设置
    useEffect(() => {
        try {
            const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
            if (storedSettings) {
                const parsedSettings = JSON.parse(storedSettings);
                setSystemSettings(prev => ({
                    ...defaultEnhancedSystemSettings,
                    ...parsedSettings,
                    marketSettings: {
                        ...defaultEnhancedSystemSettings.marketSettings,
                        ...(parsedSettings.marketSettings || {})
                    },
                    depositAddresses: {
                        ...defaultEnhancedSystemSettings.depositAddresses,
                        ...(parsedSettings.depositAddresses || {})
                    },
                    riskControl: {
                        ...defaultEnhancedSystemSettings.riskControl,
                        ...(parsedSettings.riskControl || {})
                    },
                    systemMonitoring: {
                        ...defaultEnhancedSystemSettings.systemMonitoring,
                        ...(parsedSettings.systemMonitoring || {})
                    },
                    marketInterventions: parsedSettings.marketInterventions || [],
                }));
            }
        } catch (error) {
            console.error("Failed to load enhanced system settings from localStorage", error);
        }
        setIsLoaded(true);
    }, []);

    // 保存设置
    useEffect(() => {
        if (isLoaded) {
            try {
                localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(systemSettings));
            } catch (error) {
                console.error("Failed to save enhanced system settings to localStorage", error);
            }
        }
    }, [systemSettings, isLoaded]);

    // 基础设置更新函数
    const updateDepositAddress = useCallback((asset: keyof EnhancedSystemSettings['depositAddresses'], value: string) => {
        setSystemSettings(prevSettings => ({
            ...prevSettings,
            depositAddresses: {
                ...prevSettings.depositAddresses,
                [asset]: value,
            }
        }));
        
        // 临时注释日志记录，避免循环依赖
        console.log(`Updated ${asset} deposit address`);
    }, [addLog]);

    const updateSetting = useCallback(<K extends keyof Omit<EnhancedSystemSettings, 'marketSettings' | 'marketInterventions' | 'riskControl' | 'systemMonitoring'>>(key: K, value: EnhancedSystemSettings[K]) => {
        setSystemSettings(prevSettings => ({
            ...prevSettings,
            [key]: value,
        }));
        
        // 临时注释日志记录，避免循环依赖
        console.log(`Updated system setting: ${String(key)}`);
    }, [addLog]);

    const updatePairSettings = useCallback((pair: string, newSettings: Partial<EnhancedTradingPairSettings>) => {
        setSystemSettings(prev => ({
            ...prev,
            marketSettings: {
                ...prev.marketSettings,
                [pair]: {
                    ...(prev.marketSettings[pair] || getDefaultPairSettings()),
                    ...newSettings,
                }
            }
        }));
        
        // 临时注释日志记录，避免循环依赖
        console.log(`Updated trading pair settings for ${pair}`);
    }, [addLog]);

    const updateRiskControlSettings = useCallback((newSettings: Partial<RiskControlSettings>) => {
        setSystemSettings(prev => ({
            ...prev,
            riskControl: {
                ...prev.riskControl,
                ...newSettings,
            }
        }));
        
        // 临时注释日志记录，避免循环依赖
        console.log('Updated risk control settings');
    }, [addLog]);

    const updateSystemMonitoringSettings = useCallback((newSettings: Partial<SystemMonitoringSettings>) => {
        setSystemSettings(prev => ({
            ...prev,
            systemMonitoring: {
                ...prev.systemMonitoring,
                ...newSettings,
            }
        }));
        
        // 临时注释日志记录，避免循环依赖
        console.log('Updated system monitoring settings');
    }, [addLog]);

    // 增强的干预管理
    const addMarketIntervention = useCallback((intervention?: Partial<EnhancedMarketIntervention>): string => {
        if (systemSettings.marketInterventions.length >= 10) {
            throw new Error('Maximum number of interventions (10) reached');
        }
        
        const newId = `intervention-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();
        
        const newIntervention: EnhancedMarketIntervention = {
            id: newId,
            tradingPair: 'BTC/USDT',
            startTime: '10:00',
            endTime: '11:00',
            minPrice: 110000,
            maxPrice: 120000,
            trend: 'random',
            priority: 5,
            conflictResolution: 'override',
            isActive: false,
            createdBy: 'admin',
            createdAt: now,
            smoothTransition: true,
            transitionDuration: 30000,
            ...intervention,
        };
        
        setSystemSettings(prev => ({
            ...prev,
            marketInterventions: [...prev.marketInterventions, newIntervention]
        }));
        
        // 临时注释日志记录，避免循环依赖
        console.log(`Created market intervention for ${newIntervention.tradingPair}`);
        
        return newId;
    }, [systemSettings.marketInterventions.length]);

    const removeMarketIntervention = useCallback((id: string) => {
        const intervention = systemSettings.marketInterventions.find(i => i.id === id);
        if (!intervention) return;
        
        setSystemSettings(prev => ({
            ...prev,
            marketInterventions: prev.marketInterventions.filter(i => i.id !== id),
        }));
        
        // 临时注释日志记录，避免循环依赖
        console.log(`Deleted market intervention for ${intervention.tradingPair}`);
    }, [systemSettings.marketInterventions, addLog]);

    const updateMarketIntervention = useCallback((id: string, updates: Partial<EnhancedMarketIntervention>) => {
        const intervention = systemSettings.marketInterventions.find(i => i.id === id);
        if (!intervention) return;
        
        setSystemSettings(prev => ({
            ...prev,
            marketInterventions: prev.marketInterventions.map(i =>
                i.id === id ? { 
                    ...i, 
                    ...updates, 
                    lastModifiedBy: 'admin',
                    lastModifiedAt: new Date().toISOString()
                } : i
            ),
        }));
        
        // 临时注释日志记录，避免循环依赖
        console.log(`Updated market intervention for ${intervention.tradingPair}`);
    }, [systemSettings.marketInterventions, addLog]);

    const activateIntervention = useCallback((id: string) => {
        updateMarketIntervention(id, { isActive: true });
        
        addLog({
            entity_type: 'market_intervention',
            entity_id: id,
            action: 'activate',
            details: 'Activated market intervention',
            severity: 'critical'
        });
    }, [updateMarketIntervention, addLog]);

    const deactivateIntervention = useCallback((id: string) => {
        updateMarketIntervention(id, { isActive: false });
        
        addLog({
            entity_type: 'market_intervention',
            entity_id: id,
            action: 'deactivate',
            details: 'Deactivated market intervention',
            severity: 'high'
        });
    }, [updateMarketIntervention, addLog]);

    // 增强的时间逻辑验证
    const isInterventionActiveNow = useCallback((intervention: EnhancedMarketIntervention): boolean => {
        if (!intervention.isActive) return false;
        
        const now = new Date();
        
        // 检查日期范围
        if (!isDateInRange(now, intervention.startDate, intervention.endDate)) return false;
        
        // 检查时间范围
        if (!isTimeInRange(now, intervention.startTime, intervention.endTime)) return false;
        
        // 检查重复模式
        if (!isRecurringActive(now, intervention.recurring)) return false;
        
        return true;
    }, []);

    const getActiveInterventions = useCallback((tradingPair?: string): EnhancedMarketIntervention[] => {
        let activeInterventions = systemSettings.marketInterventions.filter(isInterventionActiveNow);
        
        if (tradingPair) {
            activeInterventions = activeInterventions.filter(i => i.tradingPair === tradingPair);
        }
        
        // 按优先级排序
        return activeInterventions.sort((a, b) => b.priority - a.priority);
    }, [systemSettings.marketInterventions, isInterventionActiveNow]);

    const resolveInterventionConflicts = useCallback((interventions: EnhancedMarketIntervention[]): EnhancedMarketIntervention | null => {
        if (interventions.length === 0) return null;
        if (interventions.length === 1) return interventions[0];
        
        // 按优先级排序
        const sorted = interventions.sort((a, b) => b.priority - a.priority);
        const highest = sorted[0];
        
        if (highest.conflictResolution === 'override') {
            return highest;
        } else if (highest.conflictResolution === 'blend') {
            // 实现混合逻辑 - 这里简化为返回最高优先级
            return highest;
        }
        
        return highest;
    }, []);

    // 验证功能
    const validateInterventionSettings = useCallback((intervention: Partial<EnhancedMarketIntervention>): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];
        
        if (intervention.minPrice && intervention.maxPrice && intervention.minPrice >= intervention.maxPrice) {
            errors.push('Minimum price must be less than maximum price');
        }
        
        if (intervention.priority && (intervention.priority < 1 || intervention.priority > 10)) {
            errors.push('Priority must be between 1 and 10');
        }
        
        if (intervention.startTime && intervention.endTime) {
            const [startHour, startMin] = intervention.startTime.split(':').map(Number);
            const [endHour, endMin] = intervention.endTime.split(':').map(Number);
            
            if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
                errors.push('Invalid time format');
            }
        }
        
        if (intervention.maxPriceDeviation && intervention.maxPriceDeviation > systemSettings.riskControl.maxPriceDeviationGlobal) {
            errors.push(`Price deviation exceeds global limit of ${systemSettings.riskControl.maxPriceDeviationGlobal * 100}%`);
        }
        
        return { valid: errors.length === 0, errors };
    }, [systemSettings.riskControl.maxPriceDeviationGlobal]);

    // 导入导出功能
    const exportSettings = useCallback((): string => {
        return JSON.stringify(systemSettings, null, 2);
    }, [systemSettings]);

    const importSettings = useCallback((settingsJson: string): { success: boolean; error?: string } => {
        try {
            const importedSettings = JSON.parse(settingsJson);
            
            // 基本验证
            if (!importedSettings.systemVersion) {
                return { success: false, error: 'Invalid settings format' };
            }
            
            setSystemSettings({
                ...defaultEnhancedSystemSettings,
                ...importedSettings,
            });
            
            addLog({
                entity_type: 'system_setting',
                entity_id: 'import',
                action: 'update',
                details: 'Imported system settings',
                severity: 'critical'
            });
            
            return { success: true };
        } catch (error) {
            return { success: false, error: 'Failed to parse settings JSON' };
        }
    }, [addLog]);

    // 备份功能
    const createBackup = useCallback(() => {
        const backupData = {
            ...systemSettings,
            backupTimestamp: new Date().toISOString(),
        };
        
        localStorage.setItem(`${SETTINGS_STORAGE_KEY}_backup`, JSON.stringify(backupData));
        
        setSystemSettings(prev => ({
            ...prev,
            lastBackupTime: new Date().toISOString(),
        }));
        
        addLog({
            entity_type: 'system_setting',
            entity_id: 'backup',
            action: 'create',
            details: 'Created system settings backup',
            severity: 'medium'
        });
    }, [systemSettings, addLog]);

    const restoreFromBackup = useCallback((backupData: string): { success: boolean; error?: string } => {
        try {
            const backup = JSON.parse(backupData);
            
            if (!backup.systemVersion) {
                return { success: false, error: 'Invalid backup format' };
            }
            
            setSystemSettings(backup);
            
            addLog({
                entity_type: 'system_setting',
                entity_id: 'restore',
                action: 'update',
                details: 'Restored system settings from backup',
                severity: 'critical'
            });
            
            return { success: true };
        } catch (error) {
            return { success: false, error: 'Failed to restore from backup' };
        }
    }, [addLog]);

    const value: EnhancedSystemSettingsContextType = {
        systemSettings,
        updateDepositAddress,
        updateSetting,
        updatePairSettings,
        updateRiskControlSettings,
        updateSystemMonitoringSettings,
        addMarketIntervention,
        removeMarketIntervention,
        updateMarketIntervention,
        activateIntervention,
        deactivateIntervention,
        isInterventionActiveNow,
        getActiveInterventions,
        resolveInterventionConflicts,
        validateInterventionSettings,
        exportSettings,
        importSettings,
        createBackup,
        restoreFromBackup,
    };

    return (
        <EnhancedSystemSettingsContext.Provider value={value}>
            {children}
        </EnhancedSystemSettingsContext.Provider>
    );
}

export function useEnhancedSystemSettings() {
    const context = useContext(EnhancedSystemSettingsContext);
    if (context === undefined) {
        throw new Error('useEnhancedSystemSettings must be used within an EnhancedSystemSettingsProvider');
    }
    return context;
}