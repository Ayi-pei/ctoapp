
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { LimitedTimeActivity } from '@/types';
import { useSimpleEnhancedLogs } from './simple-enhanced-logs-context';
import { useSimpleAuth } from './simple-custom-auth';
import { supabase, isSupabaseEnabled } from '@/lib/supabaseClient';


const defaultActivities: Partial<LimitedTimeActivity>[] = [
  {
    title: '首充豪礼',
    description: '新用户首次充值任意金额，即可获得88 USDT体验金！体验金可用于秒合约交易，盈利部分可提现。',
    rewardRule: '首次充值任意金额',
    howToClaim: '充值成功后自动到账',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'published',
    imgSrc: 'https://placehold.co/600x400.png'
  },
  {
    title: '交易大师挑战赛',
    description: '活动期间内，秒合约交易量排名前十的用户可瓜分10,000 USDT奖池！',
    rewardRule: '交易量排名前十',
    howToClaim: '活动结束后联系客服领取',
    expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'published',
    imgSrc: 'https://placehold.co/600x400.png'
  },
];

interface ActivitiesContextType {
  activities: LimitedTimeActivity[];
  addActivity: () => Promise<void>;
  removeActivity: (id: string) => Promise<void>;
  updateActivity: (id: string, updates: Partial<LimitedTimeActivity>) => Promise<void>;
  publishedActivities: LimitedTimeActivity[];
  participateInActivity: (activityId: string) => void;
}

const ActivitiesContext = createContext<ActivitiesContextType | undefined>(undefined);

export function ActivitiesProvider({ children }: { children: ReactNode }) {
  const [activities, setActivities] = useState<LimitedTimeActivity[]>([]);
  const { user } = useSimpleAuth();
  const { addLog } = useSimpleEnhancedLogs();

  const fetchActivities = useCallback(async () => {
    if (!isSupabaseEnabled) {
      console.warn("Supabase not enabled, using default activities.");
      // Use default activities when Supabase is not enabled
      const activitiesWithIds = defaultActivities.map((activity, index) => ({
        ...activity,
        id: `default_${index}`,
        createdAt: new Date().toISOString()
      }));
      setActivities(activitiesWithIds as LimitedTimeActivity[]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching activities:", error);
        // Fallback to default activities on error
        const activitiesWithIds = defaultActivities.map((activity, index) => ({
          ...activity,
          id: `fallback_${index}`,
          createdAt: new Date().toISOString()
        }));
        setActivities(activitiesWithIds as LimitedTimeActivity[]);
        return;
      }

      if (!data || data.length === 0) {
        try {
          // Seed the database with default activities if it's empty
          const activitiesWithCreatedAt = defaultActivities.map(activity => ({
            ...activity,
            createdAt: new Date().toISOString()
          }));
          
          const { data: seededData, error: seedError } = await supabase
            .from('activities')
            .insert(activitiesWithCreatedAt)
            .select();
          
          if (seedError) {
            console.error("Error seeding activities:", seedError);
            // Use default activities with mock IDs if seeding fails
            const activitiesWithIds = defaultActivities.map((activity, index) => ({
              ...activity,
              id: `mock_${index}`,
              createdAt: new Date().toISOString()
            }));
            setActivities(activitiesWithIds as LimitedTimeActivity[]);
          } else {
            setActivities(seededData as LimitedTimeActivity[]);
          }
        } catch (seedError) {
          console.error("Error during activity seeding:", seedError);
          const activitiesWithIds = defaultActivities.map((activity, index) => ({
            ...activity,
            id: `error_${index}`,
            createdAt: new Date().toISOString()
          }));
          setActivities(activitiesWithIds as LimitedTimeActivity[]);
        }
      } else {
        setActivities(data as LimitedTimeActivity[]);
      }
    } catch (error) {
      console.error("Unexpected error in fetchActivities:", error);
      // Final fallback
      const activitiesWithIds = defaultActivities.map((activity, index) => ({
        ...activity,
        id: `final_${index}`,
        createdAt: new Date().toISOString()
      }));
      setActivities(activitiesWithIds as LimitedTimeActivity[]);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);


  const addActivity = async () => {
    if (!isSupabaseEnabled) {
      console.warn("Supabase not enabled, cannot add activities.");
      return;
    }
  
    const newActivity: Omit<LimitedTimeActivity, 'id'> = {
      title: '新活动',
      description: '活动描述...',
      rewardRule: '奖励规则...',
      howToClaim: '领取方式...',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'draft',
      imgSrc: 'https://placehold.co/600x400.png',
      createdAt: new Date().toISOString(), // ✅ 加上 createdAt
    };
  
    const { error } = await supabase.from('activities').insert(newActivity);
    if (error) console.error("Error adding activity:", error);
    else await fetchActivities();
  };
  

  const removeActivity = async (id: string) => {
    if (!isSupabaseEnabled) {
      console.warn("Supabase not enabled, cannot remove activities.");
      return;
    }
    const { error } = await supabase.from('activities').delete().eq('id', id);
    if (error) console.error("Error removing activity:", error);
    else await fetchActivities();
  };

  const updateActivity = async (id: string, updates: Partial<LimitedTimeActivity>) => {
     if (!isSupabaseEnabled) {
       console.warn("Supabase not enabled, cannot update activities.");
       return;
     }
     const { error } = await supabase.from('activities').update(updates).eq('id', id);
     if (error) console.error("Error updating activity:", error);
     else await fetchActivities();
  };

  const participateInActivity = useCallback((activityId: string) => {
    if (!user) return;
    const activity = activities.find(a => a.id === activityId);
    if (!activity) return;

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
