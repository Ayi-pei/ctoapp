
"use client";
import { useState } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HourlyInvestmentDialog } from "@/components/hourly-investment-dialog"; 
import { useBalance } from "@/context/balance-context";
import type { Investment } from "@/types";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronLeft, Archive, Clock, Percent, CreditCard } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useInvestmentSettings, InvestmentProduct } from "@/context/investment-settings-context";


const Header = () => {
    const router = useRouter();
    const { investments } = useBalance();

    const activeInvestments = investments.filter(inv => inv.status === 'active' && inv.category === 'finance');
    const totalActiveAmount = activeInvestments.reduce((acc, inv) => acc + inv.amount, 0);

    const settledInvestments = investments.filter(inv => inv.status === 'settled' && inv.category === 'finance');
    const totalProfit = settledInvestments.reduce((acc, inv) => acc + (inv.profit || 0), 0);
    
    return (
        <div className="p-4 bg-card text-foreground rounded-b-lg space-y-4">
            <div className="relative flex items-center justify-center">
                <Button variant="ghost" size="icon" className="absolute left-0" onClick={() => router.back()}>
                    <ChevronLeft />
                </Button>
                <div className="text-center">
                    <p className="text-lg font-bold">理财订单</p>
                </div>
                <div className="absolute right-0 flex gap-2 text-sm">
                    <Button variant="link" className="text-foreground p-0 h-auto">规则</Button>
                </div>
            </div>
            <div className="grid grid-cols-3 text-center pt-4">
                <div>
                    <p className="text-muted-foreground text-sm">托管中订单</p>
                    <p className="font-semibold">{activeInvestments.length}</p>
                </div>
                <div>
                    <p className="text-muted-foreground text-sm">累计收益</p>
                    <p className="font-semibold">{totalProfit.toFixed(2)}</p>
                </div>
                <div>
                    <p className="text-muted-foreground text-sm">托管中金额</p>
                    <p className="font-semibold">{totalActiveAmount.toFixed(2)}</p>
                </div>
            </div>
        </div>
    );
};


const FinanceProductCard = ({ product, onInvest }: { 
    product: InvestmentProduct, 
    onInvest: (product: InvestmentProduct) => void 
}) => {
    return (
        <Card className="bg-card/80">
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Image src={product.imgSrc} alt={product.name} width={48} height={48} className="rounded-md" />
                        <div>
                            <h4 className="font-semibold">{product.name}</h4>
                            <p className="text-xs text-yellow-400">限时开放: {product.activeStartTime} - {product.activeEndTime}</p>
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
                        <p className="font-semibold">{product.price} USDT起</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground flex items-center justify-center gap-1"><Clock className="w-3 h-3"/> 周期</p>
                        <p className="font-semibold">{product.hourlyTiers?.map(t => t.hours).join('/')} 小时</p>
                    </div>
                     <div>
                        <p className="text-muted-foreground flex items-center justify-center gap-1"><Percent className="w-3 h-3"/> 收益率</p>
                        <p className="font-semibold">{product.hourlyTiers?.map(t => `${(t.rate * 100).toFixed(1)}%`).join('/')}</p>
                     </div>
                </div>
            </CardContent>
        </Card>
    )
};


const EmptyState = ({ text }: { text: string }) => (
    <Card>
        <CardContent className="pt-6 flex flex-col items-center justify-center text-center h-48">
            <Archive className="h-16 w-16 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">{text}</p>
        </CardContent>
    </Card>
);

const InvestmentList = ({ investments }: { investments: Investment[] }) => (
     <Card>
        <CardContent className="p-0">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>产品</TableHead>
                        <TableHead>金额</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>结算日期</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {investments.map(inv => (
                        <TableRow key={inv.id}>
                            <TableCell className="font-medium">{inv.product_name}</TableCell>
                            <TableCell>{inv.amount.toFixed(2)}</TableCell>
                            <TableCell>
                               <Badge variant="outline" className={cn(inv.status === 'active' ? 'text-yellow-500' : 'text-green-500')}>
                                 {inv.status === 'active' ? '进行中' : `已结算 (+${(inv.profit || 0).toFixed(2)})`}
                               </Badge>
                            </TableCell>
                            <TableCell className="text-xs">{new Date(inv.settlement_date).toLocaleString()}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
);


export default function FinancePage() {
    const { toast } = useToast();
    const { balances, addHourlyInvestment, investments } = useBalance();
    const { investmentProducts } = useInvestmentSettings();
    const [selectedProduct, setSelectedProduct] = useState<InvestmentProduct | null>(null);
    const [isHourlyInvestmentDialogOpen, setIsHourlyInvestmentDialogOpen] = useState(false);
    
    const financeProducts = investmentProducts.filter(p => p.category === 'finance');
    
    const handleInvestClick = (product: InvestmentProduct) => {
        setSelectedProduct(product);
        setIsHourlyInvestmentDialogOpen(true);
    }

    const handleConfirmHourlyInvestment = async (amount: number, duration: number) => {
        if (!selectedProduct || !selectedProduct.hourlyTiers) return;

        const success = await addHourlyInvestment({
            productName: selectedProduct.name,
            amount,
            durationHours: duration,
            tiers: selectedProduct.hourlyTiers,
            category: 'finance'
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
                description: "您的余额不足或输入无效。"
            });
        }
        setIsHourlyInvestmentDialogOpen(false);
        setSelectedProduct(null);
    }
    
    const activeInvestments = investments.filter(i => i.status === 'active' && i.category === 'finance');
    const settledInvestments = investments.filter(i => i.status === 'settled' && i.category === 'finance');

    return (
        <DashboardLayout>
            <Header />
            <div className="p-4 space-y-4">
                <Tabs defaultValue="products">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="products">理财产品</TabsTrigger>
                        <TabsTrigger value="active">托管中订单 ({activeInvestments.length})</TabsTrigger>
                        <TabsTrigger value="settled">已完成订单 ({settledInvestments.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="products" className="space-y-4 mt-4">
                       {financeProducts.map(product => (
                            <FinanceProductCard 
                                key={product.id} 
                                product={product}
                                onInvest={handleInvestClick}
                            />
                        ))}
                    </TabsContent>
                    <TabsContent value="active" className="mt-4">
                        {activeInvestments.length > 0 ? (
                           <InvestmentList investments={activeInvestments} />
                        ) : (
                            <EmptyState text="当前没有正在进行的订单。" />
                        )}
                    </TabsContent>
                    <TabsContent value="settled" className="mt-4">
                        {settledInvestments.length > 0 ? (
                           <InvestmentList investments={settledInvestments} />
                        ) : (
                            <EmptyState text="暂无已完成的订单记录。" />
                        )}
                    </TabsContent>
                </Tabs>
            </div>
            {selectedProduct && (
                <HourlyInvestmentDialog
                    isOpen={isHourlyInvestmentDialogOpen}
                    onOpenChange={setIsHourlyInvestmentDialogOpen}
                    product={selectedProduct}
                    balance={balances['USDT']?.available || 0}
                    onConfirm={handleConfirmHourlyInvestment}
                />
            )}
        </DashboardLayout>
    );
}
