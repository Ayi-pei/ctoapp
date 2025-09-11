
"use client";

// Disable SSR for this page to avoid context issues
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import DashboardLayout from '@/components/dashboard-layout';
import { useTasks } from '@/context/tasks-context';
import type { IncentiveTask } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, ChevronLeft, Loader2, Lock, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { CheckInDialog } from "@/components/check-in-dialog";
import { Skeleton } from '@/components/ui/skeleton';

// Skeleton Loader for when tasks are being fetched
const TaskSkeleton = () => (
    <Card>
        <CardHeader className="flex flex-row items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-lg" />
            <div className='flex-1 space-y-2'>
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="h-4 w-4/5" />
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-10 w-24" />
            </div>
        </CardContent>
    </Card>
);

const TaskCard = ({ task, onClaim, onNavigate, isClaiming }: {
    task: IncentiveTask;
    onClaim: (key: string) => void;
    onNavigate: (link: string, key: string) => void;
    isClaiming: boolean;
}) => {
    const progressValue = (task.progress.current / task.progress.target) * 100;

    const renderButton = () => {
        switch (task.status) {
            case 'COMPLETED':
                return <Button disabled variant="secondary"><CheckCircle className="mr-2 h-4 w-4" />已完成</Button>;
            case 'ELIGIBLE':
                 if (isClaiming) {
                    return <Button disabled><Loader2 className="mr-2 h-4 w-4 animate-spin" />处理中...</Button>;
                }
                if (task.key === 'daily_check_in') {
                    return <Button onClick={() => onNavigate(task.link, task.key)}><Gift className="mr-2 h-4 w-4" />去签到</Button>;
                }
                return <Button onClick={() => onClaim(task.key)}><Gift className="mr-2 h-4 w-4" />领取奖励</Button>;
            case 'IN_PROGRESS':
            case 'LOCKED':
                return <Button variant="outline" onClick={() => onNavigate(task.link, task.key)}>前往完成</Button>;
            default:
                return <Button disabled variant="outline">未知状态</Button>;
        }
    };

    return (
        <Card className={cn("transition-all", task.status === 'COMPLETED' && "bg-muted/50")}>
            <CardHeader className="flex flex-row items-center gap-4">
                {task.imgSrc && (
                    <Image src={task.imgSrc} alt={task.title} width={64} height={64} className="rounded-lg" />
                )}
                <div className='flex-1'>
                    <CardTitle className={cn(task.status === 'COMPLETED' && "text-muted-foreground line-through")}>{task.title}</CardTitle>
                    <CardDescription className="mt-1">{task.description}</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="flex justify-between items-center">
                     <div className='space-y-1'>
                        <p className="text-sm font-medium">奖励: <span className="text-primary font-bold">{task.reward}</span></p>
                        {task.progress.target > 1 && (
                             <p className="text-xs text-muted-foreground">
                                进度: {task.progress.current.toFixed(0)} / {task.progress.target}
                            </p>
                        )}
                    </div>
                    {renderButton()}
                 </div>
                 {task.progress.target > 1 && <Progress value={progressValue} />}
            </CardContent>
        </Card>
    );
};


export default function TasksPage() {
    const { tasks, isLoading, claimReward, fetchTaskStates } = useTasks();
    const [isCheckInOpen, setIsCheckInOpen] = useState(false);
    const [claimingTask, setClaimingTask] = useState<string | null>(null);
    const router = useRouter();

    const handleNavigate = (link: string, key: string) => {
        if (link === 'action:openCheckIn') {
            setIsCheckInOpen(true);
        } else {
            router.push(link);
        }
    };

    const handleClaim = async (taskKey: string) => {
        setClaimingTask(taskKey);
        await claimReward(taskKey);
        setClaimingTask(null);
    };

    return (
        <DashboardLayout>
            <div className="p-4 md:p-6 space-y-6">
                 <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <h1 className="text-2xl font-bold">任务中心</h1>
                </div>

                <div className="space-y-4">
                    {isLoading ? (
                        <>
                            <TaskSkeleton />
                            <TaskSkeleton />
                            <TaskSkeleton />
                        </>
                    ) : (
                        tasks.map(task => (
                            <TaskCard 
                                key={task.key}
                                task={task}
                                onClaim={handleClaim}
                                onNavigate={handleNavigate}
                                isClaiming={claimingTask === task.key}
                            />
                        ))
                    )}
                </div>
                 
                <CheckInDialog 
                    isOpen={isCheckInOpen} 
                    onOpenChange={(isOpen) => {
                        setIsCheckInOpen(isOpen);
                        // If dialog is closed, refresh task states as check-in might have occurred
                        if (!isOpen) {
                            fetchTaskStates();
                        }
                    }}
                 />
            </div>
        </DashboardLayout>
    );
}
