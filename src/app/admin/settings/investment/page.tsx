
"use client";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInvestmentSettings, InvestmentProduct } from "@/context/investment-settings-context";
import { PlusCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

export default function AdminInvestmentSettingsPage() {
    const { investmentProducts, addProduct, removeProduct, updateProduct } = useInvestmentSettings();
    const { toast } = useToast();

    const handleSaveChanges = () => {
        toast({
            title: "设置已保存",
            description: "理财产品设置已自动更新。",
        });
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, productId: string) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                updateProduct(productId, { imgSrc: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <DashboardLayout>
             <div className="p-4 md:p-8 space-y-4">
                 <h1 className="text-2xl font-bold">理财设置</h1>
                <Card>
                     <CardHeader>
                        <CardTitle>理财产品列表</CardTitle>
                        <CardDescription>配置和管理平台提供的所有理财产品。</CardDescription>
                    </CardHeader>
                     <ScrollArea className="h-[calc(100vh-22rem)]">
                        <CardContent className="pr-6">
                            {investmentProducts.map((product, index) => (
                                <div key={product.id} className="relative pt-4">
                                    {index > 0 && <Separator className="my-6" />}
                                    
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

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
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
                                            <Input id={`product-rate-${product.id}`} type="number" value={(product.dailyRate || 0) * 100} onChange={e => updateProduct(product.id, { dailyRate: parseFloat(e.target.value) / 100 || 0 })} />
                                        </div>
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
                                            <div className="flex items-center gap-4">
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
                                                    onChange={(e) => handleImageUpload(e, product.id)} 
                                                    className="text-xs file:text-xs file:font-medium file:text-foreground file:border-0 file:bg-muted file:rounded-md file:px-2 file:py-1 file:mr-2 hover:file:bg-accent"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                     </ScrollArea>
                    <CardFooter className="flex-col items-start gap-4 pt-6">
                        <Button variant="outline" onClick={addProduct}>
                            <PlusCircle className="mr-2 h-4 w-4"/>
                            添加新理财产品
                        </Button>
                       <Button onClick={handleSaveChanges}>保存理财设置</Button>
                    </CardFooter>
                </Card>
            </div>
        </DashboardLayout>
    );
}
