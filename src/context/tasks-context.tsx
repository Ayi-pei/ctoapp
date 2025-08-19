
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { DailyTask, UserTaskState } from '@/types';
import { useAuth } from './auth-context';
import { useBalance } from './balance-context';
import { useLogs } from './logs-context';

const TASKS_STORAGE_KEY = 'tradeflow_daily_tasks';
const USER_TASKS_STATE_KEY_PREFIX = 'tradeflow_user_tasks_';

const defaultTasks: DailyTask[] = [
  {
    id: 'task-contract-trade',
    title: '完成一次合约交易',
    description: '在秒合约市场完成任意一笔交易，不限金额。',
    reward: 0.2,
    reward_type: 'usdt',
    link: '/trade?tab=contract',
    status: 'published',
    trigger: 'contract_trade',
    imgSrc: 'https://placehold.co/600x400.png'
  },
  {
    id: 'task-spot-trade',
    title: '进行一次币币交易',
    description: '在币币市场完成任意一笔买入或卖出操作。',
    reward: 0.2,
    reward_type: 'usdt',
    link: '/trade?tab=spot',
    status: 'published',
    trigger: 'spot_trade',
    imgSrc: 'https://placehold.co/600x400.png'
  },
  {
    id: 'task-investment',
    title: '参与一次理财投资',
    description: '购买任意一款理财产品，体验稳定收益。',
    reward: 1,
    reward_type: 'credit_score',
    link: '/finance',
    status: 'published',
    trigger: 'investment',
    imgSrc: 'https://placehold.co/600x400.png'
  }
];

export type TaskTriggerType = 'contract_trade' | 'spot_trade' | 'investment';

interface TasksContextType {
  // Admin functions
  dailyTasks: DailyTask[];
  addDailyTask: () => void;
  removeDailyTask: (id: string) => void;
  updateDailyTask: (id: string, updates: Partial<DailyTask>) => void;
  // User functions
  userTasksState: UserTaskState[];
  // Wrapped functions that will also trigger task completion
  placeContractTrade: ReturnType<typeof useBalance>['placeContractTrade'];
  placeSpotTrade: ReturnType<typeof useBalance>['placeSpotTrade'];
  addDailyInvestment: ReturnType<typeof useBalance>['addDailyInvestment'];
  addHourlyInvestment: ReturnType<typeof useBalance>['addHourlyInvestment'];
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export function TasksProvider({ children }: { children: ReactNode }) {
  const { user, updateUser } = useAuth();
  const balanceContext = useBalance();
  const { adjustBalance } = balanceContext;
  const { addLog } = useLogs();

  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [userTasksState, setUserTasksState] = useState<UserTaskState[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedTasks = localStorage.getItem(TASKS_STORAGE_KEY);
      setDailyTasks(storedTasks ? JSON.parse(storedTasks) : defaultTasks);
    } catch (e) {
      console.error("Failed to load tasks", e);
      setDailyTasks(defaultTasks);
    }
  }, []);

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
  
  useEffect(() => {
    if (isLoaded) {
        try {
            localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(dailyTasks));
        } catch (e) {
            console.error("Failed to save tasks", e);
        }
    }
  }, [dailyTasks, isLoaded]);
  
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

  const addDailyTask = useCallback(() => {
    const newTask: DailyTask = {
      id: `task-${Date.now()}`,
      title: '新任务',
      description: '任务描述...',
      reward: 1,
      reward_type: 'usdt',
      link: '/',
      status: 'draft',
      trigger: 'contract_trade',
      imgSrc: 'https://placehold.co/600x400.png'
    };
    setDailyTasks(prev => [...prev, newTask]);
  }, []);

  const removeDailyTask = useCallback((id: string) => {
    setDailyTasks(prev => prev.filter(task => task.id !== id));
  }, []);

  const updateDailyTask = useCallback((id:string, updates: Partial<DailyTask>) => {
    setDailyTasks(prev => prev.map(task => task.id === id ? { ...task, ...updates } : task));
  }, []);
  
  const triggerTaskCompletion = useCallback((type: TaskTriggerType) => {
    if (!user) return;
    
    const today = new Date().toISOString().split('T')[0];
    const task = dailyTasks.find(t => t.trigger === type && t.status === 'published');
    if (!task) return;

    const isAlreadyCompleted = userTasksState.some(state => state.taskId === task.id && state.date === today);
    if (isAlreadyCompleted) return;

    if (task.reward_type === 'usdt') {
      adjustBalance(user.id, 'USDT', task.reward);
    } else if (task.reward_type === 'credit_score') {
      const newScore = (user.credit_score || 100) + task.reward;
      updateUser(user.id, { credit_score: newScore });
    }
    
    addLog({
        entity_type: 'task_completion',
        entity_id: task.id,
        action: 'user_complete',
        details: `User ${user.username} completed task: "${task.title}" and received ${task.reward} ${task.reward_type}.`,
        actor: user, // Explicitly log this action on behalf of the user
    });

    const newState: UserTaskState = { taskId: task.id, date: today, completed: true };
    setUserTasksState(prev => [...prev, newState]);
  }, [user, dailyTasks, userTasksState, adjustBalance, updateUser, addLog]);

  // Wrap balance context functions to also trigger task completion
  const placeContractTrade: TasksContextType['placeContractTrade'] = useCallback((...args) => {
    balanceContext.placeContractTrade(...args);
    triggerTaskCompletion('contract_trade');
  }, [balanceContext, triggerTaskCompletion]);

  const placeSpotTrade: TasksContextType['placeSpotTrade'] = useCallback((...args) => {
    balanceContext.placeSpotTrade(...args);
    triggerTaskCompletion('spot_trade');
  }, [balanceContext, triggerTaskCompletion]);

  const addDailyInvestment: TasksContextType['addDailyInvestment'] = useCallback(async (...args) => {
    const result = await balanceContext.addDailyInvestment(...args);
    if (result) {
      triggerTaskCompletion('investment');
    }
    return result;
  }, [balanceContext, triggerTaskCompletion]);

  const addHourlyInvestment: TasksContextType['addHourlyInvestment'] = useCallback(async (...args) => {
    const result = await balanceContext.addHourlyInvestment(...args);
    if (result) {
      triggerTaskCompletion('investment');
    }
    return result;
  }, [balanceContext, triggerTaskCompletion]);

  const value: TasksContextType = {
    dailyTasks,
    addDailyTask,
    removeDailyTask,
    updateDailyTask,
    userTasksState,
    placeContractTrade,
    placeSpotTrade,
    addDailyInvestment,
    addHourlyInvestment,
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
