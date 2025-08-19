
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { DailyTask, UserTaskState } from '@/types';
import { useAuth } from './auth-context';
import { useBalance } from './balance-context';

const TASKS_STORAGE_KEY = 'tradeflow_daily_tasks';
const USER_TASKS_STATE_KEY_PREFIX = 'tradeflow_user_tasks_';

// IMPORTANT: The IDs are now used programmatically to trigger completion.
const defaultTasks: DailyTask[] = [
  {
    id: 'complete_contract_trade',
    title: '完成一次合约交易',
    description: '在秒合约市场完成任意一笔交易，不限金额。',
    reward: 0.2,
    reward_type: 'usdt',
    link: '/trade?tab=contract',
    status: 'published',
    trigger: 'contract_trade',
  },
  {
    id: 'complete_spot_trade',
    title: '进行一次币币交易',
    description: '在币币市场完成任意一笔买入或卖出操作。',
    reward: 0.2,
    reward_type: 'usdt',
    link: '/trade?tab=spot',
    status: 'published',
    trigger: 'spot_trade',
  },
  {
    id: 'complete_investment',
    title: '参与一次理财投资',
    description: '购买任意一款理财产品，体验稳定收益。',
    reward: 1,
    reward_type: 'credit_score',
    link: '/finance',
    status: 'published',
    trigger: 'investment',
  }
];

export type TaskTriggerType = 'contract_trade' | 'spot_trade' | 'investment';

interface TasksContextType {
  // Admin functions
  dailyTasks: DailyTask[];
  addDailyTask: () => void;
  removeDailyTask: (id: string) => void;
  updateDailyTask: (id: string, updates: Partial<DailyTask>) => void;
  saveTasks: () => void;
  // User functions
  userTasksState: UserTaskState[];
  triggerTaskCompletion: (type: TaskTriggerType) => void;
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export function TasksProvider({ children }: { children: ReactNode }) {
  const { user, updateUser } = useAuth();
  const { adjustBalance } = useBalance();
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [userTasksState, setUserTasksState] = useState<UserTaskState[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load admin-defined tasks
  useEffect(() => {
    try {
      const storedTasks = localStorage.getItem(TASKS_STORAGE_KEY);
      setDailyTasks(storedTasks ? JSON.parse(storedTasks) : defaultTasks);
    } catch (e) {
      console.error("Failed to load tasks", e);
      setDailyTasks(defaultTasks);
    }
  }, []);

  // Load user-specific task completion state
  useEffect(() => {
    if (user) {
      try {
        const key = `${USER_TASKS_STATE_KEY_PREFIX}${user.id}`;
        const storedState = localStorage.getItem(key);
        setUserTasksState(storedState ? JSON.parse(storedState) : []);
      } catch (e) {
        console.error("Failed to load user task state", e);
        setUserTasksState([]);
      }
    } else {
      setUserTasksState([]);
    }
    setIsLoaded(true);
  }, [user]);

  // Save admin-defined tasks
  const saveTasks = useCallback(() => {
    try {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(dailyTasks));
    } catch (e) {
      console.error("Failed to save tasks", e);
    }
  }, [dailyTasks]);
  
  // Save user-specific task completion state
  useEffect(() => {
    if (user && isLoaded) {
       try {
        const key = `${USER_TASKS_STATE_KEY_PREFIX}${user.id}`;
        localStorage.setItem(key, JSON.stringify(userTasksState));
      } catch (e) {
        console.error("Failed to save user task state", e);
      }
    }
  }, [userTasksState, user, isLoaded]);

  // --- Admin Functions ---
  const addDailyTask = useCallback(() => {
    const newTask: DailyTask = {
      id: `task-${Date.now()}`,
      title: '新任务',
      description: '任务描述...',
      reward: 1,
      reward_type: 'usdt',
      link: '/',
      status: 'draft',
      trigger: 'contract_trade' // Default trigger
    };
    setDailyTasks(prev => [...prev, newTask]);
  }, []);

  const removeDailyTask = useCallback((id: string) => {
    setDailyTasks(prev => prev.filter(task => task.id !== id));
  }, []);

  const updateDailyTask = useCallback((id:string, updates: Partial<DailyTask>) => {
    setDailyTasks(prev => prev.map(task => task.id === id ? { ...task, ...updates } : task));
  }, []);

  // --- User Functions ---
  const completeTask = useCallback((taskId: string) => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];

    const alreadyCompleted = userTasksState.some(state => state.taskId === taskId && state.date === today);
    if (alreadyCompleted) return;

    const task = dailyTasks.find(t => t.id === taskId);
    if (!task) return;

    if (task.reward_type === 'usdt') {
      adjustBalance(user.id, 'USDT', task.reward);
    } else if (task.reward_type === 'credit_score') {
      const newScore = (user.credit_score || 100) + task.reward;
      updateUser(user.id, { credit_score: newScore });
    }

    const newState: UserTaskState = { taskId, date: today, completed: true };
    setUserTasksState(prev => [...prev, newState]);
  }, [user, userTasksState, dailyTasks, adjustBalance, updateUser]);

  const triggerTaskCompletion = useCallback((type: TaskTriggerType) => {
    const today = new Date().toISOString().split('T')[0];
    
    // Find published tasks that match the trigger type
    const matchingTasks = dailyTasks.filter(task => task.status === 'published' && task.trigger === type);
    
    matchingTasks.forEach(task => {
        // Check if this task is already completed for today
        const isCompleted = userTasksState.some(state => state.taskId === task.id && state.date === today);
        if (!isCompleted) {
            console.log(`Completing task: ${task.title}`);
            completeTask(task.id);
        }
    });
  }, [dailyTasks, userTasksState, completeTask]);


  const value = {
    dailyTasks,
    addDailyTask,
    removeDailyTask,
    updateDailyTask,
    saveTasks,
    userTasksState,
    triggerTaskCompletion,
  };

  return (
    <TasksContext.Provider value={value}>
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TasksContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TasksProvider');
  }
  return context;
}
