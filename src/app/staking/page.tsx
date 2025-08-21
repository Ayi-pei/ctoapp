
"use client";
import { useState, useCallback } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { InvestmentDialog } from "@/components/investment-dialog";
import { useBalance } from "@/context/balance-context";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useInvestmentSettings, InvestmentProduct } from "@/context/investment-settings-context";
import Image from "next/image";
import { cn } from "@/lib/utils";
import React from "react";

const Header = () => {
    const router = useRouter();
    
    return (
        <div className="p-4 bg-background/80 backdrop-blur-sm border-b">
            <div className="relative flex items-center justify-center">
                <Button variant="ghost" size="icon" className="absolute left-0" onClick={() => router.back()}>
                    <ChevronLeft />
                </Button>
                <div className="text-center">
                    <p className="text-lg font-bold">质押挖矿</p>
                </div>
                 <div className="absolute right-0 flex gap-2 text-sm">
                    <Button variant="link" className="text-foreground p-0 h-auto">规则</Button>
                </div>
            </div>
        </div>
    );
};

const MiningProductCard = React.memo(function MiningProductCard({ product, purchasedCount, onInvest }: { 
    product: InvestmentProduct, 
    purchasedCount: number,
    onInvest: (product: InvestmentProduct) => void 
}) {
    const purchasePercentage = (purchasedCount / product.maxPurchase) * 100;
    
    const progressColor = 
        purchasePercentage > 80 ? "bg-red-500" :
        purchasePercentage > 50 ? "bg-yellow-500" :
        "bg-primary";

    return (
        <Card className="bg-card/80 border-2 border-amber-400/50 overflow-hidden shadow-[inset_0_0_8px_rgba(234,179,8,0.4)]">
            <div className="flex items-stretch">
                <div className="flex-shrink-0 w-32 md:w-40 flex items-center justify-center bg-muted/50 p-4">
                    <div className="relative h-24 w-24">
                        <Image 
                          src={product.imgSrc} 
                          alt={product.name}
                          fill
                          sizes="(max-width: 768px) 30vw, (max-width: 1200px) 20vw, 10vw"
                          className="object-contain rounded-md"
                          data-ai-hint="investment product"
                        />
                    </div>
                </div>
                <div className="flex-grow">
                    <CardContent className="p-4 space-y-3 h-full flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start">
                                <h4 className="font-semibold text-lg">{product.name}</h4>
                                <Button 
                                    className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-xs h-7 px-4 rounded-md -mt-1"
                                    onClick={() => onInvest(product)}
                                    disabled={purchasedCount >= product.maxPurchase}
                                >
                                    {purchasedCount >= product.maxPurchase ? "已售罄" : "质押"}
                                </Button>
                            </div>
                             <div className="grid grid-cols-2 md:grid-cols-3 text-left text-sm mt-3 gap-y-2">
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">每份金额</p>
                                    <p className="font-semibold">{product.price} USDT</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">周期</p>
                                    <p className="font-semibold">{product.period} 天</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">日收益率</p>
                                    <p className="font-semibold text-green-400">{((product.dailyRate ?? 0) * 100).toFixed(1)}%/天</p>
                                </div>
                                {product.stakingAsset && product.stakingAmount != null && (
                                    <div className="space-y-1 col-span-2 md:col-span-3">
                                        <p className="text-xs text-muted-foreground">质押要求</p>
                                        <p className="font-semibold text-amber-300">{product.stakingAmount} {product.stakingAsset}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <Progress value={purchasePercentage} indicatorClassName={progressColor} className="h-2" />
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>已购: {purchasedCount}</span>
                                <span>限购: {product.maxPurchase}</span>
                            </div>
                        </div>
                    </CardContent>
                </div>
            </div>
        </Card>
    );
});

export default function StakingPage() {
    const { toast } = useToast();
    const { balances, addDailyInvestment, investments } = useBalance();
    const { investmentProducts } = useInvestmentSettings();
    const [selectedProduct, setSelectedProduct] = useState<InvestmentProduct | null>(null);
    const [isInvestmentDialogOpen, setIsInvestmentDialogOpen] = useState(false);
    
    const stakingProducts = investmentProducts.filter(p => p.category === 'staking');
    
    const getPurchasedCount = useCallback((productName: string) => {
        return investments.filter(inv => inv.product_name === productName).length;
    }, [investments]);

    const handleInvestClick = useCallback((product: InvestmentProduct) => {
        const purchasedCount = getPurchasedCount(product.name);
        if (purchasedCount >= product.maxPurchase) {
            toast({ variant: "destructive", title: "已达限购", description: `您已达到此产品的最大购买次数 (${product.maxPurchase}次)。` });
            return;
        }

        if ((balances['USDT']?.available || 0) < product.price) {
            toast({ variant: "destructive", title: "余额不足", description: `购买此产品需要 ${product.price} USDT，您的余额不足。` });
            return;
        }

        if (product.stakingAsset && product.stakingAmount) {
            if ((balances[product.stakingAsset]?.available || 0) < product.stakingAmount) {
                toast({ variant: "destructive", title: "质押资产不足", description: `此产品需要质押 ${product.stakingAmount} ${product.stakingAsset}，您的余额不足。` });
                return;
            }
        }
        
        setSelectedProduct(product);
        setIsInvestmentDialogOpen(true);
    }, [balances, getPurchasedCount, toast]);
    
    const handleConfirmInvestment = useCallback(async () => {
        if (!selectedProduct || !selectedProduct.dailyRate || !selectedProduct.period) return;
        
        const success = await addDailyInvestment({
            productName: selectedProduct.name,
            amount: selectedProduct.price,
            dailyRate: selectedProduct.dailyRate,
            period: selectedProduct.period,
            category: 'staking',
            stakingAsset: selectedProduct.stakingAsset,
            stakingAmount: selectedProduct.stakingAmount,
        });
        
        if (success) {
            toast({
                title: "购买成功",
                description: `您已成功购买 ${selectedProduct.name}。`
            });
        } else {
             toast({
                variant: "destructive",
                title: "购买失败",
                description: "发生未知错误，请稍后重试。"
            });
        }
        
        setIsInvestmentDialogOpen(false);
        setSelectedProduct(null);
    }, [selectedProduct, addDailyInvestment, toast]);

    return (
        <DashboardLayout>
            <div className="h-full bg-background flex flex-col">
                <Header />
                <div className="flex-grow flex flex-col gap-4 p-4 staking-background">
                   {stakingProducts.map(product => (
                        <MiningProductCard 
                            key={product.id}
                            product={product}
                            purchasedCount={getPurchasedCount(product.name)}
                            onInvest={handleInvestClick}
                        />
                    ))}
                </div>
                 {selectedProduct && (
                    <InvestmentDialog
                        isOpen={isInvestmentDialogOpen}
                        onOpenChange={setIsInvestmentDialogOpen}
                        product={{
                            name: selectedProduct.name,
                            minInvestment: selectedProduct.price,
                            maxInvestment: selectedProduct.price,
                        }}
                        balance={balances['USDT']?.available || 0}
                        onConfirm={handleConfirmInvestment}
                    />
                )}
            </div>
        </DashboardLayout>
    );
}
