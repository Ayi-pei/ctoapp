
"use client";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useSettings, TradingPairSettings } from "@/context/settings-context";
import { availablePairs } from "@/types";
import { PlusCircle, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function AdminSettingsPage() {
    const { 
        settings, 
        updateSettings, 
        addSpecialTimeFrame, 
        removeSpecialTimeFrame,
        updateSpecialTimeFrame
    } = useSettings();
    const { toast } = useToast();

    const handleSettingChange = (pair: string, key: keyof TradingPairSettings, value: any) => {
        updateSettings(pair, { [key]: value });
    };
    
    const handleSave = () => {
        // The context now saves on every change, but we can keep the button for user feedback.
        toast({
            title: "设置已保存",
            description: "市场模拟参数已更新。",
        });
    };

    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">系统与市场设置</h1>
                    <Button onClick={handleSave}>保存全部更改</Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {availablePairs.map((pair) => {
                        const pairSettings = settings[pair] || { 
                            trend: 'normal', 
                            tradingDisabled: false, 
                            baseProfitRate: 0.85,
                            specialTimeFrames: [],
                        };
                        return (
                             <Card key={pair}>
                                <CardHeader>
                                    <CardTitle>{pair}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Trend Control */}
                                    <div className="space-y-2">
                                        <Label>价格趋势 (模拟)</Label>
                                        <div className="flex items-center space-x-4">
                                             <div className="flex items-center space-x-2">
                                                <Label htmlFor={`trend-up-${pair}`}>拉升</Label>
                                                <Switch
                                                    id={`trend-up-${pair}`}
                                                    checked={pairSettings.trend === 'up'}
                                                    onCheckedChange={(checked) => handleSettingChange(pair, 'trend', checked ? 'up' : 'normal')}
                                                />
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Label htmlFor={`trend-down-${pair}`}>下降</Label>
                                                <Switch
                                                    id={`trend-down-${pair}`}
                                                    checked={pairSettings.trend === 'down'}
                                                    onCheckedChange={(checked) => handleSettingChange(pair, 'trend', checked ? 'down' : 'normal')}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <Separator />
                                    
                                    {/* Default Profit Rate */}
                                    <div className="space-y-2">
                                        <Label htmlFor={`base-profit-rate-${pair}`}>基础秒合约收益率 (%)</Label>
                                        <Input
                                            id={`base-profit-rate-${pair}`}
                                            type="number"
                                            value={(pairSettings.baseProfitRate * 100).toFixed(0)}
                                            onChange={(e) => handleSettingChange(pair, 'baseProfitRate', parseFloat(e.target.value) / 100)}
                                            placeholder="例如: 85"
                                        />
                                    </div>
                                    
                                    <Separator />
                                    
                                    {/* Special Time Frames */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor={`limit-buy-${pair}`}>限定时段交易</Label>
                                            <Switch
                                                id={`limit-buy-${pair}`}
                                                checked={pairSettings.tradingDisabled}
                                                onCheckedChange={(checked) => handleSettingChange(pair, 'tradingDisabled', checked)}
                                            />
                                        </div>

                                        <p className="text-xs text-muted-foreground">
                                            启用后，仅在下方设定的特殊时间段内可以进行交易，并应用特殊收益率。
                                        </p>

                                        <div className="space-y-4">
                                            {pairSettings.specialTimeFrames.map((frame, index) => (
                                                <div key={frame.id} className="p-3 border rounded-lg space-y-3 relative">
                                                    <h4 className="text-sm font-medium">特殊时段 {index + 1}</h4>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <Label htmlFor={`start-time-${frame.id}`} className="text-xs">开始时间</Label>
                                                            <Input 
                                                                id={`start-time-${frame.id}`}
                                                                type="time" 
                                                                value={frame.startTime}
                                                                onChange={(e) => updateSpecialTimeFrame(pair, frame.id, { startTime: e.target.value })}
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label htmlFor={`end-time-${frame.id}`} className="text-xs">结束时间</Label>
                                                            <Input 
                                                                id={`end-time-${frame.id}`}
                                                                type="time" 
                                                                value={frame.endTime}
                                                                onChange={(e) => updateSpecialTimeFrame(pair, frame.id, { endTime: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <Label htmlFor={`profit-rate-${frame.id}`} className="text-xs">此时间段收益率 (%)</Label>
                                                        <Input
                                                            id={`profit-rate-${frame.id}`}
                                                            type="number"
                                                            value={(frame.profitRate * 100).toFixed(0)}
                                                            onChange={(e) => updateSpecialTimeFrame(pair, frame.id, { profitRate: parseFloat(e.target.value) / 100 })}
                                                        />
                                                    </div>
                                                     <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="absolute top-1 right-1 h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => removeSpecialTimeFrame(pair, frame.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                        
                                        <Button variant="outline" size="sm" onClick={() => addSpecialTimeFrame(pair)}>
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            添加特殊时间段
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </div>
        </DashboardLayout>
    );
}
