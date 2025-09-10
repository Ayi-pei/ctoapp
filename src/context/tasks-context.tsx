"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { DailyTask, UserTaskState, TaskTriggerType } from "@/types";
import { useSimpleAuth } from './simple-custom-auth';
import { useSimpleEnhancedLogs } from "./simple-enhanced-logs-context";
import { useBalance } from "./balance-context";
import { supabase, isSupabaseEnabled } from "@/lib/supabaseClient";

const defaultTasks: Omit<DailyTask, "id">[] = [
  {
    title: "完成一次合约交易",
    description: "在秒合约市场完成任意一笔交易，不限金额。",
    reward: 0.2,
    reward_type: "usdt",
    link: "/trade?tab=contract",
    status: "published",
    trigger: "contract_trade",
    imgSrc: "https://placehold.co/600x400.png",
  },
  {
    title: "进行一次币币交易",
    description: "在币币市场完成任意一笔买入或卖出操作。",
    reward: 0.2,
    reward_type: "usdt",
    link: "/trade?tab=spot",
    status: "published",
    trigger: "spot_trade",
    imgSrc: "https://placehold.co/600x400.png",
  },
  {
    title: "参与一次理财投资",
    description: "购买任意一款理财产品，体验稳定收益。",
    reward: 1,
    reward_type: "credit_score",
    link: "/finance",
    status: "published",
    trigger: "investment",
    imgSrc: "https://placehold.co/600x400.png",
  },
];

interface TasksContextType {
  dailyTasks: DailyTask[];
  addDailyTask: () => Promise<void>;
  removeDailyTask: (id: string) => Promise<void>;
  updateDailyTask: (id: string, updates: Partial<DailyTask>) => Promise<void>;
  userTasksState: UserTaskState[];
  triggerTaskCompletion: (type: TaskTriggerType) => Promise<void>;
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export function TasksProvider({ children }: { children: ReactNode }) {
  const { user, updateUser } = useSimpleAuth();
  const { addLog } = useSimpleEnhancedLogs();
  const { creditReward } = useBalance();

  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [userTasksState, setUserTasksState] = useState<UserTaskState[]>([]);

  const fetchDailyTasks = useCallback(async () => {
    if (!isSupabaseEnabled) {
      console.warn("Supabase not enabled, using default tasks.");
      // Use default tasks when Supabase is not enabled
      const tasksWithIds = defaultTasks.map((task, index) => ({
        ...task,
        id: `default_${index}`
      }));
      setDailyTasks(tasksWithIds);
      return;
    }

    try {
      const { data, error } = await supabase.from("daily_tasks").select("*");
      
      if (error) {
        console.error("Error fetching daily tasks:", (error as any)?.message || error);
        // Fallback to default tasks on error
        const tasksWithIds = defaultTasks.map((task, index) => ({
          ...task,
          id: `fallback_${index}`
        }));
        setDailyTasks(tasksWithIds);
        return;
      }

      if (!data || data.length === 0) {
        try {
          // Seed the database with default tasks if it's empty
          const { data: seededData, error: seedError } = await supabase
            .from("daily_tasks")
            .insert(defaultTasks)
            .select();
          
          if (seedError) {
            console.error("Error seeding daily tasks:", seedError);
            // Use default tasks with mock IDs if seeding fails
            const tasksWithIds = defaultTasks.map((task, index) => ({
              ...task,
              id: `mock_${index}`
            }));
            setDailyTasks(tasksWithIds);
          } else {
            setDailyTasks(seededData as DailyTask[]);
          }
        } catch (seedError) {
          console.error("Error during task seeding:", seedError);
          const tasksWithIds = defaultTasks.map((task, index) => ({
            ...task,
            id: `error_${index}`
          }));
          setDailyTasks(tasksWithIds);
        }
      } else {
        setDailyTasks(data as DailyTask[]);
      }
    } catch (error) {
      console.error("Unexpected error in fetchDailyTasks:", error);
      // Final fallback
      const tasksWithIds = defaultTasks.map((task, index) => ({
        ...task,
        id: `final_${index}`
      }));
      setDailyTasks(tasksWithIds);
    }
  }, []);

  const fetchUserTaskStates = useCallback(async (userId: string) => {
    if (!isSupabaseEnabled) {
      setUserTasksState([]);
      return;
    }
    
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("user_task_states")
        .select("*")
        .eq("user_id", userId)
        .eq("date", today);
      
      if (error) {
        console.error("Error fetching user task states:", (error as any)?.message || error);
        setUserTasksState([]);
      } else {
        setUserTasksState(data as UserTaskState[]);
      }
    } catch (error) {
      console.error("Unexpected error in fetchUserTaskStates:", error);
      setUserTasksState([]);
    }
  }, []);

  useEffect(() => {
    fetchDailyTasks();
    if (user?.id) {
      fetchUserTaskStates(user.id);
    } else {
      setUserTasksState([]);
    }
  }, [user, fetchDailyTasks, fetchUserTaskStates]);

  const addDailyTask = async () => {
    if (!isSupabaseEnabled) {
      console.warn("Supabase not enabled, cannot add tasks.");
      return;
    }
    const newTask: Partial<DailyTask> = {
      title: "新任务",
      description: "任务描述...",
      reward: 1,
      reward_type: "usdt",
      link: "/",
      status: "draft",
      trigger: "contract_trade",
      imgSrc: "https://placehold.co/600x400.png",
    };
    const { error } = await supabase.from("daily_tasks").insert(newTask);
    if (error) console.error("Error adding daily task:", error);
    else await fetchDailyTasks();
  };

  const removeDailyTask = async (id: string) => {
    if (!isSupabaseEnabled) {
      console.warn("Supabase not enabled, cannot remove tasks.");
      return;
    }
    const { error } = await supabase.from("daily_tasks").delete().eq("id", id);
    if (error) console.error("Error removing daily task:", error);
    else await fetchDailyTasks();
  };

  const updateDailyTask = async (id: string, updates: Partial<DailyTask>) => {
    if (!isSupabaseEnabled) {
      console.warn("Supabase not enabled, cannot update tasks.");
      return;
    }
    const { error } = await supabase
      .from("daily_tasks")
      .update(updates)
      .eq("id", id);
    if (error) console.error("Error updating daily task:", error);
    else await fetchDailyTasks();
  };

  const triggerTaskCompletion = useCallback(
    async (type: TaskTriggerType) => {
      if (!user) return;

      const today = new Date().toISOString().split("T")[0];
      const task = dailyTasks.find(
        (t) => t.trigger === type && t.status === "published"
      );
      if (!task) return;

      const isAlreadyCompleted = userTasksState.some(
        (state) => state.taskId === task.id && state.date === today
      );
      if (isAlreadyCompleted) return;

      if (task.reward_type === "usdt") {
        creditReward({
          userId: user.id,
          amount: task.reward,
          asset: "USDT",
          type: "dailyTask",
          sourceId: task.id,
          description: `Completed task: ${task.title}`,
        });
      } else if (task.reward_type === "credit_score") {
        const newScore = (user.credit_score || 100) + task.reward;
        await updateUser(user.id, { credit_score: newScore });
      }

      addLog({
        entity_type: "task_completion",
        entity_id: task.id,
        action: "user_complete",
        details: `User ${user.username} completed task: "${task.title}" and received ${task.reward} ${task.reward_type}.`,
        actor: user,
      });

      const newState: Omit<UserTaskState, "id"> = {
        taskId: task.id,
        date: today,
        completed: true,
        user_id: user.id,
      };

      const { error } = await supabase
        .from("user_task_states")
        .insert(newState);
      if (error) console.error("Error saving user task state:", error);
      else await fetchUserTaskStates(user.id);
    },
    [
      user,
      dailyTasks,
      userTasksState,
      creditReward,
      updateUser,
      addLog,
      fetchUserTaskStates,
    ]
  );

  const value: TasksContextType = {
    dailyTasks,
    addDailyTask,
    removeDailyTask,
    updateDailyTask,
    userTasksState,
    triggerTaskCompletion,
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
