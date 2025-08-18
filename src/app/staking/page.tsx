
"use client";
import { useState } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { InvestmentDialog } from "@/components/investment-dialog";
import { useBalance } from "@/context/balance-context";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronLeft, Calendar, Percent, CreditCard } from "lucide-react";
import { useInvestmentSettings, InvestmentProduct } from "@/context/investment-settings-context";

const Header = () => {
    const router = useRouter();
    
    return (
        <div className="p-4 bg-card text-foreground rounded-b-lg space-y-4">
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
        <Card className="bg-transparent border-none shadow-none">
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Image src={product.imgSrc} alt={product.name} width={48} height={48} className="rounded-md" />
                        <div>
                            <h4 className="font-semibold">{product.name}</h4>
                        </div>
                    </div>
                    <Button 
                        className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-sm h-8 px-6 rounded-full"
                        onClick={() => onInvest(product)}
                    >
                        买入
                    </Button>
                </div>
                <div className="grid grid-cols-3 text-center mt-4 text-sm">
                    <div>
                        <p className="text-muted-foreground flex items-center justify-center gap-1"><CreditCard className="w-3 h-3" /> 每份金额</p>
                        <p className="font-semibold">{product.price}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground flex items-center justify-center gap-1"><Calendar className="w-3 h-3"/> 周期</p>
                        <p className="font-semibold">{product.period} 天</p>
                    </div>
                     <div>
                        <p className="text-muted-foreground flex items-center justify-center gap-1"><Percent className="w-3 h-3"/> 收益率</p>
                        <p className="font-semibold">{(product.dailyRate ?? 0) * 100}% / 天</p>
                     </div>
                </div>
                <div className="mt-4">
                    <Progress value={(purchasedCount / product.maxPurchase) * 100} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>已购买次数: {purchasedCount}</span>
                        <span>最大购买次数: {product.maxPurchase}</span>
                    </div>
                </div>
            </CardContent>
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
            <div className="h-full gold-gradient-background">
                <Header />
                <div className="space-y-4">
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
