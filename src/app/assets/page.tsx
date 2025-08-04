
"use client";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useBalance } from "@/context/balance-context";
import { ArrowDownToLine, ArrowUpFromLine, Eye, RefreshCw, Repeat, RotateCcw } from "lucide-react";
import Image from "next/image";

const cryptoIcons: { [key: string]: string } = {
  "USDT": "/icons/usdt.svg",
  "BTC": "/icons/btc.svg",
  "ETH": "/icons/eth.svg",
};

type Asset = {
    name: string;
    icon: string;
    available: number;
    frozen: number;
    usdtValue: number;
}

const AssetRow = ({ asset }: { asset: Asset }) => (
    <div className="py-4">
        <div className="flex items-center gap-3 mb-4">
            <img src={asset.icon} alt={`${asset.name} logo`} className="h-8 w-8" />
            <span className="font-semibold">{asset.name}</span>
        </div>
        <div className="grid grid-cols-3 text-sm">
            <div>
                <p className="text-muted-foreground">可用</p>
                <p>{asset.available.toFixed(4)}</p>
            </div>
             <div>
                <p className="text-muted-foreground">占用</p>
                <p>{asset.frozen.toFixed(4)}</p>
            </div>
             <div className="text-right">
                <p className="text-muted-foreground">折合(USDT)</p>
                <p>{asset.usdtValue.toFixed(4)}</p>
            </div>
        </div>
    </div>
);


export default function AssetsPage() {
    const { balance } = useBalance();

     const otherAssets: Asset[] = [
        { name: "BTC", icon: cryptoIcons.BTC, available: 0, frozen: 0, usdtValue: 0 },
        { name: "ETH", icon: cryptoIcons.ETH, available: 0, frozen: 0, usdtValue: 0 },
    ];
    
    const usdtAsset: Asset = {
        name: "USDT",
        icon: cryptoIcons.USDT,
        available: balance,
        frozen: 0,
        usdtValue: balance,
    }

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
                        <p className="text-3xl font-bold mb-4">{balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>

                        <div className="grid grid-cols-4 gap-4 text-center">
                            <div className="flex flex-col items-center space-y-2">
                                <Button variant="secondary" size="icon" className="w-12 h-12 rounded-full bg-primary/20 text-primary">
                                    <ArrowDownToLine />
                                </Button>
                                <span className="text-xs">充币</span>
                            </div>
                             <div className="flex flex-col items-center space-y-2">
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
                       <AssetRow asset={usdtAsset} />
                       <Separator />
                       {otherAssets.map(asset => (
                           <>
                            <AssetRow key={asset.name} asset={asset} />
                            <Separator />
                           </>
                       ))}
                    </CardContent>
                </Card>

            </div>
        </DashboardLayout>
    );
}
