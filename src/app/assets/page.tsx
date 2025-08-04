
"use client";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useBalance } from "@/context/balance-context";
import { ArrowDownToLine, ArrowUpFromLine, Eye, RefreshCw, Repeat, RotateCcw, CircleDollarSign } from "lucide-react";
import React, { useState } from 'react';
import { DepositDialog } from "@/components/deposit-dialog";
import { WithdrawDialog } from "@/components/withdraw-dialog";


const cryptoIcons: { [key: string]: React.ElementType } = {
  "USDT": CircleDollarSign,
  "BTC": CircleDollarSign,
  "ETH": CircleDollarSign,
};


type AssetRowProps = {
    asset: {
        name: string;
        icon: React.ElementType;
    };
    balance: {
        available: number;
        frozen: number;
    };
    usdtValue: number;
}

const AssetRow = ({ asset, balance, usdtValue }: AssetRowProps) => {
    const Icon = asset.icon;
    return (
        <div className="py-4">
            <div className="flex items-center gap-3 mb-4">
                <Icon className="h-8 w-8 text-primary" />
                <span className="font-semibold">{asset.name}</span>
            </div>
            <div className="grid grid-cols-3 text-sm">
                <div>
                    <p className="text-muted-foreground">可用</p>
                    <p>{balance.available.toFixed(4)}</p>
                </div>
                 <div>
                    <p className="text-muted-foreground">占用</p>
                    <p>{balance.frozen.toFixed(4)}</p>
                </div>
                 <div className="text-right">
                    <p className="text-muted-foreground">折合(USDT)</p>
                    <p>{usdtValue.toFixed(4)}</p>
                </div>
            </div>
        </div>
    );
}


export default function AssetsPage() {
    const { balances, assets } = useBalance();
    const [isDepositOpen, setIsDepositOpen] = useState(false);
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
    
    // In a real app, you'd fetch prices to calculate USDT value.
    // For now, we'll use a mock or simplified logic.
    const getUsdtValue = (assetName: string, amount: number) => {
        if (assetName === 'USDT') return amount;
        if (assetName === 'BTC') return amount * 68000; // Mock price
        if (assetName === 'ETH') return amount * 3800; // Mock price
        return 0;
    }

    const totalBalance = Object.entries(balances).reduce((acc, [name, balance]) => {
        return acc + getUsdtValue(name, balance.available);
    }, 0);
    

    return (
        <DashboardLayout>
            <div className="p-4 space-y-6">
                 <Card className="bg-card text-card-foreground">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-center text-sm text-muted-foreground mb-2">
                            <span>账户余额(USDT)</span>
                            <div className="flex items-center gap-3">
                                <Eye className="w-4 h-4" />
                                <RefreshCw className="w-4 h-4" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold mb-4">{totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>

                        <div className="grid grid-cols-4 gap-4 text-center">
                            <div className="flex flex-col items-center space-y-2" onClick={() => setIsDepositOpen(true)}>
                                <Button variant="secondary" size="icon" className="w-12 h-12 rounded-full bg-primary/20 text-primary">
                                    <ArrowDownToLine />
                                </Button>
                                <span className="text-xs">充币</span>
                            </div>
                             <div className="flex flex-col items-center space-y-2" onClick={() => setIsWithdrawOpen(true)}>
                                <Button variant="secondary" size="icon" className="w-12 h-12 rounded-full bg-primary/20 text-primary">
                                    <ArrowUpFromLine />
                                </Button>
                                <span className="text-xs">提币</span>
                            </div>
                             <div className="flex flex-col items-center space-y-2">
                                <Button variant="secondary" size="icon" className="w-12 h-12 rounded-full bg-primary/20 text-primary">
                                    <Repeat />
                                </Button>
                                <span className="text-xs">闪兑</span>
                            </div>
                             <div className="flex flex-col items-center space-y-2">
                                <Button variant="secondary" size="icon" className="w-12 h-12 rounded-full bg-primary/20 text-primary">
                                    <RotateCcw />
                                </Button>
                                <span className="text-xs">划转</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                 <Card className="bg-card text-card-foreground">
                    <CardHeader>
                        <CardTitle className="text-lg">资产明细</CardTitle>
                    </CardHeader>
                    <CardContent>
                       {assets.map((asset, index) => (
                           <React.Fragment key={asset.name}>
                            <AssetRow 
                                asset={asset} 
                                balance={balances[asset.name]} 
                                usdtValue={getUsdtValue(asset.name, balances[asset.name].available)}
                            />
                            {index < assets.length -1 && <Separator />}
                           </React.Fragment>
                       ))}
                    </CardContent>
                </Card>

            </div>
            <DepositDialog isOpen={isDepositOpen} onOpenChange={setIsDepositOpen} />
            <WithdrawDialog isOpen={isWithdrawOpen} onOpenChange={setIsWithdrawOpen} />
        </DashboardLayout>
    );
}
