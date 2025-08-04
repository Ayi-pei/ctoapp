
"use client";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Gem, Star, User } from "lucide-react";
import Image from "next/image";

const InvestmentProductCard = () => (
    <Card className="bg-card">
        <CardContent className="p-4 space-y-4">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                     <Image src="https://placehold.co/40x40.png" alt="USDT" width={40} height={40} data-ai-hint="logo cryptocurrency" />
                    <div>
                        <h4 className="font-semibold">USDT Metfone contract</h4>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold text-green-500">0.75 %</p>
                    {/* Placeholder for sparkline */}
                </div>
            </div>

            <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center"><Gem className="w-3 h-3 mr-2 text-primary" />起投金额:</span>
                    <span>500 USDT</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center"><Gem className="w-3 h-3 mr-2 text-primary" />限投金额:</span>
                    <span>200,000 USDT</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center"><Gem className="w-3 h-3 mr-2 text-primary" />锁仓天数:</span>
                    <span>15</span>
                </div>
            </div>

            <div>
                <div className="flex justify-between mb-1 text-sm">
                    <span className="text-muted-foreground">项目进度:</span>
                    <span>25%</span>
                </div>
                <Progress value={25} className="h-2" />
            </div>

            <Button className="w-full bg-primary/90 hover:bg-primary">立即参投</Button>
        </CardContent>
    </Card>
);


export default function FinancePage() {
    const renderEmptyState = (text: string) => (
         <Card>
            <CardContent className="pt-6 flex flex-col items-center justify-center text-center h-48">
                 <Image src="https://placehold.co/100x100.png" alt="No data" width={80} height={80} data-ai-hint="illustration no-data" />
                <p className="mt-4 text-muted-foreground">{text}</p>
            </CardContent>
        </Card>
    );

    return (
        <DashboardLayout>
            <div className="p-4 space-y-4">
                <Tabs defaultValue="value-added" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-card">
                        <TabsTrigger value="value-added">
                            <BarChart className="w-4 h-4 mr-2" />
                            增值收益
                        </TabsTrigger>
                        <TabsTrigger value="membership">
                            <Star className="w-4 h-4 mr-2" />
                            会员专区
                        </TabsTrigger>
                        <TabsTrigger value="regular">
                             <Gem className="w-4 h-4 mr-2" />
                            普通产品
                        </TabsTrigger>
                        <TabsTrigger value="my-investments">
                            <User className="w-4 h-4 mr-2" />
                           我的投资
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="value-added">
                        <div className="space-y-4">
                            <InvestmentProductCard />
                             <InvestmentProductCard />
                        </div>
                    </TabsContent>
                    <TabsContent value="membership">
                         {renderEmptyState("暂无会员专区产品")}
                    </TabsContent>
                    <TabsContent value="regular">
                        {renderEmptyState("暂无普通产品")}
                    </TabsContent>
                    <TabsContent value="my-investments">
                        {renderEmptyState("暂无投资记录")}
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}
