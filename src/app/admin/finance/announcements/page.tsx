
"use client";

import { useState } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAnnouncements, CarouselItemData, HornAnnouncement } from "@/context/announcements-context";
import { PlusCircle, Trash2, Edit2, GripVertical, ArrowDown, ArrowUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";


const HornAnnouncementEditor = ({ announcements, updateHornAnnouncement, removeHornAnnouncement, reorderHornAnnouncements }: {
    announcements: HornAnnouncement[],
    updateHornAnnouncement: (id: string, updates: Partial<HornAnnouncement>) => void,
    removeHornAnnouncement: (id: string) => void,
    reorderHornAnnouncements: (id: string, direction: 'up' | 'down') => void,
}) => {
     return (
        <div className="space-y-4">
            {announcements.map((ann, index) => (
                <Card key={ann.id} className="p-4 bg-muted/50">
                    <div className="flex gap-4">
                        <div className="flex flex-col items-center gap-1 text-muted-foreground pt-1">
                             <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === 0} onClick={() => reorderHornAnnouncements(ann.id, 'up')}>
                                <ArrowUp className="h-4 w-4" />
                            </Button>
                            <GripVertical className="h-5 w-5" />
                             <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === announcements.length - 1} onClick={() => reorderHornAnnouncements(ann.id, 'down')}>
                                <ArrowDown className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex-grow space-y-3">
                             <div className="flex items-center justify-between">
                                <Label className="text-base">喇叭公告 {index + 1}</Label>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeHornAnnouncement(ann.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor={`horn-theme-${ann.id}`}>主题</Label>
                                    <Select value={ann.theme} onValueChange={(value) => updateHornAnnouncement(ann.id, { theme: value as any })}>
                                        <SelectTrigger id={`horn-theme-${ann.id}`}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="更新公告">更新公告</SelectItem>
                                            <SelectItem value="重磅通知">重磅通知</SelectItem>
                                            <SelectItem value="庆贺">庆贺</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 md:col-span-3">
                                    <Label htmlFor={`horn-content-${ann.id}`}>内容</Label>
                                    <Input 
                                        id={`horn-content-${ann.id}`}
                                        value={ann.content}
                                        onChange={(e) => updateHornAnnouncement(ann.id, { content: e.target.value })}
                                        placeholder="输入公告内容"
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor={`horn-priority-${ann.id}`}>优先级</Label>
                                    <Input 
                                        id={`horn-priority-${ann.id}`}
                                        type="number"
                                        value={ann.priority}
                                        onChange={(e) => updateHornAnnouncement(ann.id, { priority: parseInt(e.target.value) || 0 })}
                                        placeholder="数字越大越靠前"
                                    />
                                </div>
                                 <div className="space-y-2 md:col-span-3">
                                    <Label htmlFor={`horn-expires-${ann.id}`}>过期时间</Label>
                                    <Input 
                                        id={`horn-expires-${ann.id}`}
                                        type="datetime-local"
                                        value={ann.expires_at ? ann.expires_at.slice(0, 16) : ''}
                                        onChange={(e) => updateHornAnnouncement(ann.id, { expires_at: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            ))}
             <Button variant="outline" onClick={() => { /* Implemented in parent */ }} disabled>
                <PlusCircle className="mr-2 h-4 w-4" />
                添加喇叭公告 (最多3条)
            </Button>
        </div>
    )
}

const CarouselEditor = ({ items, updateCarouselItem }: {
    items: CarouselItemData[],
    updateCarouselItem: (index: number, updates: Partial<CarouselItemData>) => void
}) => {
    return (
        <div className="space-y-4">
            {items.map((item, index) => (
                <Card key={index} className="p-4 bg-muted/50">
                     <Label className="text-base">轮播图 {index + 1}</Label>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <div className="space-y-2">
                            <Label htmlFor={`carousel-title-${index}`}>标题</Label>
                            <Input 
                                id={`carousel-title-${index}`}
                                value={item.title}
                                onChange={(e) => updateCarouselItem(index, { title: e.target.value })}
                            />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor={`carousel-desc-${index}`}>描述</Label>
                            <Input 
                                id={`carousel-desc-${index}`}
                                value={item.description}
                                onChange={(e) => updateCarouselItem(index, { description: e.target.value })}
                            />
                        </div>
                         <div className="space-y-2 md:col-span-2">
                            <Label htmlFor={`carousel-href-${index}`}>跳转链接</Label>
                            <Input 
                                id={`carousel-href-${index}`}
                                value={item.href}
                                onChange={(e) => updateCarouselItem(index, { href: e.target.value })}
                                placeholder="例如: /trade"
                            />
                        </div>
                     </div>
                </Card>
            ))}
        </div>
    )
}


export default function AdminAnnouncementsPage() {
    const { 
        carouselItems, 
        hornAnnouncements,
        updateCarouselItem, 
        updateHornAnnouncement,
        addHornAnnouncement,
        removeHornAnnouncement,
        reorderHornAnnouncements,
        saveAllAnnouncements
    } = useAnnouncements();
    const { toast } = useToast();

    const handleSave = () => {
        saveAllAnnouncements();
        toast({ title: "成功", description: "所有公告设置已保存。" });
    }

    const handleAddHorn = () => {
        if (hornAnnouncements.length < 3) {
            addHornAnnouncement();
        } else {
             toast({ variant: "destructive", title: "已达上限", description: "最多只能添加3条喇叭公告。" });
        }
    }

    return (
        <DashboardLayout>
             <div className="p-4 md:p-8 space-y-6">
                <h1 className="text-2xl font-bold">公告发布管理</h1>

                <Card>
                    <CardHeader>
                        <CardTitle>首页轮播图设置</CardTitle>
                        <CardDescription>编辑首页顶部轮播图的文字内容和跳转链接。图片资源为系统内置，不可修改。</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <CarouselEditor items={carouselItems} updateCarouselItem={updateCarouselItem} />
                    </CardContent>
                </Card>
                
                 <Card>
                    <CardHeader>
                        <CardTitle>首页喇叭公告</CardTitle>
                        <CardDescription>编辑、排序、删除首页滚动显示的喇叭公告。最多可设置3条。</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {hornAnnouncements.map((ann, index) => (
                                <Card key={ann.id} className={cn("p-4 bg-muted/50 transition-colors", ann.expires_at && new Date(ann.expires_at) < new Date() && "border-dashed border-muted-foreground opacity-60")}>
                                    <div className="flex gap-4">
                                        <div className="flex flex-col items-center gap-1 text-muted-foreground pt-1">
                                            <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === 0} onClick={() => reorderHornAnnouncements(ann.id, 'up')}>
                                                <ArrowUp className="h-4 w-4" />
                                            </Button>
                                            <GripVertical className="h-5 w-5" />
                                            <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === hornAnnouncements.length - 1} onClick={() => reorderHornAnnouncements(ann.id, 'down')}>
                                                <ArrowDown className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <div className="flex-grow space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-base">喇叭公告 {index + 1}</Label>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeHornAnnouncement(ann.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                                <div className="space-y-2 md:col-span-2">
                                                    <Label htmlFor={`horn-theme-${ann.id}`}>主题</Label>
                                                    <Select value={ann.theme} onValueChange={(value) => updateHornAnnouncement(ann.id, { theme: value as any })}>
                                                        <SelectTrigger id={`horn-theme-${ann.id}`}>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="更新公告">更新公告</SelectItem>
                                                            <SelectItem value="重磅通知">重磅通知</SelectItem>
                                                            <SelectItem value="庆贺">庆贺</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2 md:col-span-3">
                                                    <Label htmlFor={`horn-content-${ann.id}`}>内容</Label>
                                                    <Input 
                                                        id={`horn-content-${ann.id}`}
                                                        value={ann.content}
                                                        onChange={(e) => updateHornAnnouncement(ann.id, { content: e.target.value })}
                                                        placeholder="输入公告内容"
                                                    />
                                                </div>
                                                 <div className="space-y-2 md:col-span-2">
                                                    <Label htmlFor={`horn-priority-${ann.id}`}>优先级</Label>
                                                    <Input 
                                                        id={`horn-priority-${ann.id}`}
                                                        type="number"
                                                        value={ann.priority}
                                                        onChange={(e) => updateHornAnnouncement(ann.id, { priority: parseInt(e.target.value) || 0 })}
                                                        placeholder="数字越大越靠前"
                                                    />
                                                </div>
                                                 <div className="space-y-2 md:col-span-3">
                                                    <Label htmlFor={`horn-expires-${ann.id}`}>过期时间 (选填)</Label>
                                                    <Input 
                                                        id={`horn-expires-${ann.id}`}
                                                        type="datetime-local"
                                                        value={ann.expires_at ? ann.expires_at.slice(0, 16) : ''}
                                                        onChange={(e) => updateHornAnnouncement(ann.id, { expires_at: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                            <Button variant="outline" onClick={handleAddHorn} disabled={hornAnnouncements.length >= 3}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                添加喇叭公告
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Button onClick={handleSave}>保存全部更改</Button>

             </div>
        </DashboardLayout>
    );
}
