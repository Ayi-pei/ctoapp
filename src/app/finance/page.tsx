
"use client";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Gem, Star, User } from "lucide-react";
import Image from "next/image";

type InvestmentProductProps = {
    name: string;
    rate: number;
    minInvestment: number;
    maxInvestment: number;
    lockPeriod: number;
    progress: number;
    icon: React.ReactNode;
};

const MfIcon = () => (
    <svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <radialGradient id="mfGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                <stop offset="0%" style={{ stopColor: '#FFFFFF' }} />
                <stop offset="60%" style={{ stopColor: '#E57373' }} />
                <stop offset="100%" style={{ stopColor: '#D32F2F' }} />
            </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="45" fill="url(#mfGradient)" />
        <path d="M25 65 Q50 40 75 65" stroke="white" strokeWidth="5" fill="none" />
        <path d="M25 35 Q50 60 75 35" stroke="white" strokeWidth="5" fill="none" />
    </svg>
);

const SmIcon = () => (
    <svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <radialGradient id="smGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                <stop offset="0%" style={{ stopColor: '#FFFFFF' }} />
                <stop offset="60%" style={{ stopColor: '#81C784' }} />
                <stop offset="100%" style={{ stopColor: '#388E3C' }} />
            </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="45" fill="url(#smGradient)" />
        <path d="M25 65 Q50 40 75 65" stroke="white" strokeWidth="5" fill="none" />
        <path d="M25 35 Q50 60 75 35" stroke="white" strokeWidth="5" fill="none" />
    </svg>
);


const InvestmentProductCard = ({ name, rate, minInvestment, maxInvestment, lockPeriod, progress, icon }: InvestmentProductProps) => (
    <Card className="bg-card">
        <CardContent className="p-4 space-y-4">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                     {icon}
                    <div>
                        <h4 className="font-semibold">{name}</h4>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold text-green-500">{rate.toFixed(2)} %</p>
                    {/* Placeholder for sparkline */}
                </div>
            </div>

            <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center"><Gem className="w-3 h-3 mr-2 text-primary" />起投金额:</span>
                    <span>{minInvestment} USDT</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center"><Gem className="w-3 h-3 mr-2 text-primary" />限投金额:</span>
                    <span>{maxInvestment.toLocaleString()} USDT</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center"><Gem className="w-3 h-3 mr-2 text-primary" />锁仓天数:</span>
                    <span>{lockPeriod}</span>
                </div>
            </div>

            <div>
                <div className="flex justify-between mb-1 text-sm">
                    <span className="text-muted-foreground">项目进度:</span>
                    <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
            </div>

            <Button className="w-full bg-primary/90 hover:bg-primary">立即参投</Button>
        </CardContent>
    </Card>
);


export default function FinancePage() {
    const valueAddedProducts: Omit<InvestmentProductProps, 'icon'>[] = [
        { name: "USDT Metfone contract", rate: 0.75, minInvestment: 500, maxInvestment: 200000, lockPeriod: 15, progress: 25 },
        { name: "USDT Smart contract", rate: 0.90, minInvestment: 1000, maxInvestment: 500000, lockPeriod: 30, progress: 60 },
    ];

    const regularProducts: Omit<InvestmentProductProps, 'icon'>[] = [
        { name: "USDT Regular Saver", rate: 0.35, minInvestment: 100, maxInvestment: 50000, lockPeriod: 7, progress: 78 },
    ];
    
    const productIcons: { [key: string]: React.ReactNode } = {
        "USDT Metfone contract": <MfIcon />,
        "USDT Smart contract": <SmIcon />,
        "USDT Regular Saver": <Image src="https://placehold.co/40x40.png" alt="USDT" width={40} height={40} data-ai-hint="logo cryptocurrency" />
    }


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
                           {valueAddedProducts.map(product => (
                                <InvestmentProductCard key={product.name} {...product} icon={productIcons[product.name]} />
                           ))}
                        </div>
                    </TabsContent>
                    <TabsContent value="membership">
                         {renderEmptyState("暂无会员专区产品")}
                    </TabsContent>
                    <TabsContent value="regular">
                        <div className="space-y-4">
                           {regularProducts.length > 0 ? (
                                regularProducts.map(product => (
                                    <InvestmentProductCard key={product.name} {...product} icon={productIcons[product.name]} />
                                ))
                           ) : (
                                renderEmptyState("暂无普通产品")
                           )}
                        </div>
                    </TabsContent>
                    <TabsContent value="my-investments">
                        {renderEmptyState("暂无投资记录")}
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}
