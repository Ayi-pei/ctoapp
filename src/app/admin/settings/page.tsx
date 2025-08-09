
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

export default function AdminSettingsPage() {
    const { settings, updateSettings } = useSettings();
    const { toast } = useToast();

    const handleSettingChange = (pair: string, key: keyof TradingPairSettings, value: any) => {
        updateSettings(pair, { [key]: value });
    };
    
    const handleTimeChange = (pair: string, key: 'limitBuyStart' | 'limitBuyEnd', value: string) => {
        updateSettings(pair, { [key]: value || null });
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
                            profitRate: 0.85,
                            limitBuyStart: null,
                            limitBuyEnd: null,
                        };
                        return (
                             <Card key={pair}>
                                <CardHeader>
                                    <CardTitle>{pair}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <Label>价格趋势</Label>
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
                                    
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor={`limit-buy-${pair}`}>限定买入</Label>
                                            <Switch
                                                id={`limit-buy-${pair}`}
                                                checked={pairSettings.tradingDisabled}
                                                onCheckedChange={(checked) => handleSettingChange(pair, 'tradingDisabled', checked)}
                                            />
                                        </div>
                                        {pairSettings.tradingDisabled && (
                                            <div className="grid grid-cols-2 gap-2 pl-2 border-l-2">
                                                 <div>
                                                    <Label htmlFor={`limit-start-${pair}`} className="text-xs">开始时间</Label>
                                                    <Input
                                                        id={`limit-start-${pair}`}
                                                        type="time"
                                                        value={pairSettings.limitBuyStart || ""}
                                                        onChange={(e) => handleTimeChange(pair, 'limitBuyStart', e.target.value)}
                                                    />
                                                </div>
                                                 <div>
                                                    <Label htmlFor={`limit-end-${pair}`} className="text-xs">结束时间</Label>
                                                    <Input
                                                        id={`limit-end-${pair}`}
                                                        type="time"
                                                        value={pairSettings.limitBuyEnd || ""}
                                                        onChange={(e) => handleTimeChange(pair, 'limitBuyEnd', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Label htmlFor={`profit-rate-${pair}`}>秒合约收益率 (%)</Label>
                                        <Input
                                            id={`profit-rate-${pair}`}
                                            type="number"
                                            value={pairSettings.profitRate * 100}
                                            onChange={(e) => handleSettingChange(pair, 'profitRate', parseFloat(e.target.value) / 100)}
                                            placeholder="例如: 85"
                                        />
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
