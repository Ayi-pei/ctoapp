
"use client";
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HourlyInvestmentDialog } from "@/components/hourly-investment-dialog"; 
import { useBalance } from "@/context/balance-context";
import type { Investment } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { ChevronLeft, Landmark, PiggyBank, BarChart, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useInvestmentSettings, InvestmentProduct } from "@/context/investment-settings-context";

const PRODUCT_NAME = "富投宝";

const Header = () => {
    const router = useRouter();
    return (
        <div className="relative flex items-center justify-center p-4">
            <Button variant="ghost" size="icon" className="absolute left-2" onClick={() => router.back()}>
                <ChevronLeft />
            </Button>
            <h1 className="text-lg font-bold">{PRODUCT_NAME}</h1>
            <Button variant="link" className="text-foreground p-0 h-auto absolute right-4">规则</Button>
        </div>
    )
}

export default function YueBaoStylePage() {
    const { toast } = useToast();
    const { balances, addHourlyInvestment, investments } = useBalance();
    const { investmentProducts } = useInvestmentSettings();

    const [product, setProduct] = useState<InvestmentProduct | null>(null);
    const [isInvestDialogOpen, setIsInvestDialogOpen] = useState(false);
    
    // Stats states
    const [totalAmount, setTotalAmount] = useState(0);
    const [totalProfit, setTotalProfit] = useState(0);
    const [yesterdayProfit, setYesterdayProfit] = useState(0); // Mocked for now
    const [activeInvestments, setActiveInvestments] = useState<Investment[]>([]);
    const [settledInvestments, setSettledInvestments] = useState<Investment[]>([]);

    useEffect(() => {
        const yuebaoProduct = investmentProducts.find(p => p.name === PRODUCT_NAME);
        if (yuebaoProduct) {
            setProduct(yuebaoProduct);

            const productInvestments = investments.filter(inv => inv.product_name === PRODUCT_NAME);
            
            const active = productInvestments.filter(i => i.status === 'active');
            const settled = productInvestments.filter(i => i.status === 'settled');
            
            setActiveInvestments(active);
            setSettledInvestments(settled);

            const activeTotal = active.reduce((sum, i) => sum + i.amount, 0);
            setTotalAmount(activeTotal);

            const settledTotalProfit = settled.reduce((sum, i) => sum + (i.profit || 0), 0);
            setTotalProfit(settledTotalProfit);
            
            // Mock yesterday's profit calculation
            const someProfit = settled.length > 0 ? (settled[0].profit || 0) / (settled[0].duration_hours || 24) : 0;
            setYesterdayProfit(someProfit);

        }
    }, [investmentProducts, investments]);

    const handleInvestClick = () => {
        if (!product) return;
        setIsInvestDialogOpen(true);
    };
    
    const handleConfirmInvestment = async (amount: number, duration: number) => {
        if (!product || !product.hourlyTiers) return;

        const success = await addHourlyInvestment({
            productName: product.name,
            amount,
            durationHours: duration,
            tiers: product.hourlyTiers,
            category: 'finance'
        });

         if (success) {
            toast({
                title: "转入成功",
                description: `您已成功转入 ${amount} USDT 到${product.name}。`
            });
        } else {
             toast({
                variant: "destructive",
                title: "转入失败",
                description: "您的余额不足或输入无效。"
            });
        }
        setIsInvestDialogOpen(false);
    };

    const InvestmentList = ({ investments, title }: { investments: Investment[], title: string }) => (
         <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>金额 (USDT)</TableHead>
                            <TableHead>状态</TableHead>
                            <TableHead className="text-right">时间</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {investments.map(inv => (
                            <TableRow key={inv.id}>
                                <TableCell className="font-medium">{inv.amount.toFixed(2)}</TableCell>
                                <TableCell>
                                <Badge variant="outline" className={cn(inv.status === 'active' ? 'text-yellow-500' : 'text-green-500')}>
                                    {inv.status === 'active' ? '进行中' : `已结算 (+${(inv.profit || 0).toFixed(2)})`}
                                </Badge>
                                </TableCell>
                                <TableCell className="text-right text-xs">{new Date(inv.created_at).toLocaleString()}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );

    return (
        <DashboardLayout>
            <div className="h-full w-full finance-background bg-cover bg-center">
                <div className="flex flex-col h-full bg-black/50 backdrop-blur-sm">
                    <Header />
                    <div className="flex-grow p-4 space-y-6 rounded-t-2xl">
                        <Card className="bg-card/80 shadow-lg">
                            <CardContent className="p-6">
                                <div className="text-sm text-muted-foreground">总金额 (USDT)</div>
                                <div className="text-4xl font-bold mt-2">{totalAmount.toFixed(2)}</div>
                                <div className="grid grid-cols-2 mt-4 text-sm">
                                    <div>
                                        <div className="text-muted-foreground">累计收益 (USDT)</div>
                                        <div className="font-semibold text-green-400">+{totalProfit.toFixed(2)}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">昨日收益 (USDT)</div>
                                        <div className="font-semibold text-green-400">+{yesterdayProfit.toFixed(2)}</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-2 gap-4">
                            <Button className="w-full h-12 bg-primary/80 hover:bg-primary" onClick={handleInvestClick}>转入</Button>
                            <Button className="w-full h-12" variant="secondary" disabled>转出</Button>
                        </div>
                        
                        <Tabs defaultValue="active" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="active">进行中 ({activeInvestments.length})</TabsTrigger>
                                <TabsTrigger value="settled">历史记录 ({settledInvestments.length})</TabsTrigger>
                            </TabsList>
                            <TabsContent value="active" className="mt-4">
                                {activeInvestments.length > 0 ? (
                                    <InvestmentList investments={activeInvestments} title="进行中订单" />
                                ) : (
                                    <div className="text-center text-muted-foreground py-10">暂无进行中的订单</div>
                                )}
                            </TabsContent>
                            <TabsContent value="settled" className="mt-4">
                                {settledInvestments.length > 0 ? (
                                    <InvestmentList investments={settledInvestments} title="已完成订单" />
                                ) : (
                                    <div className="text-center text-muted-foreground py-10">暂无已完成的订单</div>
                                )}
                            </TabsContent>
                        </Tabs>
                        
                    </div>
                </div>
            </div>

            {product && (
                <HourlyInvestmentDialog
                    isOpen={isInvestDialogOpen}
                    onOpenChange={setIsInvestDialogOpen}
                    product={product}
                    balance={balances['USDT']?.available || 0}
                    onConfirm={handleConfirmInvestment}
                />
            )}
        </DashboardLayout>
    )
}
