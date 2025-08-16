
"use client";
import { useState } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { InvestmentDialog } from "@/components/investment-dialog";
import { useBalance, Investment } from "@/context/balance-context";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

type MiningProduct = {
    name: string;
    price: number;
    dailyRate: number;
    period: number;
    maxPurchase: number;
    imgSrc: string;
};

const Header = ({ totalAssets }: { totalAssets: number }) => {
    const router = useRouter();
    return (
        <div className="p-4 bg-card text-foreground rounded-b-lg space-y-4">
            <div className="flex justify-between items-center">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ChevronLeft />
                </Button>
                <div className="text-center">
                    <p className="text-lg font-bold">{totalAssets.toFixed(2)}</p>
                </div>
                <div className="flex gap-4 text-sm">
                    <Button variant="link" className="text-foreground p-0">托管订单</Button>
                    <Button variant="link" className="text-foreground p-0">规则</Button>
                </div>
            </div>
            <div className="grid grid-cols-3 text-center">
                <div>
                    <p className="text-muted-foreground text-sm">正在托管订单</p>
                    <p className="font-semibold">0</p>
                </div>
                <div>
                    <p className="text-muted-foreground text-sm">累计收益</p>
                    <p className="font-semibold">0.00</p>
                </div>
                <div>
                    <p className="text-muted-foreground text-sm">托管中订单</p>
                    <p className="font-semibold">0</p>
                </div>
            </div>
        </div>
    );
};


const MiningProductCard = ({ product, purchasedCount, onInvest }: { 
    product: MiningProduct, 
    purchasedCount: number,
    onInvest: (product: MiningProduct) => void 
}) => (
    <Card className="bg-card/80">
        <CardContent className="p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Image src={product.imgSrc} alt={product.name} width={48} height={48} className="rounded-md" />
                    <h4 className="font-semibold">{product.name}</h4>
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
                    <p className="text-muted-foreground">每份金额</p>
                    <p className="font-semibold">{product.price}</p>
                </div>
                <div>
                    <p className="text-muted-foreground">日收益率</p>
                    <p className="font-semibold">{product.dailyRate * 100}%</p>
                </div>
                <div>
                    <p className="text-muted-foreground">周期</p>
                    <p className="font-semibold">{product.period} 天</p>
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
);

const miningProducts: MiningProduct[] = [
    { name: "ASIC 矿机", price: 98, dailyRate: 0.03, period: 25, maxPurchase: 1, imgSrc: "/images/asic-miner.png" },
    { name: "阿瓦隆矿机 (Avalon) A13", price: 103, dailyRate: 0.025, period: 30, maxPurchase: 1, imgSrc: "/images/avalon-miner.png" },
    { name: "MicroBT Whatsminer M60S", price: 1, dailyRate: 0.80, period: 365, maxPurchase: 1, imgSrc: "/images/microbt-miner.png" },
];

export default function FinancePage() {
    const { toast } = useToast();
    const { balances, addInvestment, investments } = useBalance();
    const [selectedProduct, setSelectedProduct] = useState<MiningProduct | null>(null);
    const [isInvestmentDialogOpen, setIsInvestmentDialogOpen] = useState(false);
    
    const getUsdtValue = (assetName: string, amount: number) => {
        if (assetName === 'USDT') return amount;
        if (assetName === 'BTC') return amount * 68000;
        if (assetName === 'ETH') return amount * 3800;
        return 0;
    }

    const totalBalance = Object.entries(balances).reduce((acc, [name, balance]) => {
        return acc + getUsdtValue(name, balance.available);
    }, 0);

    const handleInvestClick = (product: MiningProduct) => {
        setSelectedProduct(product);
        setIsInvestmentDialogOpen(true);
    }
    
    const handleConfirmInvestment = async (amount: number) => {
        if (!selectedProduct) return;
        
        // In this model, amount is fixed to product price.
        const success = await addInvestment(selectedProduct.name, selectedProduct.price);
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
            <Header totalAssets={totalBalance} />
            <div className="p-4 space-y-4">
                {miningProducts.map(product => (
                    <MiningProductCard 
                        key={product.name} 
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
        </DashboardLayout>
    );
}
