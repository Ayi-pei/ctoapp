
"use client";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSystemSettings, TradingPairSettings, MarketOverridePreset } from "@/context/system-settings-context";
import { availablePairs } from "@/types";
import { PlusCircle, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";


const PairSettingsCard = ({ 
    pair, 
    settings, 
    addMarketOverride,
    updateMarketOverride,
    removeMarketOverride
}: { 
    pair: string, 
    settings: TradingPairSettings,
    addMarketOverride: (pair: string) => void,
    updateMarketOverride: (pair: string, overrideId: string, updates: Partial<MarketOverridePreset>) => void,
    removeMarketOverride: (pair: string, overrideId: string) => void
}) => {
    return (
        <div key={pair} className="p-4 border rounded-lg space-y-4">
            <h3 className="font-semibold text-lg">{pair}</h3>
            
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
        addMarketOverride,
        updateMarketOverride,
        removeMarketOverride,
        updateSetting,
    } = useSystemSettings();
    const { toast } = useToast();
    
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
