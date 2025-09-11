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
import { ChevronLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useInvestmentSettings,
  InvestmentProduct,
} from "@/context/investment-settings-context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Disable SSR for this page to avoid context issues
export const dynamic = "force-dynamic";

const PRODUCT_NAME = "富投宝";

const Header = () => {
  const router = useRouter();
  return (
    <div className="relative flex items-center justify-center p-4">
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-2"
        onClick={() => router.back()}
      >
        <ChevronLeft />
      </Button>
      <h1 className="text-2xl font-bold tracking-widest bg-black/20 text-white px-4 py-2 rounded-lg shadow-lg border border-white/30">
        <span className="bg-gradient-to-r from-yellow-400 to-amber-600 bg-clip-text text-transparent">
          富投宝
        </span>
      </h1>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            className="text-foreground p-2 h-auto absolute right-4 text-xs border-green-500 bg-blue-500/40 hover:bg-blue-500/60"
          >
            规则
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>富投宝规则说明</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 pt-2 text-left">
              <p>
                1. <strong>投资时间:</strong>{" "}
                “富投宝”仅在每日特定时间段内开放投资，具体时间请参考产品说明。
              </p>
              <p>
                2. <strong>计息方式:</strong>{" "}
                投资成功后，系统将根据您选择的投资时长和对应的小时利率开始计息。
              </p>
              <p>
                3. <strong>收益计算:</strong> 预计收益 = 投资金额 ×
                对应时长的小时利率。实际收益以结算时为准。
              </p>
              <p>
                4. <strong>本金与收益返还:</strong>{" "}
                投资到期后，您的本金和所产生的收益将自动返还至您的USDT可用余额中。
              </p>
              <p>
                5. <strong>风险提示:</strong>{" "}
                所有投资均存在市场风险，请您在充分了解产品详情后，根据自身的风险承受能力进行操作。
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>我明白了</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

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
  const [settledInvestments, setSettledInvestments] = useState<Investment[]>(
    []
  );

  useEffect(() => {
    const yuebaoProduct = investmentProducts.find(
      (p) => p.name === PRODUCT_NAME
    );
    if (yuebaoProduct) {
      setProduct(yuebaoProduct);

      const productInvestments = investments.filter(
        (inv) => inv.product_name === PRODUCT_NAME
      );

      const active = productInvestments.filter((i) => i.status === "active");
      const settled = productInvestments.filter((i) => i.status === "settled");

      setActiveInvestments(active);
      setSettledInvestments(settled);

      const activeTotal = active.reduce((sum, i) => sum + i.amount, 0);
      setTotalAmount(activeTotal);

      const settledTotalProfit = settled.reduce(
        (sum, i) => sum + (i.profit || 0),
        0
      );
      setTotalProfit(settledTotalProfit);

      // Mock yesterday's profit calculation
      const someProfit =
        settled.length > 0
          ? (settled[0].profit || 0) / (settled[0].duration_hours || 24)
          : 0;
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
      category: "finance",
    });

    if (success) {
      toast({
        title: "转入成功",
        description: `您已成功转入 ${amount} USDT 到${product.name}。`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "转入失败",
        description: "您的余额不足或输入无效。",
      });
    }
    setIsInvestDialogOpen(false);
  };

  const InvestmentList = ({
    investments,
    title,
  }: {
    investments: Investment[];
    title: string;
  }) => (
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
            {investments.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium">
                  {inv.amount.toFixed(2)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      inv.status === "active"
                        ? "text-yellow-500"
                        : "text-green-500"
                    )}
                  >
                    {inv.status === "active"
                      ? "进行中"
                      : `已结算 (+${(inv.profit || 0).toFixed(2)})`}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-xs">
                  {new Date(inv.created_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="h-full w-full finance-background">
        <div className="flex flex-col h-full bg-black/50 backdrop-blur-sm">
          <Header />
          <div className="flex-grow p-4 space-y-6 rounded-t-2xl">
            <Card className="shadow-lg futoubao-card-background">
              <CardContent className="p-6">
                <div className="text-sm text-black/80">总金额 (USDT)</div>
                <div className="text-4xl font-bold mt-2 text-green-600">
                  {totalAmount.toFixed(2)}
                </div>
                <div className="grid grid-cols-2 mt-4 text-sm">
                  <div>
                    <div className="text-black/80">累计收益 (USDT)</div>
                    <div className="font-semibold text-green-600">
                      +{totalProfit.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-black/80">昨日收益 (USDT)</div>
                    <div className="font-semibold text-green-600">
                      +{yesterdayProfit.toFixed(2)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Button
                className="w-full h-12 bg-gradient-to-r from-gray-200 to-yellow-500 text-black font-bold"
                onClick={handleInvestClick}
              >
                转入
              </Button>
              <Button className="w-full h-12" variant="secondary" disabled>
                转出
              </Button>
            </div>

            <Tabs defaultValue="active" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="active">
                  进行中 ({activeInvestments.length})
                </TabsTrigger>
                <TabsTrigger value="settled">
                  历史记录 ({settledInvestments.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="active" className="mt-4">
                {activeInvestments.length > 0 ? (
                  <InvestmentList
                    investments={activeInvestments}
                    title="进行中订单"
                  />
                ) : (
                  <div className="text-center text-muted-foreground py-10">
                    暂无进行中的订单
                  </div>
                )}
              </TabsContent>
              <TabsContent value="settled" className="mt-4">
                {settledInvestments.length > 0 ? (
                  <InvestmentList
                    investments={settledInvestments}
                    title="已完成订单"
                  />
                ) : (
                  <div className="text-center text-muted-foreground py-10">
                    暂无已完成的订单
                  </div>
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
          balance={balances["USDT"]?.available || 0}
          onConfirm={handleConfirmInvestment}
        />
      )}
    </DashboardLayout>
  );
}
