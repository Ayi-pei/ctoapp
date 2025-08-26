"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { explainMarketDynamics } from "@/ai/flows/explain-market-dynamics";
import { Order } from "@/types";
import { Sparkles, LoaderCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";


type MarketExplanationProps = {
    orderBook: {
        asks: Order[];
        bids: Order[];
    };
    tradingPair: string;
};

export function MarketExplanation({ orderBook, tradingPair }: MarketExplanationProps) {
  const [explanation, setExplanation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
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
        setIsOpen(false);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not generate market explanation. Please try again.",
        })
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={handleExplain}>
          <Sparkles className="mr-2 h-4 w-4" />
          Explain Market
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Market Dynamics Analysis for {tradingPair}</DialogTitle>
          <DialogDescription>
            AI-powered insights based on the current order book.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Analyzing market data...</p>
            </div>
          ) : (
            <ScrollArea className="h-72 w-full rounded-md border p-4">
                <div className="text-foreground whitespace-pre-wrap">
                  {explanation}
                </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
