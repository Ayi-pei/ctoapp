
"use client";

import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/dashboard-layout';
import { useTasks, DailyTask } from '@/context/tasks-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";


const TaskDetailsDialog = ({ task, isOpen, onOpenChange, onGo }: { 
    task: DailyTask | null; 
    isOpen: boolean; 
    onOpenChange: (open: boolean) => void;
    onGo: (link: string) => void;
}) => {
    if (!task) return null;
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{task.title}</DialogTitle>
                     <DialogDescription>{task.description}</DialogDescription>
                </DialogHeader>
                {task.imgSrc && (
                    <div className="relative w-full h-48 my-4 rounded-lg overflow-hidden">
                        <Image src={task.imgSrc} alt={task.title} layout="fill" objectFit="cover" />
                    </div>
                )}
                <div className="text-sm space-y-2">
                    <p><strong>奖励:</strong> <span className="font-bold text-primary">{task.reward} {task.reward_type === 'usdt' ? 'USDT' : '信誉分'}</span></p>
                    <p><strong>状态:</strong> <span className="text-muted-foreground">未完成</span></p>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button>
                    <Button onClick={() => onGo(task.link)}>前往完成</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


export default function TasksPage() {
    const { dailyTasks, userTasksState } = useTasks();
    const [selectedTask, setSelectedTask] = useState<DailyTask | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const router = useRouter();

    const todayStr = new Date().toISOString().split('T')[0];

    const { completedTasks, incompleteTasks, progress } = useMemo(() => {
        const publishedTasks = dailyTasks.filter(t => t.status === 'published');
        
        const completedIds = userTasksState
            .filter(state => state.date === todayStr && state.completed)
            .map(state => state.taskId);

        const completed = publishedTasks.filter(task => completedIds.includes(task.id));
        const incomplete = publishedTasks.filter(task => !completedIds.includes(task.id));
        
        const calculatedProgress = publishedTasks.length > 0 ? (completed.length / publishedTasks.length) * 100 : 0;
        
        return { 
            completedTasks: completed, 
            incompleteTasks: incomplete, 
            progress: calculatedProgress 
        };
    }, [dailyTasks, userTasksState, todayStr]);


    const handleTaskClick = (task: DailyTask) => {
        setSelectedTask(task);
        setIsDetailsOpen(true);
    };

    const handleGoToTask = (link: string) => {
        setIsDetailsOpen(false);
        router.push(link);
    };
    
    const totalTasks = incompleteTasks.length + completedTasks.length;

    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6">
                 <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <h1 className="text-2xl font-bold">每日任务</h1>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>任务中心</CardTitle>
                        <CardDescription>完成每日任务，领取丰厚奖励！</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-sm font-medium">今日进度</p>
                                <p className="text-sm font-bold text-primary">{completedTasks.length} / {totalTasks}</p>
                            </div>
                            <Progress value={progress} />
                        </div>
                        
                        <div className="space-y-2">
                            {[...incompleteTasks, ...completedTasks].map((task) => {
                                const isCompleted = completedTasks.some(ct => ct.id === task.id);
                                return (
                                     <div
                                        key={task.id}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all",
                                            isCompleted
                                                ? "bg-muted/50 text-muted-foreground border-dashed"
                                                : "bg-card hover:bg-muted"
                                        )}
                                        onClick={() => !isCompleted && handleTaskClick(task)}
                                    >
                                        <div className="flex items-center gap-4">
                                            {isCompleted ? (
                                                <CheckCircle className="h-6 w-6 text-green-500" />
                                            ) : (
                                                <Circle className="h-6 w-6 text-primary" />
                                            )}
                                            <div>
                                                <p className={cn("font-semibold", isCompleted ? "line-through" : "")}>{task.title}</p>
                                                <p className="text-xs text-muted-foreground">{task.description}</p>
                                            </div>
                                        </div>
                                         <div className="text-right">
                                            <p className="font-bold text-primary">+{task.reward}</p>
                                            <p className="text-xs text-muted-foreground">{task.reward_type === 'usdt' ? 'USDT' : '信誉分'}</p>
                                         </div>
                                    </div>
                                );
                            })}
                        </div>

                    </CardContent>
                </Card>

                <TaskDetailsDialog 
                    task={selectedTask}
                    isOpen={isDetailsOpen}
                    onOpenChange={setIsDetailsOpen}
                    onGo={handleGoToTask}
                />

            </div>
        </DashboardLayout>
    );
}
