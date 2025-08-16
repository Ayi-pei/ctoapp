
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
import { useInvestmentSettings, InvestmentProduct } from "@/context/investment-settings-context";
import { availablePairs } from "@/types";
import { PlusCircle, Trash2, Upload } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";
import Image from "next/image";

const supportedAssets: (keyof ReturnType<typeof useSystemSettings>['systemSettings']['depositAddresses'])[] = ["USDT", "ETH", "BTC", "USD"];


const PairSettingsCard = ({ pair, settings, handleSettingChange, handleTrendChange, handleVolatilityChange, updateSpecialTimeFrame, addSpecialTimeFrame, removeSpecialTimeFrame }: { 
    pair: string, 
    settings: TradingPairSettings,
    handleSettingChange: (pair: string, key: keyof TradingPairSettings, value: any) => void,
    handleTrendChange: (pair: string, newTrend: 'up' | 'down' | 'normal') => void,
    handleVolatilityChange: (pair: string, value: number[]) => void,
    updateSpecialTimeFrame: (pair: string, frameId: string, updates: Partial<any>) => void,
    addSpecialTimeFrame: (pair: string) => void,
    removeSpecialTimeFrame: (pair: string, frameId: string) => void
}) => {
    const [volatilityValue, setVolatilityValue] = useState(settings.volatility);

    return (
        <div key={pair} className="p-4 border rounded-lg space-y-4">
            <h3 className="font-semibold text-lg">{pair}</h3>
            
            {/* Trading halt switch */}
            <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                <Label htmlFor={`halt-trading-${pair}`} className="font-semibold">暂停此币种交易</Label>
                <Switch
                    id={`halt-trading-${pair}`}
                    checked={settings.isTradingHalted}
                    onCheckedChange={(checked) => handleSettingChange(pair, 'isTradingHalted', checked)}
                />
            </div>
            
            <Separator />

            {/* Trend Control */}
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

            {/* Volatility Control */}
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
                    onValueChange={(value) => setVolatilityValue(value[0])}
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
                    value={(settings.baseProfitRate * 100).toFixed(0)}
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
                        checked={settings.tradingDisabled}
                        onCheckedChange={(checked) => handleSettingChange(pair, 'tradingDisabled', checked)}
                    />
                </div>

                <p className="text-xs text-muted-foreground">
                    启用后，仅在下方设定的特殊时间段内可以进行交易，并应用特殊收益率或指定价格。
                </p>

                <div className="space-y-4">
                    {settings.specialTimeFrames.map((frame, index) => (
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
                             <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label htmlFor={`buy-price-${frame.id}`} className="text-xs">指定买入价 (选填)</Label>
                                    <Input 
                                        id={`buy-price-${frame.id}`}
                                        type="number" 
                                        value={frame.buyPrice ?? ''}
                                        onChange={(e) => updateSpecialTimeFrame(pair, frame.id, { buyPrice: parseFloat(e.target.value) || undefined })}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor={`sell-price-${frame.id}`} className="text-xs">指定卖出价 (选填)</Label>
                                    <Input 
                                        id={`sell-price-${frame.id}`}
                                        type="number" 
                                        value={frame.sellPrice ?? ''}
                                        onChange={(e) => updateSpecialTimeFrame(pair, frame.id, { sellPrice: parseFloat(e.target.value) || undefined })}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor={`profit-rate-${frame.id}`} className="text-xs">特殊收益率 (%)</Label>
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
    );
};

const InvestmentProductCard = ({ product, updateProduct, removeProduct }: {
    product: InvestmentProduct,
    updateProduct: (id: string, updates: Partial<InvestmentProduct>) => void,
    removeProduct: (id: string) => void
}) => {
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                updateProduct(product.id, { imgSrc: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="p-4 border rounded-lg space-y-4 relative">
            <h3 className="font-semibold text-lg">{product.name || '新产品'}</h3>
            <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => removeProduct(product.id)}>
                <Trash2 className="h-4 w-4" />
            </Button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor={`product-name-${product.id}`}>产品名称</Label>
                        <Input id={`product-name-${product.id}`} value={product.name} onChange={e => updateProduct(product.id, { name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor={`product-price-${product.id}`}>每份金额 (USDT)</Label>
                        <Input id={`product-price-${product.id}`} type="number" value={product.price} onChange={e => updateProduct(product.id, { price: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor={`product-rate-${product.id}`}>日收益率 (%)</Label>
                        <Input id={`product-rate-${product.id}`} type="number" value={product.dailyRate * 100} onChange={e => updateProduct(product.id, { dailyRate: parseFloat(e.target.value) / 100 || 0 })} />
                    </div>
                </div>
                <div className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor={`product-period-${product.id}`}>周期 (天)</Label>
                        <Input id={`product-period-${product.id}`} type="number" value={product.period} onChange={e => updateProduct(product.id, { period: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor={`product-max-${product.id}`}>最大购买次数</Label>
                        <Input id={`product-max-${product.id}`} type="number" value={product.maxPurchase} onChange={e => updateProduct(product.id, { maxPurchase: parseInt(e.target.value) || 0 })} />
                    </div>
                     <div className="space-y-2">
                        <Label>产品图片</Label>
                        {product.imgSrc && (
                            <Image 
                                src={product.imgSrc} 
                                alt={product.name} 
                                width={80} 
                                height={80} 
                                className="object-cover rounded-md border"
                            />
                        )}
                         <Input 
                            id={`product-img-upload-${product.id}`} 
                            type="file" 
                            accept="image/*"
                            onChange={handleImageUpload} 
                            className="text-xs file:text-xs file:font-medium file:text-foreground file:border-0 file:bg-muted file:rounded-md file:px-2 file:py-1 file:mr-2 hover:file:bg-accent"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}


export default function AdminSettingsPage() {
    const { 
        settings, 
        updateSettings, 
        addSpecialTimeFrame, 
        removeSpecialTimeFrame,
        updateSpecialTimeFrame
    } = useSettings();

    const { systemSettings, updateDepositAddress, toggleContractTrading } = useSystemSettings();
    const { investmentProducts, addProduct, removeProduct, updateProduct } = useInvestmentSettings();

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
    
    const handleSaveSettings = (section: string) => {
        // In this mock setup, data is saved on change. This button just provides user feedback.
        toast({
            title: "设置已保存",
            description: `所有${section}设置已更新。`,
        });
    };

    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6">
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    {/* Column 1: System & Investment Settings */}
                    <div className="space-y-8">
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
                                <Button onClick={() => handleSaveSettings('通用')}>保存通用设置</Button>
                            </CardFooter>
                        </Card>
                        
                        <Card>
                             <CardHeader>
                                <CardTitle>理财设置</CardTitle>
                                <CardDescription>配置和管理平台提供的所有理财产品</CardDescription>
                            </CardHeader>
                             <ScrollArea className="h-[calc(100vh-24rem)]">
                                <CardContent className="space-y-6 pr-6">
                                    {investmentProducts.map(product => (
                                        <InvestmentProductCard
                                            key={product.id}
                                            product={product}
                                            updateProduct={updateProduct}
                                            removeProduct={removeProduct}
                                        />
                                    ))}
                                </CardContent>
                             </ScrollArea>
                            <CardFooter className="flex-col items-start gap-4">
                                <Button variant="outline" onClick={addProduct}>
                                    <PlusCircle className="mr-2 h-4 w-4"/>
                                    添加新理财产品
                                </Button>
                               <Button onClick={() => handleSaveSettings('理财')}>保存理财设置</Button>
                            </CardFooter>
                        </Card>
                    </div>

                    {/* Column 2: Market Settings */}
                     <Card>
                        <CardHeader>
                            <CardTitle>市场设置</CardTitle>
                             <CardDescription>为每个交易对配置独特的市场行为</CardDescription>
                        </CardHeader>
                        <ScrollArea className="h-[calc(100vh-12rem)]">
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
                                        />
                                    )
                                })}
                            </CardContent>
                        </ScrollArea>
                        <CardFooter>
                           <Button onClick={() => handleSaveSettings('市场')}>保存市场设置</Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}

