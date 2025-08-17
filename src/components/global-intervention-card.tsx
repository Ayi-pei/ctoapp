
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { availablePairs } from "@/types";
import { useAdminSettings } from "@/context/admin-settings-context";
import { useToast } from "@/hooks/use-toast";
import { ChevronsRight } from "lucide-react";


export const GlobalInterventionCard = () => {
    const { startOverride } = useAdminSettings();
    const { toast } = useToast();
    const [pair, setPair] = useState(availablePairs[0]);
    const [price, setPrice] = useState("");
    const [duration, setDuration] = useState("10");

    const handleStartOverride = () => {
        const priceNum = parseFloat(price);
        const durationNum = parseInt(duration, 10);
        if (isNaN(priceNum) || priceNum <= 0) {
            toast({ variant: 'destructive', title: "错误", description: "请输入有效的干预价格。" });
            return;
        }
        if (isNaN(durationNum) || durationNum <= 0) {
            toast({ variant: 'destructive', title: "错误", description: "请输入有效的干预时长。" });
            return;
        }
        
        startOverride(pair, priceNum, Math.random() * 10, durationNum);
        toast({ title: "干预已启动", description: `交易对 ${pair} 的价格已临时设置为 ${priceNum}，持续 ${durationNum} 秒。` });
        setPrice("");
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>全局市场干预</CardTitle>
                <CardDescription>临时覆盖指定交易对的实时价格，用于测试或演示。此操作将覆盖所有其他设置。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="override-pair">交易对</Label>
                    <Select value={pair} onValueChange={setPair}>
                        <SelectTrigger id="override-pair">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {availablePairs.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="override-price">干预价格 (USDT)</Label>
                    <Input id="override-price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="例如: 70000" />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="override-duration">持续时间 (秒)</Label>
                    <Input id="override-duration" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="例如: 10" />
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleStartOverride} className="w-full">
                    <ChevronsRight className="mr-2 h-4 w-4" />
                    启动临时干预
                </Button>
            </CardFooter>
        </Card>
    )
}
