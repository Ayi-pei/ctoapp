
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getMarketAnalysis } from "@/ai/flows/get-market-analysis";
import { Order, PriceDataPoint } from "@/types";
import { Sparkles, LoaderCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";


type AIAssistantProps = {
    orderBook: {
        asks: Order[];
        bids: Order[];
    };
    priceHistory: PriceDataPoint[];
    tradingPair: string;
};

export function AIAssistant({ orderBook, priceHistory, tradingPair }: AIAssistantProps) {
  const [analysis, setAnalysis] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleManualAnalysis = async () => {
    setIsLoading(true);
    setAnalysis("");
    try {
        const orderBookDataString = `Asks:\n${orderBook.asks.slice(0, 10).map(o => `Price: ${o.price.toFixed(2)}, Size: ${o.size.toFixed(4)}`).join('\n')}\n\nBids:\n${orderBook.bids.slice(0, 10).map(o => `Price: ${o.price.toFixed(2)}, Size: ${o.size.toFixed(4)}`).join('\n')}`;

        // For manual analysis, we can provide the recent price history as context
        const priceHistoryString = `Recent Prices:\n${priceHistory.slice(-10).map(p => `Time: ${p.time}, Price: ${p.price.toFixed(2)}`).join('\n')}`;

        const result = await getMarketAnalysis({
            orderBookData: orderBookDataString,
            priceHistoryData: priceHistoryString,
            tradingPair: tradingPair,
        });

        if (result.analysis) {
            setAnalysis(result.analysis);
        } else {
            throw new Error("Failed to get analysis from AI.");
        }
    } catch (error) {
        console.error("Error explaining market dynamics:", error);
        toast({
            variant: "destructive",
            title: "分析失败",
            description: "无法生成市场分析，请稍后再试。",
        })
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Card>
        <CardHeader>
            <CardTitle>AI 交易助手</CardTitle>
            <CardDescription>获取基于当前市场数据的AI分析建议。</CardDescription>
        </CardHeader>
        <CardContent>
            <Button onClick={handleManualAnalysis} disabled={isLoading} className="w-full">
                {isLoading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {isLoading ? '正在分析...' : '手动分析行情'}
            </Button>
            {analysis && (
                <div className="mt-4">
                    <ScrollArea className="h-32 w-full rounded-md border p-4 text-sm">
                        <div className="text-foreground whitespace-pre-wrap">
                        {analysis}
                        </div>
                    </ScrollArea>
                </div>
            )}
        </CardContent>
    </Card>
  );
}
