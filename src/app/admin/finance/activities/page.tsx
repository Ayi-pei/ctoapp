
"use client";

import { useState } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActivities, LimitedTimeActivity } from "@/context/activities-context";
import { PlusCircle, Trash2, Edit2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";


const ActivityEditorCard = ({ activity, updateActivity, removeActivity }: {
    activity: LimitedTimeActivity,
    updateActivity: (id: string, updates: Partial<LimitedTimeActivity>) => void,
    removeActivity: (id: string) => void
}) => {
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                updateActivity(activity.id, { imgSrc: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateActivity(activity.id, { expiresAt: new Date(e.target.value).toISOString() });
    }

    return (
        <Card className="p-4 space-y-4 relative">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Edit2 className="h-5 w-5" />
                    {activity.title || '新活动'}
                </h3>
                 <Badge variant={activity.status === 'published' ? 'default' : 'secondary'} className={cn(activity.status === 'published' && "bg-green-500/80")}>
                    {activity.status === 'published' ? '已发布' : '草稿'}
                </Badge>
            </div>
           
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor={`activity-title-${activity.id}`}>活动标题</Label>
                        <Input id={`activity-title-${activity.id}`} value={activity.title} onChange={e => updateActivity(activity.id, { title: e.target.value })} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor={`activity-desc-${activity.id}`}>活动描述</Label>
                        <Textarea id={`activity-desc-${activity.id}`} value={activity.description} onChange={e => updateActivity(activity.id, { description: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor={`activity-reward-${activity.id}`}>奖励规则</Label>
                        <Textarea id={`activity-reward-${activity.id}`} value={activity.rewardRule} onChange={e => updateActivity(activity.id, { rewardRule: e.target.value })} />
                    </div>
                </div>
                <div className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor={`activity-claim-${activity.id}`}>奖励领取方式</Label>
                        <Input id={`activity-claim-${activity.id}`} value={activity.howToClaim} onChange={e => updateActivity(activity.id, { howToClaim: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor={`activity-expiry-${activity.id}`}>截止日期</Label>
                        <Input id={`activity-expiry-${activity.id}`} type="date" value={activity.expiresAt.split('T')[0]} onChange={handleDateChange} />
                    </div>
                     <div className="space-y-2">
                        <Label>活动图片</Label>
                        <div className="flex items-center gap-4">
                            {activity.imgSrc && (
                                <Image 
                                    src={activity.imgSrc} 
                                    alt={activity.title} 
                                    width={80} 
                                    height={80} 
                                    className="object-cover rounded-md border"
                                    data-ai-hint="reward celebration"
                                />
                            )}
                            <Input 
                                id={`activity-img-upload-${activity.id}`} 
                                type="file" 
                                accept="image/*"
                                onChange={handleImageUpload} 
                                className="text-xs file:text-xs file:font-medium file:text-foreground file:border-0 file:bg-muted file:rounded-md file:px-2 file:py-1 file:mr-2 hover:file:bg-accent"
                            />
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t mt-4">
                <div className="flex items-center space-x-2">
                    <Switch
                        id={`activity-status-${activity.id}`}
                        checked={activity.status === 'published'}
                        onCheckedChange={checked => updateActivity(activity.id, { status: checked ? 'published' : 'draft' })}
                    />
                    <Label htmlFor={`activity-status-${activity.id}`} className="text-sm">
                        {activity.status === 'published' ? '已发布' : '设为发布'}
                    </Label>
                </div>
                 <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeActivity(activity.id)}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </Card>
    );
}


export default function AdminActivitiesPage() {
    const { activities, addActivity, removeActivity, updateActivity } = useActivities();
    const { toast } = useToast();

    const handleSave = () => {
        // The context now saves automatically. This button provides user feedback.
        toast({ title: "成功", description: "所有限时活动设置已自动保存。" });
    }

    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6 bg-card/80 backdrop-blur-sm">
                <h1 className="text-2xl font-bold">限时活动管理</h1>
                <Card>
                     <CardHeader>
                        <CardTitle>活动列表</CardTitle>
                        <CardDescription>设置前端用户“限时活动”板块内容。可编辑活动标题、内容、奖励规则、有效期等。</CardDescription>
                    </CardHeader>
                     <ScrollArea className="h-[calc(100vh-22rem)]">
                        <CardContent className="space-y-6 pr-6">
                           {activities.map(activity => (
                                <ActivityEditorCard
                                    key={activity.id}
                                    activity={activity}
                                    updateActivity={updateActivity}
                                    removeActivity={removeActivity}
                                />
                            ))}
                        </CardContent>
                     </ScrollArea>
                    <CardFooter className="flex-col items-start gap-4">
                        <Button variant="outline" onClick={addActivity}>
                            <PlusCircle className="mr-2 h-4 w-4"/>
                            添加新活动
                        </Button>
                       <Button onClick={handleSave}>保存全部更改</Button>
                    </CardFooter>
                </Card>
            </div>
        </DashboardLayout>
    );
}
