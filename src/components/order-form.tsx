
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContractOrderSheet } from "./contract-order-sheet";
import { ContractTrade } from "@/types";


type OrderFormProps = {
  tradingPair: string;
  balance: number;
  onPlaceTrade: (trade: Omit<ContractTrade, 'id' | 'price' | 'status' | 'userId' | 'orderType' | 'tradingPair' | 'createdAt'>) => void;
}

export function OrderForm({ tradingPair, balance, onPlaceTrade }: OrderFormProps) {
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');

    const handleOpenSheet = (type: 'buy' | 'sell') => {
        setOrderType(type);
        setIsSheetOpen(true);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>秒合约</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4">
                    <Button
                        size="lg"
                        className="bg-green-600 hover:bg-green-700 text-white text-lg h-12"
                        onClick={() => handleOpenSheet('buy')}
                    >
                        看涨
                    </Button>
                    <Button
                        size="lg"
                        className="bg-red-600 hover:bg-red-700 text-white text-lg h-12"
                        onClick={() => handleOpenSheet('sell')}
                    >
                        看跌
                    </Button>
                </div>
                 <ContractOrderSheet
                    isOpen={isSheetOpen}
                    onOpenChange={setIsSheetOpen}
                    orderType={orderType}
                    tradingPair={tradingPair}
                    balance={balance}
                    onPlaceTrade={onPlaceTrade}
                />
            </CardContent>
        </Card>
    );
}
