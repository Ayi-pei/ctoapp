
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useBalance } from "@/context/balance-context";
import { Check, Gift, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type CheckInDialogProps = {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
};

const days = ["第一天", "第二天", "第三天", "第四天", "第五天", "第六天", "第七天"];

export function CheckInDialog({ isOpen, onOpenChange }: CheckInDialogProps) {
    const { toast } = useToast();
    const { handleCheckIn, lastCheckInDate, consecutiveCheckIns = 0 } = useBalance();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const todayStr = new Date().toISOString().split('T')[0];
    const hasCheckedInToday = lastCheckInDate === todayStr;

    const handleConfirmCheckIn = async () => {
        setIsSubmitting(true);
        const result = await handleCheckIn();
        if (result.success) {
            toast({
                title: "签到成功",
                description: `恭喜您获得 ${result.reward.toFixed(2)} USDT 奖励！`,
            });
        } else {
            toast({
                variant: "destructive",
                title: "签到失败",
                description: result.message,
            });
        }
        setIsSubmitting(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-zinc-800 border-yellow-500/50 text-white p-0 overflow-hidden">
                <div className="relative p-6 space-y-6">
                     <DialogHeader className="text-center">
                        <DialogTitle className="text-2xl font-bold text-yellow-300 flex items-center justify-center gap-2">
                            <Gift className="h-6 w-6"/>
                            签到送现金
                        </DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-3 gap-4">
                        {days.map((day, index) => {
                            const dayIndex = index + 1;
                            const isCheckedIn = dayIndex <= consecutiveCheckIns;
                            const isFuture = dayIndex > consecutiveCheckIns + (hasCheckedInToday ? 0 : 1);
                            const isToday = dayIndex === consecutiveCheckIns + 1 && !hasCheckedInToday;

                            return (
                                <div
                                    key={day}
                                    className={cn(
                                        "p-3 rounded-lg flex flex-col items-center justify-center aspect-square",
                                        isCheckedIn ? "bg-yellow-600/50 border-2 border-yellow-500 relative" : "bg-zinc-700",
                                        isFuture && "opacity-50",
                                        isToday && "animate-pulse border-2 border-yellow-300"
                                    )}
                                >
                                    {isCheckedIn && (
                                         <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg">
                                            <span className="font-bold text-xl text-yellow-300 transform -rotate-12 opacity-80">已签到</span>
                                         </div>
                                    )}
                                    <p className="text-xs text-yellow-200">{day}</p>
                                    <div className="w-10 h-10 my-1 bg-yellow-400/20 rounded-full flex items-center justify-center">
                                        <Check className="h-6 w-6 text-yellow-400" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    <DialogFooter>
                        <Button 
                            onClick={handleConfirmCheckIn} 
                            disabled={hasCheckedInToday || isSubmitting}
                            className="w-full bg-gradient-to-b from-zinc-200 to-zinc-400 text-zinc-900 font-bold text-lg h-12 rounded-full shadow-lg hover:from-zinc-100 hover:to-zinc-300 disabled:opacity-50"
                        >
                            {hasCheckedInToday ? "今日已签到" : "立即签到"}
                        </Button>
                    </DialogFooter>
                </div>
                <AlertDialog>
                     <AlertDialogTrigger asChild>
                        <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 bg-zinc-900/80 px-1 py-4 rounded-l-md transform cursor-pointer hover:bg-zinc-900">
                            <p className="[writing-mode:vertical-rl] text-sm text-yellow-300 tracking-wider">活动规则</p>
                        </div>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                                <HelpCircle className="h-5 w-5" />
                                签到活动规则
                            </AlertDialogTitle>
                            <div className="text-sm text-muted-foreground text-left pt-4 space-y-2">
                                <p>1. 每日签到均可获得USDT现金奖励，奖励将直接发放到您的账户余额。</p>
                                <p>2. 签到活动以7天为一个完整周期，连续签到天数越长，奖励越丰厚。</p>
                                <p>3. 奖励计算规则：首日签到奖励为 <strong>0.5 USDT</strong>。从第二天起，每日奖励金额为前一天奖励金额的 <strong>1.5倍</strong>。</p>
                                <p>4. 如果签到中断，连续签到天数将从第一天重新开始计算。</p>
                                <p>5. 完成一个7天的签到周期后，下一轮签到将从第一天的奖励重新开始。</p>
                            </div>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogAction>我明白了</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

            </DialogContent>
        </Dialog>
    );
}
