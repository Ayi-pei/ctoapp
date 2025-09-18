"use client";

import AuthLayout from "@/components/auth-layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { useAuth } from "@/context/unified-auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LoaderCircle,
  PlusCircle,
  Edit2,
  Trash2,
  Eye,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTasks } from "@/context/tasks-context";
import { useToast } from "@/hooks/use-toast";
import { DailyTask } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import Image from "next/image";

// 任务编辑卡片组件
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
              placeholder="输入任务标题"
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
              placeholder="详细描述任务内容和要求"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`task-trigger-${task.id}`}>
              完成条件（触发器）
            </Label>
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
                <SelectItem value="investment_create">
                  完成一次理财投资
                </SelectItem>
                <SelectItem value="trade_complete">完成一次交易</SelectItem>
                <SelectItem value="daily_check_in">每日签到</SelectItem>
                <SelectItem value="market_prediction">市场预测</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>奖励设置</Label>
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
                placeholder="奖励数量"
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
                  <SelectItem value="btc">BTC</SelectItem>
                  <SelectItem value="eth">ETH</SelectItem>
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
              placeholder="例如: /trade 或 /finance"
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

// Disable SSR for this page to avoid context issues
export const dynamic = "force-dynamic";

export default function AdminFinanceTasksPage() {
  const { isAdmin, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const {
    dailyTasks,
    addDailyTask,
    removeDailyTask,
    updateDailyTask,
    isLoadingDailyTasks,
  } = useTasks();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace("/login");
      } else if (!isAdmin) {
        router.replace("/dashboard");
      }
    }
  }, [isAdmin, isLoading, isAuthenticated, router]);

  const handleAddTask = () => {
    const newTask: Omit<DailyTask, "id" | "created_at"> = {
      title: "新任务",
      description: "请填写任务描述",
      status: "draft",
      trigger: "trade_complete",
      reward: 1,
      reward_type: "usdt",
      link: "/",
      imgSrc: "/images/tasks/task-default.png",
    };
    addDailyTask(newTask);
    toast({
      title: "任务已创建",
      description: "新任务已添加到列表，请完善任务信息。",
    });
  };

  const handleSave = () => {
    toast({
      title: "保存成功",
      description: "所有任务设置已自动保存。",
    });
  };

  if (isLoading) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center gap-4">
          <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">正在加载，请稍候...</p>
        </div>
      </AuthLayout>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground">
            您需要以管理员身份登录才能访问此页面。
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="p-4 md:p-8 space-y-6">
        {/* 页面标题和描述 */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary" />
            日常任务管理
          </h1>
          <p className="text-muted-foreground">
            管理用户日常任务，设置任务内容、奖励和完成条件。发布的任务将在用户的"任务中心"中显示。
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              每日任务配置
            </CardTitle>
            <CardDescription>
              设置前端用户"每日任务"板块内容。可编辑任务标题、描述、奖励规则和完成条件。
            </CardDescription>
          </CardHeader>

          <ScrollArea className="h-[calc(100vh-22rem)]">
            <CardContent className="space-y-6 pr-6">
              {isLoadingDailyTasks ? (
                <div className="space-y-6">
                  <Skeleton className="w-full h-[320px] rounded-lg" />
                  <Skeleton className="w-full h-[320px] rounded-lg" />
                </div>
              ) : dailyTasks.length === 0 ? (
                <div className="text-center py-12">
                  <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">暂无任务</h3>
                  <p className="text-muted-foreground mb-4">
                    还没有创建任何日常任务，点击下方按钮创建第一个任务。
                  </p>
                  <Button onClick={handleAddTask}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    创建第一个任务
                  </Button>
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

          {dailyTasks.length > 0 && (
            <CardFooter className="flex-col items-start gap-4 border-t bg-muted/30">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-4">
                  <Button variant="outline" onClick={handleAddTask}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    添加新任务
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    共 {dailyTasks.length} 个任务，
                    {
                      dailyTasks.filter((t) => t.status === "published").length
                    }{" "}
                    个已发布
                  </div>
                </div>
                <Button onClick={handleSave}>保存全部更改</Button>
              </div>

              <div className="text-xs text-muted-foreground">
                💡
                提示：任务修改后会自动保存，发布状态的任务将立即在用户端生效。
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </AuthLayout>
  );
}
