
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
                        <Input id={`product-rate-${product.id}`} type="number" value={(product.dailyRate || 0) * 100} onChange={e => updateProduct(product.id, { dailyRate: parseFloat(e.target.value) / 100 || 0 })} />
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

export default function AdminInvestmentSettingsPage() {
    const { investmentProducts, addProduct, removeProduct, updateProduct } = useInvestmentSettings();
    const { toast } = useToast();

    const handleSaveChanges = () => {
        // The context now saves automatically, but we can provide user feedback.
        toast({
            title: "设置已保存",
            description: "理财产品设置已自动更新。",
        });
    };

    return (
        <DashboardLayout>
             <div className="p-4 md:p-8 space-y-6 bg-card/80 backdrop-blur-sm">
                 <h1 className="text-2xl font-bold">理财设置</h1>
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
                       <Button onClick={handleSaveChanges}>保存理财设置</Button>
                    </CardFooter>
                </Card>
            </div>
        </DashboardLayout>
    );
}
