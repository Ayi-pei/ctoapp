"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import type { LimitedTimeActivity } from "@/types";
import { useSimpleEnhancedLogs } from "./simple-enhanced-logs-context";
import { useSimpleAuth } from "./simple-custom-auth";
import { supabase, isSupabaseEnabled } from "@/lib/supabaseClient";

const defaultActivities: Partial<LimitedTimeActivity>[] = [
  {
    title: "首充豪礼",
    description:
      "新用户首次充值任意金额，即可获得88 USDT体验金！体验金可用于秒合约交易，盈利部分可提现。",
    rewardRule: "首次充值任意金额",
    howToClaim: "充值成功后自动到账",
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: "published",
    imgSrc: "https://placehold.co/600x400.png",
  },
  {
    title: "交易大师挑战赛",
    description:
      "活动期间内，秒合约交易量排名前十的用户可瓜分10,000 USDT奖池！",
    rewardRule: "交易量排名前十",
    howToClaim: "活动结束后联系客服领取",
    expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    status: "published",
    imgSrc: "https://placehold.co/600x400.png",
  },
];

interface ActivitiesContextType {
  activities: LimitedTimeActivity[];
  addActivity: () => Promise<void>;
  removeActivity: (id: string) => Promise<void>;
  updateActivity: (
    id: string,
    updates: Partial<LimitedTimeActivity>
  ) => Promise<void>;
  publishedActivities: LimitedTimeActivity[];
  participateInActivity: (activityId: string) => void;
}

const ActivitiesContext = createContext<ActivitiesContextType | undefined>(
  undefined
);

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
        createdAt: new Date().toISOString(),
      }));
      setActivities(activitiesWithIds as LimitedTimeActivity[]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("activities")
        .select(
          "id, title, description, rewardrule, howtoclaim, expiresat, status, imgsrc, createdat"
        )
        .order("createdat", { ascending: false });

      if (error) {
        console.error(
          "Error fetching activities:",
          (error as any)?.message || error
        );
        // Fallback to default activities on error
        const activitiesWithIds = defaultActivities.map((activity, index) => ({
          ...activity,
          id: `fallback_${index}`,
          createdAt: new Date().toISOString(),
        }));
        setActivities(activitiesWithIds as LimitedTimeActivity[]);
        return;
      }

      if (!data || data.length === 0) {
        try {
          // Map default activities to database column names for seeding
          const activitiesForDb = defaultActivities.map((activity) => ({
            title: activity.title,
            description: activity.description,
            rewardrule: activity.rewardRule,
            howtoclaim: activity.howToClaim,
            expiresat: activity.expiresAt,
            status: activity.status,
            imgsrc: activity.imgSrc,
            createdat: new Date().toISOString(),
          }));

          const { data: seededData, error: seedError } = await supabase
            .from("activities")
            .insert(activitiesForDb)
            .select(
              "id, title, description, rewardrule, howtoclaim, expiresat, status, imgsrc, createdat"
            );

          if (seedError) {
            console.error("Error seeding activities:", seedError);
            // Use default activities with mock IDs if seeding fails
            const activitiesWithIds = defaultActivities.map(
              (activity, index) => ({
                ...activity,
                id: `mock_${index}`,
                createdAt: new Date().toISOString(),
              })
            );
            setActivities(activitiesWithIds as LimitedTimeActivity[]);
          } else {
            // Map seeded data back to frontend format
            const mappedSeededData = seededData.map((activity) => ({
              id: activity.id?.toString() || "",
              title: activity.title || "",
              description: activity.description || "",
              rewardRule: activity.rewardrule || "",
              howToClaim: activity.howtoclaim || "",
              expiresAt: activity.expiresat || new Date().toISOString(),
              status: activity.status || "draft",
              imgSrc: activity.imgsrc || "https://placehold.co/600x400.png",
              createdAt: activity.createdat || new Date().toISOString(),
            }));
            setActivities(mappedSeededData as LimitedTimeActivity[]);
          }
        } catch (seedError) {
          console.error("Error during activity seeding:", seedError);
          const activitiesWithIds = defaultActivities.map(
            (activity, index) => ({
              ...activity,
              id: `error_${index}`,
              createdAt: new Date().toISOString(),
            })
          );
          setActivities(activitiesWithIds as LimitedTimeActivity[]);
        }
      } else {
        // Map database column names to frontend types
        const mappedData = data.map((activity) => ({
          id: activity.id?.toString() || "",
          title: activity.title || "",
          description: activity.description || "",
          rewardRule: activity.rewardrule || "",
          howToClaim: activity.howtoclaim || "",
          expiresAt: activity.expiresat || new Date().toISOString(),
          status: activity.status || "draft",
          imgSrc: activity.imgsrc || "https://placehold.co/600x400.png",
          createdAt: activity.createdat || new Date().toISOString(),
        }));
        setActivities(mappedData as LimitedTimeActivity[]);
      }
    } catch (error) {
      console.error("Unexpected error in fetchActivities:", error);
      // Final fallback
      const activitiesWithIds = defaultActivities.map((activity, index) => ({
        ...activity,
        id: `final_${index}`,
        createdAt: new Date().toISOString(),
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

    // Map frontend fields to database column names
    const newActivity = {
      title: "新活动",
      description: "活动描述...",
      rewardrule: "奖励规则...",
      howtoclaim: "领取方式...",
      expiresat: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: "draft",
      imgsrc: "https://placehold.co/600x400.png",
      createdat: new Date().toISOString(),
    };

    const { error } = await supabase.from("activities").insert(newActivity);
    if (error) console.error("Error adding activity:", error);
    else await fetchActivities();
  };

  const removeActivity = async (id: string) => {
    if (!isSupabaseEnabled) {
      console.warn("Supabase not enabled, cannot remove activities.");
      return;
    }
    const { error } = await supabase.from("activities").delete().eq("id", id);
    if (error) console.error("Error removing activity:", error);
    else await fetchActivities();
  };

  const updateActivity = async (
    id: string,
    updates: Partial<LimitedTimeActivity>
  ) => {
    if (!isSupabaseEnabled) {
      console.warn("Supabase not enabled, cannot update activities.");
      return;
    }

    // Map frontend fields to database column names
    const dbUpdates: any = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined)
      dbUpdates.description = updates.description;
    if (updates.rewardRule !== undefined)
      dbUpdates.rewardrule = updates.rewardRule;
    if (updates.howToClaim !== undefined)
      dbUpdates.howtoclaim = updates.howToClaim;
    if (updates.expiresAt !== undefined)
      dbUpdates.expiresat = updates.expiresAt;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.imgSrc !== undefined) dbUpdates.imgsrc = updates.imgSrc;
    if (updates.createdAt !== undefined)
      dbUpdates.createdat = updates.createdAt;

    const { error } = await supabase
      .from("activities")
      .update(dbUpdates)
      .eq("id", id);
    if (error) console.error("Error updating activity:", error);
    else await fetchActivities();
  };

  const participateInActivity = useCallback(
    (activityId: string) => {
      if (!user) return;
      const activity = activities.find((a) => a.id === activityId);
      if (!activity) return;

      addLog({
        entity_type: "activity_participation",
        entity_id: activityId,
        action: "user_complete",
        details: `User ${user.username} participated in activity: "${activity.title}".`,
      });
    },
    [addLog, user, activities]
  );

  const value = {
    activities,
    addActivity,
    removeActivity,
    updateActivity,
    publishedActivities: activities.filter(
      (a) => a.status === "published" && new Date(a.expiresAt) > new Date()
    ),
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
    throw new Error("useActivities must be used within a ActivitiesProvider");
  }
  return context;
}
