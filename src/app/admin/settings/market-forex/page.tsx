"use client";

// Disable SSR for this page to avoid context issues
export const dynamic = "force-dynamic";

import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useEnhancedSystemSettings,
  EnhancedMarketIntervention,
} from "@/context/enhanced-system-settings-context";
import { PlusCircle, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useOptions } from "@/context/options-context";
import { Switch } from "@/components/ui/switch";

const InterventionCard = ({
  intervention,
  index,
  updateIntervention,
  removeIntervention,
  activateIntervention,
  deactivateIntervention,
  availableSymbols,
}: {
  intervention: EnhancedMarketIntervention;
  index: number;
  updateIntervention: (
    id: string,
    updates: Partial<EnhancedMarketIntervention>
  ) => void;
  removeIntervention: (id: string) => void;
  activateIntervention: (id: string) => void;
  deactivateIntervention: (id: string) => void;
  availableSymbols: string[];
}) => {
  return (
    <Card className="p-4 bg-muted/30">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">干预指令 {index + 1}</h3>
        <div className="flex items-center gap-2">
          <Switch
            checked={intervention.isActive}
            onCheckedChange={(checked) => {
              if (checked) {
                activateIntervention(intervention.id);
              } else {
                deactivateIntervention(intervention.id);
              }
            }}
          />
          <span className="text-sm">
            {intervention.isActive ? "启用" : "禁用"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => removeIntervention(intervention.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`intervention-pair-${intervention.id}`}>交易对</Label>
          <Select
            value={intervention.tradingPair}
            onValueChange={(value: string) =>
              updateIntervention(intervention.id, { tradingPair: value })
            }
          >
            <SelectTrigger id={`intervention-pair-${intervention.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableSymbols.map((pair: string) => (
                <SelectItem key={pair} value={pair}>
                  {pair}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`intervention-trend-${intervention.id}`}>趋势</Label>
          <Select
            value={intervention.trend}
            onValueChange={(value: "up" | "down" | "random") =>
              updateIntervention(intervention.id, { trend: value })
            }
          >
            <SelectTrigger id={`intervention-trend-${intervention.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="up">上涨</SelectItem>
              <SelectItem value="down">下跌</SelectItem>
              <SelectItem value="random">随机波动</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2 lg:col-span-1">
          <Label>时间范围</Label>
          <div className="flex items-center gap-2">
            <Input
              id={`intervention-start-${intervention.id}`}
              type="time"
              value={intervention.startTime}
              onChange={(e) =>
                updateIntervention(intervention.id, {
                  startTime: e.target.value,
                })
              }
            />
            <Input
              id={`intervention-end-${intervention.id}`}
              type="time"
              value={intervention.endTime}
              onChange={(e) =>
                updateIntervention(intervention.id, { endTime: e.target.value })
              }
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`intervention-min-${intervention.id}`}>最低价</Label>
          <Input
            id={`intervention-min-${intervention.id}`}
            type="number"
            step="0.01"
            value={intervention.minPrice.toFixed(2)}
            onChange={(e) =>
              updateIntervention(intervention.id, {
                minPrice: parseFloat(e.target.value) || 0,
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`intervention-max-${intervention.id}`}>最高价</Label>
          <Input
            id={`intervention-max-${intervention.id}`}
            type="number"
            step="0.01"
            value={intervention.maxPrice.toFixed(2)}
            onChange={(e) =>
              updateIntervention(intervention.id, {
                maxPrice: parseFloat(e.target.value) || 0,
              })
            }
          />
        </div>
      </div>
    </Card>
  );
};

export default function AdminForexMarketSettingsPage() {
  const {
    systemSettings,
    addMarketIntervention,
    removeMarketIntervention,
    updateMarketIntervention,
    activateIntervention,
    deactivateIntervention,
  } = useEnhancedSystemSettings();
  const { availableSymbols: availableOptionsSymbols } = useOptions();
  const { toast } = useToast();

  const FOREX_COMMODITY_PAIRS = ["XAU/USD", "EUR/USD", "GBP/USD"];
  const allAvailableSymbols = [
    ...availableOptionsSymbols,
    ...FOREX_COMMODITY_PAIRS,
  ];

  const handleSaveChanges = () => {
    toast({
      title: "设置已保存",
      description: "市场设置已自动更新。",
    });
  };

  const handleAddIntervention = () => {
    // 创建期权/外汇类型的干预规则，默认交易对为第一个可用的期权交易对
    const defaultTradingPair =
      allAvailableSymbols.length > 0 ? allAvailableSymbols[0] : "XAU/USD";
    addMarketIntervention({
      tradingPair: defaultTradingPair,
    });
  };

  const forexInterventions = systemSettings.marketInterventions.filter((i) =>
    allAvailableSymbols.includes(i.tradingPair)
  );

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6">
        <h1 className="text-2xl font-bold">期权/外汇市场设置</h1>

        <Card>
          <CardHeader>
            <CardTitle>市场数据干预指令</CardTitle>
            <CardDescription>为期权和外汇交易对创建干预指令。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {forexInterventions.map((intervention, index) => (
              <InterventionCard
                key={intervention.id}
                intervention={intervention}
                index={index}
                updateIntervention={updateMarketIntervention}
                removeIntervention={removeMarketIntervention}
                activateIntervention={activateIntervention}
                deactivateIntervention={deactivateIntervention}
                availableSymbols={allAvailableSymbols}
              />
            ))}
            <Button
              variant="outline"
              onClick={handleAddIntervention}
              disabled={systemSettings.marketInterventions.length >= 5}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              添加新指令
            </Button>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSaveChanges}>保存市场设置</Button>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
}
