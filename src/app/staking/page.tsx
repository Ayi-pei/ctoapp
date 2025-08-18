
"use client";
import { useState } from "react";
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

const MiningProductCard = ({ product, purchasedCount, onInvest }: { 
    product: InvestmentProduct, 
    purchasedCount: number,
    onInvest: (product: InvestmentProduct) => void 
}) => {
    return (
        <Card className="bg-card/80 border overflow-hidden">
            <div className="flex items-stretch">
                <div className="flex-shrink-0 w-32 md:w-40 flex items-center justify-center bg-muted/50 p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={product.imgSrc} alt={product.name} width={96} height={96} className="rounded-md object-contain" />
                </div>
                <div className="flex-grow">
                    <CardContent className="p-4 space-y-3 h-full flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start">
                                <h4 className="font-semibold text-lg">{product.name}</h4>
                                <Button 
                                    className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-xs h-7 px-4 rounded-md -mt-1"
                                    onClick={() => onInvest(product)}
                                >
                                    买入
                                </Button>
                            </div>
                            <div className="grid grid-cols-3 text-left text-sm mt-3 gap-y-2">
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">每份金额</p>
                                    <p className="font-semibold">{product.price}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">周期</p>
                                    <p className="font-semibold">{product.period} 天</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">收益率</p>
                                    <p className="font-semibold text-green-400">{(product.dailyRate ?? 0) * 100}%/天</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <Progress value={(purchasedCount / product.maxPurchase) * 100} className="h-2" />
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>已购: {purchasedCount}</span>
                                <span>限购: {product.maxPurchase}</span>
                            </div>
                        </div>
                    </CardContent>
                </div>
            </div>
        </Card>
    )
};

export default function StakingPage() {
    const { toast } = useToast();
    const { balances, addDailyInvestment, investments } = useBalance();
    const { investmentProducts } = useInvestmentSettings();
    const [selectedProduct, setSelectedProduct] = useState<InvestmentProduct | null>(null);
    const [isInvestmentDialogOpen, setIsInvestmentDialogOpen] = useState(false);
    
    const stakingProducts = investmentProducts.filter(p => p.category === 'staking');
    
    const handleInvestClick = (product: InvestmentProduct) => {
        setSelectedProduct(product);
        setIsInvestmentDialogOpen(true);
    }
    
    const handleConfirmInvestment = async () => {
        if (!selectedProduct || !selectedProduct.dailyRate || !selectedProduct.period) return;
        
        const success = await addDailyInvestment({
            productName: selectedProduct.name,
            amount: selectedProduct.price,
            dailyRate: selectedProduct.dailyRate,
            period: selectedProduct.period,
            category: 'staking'
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
                description: "您的余额不足。"
            });
        }
        setIsInvestmentDialogOpen(false);
        setSelectedProduct(null);
    }
    
    const getPurchasedCount = (productName: string) => {
        return investments.filter(inv => inv.product_name === productName).length;
    }

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
                            maxInvestment: selectedProduct.price, // Each purchase is one unit
                        }}
                        balance={balances['USDT']?.available || 0}
                        onConfirm={handleConfirmInvestment}
                    />
                )}
            </div>
        </DashboardLayout>
    );
}
