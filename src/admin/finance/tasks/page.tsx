"use client";

import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTasks } from "@/context/tasks-context";
import { DailyTask } from "@/types";
import { PlusCircle, Trash2, Edit2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const TaskEditorCard = ({
  task,
  updateTask,
  removeTask,
}: {
  task: DailyTask;
  updateTask: (id: string, updates: Partial<DailyTask>) => void;
  removeTask: (id: string) => void;
}) => {
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateTask(task.id, { imgSrc: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Card className="p-4 space-y-4 relative">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Edit2 className="h-5 w-5" />
          {task.title || "新任务"}
        </h3>
        <Badge
          variant={task.status === "published" ? "default" : "secondary"}
          className={cn(task.status === "published" && "bg-green-500/80")}
        >
          {task.status === "published" ? "已发布" : "草稿"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`task-title-${task.id}`}>任务标题</Label>
            <Input
              id={`task-title-${task.id}`}
              value={task.title}
              onChange={(e) => updateTask(task.id, { title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`task-desc-${task.id}`}>任务描述</Label>
            <Textarea
              id={`task-desc-${task.id}`}
              value={task.description}
              onChange={(e) =>
                updateTask(task.id, { description: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`task-trigger-${task.id}`}>完成条件 (触发器)</Label>
            <Select
              value={task.trigger}
              onValueChange={(v) => updateTask(task.id, { trigger: v as any })}
            >
              <SelectTrigger id={`task-trigger-${task.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contract_trade">完成一次合约交易</SelectItem>
                <SelectItem value="spot_trade">完成一次币币交易</SelectItem>
                <SelectItem value="investment">完成一次理财投资</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>奖励</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={task.reward}
                onChange={(e) =>
                  updateTask(task.id, {
                    reward: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-2/3"
              />
              <Select
                value={task.reward_type}
                onValueChange={(v) =>
                  updateTask(task.id, { reward_type: v as any })
                }
              >
                <SelectTrigger className="w-1/3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usdt">USDT</SelectItem>
                  <SelectItem value="credit_score">信誉分</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`task-link-${task.id}`}>跳转链接</Label>
            <Input
              id={`task-link-${task.id}`}
              value={task.link}
              onChange={(e) => updateTask(task.id, { link: e.target.value })}
              placeholder="例如: /trade"
            />
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <Label>任务图片</Label>
        <div className="flex items-center gap-4">
          {task.imgSrc && (
            <Image
              src={task.imgSrc}
              alt={task.title}
              width={80}
              height={80}
              className="object-cover rounded-md border"
            />
          )}
          <Input
            id={`task-img-upload-${task.id}`}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="text-xs file:text-xs file:font-medium file:text-foreground file:border-0 file:bg-muted file:rounded-md file:px-2 file:py-1 file:mr-2 hover:file:bg-accent"
          />
        </div>
      </div>
      <div className="flex items-center justify-between pt-4 border-t mt-4">
        <div className="flex items-center space-x-2">
          <Switch
            id={`task-status-${task.id}`}
            checked={task.status === "published"}
            onCheckedChange={(checked) =>
              updateTask(task.id, { status: checked ? "published" : "draft" })
            }
          />
          <Label htmlFor={`task-status-${task.id}`} className="text-sm">
            {task.status === "published" ? "已发布" : "设为发布"}
          </Label>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={() => removeTask(task.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};

export default function AdminTasksPage() {
  const {
    dailyTasks,
    addDailyTask,
    removeDailyTask,
    updateDailyTask,
    isLoadingDailyTasks,
  } = useTasks();
  const { toast } = useToast();

  const handleAddTask = () => {
    const newTask: Omit<DailyTask, "id" | "created_at"> = {
      title: "新任务",
      description: "请填写任务描述",
      status: "draft",
      trigger: "contract_trade",
      reward: 1,
      reward_type: "usdt",
      link: "/",
      imgSrc: "/images/tasks/task-default.png",
    };
    addDailyTask(newTask);
  };

  const handleSave = () => {
    toast({ title: "成功", description: "所有任务设置已自动保存。" });
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6">
        <h1 className="text-2d font-bold">日常任务管理</h1>
        <Card>
          <CardHeader>
            <CardTitle>每日必做</CardTitle>
            <CardDescription>
              设置前端用户“每日任务”板块内容。可编辑任务标题、内容、奖励规则等。
            </CardDescription>
          </CardHeader>
          <ScrollArea className="h-[calc(100vh-22rem)]">
            <CardContent className="space-y-6 pr-6">
              {isLoadingDailyTasks ? (
                <div className="space-y-6">
                  <Skeleton className="w-full h-[320px] rounded-lg" />
                  <Skeleton className="w-full h-[320px] rounded-lg" />
                </div>
              ) : (
                dailyTasks.map((task: DailyTask) => (
                  <TaskEditorCard
                    key={task.id}
                    task={task}
                    updateTask={updateDailyTask}
                    removeTask={removeDailyTask}
                  />
                ))
              )}
            </CardContent>
          </ScrollArea>
          <CardFooter className="flex-col items-start gap-4">
            <Button variant="outline" onClick={handleAddTask}>
              <PlusCircle className="mr-2 h-4 w-4" />
              添加新任务
            </Button>
            <Button onClick={handleSave}>保存全部更改</Button>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
}
