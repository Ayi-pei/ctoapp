"use client";

"use client";

// Disable SSR for this page to avoid context issues
export const dynamic = "force-dynamic";

import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SpotTrade, ContractTrade, Transaction } from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useBalance } from "@/context/balance-context";
import { useRequests } from "@/context/requests-context";
import { useSimpleAuth } from "@/context/simple-custom-auth";

type OrderHistoryItem = SpotTrade | ContractTrade | Transaction;

export default function ProfileOrdersPage() {
  const router = useRouter();
  const { user } = useSimpleAuth();
  const { historicalTrades } = useBalance();
  const { requests } = useRequests();

  const userRequests = requests.filter(
    (r) =>
      r.user_id === user?.id &&
      (r.type === "deposit" || r.type === "withdrawal")
  ) as Transaction[];

  const allHistory: OrderHistoryItem[] = [
    ...historicalTrades,
    ...userRequests,
  ].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const getStatusBadge = (order: OrderHistoryItem) => {
    if ("orderType" in order) {
      // It's a trade
      if (order.orderType === "spot") {
        const spotOrder = order as SpotTrade;
        return (
          <Badge
            variant={spotOrder.status === "filled" ? "default" : "destructive"}
            className={cn(
              spotOrder.status === "filled" && "bg-green-500/20 text-green-500"
            )}
          >
            {spotOrder.status === "filled" ? "已成交" : "已取消"}
          </Badge>
        );
      }
      if (order.orderType === "contract") {
        const contractOrder = order as ContractTrade;
        if (contractOrder.status === "active") {
          return (
            <Badge className="bg-yellow-500/20 text-yellow-500">进行中</Badge>
          );
        }
        if (contractOrder.outcome === "win") {
          return <Badge className="bg-green-500/20 text-green-500">盈利</Badge>;
        }
        if (contractOrder.outcome === "loss") {
          return <Badge className="bg-red-500/20 text-red-500">亏损</Badge>;
        }
      }
    } else if (
      "type" in order &&
      (order.type === "deposit" || order.type === "withdrawal")
    ) {
      // It's a transaction request
      const transaction = order as Transaction;
      switch (transaction.status) {
        case "pending":
          return (
            <Badge className="bg-yellow-500/20 text-yellow-500">待审核</Badge>
          );
        case "approved":
          if (transaction.type === "deposit") {
            return (
              <Badge className="bg-green-500/20 text-green-500">充值成功</Badge>
            );
          } else {
            return (
              <Badge className="bg-blue-500/20 text-blue-500">提取成功</Badge>
            );
          }
        case "rejected":
          if (transaction.type === "withdrawal") {
            return (
              <Badge
                variant="destructive"
                className="bg-red-500/20 text-red-500"
              >
                已折返
              </Badge>
            );
          }
          return (
            <Badge variant="destructive" className="bg-red-500/20 text-red-500">
              已拒绝
            </Badge>
          );
      }
    }
    return <Badge variant="secondary">未知</Badge>;
  };

  const getOrderType = (order: OrderHistoryItem) => {
    if ("orderType" in order) {
      return (
        <span
          className={`px-2 py-1 text-xs font-semibold rounded-full ${
            order.orderType === "spot"
              ? "bg-blue-500/20 text-blue-500"
              : "bg-purple-500/20 text-purple-500"
          }`}
        >
          {order.orderType === "spot" ? "币币" : "秒合约"}
        </span>
      );
    }
    if ("type" in order) {
      const transaction = order as Transaction;
      return (
        <span
          className={`px-2 py-1 text-xs font-semibold rounded-full ${
            transaction.type === "deposit"
              ? "bg-green-500/20 text-green-500"
              : "bg-orange-500/20 text-orange-500"
          }`}
        >
          {transaction.type === "deposit" ? "充值" : "提现"}
        </span>
      );
    }
    return "N/A";
  };

  const getOrderDirection = (order: OrderHistoryItem) => {
    if ("orderType" in order) {
      // It's a trade
      return (
        <span
          className={order.type === "buy" ? "text-green-500" : "text-red-500"}
        >
          {order.type === "buy" ? "买入" : "卖出"}
        </span>
      );
    }
    return <span className="text-muted-foreground">-</span>;
  };

  const getOrderAmount = (order: OrderHistoryItem) => {
    if ("orderType" in order) {
      return (
        order.orderType === "spot"
          ? (order as SpotTrade).total
          : (order as ContractTrade).amount
      )?.toFixed(4);
    }
    if ("type" in order) {
      return (order as Transaction).amount?.toFixed(4);
    }
    return "N/A";
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold">交易订单</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>全部历史订单</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>交易对/资产</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>方向</TableHead>
                  <TableHead>金额</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allHistory.length > 0 ? (
                  allHistory.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        {"trading_pair" in order
                          ? order.trading_pair
                          : (order as Transaction).asset}
                      </TableCell>
                      <TableCell>{getOrderType(order)}</TableCell>
                      <TableCell>{getOrderDirection(order)}</TableCell>
                      <TableCell>{getOrderAmount(order)}</TableCell>
                      <TableCell>{getStatusBadge(order)}</TableCell>
                      <TableCell className="text-xs">
                        {new Date(order.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground h-24"
                    >
                      暂无订单记录。
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
