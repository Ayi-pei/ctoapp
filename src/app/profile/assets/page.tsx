
"use client";

import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBalance } from "@/context/balance-context";
import type { Investment } from "@/types";
import { ChevronLeft, Archive } from "lucide-react";
import { useRouter } from "next/navigation";

const CRYPTO_ASSETS = ["BTC", "ETH", "USDT", "SOL", "XRP", "LTC", "BNB", "MATIC", "DOGE", "ADA", "SHIB"];
const FOREX_ASSETS = ["EUR", "GBP"];
const GOLD_ASSETS = ["XAU"];

const AssetList = ({ assets, balances }: { assets: string[], balances: ReturnType<typeof useBalance>['balances'] }) => (
    <Card>
        <CardContent className="p-0">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>资产</TableHead>
                        <TableHead className="text-right">可用</TableHead>
                        <TableHead className="text-right">冻结</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {assets.map(asset => {
                        const balance = balances[asset] || { available: 0, frozen: 0 };
                        return (
                            <TableRow key={asset}>
                                <TableCell className="font-medium">{asset}</TableCell>
                                <TableCell className="text-right">{balance.available.toFixed(4)}</TableCell>
                                <TableCell className="text-right">{balance.frozen.toFixed(4)}</TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
);

const InvestmentList = ({ investments }: { investments: Investment[] }) => (
     <Card>
        <CardContent className="p-0">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>产品名称</TableHead>
                        <TableHead className="text-right">投资金额 (USDT)</TableHead>
                        <TableHead className="text-right">状态</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {investments.map(inv => (
                        <TableRow key={inv.id}>
                            <TableCell className="font-medium">{inv.product_name}</TableCell>
                            <TableCell className="text-right">{inv.amount.toFixed(2)}</TableCell>
                             <TableCell className="text-right">{inv.status}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
);


const EmptyState = ({ text }: { text: string }) => (
    <Card>
        <CardContent className="pt-6 flex flex-col items-center justify-center text-center h-48">
            <Archive className="h-16 w-16 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">{text}</p>
        </CardContent>
    </Card>
);


export default function AssetsPage() {
    const router = useRouter();
    const { balances, investments } = useBalance();

    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <h1 className="text-2xl font-bold">我的资产</h1>
                </div>

                <Tabs defaultValue="crypto" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="crypto">加密货币</TabsTrigger>
                        <TabsTrigger value="investments">理财</TabsTrigger>
                        <TabsTrigger value="forex">外汇</TabsTrigger>
                        <TabsTrigger value="gold">黄金</TabsTrigger>
                    </TabsList>

                    <TabsContent value="crypto">
                        <AssetList assets={CRYPTO_ASSETS} balances={balances} />
                    </TabsContent>
                     <TabsContent value="investments">
                        {investments.length > 0 ? <InvestmentList investments={investments} /> : <EmptyState text="您还没有任何投资记录。" />}
                    </TabsContent>
                    <TabsContent value="forex">
                        <AssetList assets={FOREX_ASSETS} balances={balances} />
                    </TabsContent>
                     <TabsContent value="gold">
                        <AssetList assets={GOLD_ASSETS} balances={balances} />
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}
