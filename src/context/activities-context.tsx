
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { LimitedTimeActivity } from '@/types';
import { useLogs } from './logs-context';
import { useAuth } from './auth-context';

const ACTIVITIES_STORAGE_KEY = 'tradeflow_activities';

const defaultActivities: LimitedTimeActivity[] = [
  {
    id: 'activity-1',
    title: '首充豪礼',
    description: '新用户首次充值任意金额，即可获得88 USDT体验金！体验金可用于秒合约交易，盈利部分可提现。',
    rewardRule: '首次充值任意金额',
    howToClaim: '充值成功后自动到账',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    status: 'published',
    createdAt: new Date().toISOString(),
    imgSrc: 'https://placehold.co/600x400.png'
  },
  {
    id: 'activity-2',
    title: '交易大师挑战赛',
    description: '活动期间内，秒合约交易量排名前十的用户可瓜分10,000 USDT奖池！',
    rewardRule: '交易量排名前十',
    howToClaim: '活动结束后联系客服领取',
    expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days from now
    status: 'published',
    createdAt: new Date().toISOString(),
    imgSrc: 'https://placehold.co/600x400.png'
  },
];

interface ActivitiesContextType {
  // Admin functions
  activities: LimitedTimeActivity[];
  addActivity: () => void;
  removeActivity: (id: string) => void;
  updateActivity: (id: string, updates: Partial<LimitedTimeActivity>) => void;
  saveActivities: () => void;
  // User functions
  publishedActivities: LimitedTimeActivity[];
  participateInActivity: (activityId: string) => void;
}

const ActivitiesContext = createContext<ActivitiesContextType | undefined>(undefined);

export function ActivitiesProvider({ children }: { children: ReactNode }) {
  const [activities, setActivities] = useState<LimitedTimeActivity[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { user } = useAuth();
  const { addLog } = useLogs();

  // Load admin-defined activities
  useEffect(() => {
    try {
      const storedActivities = localStorage.getItem(ACTIVITIES_STORAGE_KEY);
      setActivities(storedActivities ? JSON.parse(storedActivities) : defaultActivities);
    } catch (e) {
      console.error("Failed to load activities", e);
      setActivities(defaultActivities);
    }
    setIsLoaded(true);
  }, []);

  // Save admin-defined activities
  const saveActivities = useCallback(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(activities));
    } catch (e) {
      console.error("Failed to save activities", e);
    }
  }, [activities, isLoaded]);
  
  // Also save on any change
   useEffect(() => {
     saveActivities();
   }, [activities, saveActivities]);

  // --- Admin Functions ---
  const addActivity = useCallback(() => {
    const newActivity: LimitedTimeActivity = {
      id: `activity-${Date.now()}`,
      title: '新活动',
      description: '活动描述...',
      rewardRule: '奖励规则...',
      howToClaim: '领取方式...',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      status: 'draft',
      createdAt: new Date().toISOString(),
      imgSrc: 'https://placehold.co/600x400.png'
    };
    setActivities(prev => [...prev, newActivity]);
  }, []);

  const removeActivity = useCallback((id: string) => {
    setActivities(prev => prev.filter(activity => activity.id !== id));
  }, []);

  const updateActivity = useCallback((id: string, updates: Partial<LimitedTimeActivity>) => {
    setActivities(prev => prev.map(activity => activity.id === id ? { ...activity, ...updates } : activity));
  }, []);

  const participateInActivity = useCallback((activityId: string) => {
    if (!user) return;
    const activity = activities.find(a => a.id === activityId);
    if (!activity) return;

    // Here, you would check if the user is eligible.
    // For now, we'll just log the participation.
    addLog({
      entity_type: 'activity_participation',
      entity_id: activityId,
      action: 'user_complete',
      details: `User ${user.username} participated in activity: "${activity.title}".`
    });

  }, [addLog, user, activities]);

  const value = {
    activities,
    addActivity,
    removeActivity,
    updateActivity,
    saveActivities,
    publishedActivities: activities.filter(a => a.status === 'published' && new Date(a.expiresAt) > new Date()),
    participateInActivity,
  };

  return (
    <ActivitiesContext.Provider value={value}>
      {children}
    </ActivitiesContext.Provider>
  );
}

export function useActivities() {
  const context = useContext(ActivitiesContext);
  if (context === undefined) {
    throw new Error('useActivities must be used within a ActivitiesProvider');
  }
  return context;
}
