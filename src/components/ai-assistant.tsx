
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { explainMarketDynamics } from "@/ai/flows/explain-market-dynamics";
import { Order } from "@/types";
import { Sparkles, LoaderCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";


type AIAssistantProps = {
    orderBook: {
        asks: Order[];
        bids: Order[];
    };
    tradingPair: string;
};

export function AIAssistant({ orderBook, tradingPair }: AIAssistantProps) {
  const [explanation, setExplanation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleExplain = async () => {
    setIsLoading(true);
    setExplanation("");
    try {
        const orderBookDataString = `Asks:\n${orderBook.asks.slice(0, 10).map(o => `Price: ${o.price.toFixed(2)}, Size: ${o.size.toFixed(4)}`).join('\n')}\n\nBids:\n${orderBook.bids.slice(0, 10).map(o => `Price: ${o.price.toFixed(2)}, Size: ${o.size.toFixed(4)}`).join('\n')}`;

        const result = await explainMarketDynamics({
            orderBookData: orderBookDataString,
            tradingPair: tradingPair,
        });

        if (result.explanation) {
            setExplanation(result.explanation);
        } else {
            throw new Error("Failed to get explanation from AI.");
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
            <CardTitle>智能助手</CardTitle>
        </CardHeader>
        <CardContent>
            <Button onClick={handleExplain} disabled={isLoading} className="w-full">
                {isLoading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {isLoading ? '正在分析...' : '开始分析'}
            </Button>
            {explanation && (
                <div className="mt-4">
                    <ScrollArea className="h-32 w-full rounded-md border p-4 text-sm">
                        <div className="text-foreground whitespace-pre-wrap">
                        {explanation}
                        </div>
                    </ScrollArea>
                </div>
            )}
        </CardContent>
    </Card>
  );
}
