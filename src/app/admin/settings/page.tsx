
"use client";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useSettings, TradingPairSettings } from "@/context/settings-context";
import { useSystemSettings } from "@/context/system-settings-context";
import { availablePairs } from "@/types";
import { PlusCircle, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";

const supportedAssets: (keyof ReturnType<typeof useSystemSettings>['systemSettings']['depositAddresses'])[] = ["USDT", "ETH", "BTC", "USD"];


export default function AdminSettingsPage() {
    const { 
        settings, 
        updateSettings, 
        addSpecialTimeFrame, 
        removeSpecialTimeFrame,
        updateSpecialTimeFrame
    } = useSettings();

    const { systemSettings, updateDepositAddress, toggleContractTrading } = useSystemSettings();

    const { toast } = useToast();

    const handleTrendChange = (pair: string, newTrend: 'up' | 'down' | 'normal') => {
        const currentTrend = settings[pair]?.trend;
        const finalTrend = currentTrend === newTrend ? 'normal' : newTrend;
        updateSettings(pair, { trend: finalTrend });
    };
    
    const handleSettingChange = (pair: string, key: keyof TradingPairSettings, value: any) => {
        updateSettings(pair, { [key]: value });
    };

    const handleVolatilityChange = (pair: string, value: number[]) => {
        updateSettings(pair, { volatility: value[0] });
    }
    
    const handleSaveSystemSettings = () => {
        // In a real app, this would trigger an API call.
        // Since we are using localStorage which saves automatically, we just show a toast.
        toast({
            title: "设置已保存",
            description: "所有通用设置已更新。",
        });
    };
    
    const handleSaveMarketSettings = () => {
        // In a real app, this would trigger an API call.
        // Since we are using localStorage which saves automatically, we just show a toast.
         toast({
            title: "设置已保存",
            description: "所有市场设置已更新。",
        });
    }

    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6">
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* Column 1: System Settings */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>通用设置</CardTitle>
                                <CardDescription>影响整个平台的全局配置</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4 p-4 border rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="global-contract-trading" className="font-semibold">秒合约总开关</Label>
                                         <Switch
                                            id="global-contract-trading"
                                            checked={systemSettings.isContractTradingEnabled}
                                            onCheckedChange={toggleContractTrading}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        关闭后，整个平台将无法进行新的秒合约交易。
                                    </p>
                                </div>
                                
                                <Separator />
                                
                                {supportedAssets.map((asset) => (
                                    <div className="space-y-2" key={asset}>
                                        <Label htmlFor={`deposit-address-${asset}`}>在线充币地址 ({asset})</Label>
                                        <Input
                                            id={`deposit-address-${asset}`}
                                            type="text"
                                            value={systemSettings.depositAddresses[asset] || ''}
                                            onChange={(e) => updateDepositAddress(asset, e.target.value)}
                                            placeholder={`请输入您的 ${asset} 钱包或账户地址`}
                                        />
                                    </div>
                                ))}
                            </CardContent>
                             <CardFooter>
                                <Button onClick={handleSaveSystemSettings}>保存通用设置</Button>
                            </CardFooter>
                        </Card>
                    </div>

                    {/* Column 2: Market Settings */}
                     <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>市场设置</CardTitle>
                             <CardDescription>为每个交易对配置独特的市场行为</CardDescription>
                        </CardHeader>
                        <ScrollArea className="h-[calc(100vh-24rem)]">
                            <CardContent className="space-y-6 pr-6">
                                {availablePairs.map((pair) => {
                                    const pairSettings = settings[pair] || { 
                                        trend: 'normal', 
                                        tradingDisabled: false, 
                                        baseProfitRate: 0.85,
                                        specialTimeFrames: [],
                                        isTradingHalted: false,
                                        volatility: 0.05,
                                    };
                                    return (
                                        <div key={pair} className="p-4 border rounded-lg space-y-4">
                                            <h3 className="font-semibold text-lg">{pair}</h3>
                                            
                                            {/* Trading halt switch */}
                                            <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                                                <Label htmlFor={`halt-trading-${pair}`} className="font-semibold">暂停此币种交易</Label>
                                                <Switch
                                                    id={`halt-trading-${pair}`}
                                                    checked={pairSettings.isTradingHalted}
                                                    onCheckedChange={(checked) => handleSettingChange(pair, 'isTradingHalted', checked)}
                                                />
                                            </div>
                                            
                                            <Separator />

                                            {/* Trend Control */}
                                            <div className="space-y-2">
                                                <Label>价格趋势模拟</Label>
                                                <p className="text-xs text-muted-foreground">
                                                关闭所有开关则默认使用随机市场数据。
                                                </p>
                                                <div className="flex items-center space-x-4 pt-2">
                                                    <div className="flex items-center space-x-2">
                                                        <Label htmlFor={`trend-up-${pair}`}>拉升</Label>
                                                        <Switch
                                                            id={`trend-up-${pair}`}
                                                            checked={pairSettings.trend === 'up'}
                                                            onCheckedChange={() => handleTrendChange(pair, 'up')}
                                                        />
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <Label htmlFor={`trend-down-${pair}`}>下降</Label>
                                                        <Switch
                                                            id={`trend-down-${pair}`}
                                                            checked={pairSettings.trend === 'down'}
                                                            onCheckedChange={() => handleTrendChange(pair, 'down')}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Volatility Control */}
                                            <div className="space-y-2">
                                                <Label>价格波动率</Label>
                                                <Slider
                                                    defaultValue={[pairSettings.volatility]}
                                                    max={0.2}
                                                    min={0.01}
                                                    step={0.01}
                                                    onValueCommit={(value) => handleVolatilityChange(pair, value)}
                                                />
                                                <div className="flex justify-between text-xs text-muted-foreground">
                                                    <span>平稳</span>
                                                    <span>剧烈</span>
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
                                                    <Label htmlFor={`limit-buy-${pair}`} className="font-semibold">限定时段交易</Label>
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
                                        </div>
                                    )
                                })}
                            </CardContent>
                        </ScrollArea>
                        <CardFooter>
                           <Button onClick={handleSaveMarketSettings}>保存市场设置</Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
