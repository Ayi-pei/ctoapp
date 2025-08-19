
"use client";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSystemSettings, TradingPairSettings, SpecialTimeFrame, MarketOverridePreset } from "@/context/system-settings-context";
import { availablePairs } from "@/types";
import { PlusCircle, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";


const PairSettingsCard = ({ 
    pair, 
    settings, 
    handleSettingChange, 
    handleTrendChange, 
    handleVolatilityChange, 
    updateSpecialTimeFrame, 
    addSpecialTimeFrame, 
    removeSpecialTimeFrame,
    addMarketOverride,
    updateMarketOverride,
    removeMarketOverride
}: { 
    pair: string, 
    settings: TradingPairSettings,
    handleSettingChange: (pair: string, key: keyof TradingPairSettings, value: any) => void,
    handleTrendChange: (pair: string, newTrend: 'up' | 'down' | 'normal') => void,
    handleVolatilityChange: (pair: string, value: number[]) => void,
    updateSpecialTimeFrame: (pair: string, frameId: string, updates: Partial<SpecialTimeFrame>) => void,
    addSpecialTimeFrame: (pair: string) => void,
    removeSpecialTimeFrame: (pair: string, frameId: string) => void,
    addMarketOverride: (pair: string) => void,
    updateMarketOverride: (pair: string, overrideId: string, updates: Partial<MarketOverridePreset>) => void,
    removeMarketOverride: (pair: string, overrideId: string) => void
}) => {
    const [volatilityValue, setVolatilityValue] = useState(settings.volatility);

    return (
        <div key={pair} className="p-4 border rounded-lg space-y-4">
            <h3 className="font-semibold text-lg">{pair}</h3>
            
            <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                <Label htmlFor={`halt-trading-${pair}`} className="font-semibold">暂停此币种交易</Label>
                <Switch
                    id={`halt-trading-${pair}`}
                    checked={settings.isTradingHalted}
                    onCheckedChange={(checked: boolean) => handleSettingChange(pair, 'isTradingHalted', checked)}
                />
            </div>
            
            <Separator />

            <div className="space-y-2">
                <Label>价格趋势模拟</Label>
                <p className="text-xs text-muted-foreground">
                此设置控制价格的长期走向。关闭所有开关则为随机游走。
                </p>
                <div className="flex items-center space-x-4 pt-2">
                    <div className="flex items-center space-x-2">
                        <Label htmlFor={`trend-up-${pair}`}>拉升</Label>
                        <Switch
                            id={`trend-up-${pair}`}
                            checked={settings.trend === 'up'}
                            onCheckedChange={() => handleTrendChange(pair, 'up')}
                        />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Label htmlFor={`trend-down-${pair}`}>下降</Label>
                        <Switch
                            id={`trend-down-${pair}`}
                            checked={settings.trend === 'down'}
                            onCheckedChange={() => handleTrendChange(pair, 'down')}
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <Label>价格波动率</Label>
                    <span className="text-sm font-medium text-primary">{(volatilityValue * 100).toFixed(0)}%</span>
                </div>
                 <p className="text-xs text-muted-foreground">
                    此设置控制价格上下跳动的幅度，不影响总体趋势。
                </p>
                <Slider
                    defaultValue={[settings.volatility]}
                    max={0.2}
                    min={0.01}
                    step={0.01}
                    onValueChange={(value: number[]) => setVolatilityValue(value[0])}
                    onValueCommit={(value: number[]) => handleVolatilityChange(pair, value)}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>平稳</span>
                    <span>剧烈</span>
                </div>
            </div>

            <Separator />
            
            <div className="space-y-2">
                <Label htmlFor={`base-profit-rate-${pair}`}>基础秒合约收益率 (%)</Label>
                <Input
                    id={`base-profit-rate-${pair}`}
                    type="number"
                    value={(settings.baseProfitRate * 100).toFixed(0)}
                    onChange={(e) => handleSettingChange(pair, 'baseProfitRate', parseFloat(e.target.value) / 100)}
                    placeholder="例如: 85"
                />
            </div>
            
            <Separator />
            
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label htmlFor={`limit-buy-${pair}`} className="font-semibold">限定时段交易</Label>
                    <Switch
                        id={`limit-buy-${pair}`}
                        checked={settings.tradingDisabled}
                        onCheckedChange={(checked: boolean) => handleSettingChange(pair, 'tradingDisabled', checked)}
                    />
                </div>

                <p className="text-xs text-muted-foreground">
                    启用后，仅在下方设定的特殊时间点可以进行交易，并应用特殊收益率。
                </p>

                <div className="space-y-4">
                    {settings.specialTimeFrames.map((frame, index) => {
                        return (
                            <div key={frame.id} className="p-3 border rounded-lg space-y-3 relative bg-muted/30">
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
                                <div className="space-y-2">
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
                        )
                    })}
                </div>
                
                <Button variant="outline" size="sm" onClick={() => addSpecialTimeFrame(pair)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    添加特殊时间段
                </Button>
            </div>
            
            <Separator />
            
             <div className="space-y-4">
                <Label className="font-semibold">市场数据干预</Label>
                 <p className="text-xs text-muted-foreground">
                    设置一个时间段，用自定义的模拟数据覆盖真实市场行情。
                </p>
                {settings.marketOverrides.map((override, index) => (
                    <div key={override.id} className="p-3 border rounded-lg space-y-3 relative bg-muted/30">
                        <h4 className="text-sm font-medium">干预时段 {index + 1}</h4>
                         <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute top-1 right-1 h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeMarketOverride(pair, override.id)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label htmlFor={`override-start-${override.id}`} className="text-xs">开始时间</Label>
                                <Input 
                                    id={`override-start-${override.id}`}
                                    type="time" 
                                    value={override.startTime}
                                    onChange={(e) => updateMarketOverride(pair, override.id, { startTime: e.target.value })}
                                />
                            </div>
                             <div>
                                <Label htmlFor={`override-end-${override.id}`} className="text-xs">结束时间</Label>
                                <Input 
                                    id={`override-end-${override.id}`}
                                    type="time" 
                                    value={override.endTime}
                                    onChange={(e) => updateMarketOverride(pair, override.id, { endTime: e.target.value })}
                                />
                            </div>
                             <div>
                                <Label htmlFor={`override-min-${override.id}`} className="text-xs">最低价</Label>
                                <Input 
                                    id={`override-min-${override.id}`}
                                    type="number" 
                                    value={override.minPrice}
                                    onChange={(e) => updateMarketOverride(pair, override.id, { minPrice: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                             <div>
                                <Label htmlFor={`override-max-${override.id}`} className="text-xs">最高价</Label>
                                <Input 
                                    id={`override-max-${override.id}`}
                                    type="number" 
                                    value={override.maxPrice}
                                    onChange={(e) => updateMarketOverride(pair, override.id, { maxPrice: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">刷新频率</Label>
                            <Select 
                                value={override.frequency} 
                                onValueChange={(value: 'day' | 'night') => updateMarketOverride(pair, override.id, { frequency: value })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="day">日间频率 (5s)</SelectItem>
                                    <SelectItem value="night">夜间频率 (15s)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                ))}
                 <Button variant="outline" size="sm" onClick={() => addMarketOverride(pair)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    添加干预时段
                </Button>
            </div>

        </div>
    );
};


export default function AdminMarketSettingsPage() {
    const { 
        systemSettings, 
        updatePairSettings, 
        addSpecialTimeFrame, 
        removeSpecialTimeFrame,
        updateSpecialTimeFrame,
        addMarketOverride,
        updateMarketOverride,
        removeMarketOverride,
        updateSetting,
    } = useSystemSettings();
    const { toast } = useToast();

    const handleTrendChange = (pair: string, newTrend: 'up' | 'down' | 'normal') => {
        const currentTrend = systemSettings.marketSettings[pair]?.trend;
        const finalTrend = currentTrend === newTrend ? 'normal' : newTrend;
        updatePairSettings(pair, { trend: finalTrend });
    };
    
    const handleSettingChange = (pair: string, key: keyof TradingPairSettings, value: any) => {
        updatePairSettings(pair, { [key]: value });
    };

    const handleVolatilityChange = (pair: string, value: number[]) => {
        updatePairSettings(pair, { volatility: value[0] });
    }
    
    const handleSaveChanges = () => {
        // The context now saves automatically, but we can provide user feedback.
        toast({
            title: "设置已保存",
            description: "市场设置已自动更新。",
        });
    };

    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6">
                 <h1 className="text-2xl font-bold">市场设置</h1>
                 <Card>
                    <CardHeader>
                        <CardTitle>全局市场设置</CardTitle>
                         <CardDescription>影响所有交易对的全局市场配置</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between p-4 rounded-md bg-muted/50">
                            <div>
                                <Label htmlFor="enable-contract-trading" className="font-semibold text-base">
                                    开启秒合约交易
                                </Label>
                                <p className="text-xs font-normal text-muted-foreground mt-1">
                                    关闭后，所有用户将无法进行秒合约交易。
                                </p>
                            </div>
                            <Switch
                                id="enable-contract-trading"
                                checked={systemSettings.contractTradingEnabled}
                                onCheckedChange={(checked: boolean) => updateSetting('contractTradingEnabled', checked)}
                            />
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>交易对个性化设置</CardTitle>
                         <CardDescription>为每个交易对配置独特的市场行为</CardDescription>
                    </CardHeader>
                    <ScrollArea className="h-[calc(100vh-24rem)]">
                        <CardContent className="space-y-6 pr-6">
                            {availablePairs.map((pair) => {
                                const pairSettings = systemSettings.marketSettings[pair] || { 
                                    trend: 'normal', 
                                    tradingDisabled: false, 
                                    baseProfitRate: 0.85,
                                    specialTimeFrames: [],
                                    isTradingHalted: false,
                                    volatility: 0.05,
                                    marketOverrides: [],
                                };
                                return (
                                    <PairSettingsCard 
                                        key={pair}
                                        pair={pair}
                                        settings={pairSettings}
                                        handleSettingChange={handleSettingChange}
                                        handleTrendChange={handleTrendChange}
                                        handleVolatilityChange={handleVolatilityChange}
                                        addSpecialTimeFrame={addSpecialTimeFrame}
                                        removeSpecialTimeFrame={removeSpecialTimeFrame}
                                        updateSpecialTimeFrame={updateSpecialTimeFrame}
                                        addMarketOverride={addMarketOverride}
                                        updateMarketOverride={updateMarketOverride}
                                        removeMarketOverride={removeMarketOverride}
                                    />
                                )
                            })}
                        </CardContent>
                    </ScrollArea>
                    <CardFooter>
                       <Button onClick={handleSaveChanges}>保存市场设置</Button>
                    </CardFooter>
                </Card>
            </div>
        </DashboardLayout>
    );
}
