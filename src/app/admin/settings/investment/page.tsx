
"use client";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInvestmentSettings, InvestmentProduct, InvestmentTier } from "@/context/investment-settings-context";
import { PlusCircle, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

const StakingProductEditor = ({ product, updateProduct, removeProduct }: { product: InvestmentProduct, updateProduct: (id: string, updates: Partial<InvestmentProduct>) => void, removeProduct: (id: string) => void }) => {
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
        <div className="relative pt-4">
            <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-xl text-primary">{product.name || '新产品'}</h3>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeProduct(product.id)}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6">
                <div className="space-y-2">
                    <Label htmlFor={`product-name-${product.id}`}>产品名称</Label>
                    <Input id={`product-name-${product.id}`} value={product.name} onChange={e => updateProduct(product.id, { name: e.target.value })} placeholder="例如: ASIC 矿机"/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor={`product-price-${product.id}`}>每份金额 (USDT)</Label>
                    <Input id={`product-price-${product.id}`} type="number" min={0} step="0.01" value={product.price} onChange={e => updateProduct(product.id, { price: parseFloat(e.target.value) || 0 })} placeholder="例如: 98"/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor={`product-rate-${product.id}`}>日收益率 (%)</Label>
                    <Input id={`product-rate-${product.id}`} type="number" min={0} step="0.01" value={(product.dailyRate || 0) * 100} onChange={e => updateProduct(product.id, { dailyRate: parseFloat(e.target.value) / 100 || 0 })} placeholder="例如: 3 (代表3%)"/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor={`product-period-${product.id}`}>周期 (天)</Label>
                    <Input id={`product-period-${product.id}`} type="number" min={1} step="1" value={product.period} onChange={e => updateProduct(product.id, { period: parseInt(e.target.value) || 0 })} placeholder="例如: 25"/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor={`product-max-${product.id}`}>最大购买次数</Label>
                    <Input id={`product-max-${product.id}`} type="number" min={1} step="1" value={product.maxPurchase} onChange={e => updateProduct(product.id, { maxPurchase: parseInt(e.target.value) || 0 })} placeholder="例如: 1"/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor={`staking-asset-${product.id}`}>质押币种 (选填)</Label>
                    <Input id={`staking-asset-${product.id}`} value={product.stakingAsset || ''} onChange={e => updateProduct(product.id, { stakingAsset: e.target.value })} placeholder="例如: USDT" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor={`staking-amount-${product.id}`}>质押数量 (选填)</Label>
                    <Input 
                        id={`staking-amount-${product.id}`} 
                        type="number" 
                        min={0} 
                        value={product.stakingAmount || ''} 
                        onChange={e => {
                            const val = e.target.value;
                            updateProduct(product.id, { stakingAmount: val ? parseFloat(val) : undefined });
                        }}
                        placeholder="输入需要质押的数量" 
                    />
                </div>
                 <div className="lg:col-span-3 space-y-2">
                    <Label>产品图片</Label>
                    <div className="flex items-center gap-4">
                        {product.imgSrc && (
                             <div className="flex items-center gap-2">
                                <Image 
                                    src={product.imgSrc} 
                                    alt={product.name} 
                                    width={80} 
                                    height={80} 
                                    className="object-cover rounded-md border"
                                    data-ai-hint="investment product"
                                />
                                 <Button variant="ghost" size="icon" onClick={() => updateProduct(product.id, { imgSrc: "" })} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                    <Trash2 className="h-4 w-4"/>
                                </Button>
                             </div>
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
};

const FinanceProductEditor = ({ 
    product, 
    updateProduct,
    removeProduct 
}: { 
    product: InvestmentProduct, 
    updateProduct: (id: string, updates: Partial<InvestmentProduct>) => void, 
    removeProduct: (id: string) => void 
}) => {
    
    const handleTierChange = (tierIndex: number, field: keyof InvestmentTier, value: string) => {
        const newTiers = [...(product.hourlyTiers || [])];
        const numValue = parseFloat(value);

        if (isNaN(numValue)) {
            return; // Exit if the value is not a valid number
        }

        // Safely access the tier, providing a default structure to satisfy TypeScript's
        // `noUncheckedIndexedAccess` and prevent runtime errors.
        const originalTier = newTiers[tierIndex] || { hours: 0, rate: 0 };

        const updatedValue = field === 'rate' 
            ? numValue / 100 
            : Math.max(0, numValue);
        
        const updatedTier = { 
            ...originalTier, 
            [field]: updatedValue 
        };

        newTiers[tierIndex] = updatedTier;

        updateProduct(product.id, { hourlyTiers: newTiers });
    };

    const addTier = () => {
        const newTiers = [...(product.hourlyTiers || []), { hours: 1, rate: 0.01 }];
        updateProduct(product.id, { hourlyTiers: newTiers });
    };

    const removeTier = (index: number) => {
        const newTiers = [...(product.hourlyTiers || [])];
        newTiers.splice(index, 1);
        updateProduct(product.id, { hourlyTiers: newTiers });
    };
    
    return (
        <div className="relative pt-4">
            <div className="flex justify-between items-start mb-4">
                 <h3 className="font-semibold text-xl text-primary">{product.name}</h3>
                 <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeProduct(product.id)}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                <div className="space-y-2">
                    <Label htmlFor={`fin-name-${product.id}`}>产品名称</Label>
                    <Input id={`fin-name-${product.id}`} value={product.name} onChange={e => updateProduct(product.id, { name: e.target.value })} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor={`fin-price-${product.id}`}>最低投资额 (USDT)</Label>
                    <Input id={`fin-price-${product.id}`} type="number" min={0} step="0.01" value={product.price} onChange={e => updateProduct(product.id, { price: parseFloat(e.target.value) || 0 })} placeholder="例如: 100"/>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor={`fin-start-time-${product.id}`}>开放开始时间</Label>
                    <Input id={`fin-start-time-${product.id}`} type="time" value={product.activeStartTime} onChange={e => updateProduct(product.id, { activeStartTime: e.target.value })} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor={`fin-end-time-${product.id}`}>开放结束时间</Label>
                    <Input id={`fin-end-time-${product.id}`} type="time" value={product.activeEndTime} onChange={e => updateProduct(product.id, { activeEndTime: e.target.value })} />
                </div>
                <div className="md:col-span-2 space-y-4">
                     <Label>小时利率阶梯</Label>
                     <div className="space-y-3">
                        {(product.hourlyTiers || []).map((tier, index) => (
                             <div key={index} className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                                <Input type="number" min={1} value={tier.hours} onChange={e => handleTierChange(index, 'hours', e.target.value)} placeholder="小时" className="w-1/3"/>
                                <span className="text-muted-foreground text-sm">小时</span>
                                <Input type="number" min={0} step="0.01" value={tier.rate * 100} onChange={e => handleTierChange(index, 'rate', e.target.value)} placeholder="利率" className="w-1/3"/>
                                <span className="text-muted-foreground text-sm">%</span>
                                <Button variant="ghost" size="icon" onClick={() => removeTier(index)} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                     </div>
                      <Button variant="outline" size="sm" onClick={addTier}>
                        <PlusCircle className="mr-2 h-4 w-4"/>
                        添加利率档位
                     </Button>
                </div>
            </div>
        </div>
    )
}

export default function AdminInvestmentSettingsPage() {
    const { investmentProducts, addProduct, removeProduct, updateProduct } = useInvestmentSettings();
    const { toast } = useToast();

    const handleSaveChanges = () => {
        toast({
            title: "设置已保存",
            description: "理财产品设置已自动更新。",
        });
    };

    const stakingProducts = investmentProducts.filter(p => p.category === 'staking');
    const financeProducts = investmentProducts.filter(p => p.category === 'finance');

    return (
        <DashboardLayout>
             <div className="p-4 md:p-8 space-y-6">
                 <h1 className="text-2xl font-bold">理财设置</h1>

                 <Card>
                    <CardHeader>
                        <CardTitle>金融理财产品</CardTitle>
                        <CardDescription>配置如“富投宝”等按小时计息的活期理财产品。</CardDescription>
                    </CardHeader>
                    <CardContent>
                       {financeProducts.map((product) => (
                           <FinanceProductEditor 
                                key={product.id}
                                product={product}
                                updateProduct={updateProduct}
                                removeProduct={removeProduct}
                           />
                       ))}
                    </CardContent>
                </Card>

                <Card>
                     <CardHeader>
                        <CardTitle>质押挖矿产品</CardTitle>
                        <CardDescription>配置和管理平台提供的所有固定周期的质押产品。</CardDescription>
                    </CardHeader>
                     <ScrollArea className="h-[calc(100vh-22rem)]">
                        <CardContent className="pr-6">
                            {stakingProducts.map((product, index) => (
                                <div key={product.id}>
                                    {index > 0 && <Separator className="my-6" />}
                                    <StakingProductEditor 
                                        product={product}
                                        updateProduct={updateProduct}
                                        removeProduct={removeProduct}
                                    />
                                </div>
                            ))}
                        </CardContent>
                     </ScrollArea>
                    <CardFooter className="flex-col items-start gap-4 pt-6">
                        <Button variant="outline" onClick={() => addProduct('staking')}>
                            <PlusCircle className="mr-2 h-4 w-4"/>
                            添加新质押产品
                        </Button>
                        <div className="flex items-center gap-4">
                           <Button onClick={handleSaveChanges}>保存全部设置</Button>
                           <p className="text-xs text-muted-foreground">
                               提示：所有修改已实时保存。
                           </p>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </DashboardLayout>
    );
}
