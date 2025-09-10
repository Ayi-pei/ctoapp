
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { IncentiveTask, TaskStatus, DailyTask } from "@/types";
import { useSimpleAuth } from "./simple-custom-auth";
import { supabase, isSupabaseEnabled } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { useBalance } from "./balance-context";

// Define the four core incentive tasks statically
const coreIncentiveTasks: Omit<IncentiveTask, "status" | "progress" | "id">[] = [
  {
    key: "initial_investment",
    title: "首次理财体验",
    description: "首次成功参与任意“活期宝”或“余币宝”理财项目。",
    reward: "5 USDT",
    reward_type: "usdt",
    link: "/finance",
    imgSrc: "/images/tasks/task-finance.png",
    claim_api: "/api/rewards/claim-initial",
  },
  {
    key: "snowball",
    title: "滚雪球",
    description: "累计充值达到 1000 USDT，解锁丰厚奖励。",
    reward: "10 USDT",
    reward_type: "usdt",
    link: "/profile/wallet",
    imgSrc: "/images/tasks/task-deposit.png",
    claim_api: "/api/rewards/claim-snowball",
  },
  {
    key: "market_prediction",
    title: "市场精准预测",
    description: "预测涨跌，完成相应交易，即可领取奖励。",
    reward: "3 USDT",
    reward_type: "usdt",
    link: "/market-predictions",
    imgSrc: "/images/tasks/task-predict.png",
    claim_api: "/api/rewards/claim-market-prediction",
  },
  {
    key: "daily_check_in",
    title: "每日签到",
    description: "每日坚持签到，连续天数越多，奖励越丰厚。",
    reward: "最高 11.39 USDT",
    reward_type: "usdt",
    link: "action:openCheckIn", // Special link to trigger a local action
    imgSrc: "/images/tasks/task-check-in.png",
  },
];

interface TasksContextType {
  // Incentive Tasks
  tasks: IncentiveTask[];
  isLoading: boolean;
  claimReward: (taskKey: string) => Promise<void>;
  fetchTaskStates: () => void;
  
  // Daily Tasks (for Admin)
  dailyTasks: DailyTask[];
  isLoadingDailyTasks: boolean;
  addDailyTask: (task: Omit<DailyTask, 'id' | 'created_at'>) => Promise<void>;
  updateDailyTask: (id: string, updates: Partial<DailyTask>) => Promise<void>;
  removeDailyTask: (id: string) => Promise<void>;
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export function TasksProvider({ children }: { children: ReactNode }) {
  const { user } = useSimpleAuth();
  const { toast } = useToast();
  const { fetchUserBalanceData, fetchUserRewardLogs } = useBalance();
  
  // State for Incentive Tasks
  const [tasks, setTasks] = useState<IncentiveTask[]>(
    coreIncentiveTasks.map((task, i) => ({
      ...task,
      id: `task_${i}`,
      status: "LOCKED",
      progress: { current: 0, target: 1 },
    }))
  );
  const [isLoading, setIsLoading] = useState(true);

  // State for Daily Tasks
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [isLoadingDailyTasks, setIsLoadingDailyTasks] = useState(true);

  // --- Incentive Task Logic ---
  const fetchTaskStates = useCallback(async () => {
    if (!user || !isSupabaseEnabled) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    const [
      claimedRewardsRes,
      initialInvestmentRes,
      snowballRes,
      marketPredictionRes
    ] = await Promise.all([
      supabase.from("rewards").select("type").eq("user_id", user.id),
      supabase.from("investments").select("id").eq("user_id", user.id).limit(1),
      supabase.from("transactions").select("amount").eq("user_id", user.id).eq("type", "deposit"),
      supabase.from("market_predictions").select("id").eq("user_id", user.id).limit(1)
    ]);

    const { data: claimedRewards } = claimedRewardsRes;
    const claimedSet = new Set(claimedRewards?.map(r => r.type) || []);
    
    const newTasksState = coreIncentiveTasks.map((task, i) => {
        let status: TaskStatus = "LOCKED";
        let progress = { current: 0, target: 1 };

        if (claimedSet.has(task.key)) {
            status = "COMPLETED";
            progress.current = progress.target;
        } else {
             switch (task.key) {
                case "initial_investment":
                    const { data: investments } = initialInvestmentRes;
                    status = (investments && investments.length > 0) ? "ELIGIBLE" : "LOCKED";
                    progress.current = (investments && investments.length > 0) ? 1 : 0;
                    break;
                case "snowball":
                    const { data: deposits } = snowballRes;
                    const totalDeposit = deposits?.reduce((acc, t) => acc + t.amount, 0) || 0;
                    progress = { current: Math.min(totalDeposit, 1000), target: 1000 };
                    status = totalDeposit >= 1000 ? "ELIGIBLE" : "IN_PROGRESS";
                    break;
                case "market_prediction":
                     const { data: predictions } = marketPredictionRes;
                     status = (predictions && predictions.length > 0) ? "IN_PROGRESS" : "LOCKED";
                     progress.current = (predictions && predictions.length > 0) ? 1 : 0;
                    break;
                case "daily_check_in":
                    status = "ELIGIBLE";
                    progress.current = 1;
                    break;
            }
        }
        
        return { ...task, id: `task_${i}`, status, progress };
    });

    setTasks(newTasksState);
    setIsLoading(false);
  }, [user]);

  const claimReward = async (taskKey: string) => {
    if (!user) {
        toast({ title: "请先登录", variant: "destructive" });
        return;
    }
    
    const task = tasks.find(t => t.key === taskKey);
    if (!task || !task.claim_api) {
        toast({ title: "任务不存在或无法领取", variant: "destructive" });
        return;
    }

    try {
        const response = await fetch(task.claim_api, { method: "POST" });
        const result = await response.json();

        if (!response.ok) throw new Error(result.error || "领取奖励失败");
        
        toast({
            title: "领取成功！",
            description: `恭喜您！ ${result.rewardAmount} USDT 已添加至您的账户。`,
        });

        fetchTaskStates();
        if (user) {
          fetchUserBalanceData(user.id);
          fetchUserRewardLogs(user.id);
        }

    } catch (error: any) {
        toast({ title: "操作失败", description: error.message, variant: "destructive" });
    }
  };

  // --- Daily Task Logic (for Admin) ---
  const fetchDailyTasks = useCallback(async () => {
    if (!isSupabaseEnabled) {
        setIsLoadingDailyTasks(false);
        return;
    }
    setIsLoadingDailyTasks(true);
    // Use the v_daily_tasks view to fetch all task types
    const { data, error } = await supabase.from('v_daily_tasks').select('*').order('created_at', { ascending: false });
    if (error) {
        console.error("Error fetching daily tasks:", error.message);
        toast({ title: "获取日常任务失败", description: error.message, variant: "destructive" });
    } else {
        setDailyTasks(data as DailyTask[]);
    }
    setIsLoadingDailyTasks(false);
  }, [toast]);
  
  const addDailyTask = async (task: Omit<DailyTask, 'id' | 'created_at'>) => {
    if (!isSupabaseEnabled) return;
    // Keep this pointed at the base table for admin actions
    const { data, error } = await supabase.from('daily_tasks').insert([task]).select();
    if (error) {
      toast({ title: "添加任务失败", description: error.message, variant: "destructive" });
    } else if (data) {
      // Refetch the view to get a consistent state
      fetchDailyTasks();
      toast({ title: "任务已添加" });
    }
  };

  const updateDailyTask = async (id: string, updates: Partial<DailyTask>) => {
    if (!isSupabaseEnabled) return;
    // Keep this pointed at the base table for admin actions
    const { data, error } = await supabase.from('daily_tasks').update(updates).eq('id', id).select();
     if (error) {
      toast({ title: "更新任务失败", description: error.message, variant: "destructive" });
    } else if (data) {
       // Refetch the view to get a consistent state
      fetchDailyTasks();
      toast({ title: "任务已更新" });
    }
  };

  const removeDailyTask = async (id: string) => {
    if (!isSupabaseEnabled) return;
    // Keep this pointed at the base table for admin actions
    const { error } = await supabase.from('daily_tasks').delete().eq('id', id);
    if (error) {
      toast({ title: "删除任务失败", description: error.message, variant: "destructive" });
    } else {
       // Refetch the view to get a consistent state
      fetchDailyTasks();
      toast({ title: "任务已删除" });
    }
  };

  // Initial data fetching
  useEffect(() => {
    if (user) {
      fetchTaskStates();
    } else {
      setTasks(coreIncentiveTasks.map((task, i) => ({
          ...task,
          id: `task_${i}`,
          status: "LOCKED",
          progress: { current: 0, target: 1 },
      })));
      setIsLoading(false);
    }
    // Always fetch daily tasks for admin pages regardless of user state
    fetchDailyTasks();
  }, [user, fetchTaskStates, fetchDailyTasks]);


  const value: TasksContextType = {
    tasks,
    isLoading,
    claimReward,
    fetchTaskStates,
    dailyTasks,
    isLoadingDailyTasks,
    addDailyTask,
    updateDailyTask,
    removeDailyTask,
  };

  return (
    <TasksContext.Provider value={value}>{children}</TasksContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TasksContext);
  if (context === undefined) {
    throw new Error("useTasks must be used within a TasksProvider");
  }
  return context;
}
