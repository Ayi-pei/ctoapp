
"use client";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettings, TimedMarketPreset } from "@/context/settings-context";
import { availablePairs } from "@/types";
import { PlusCircle, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";


const TimedMarketSettingsCard = ({ presets, addPreset, removePreset, updatePreset, onSave }: { 
    presets: TimedMarketPreset[],
    addPreset: () => void,
    removePreset: (id: string) => void,
    updatePreset: (id: string, updates: Partial<TimedMarketPreset>) => void,
    onSave: () => void
}) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>限定时间市场设置</CardTitle>
                <CardDescription>预设在特定时间自动影响市场价格，用于引导智能交易和秒合约的结果。</CardDescription>
            </CardHeader>
            <ScrollArea className="h-[calc(100vh-20rem)]">
                <CardContent className="space-y-4 pr-6">
                    {presets.map((preset, index) => (
                        <div key={preset.id} className="p-4 border rounded-lg space-y-3 relative bg-muted/30">
                            <h4 className="text-sm font-semibold">预设 {index + 1}</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs">操作类型</Label>
                                    <Select 
                                        value={preset.action} 
                                        onValueChange={(value: 'buy' | 'sell') => updatePreset(preset.id, { action: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="选择操作" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="buy">预设买入 (拉升)</SelectItem>
                                            <SelectItem value="sell">预设抛售 (下降)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">币种</Label>
                                     <Select 
                                        value={preset.pair}
                                        onValueChange={(value: string) => updatePreset(preset.id, { pair: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="选择币种" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availablePairs.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor={`preset-min-price-${preset.id}`} className="text-xs">最低价 (USDT)</Label>
                                    <Input 
                                        id={`preset-min-price-${preset.id}`}
                                        type="number"
                                        value={preset.minPrice}
                                        onChange={(e) => updatePreset(preset.id, { minPrice: parseFloat(e.target.value) || 0 })}
                                        placeholder="输入最低价格"
                                    />
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor={`preset-max-price-${preset.id}`} className="text-xs">最高价 (USDT)</Label>
                                    <Input 
                                        id={`preset-max-price-${preset.id}`}
                                        type="number"
                                        value={preset.maxPrice}
                                        onChange={(e) => updatePreset(preset.id, { maxPrice: parseFloat(e.target.value) || 0 })}
                                        placeholder="输入最高价格"
                                    />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label className="text-xs">触发时间范围</Label>
                                    <div className="flex items-center gap-2">
                                        <Input 
                                            type="time" 
                                            value={preset.startTime}
                                            onChange={(e) => updatePreset(preset.id, { startTime: e.target.value })}
                                        />
                                        <span>-</span>
                                        <Input 
                                            type="time" 
                                            value={preset.endTime}
                                            onChange={(e) => updatePreset(preset.id, { endTime: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                             <Button 
                                variant="ghost" 
                                size="icon" 
                                className="absolute top-1 right-1 h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={() => removePreset(preset.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </CardContent>
            </ScrollArea>
            <CardFooter className="flex-col items-start gap-4">
                 <Button variant="outline" size="sm" onClick={addPreset}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    添加新预设
                </Button>
                <Button onClick={onSave}>保存预设设置</Button>
            </CardFooter>
        </Card>
    );
};


export default function AdminPresetsPage() {
    const { 
        timedMarketPresets,
        addTimedMarketPreset,
        removeTimedMarketPreset,
        updateTimedMarketPreset,
    } = useSettings();
    const { toast } = useToast();

    const handleSaveChanges = () => {
        // The context now saves automatically, but we can provide user feedback.
        toast({
            title: "设置已保存",
            description: "定时预设设置已自动更新。",
        });
    };

    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6 bg-card/80 backdrop-blur-sm">
                <h1 className="text-2xl font-bold">定时预设</h1>
                <TimedMarketSettingsCard
                    presets={timedMarketPresets}
                    addPreset={addTimedMarketPreset}
                    removePreset={removeTimedMarketPreset}
                    updatePreset={updateTimedMarketPreset}
                    onSave={handleSaveChanges}
                />
            </div>
        </DashboardLayout>
    );
}
