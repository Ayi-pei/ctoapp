
"use client";

import { useState } from 'react';
import DashboardLayout from '@/components/dashboard-layout';
import { useActivities, LimitedTimeActivity } from '@/context/activities-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ChevronLeft, Gift, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { format } from 'date-fns';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';

const ActivityDetailsDialog = ({ activity, isOpen, onOpenChange }: { 
    activity: LimitedTimeActivity | null; 
    isOpen: boolean; 
    onOpenChange: (open: boolean) => void;
}) => {
    if (!activity) return null;
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                 <DialogHeader>
                    <DialogTitle className="text-xl">{activity.title}</DialogTitle>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh] pr-4">
                    {activity.imgSrc && (
                        <div className="relative w-full h-48 my-4 rounded-lg overflow-hidden">
                            <Image src={activity.imgSrc} alt={activity.title} layout="fill" objectFit="cover" />
                        </div>
                    )}
                    <div className="space-y-4 text-sm">
                        <div>
                            <h4 className="font-semibold mb-1">活动介绍</h4>
                            <p className="text-muted-foreground">{activity.description}</p>
                        </div>
                         <div>
                            <h4 className="font-semibold mb-1">奖励规则</h4>
                            <p className="text-muted-foreground">{activity.rewardRule}</p>
                        </div>
                         <div>
                            <h4 className="font-semibold mb-1">领取方式</h4>
                            <p className="text-muted-foreground">{activity.howToClaim}</p>
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>关闭</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default function ActivitiesPage() {
    const { publishedActivities } = useActivities();
    const [selectedActivity, setSelectedActivity] = useState<LimitedTimeActivity | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const router = useRouter();

    const handleActivityClick = (activity: LimitedTimeActivity) => {
        setSelectedActivity(activity);
        setIsDetailsOpen(true);
    };

    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6">
                 <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Gift className="text-primary"/>
                        限时领取
                    </h1>
                </div>

                <div className="space-y-4">
                    {publishedActivities.map((activity) => (
                        <Card 
                            key={activity.id} 
                            className="cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all"
                            onClick={() => handleActivityClick(activity)}
                        >
                            <CardHeader>
                                <CardTitle>{activity.title}</CardTitle>
                                <CardDescription>{activity.description}</CardDescription>
                            </CardHeader>
                            <CardFooter className="flex justify-between items-center text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{format(new Date(activity.createdAt), 'yyyy-MM-dd')}</span>
                                    <span>-</span>
                                    <span>{format(new Date(activity.expiresAt), 'yyyy-MM-dd')}</span>
                                </div>
                                <Button variant="link" className="p-0 h-auto">查看详情</Button>
                            </CardFooter>
                        </Card>
                    ))}
                     {publishedActivities.length === 0 && (
                        <Card className="text-center p-10 text-muted-foreground">
                            <Gift className="h-12 w-12 mx-auto mb-4" />
                            <p>当前暂无活动，敬请期待！</p>
                        </Card>
                    )}
                </div>

                <ActivityDetailsDialog 
                    activity={selectedActivity}
                    isOpen={isDetailsOpen}
                    onOpenChange={setIsDetailsOpen}
                />

            </div>
        </DashboardLayout>
    );
}
