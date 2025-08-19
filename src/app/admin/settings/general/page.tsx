
"use client";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSystemSettings } from "@/context/system-settings-context";
import { useToast } from "@/hooks/use-toast";

const supportedAssets: (keyof ReturnType<typeof useSystemSettings>['systemSettings']['depositAddresses'])[] = ["USDT", "ETH", "BTC", "USD"];

export default function AdminGeneralSettingsPage() {
    const { systemSettings, updateDepositAddress, updateSetting } = useSystemSettings();
    const { toast } = useToast();
    
    const handleSaveSettings = () => {
        // The context now saves automatically, but we can provide user feedback.
        toast({
            title: "设置已保存",
            description: "通用设置已更新。",
        });
    };

    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-4">
                <h1 className="text-2xl font-bold">通用设置</h1>
                <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>通用设置</CardTitle>
                        <CardDescription>影响整个平台的全局配置</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        
                        <div className="flex items-center justify-between p-4 rounded-md bg-muted/50">
                            <div>
                                <Label htmlFor="enable-contract-trading" className="font-semibold text-base">
                                    开启秒合约交易
                                </Label>
                                <p className="text-xs font-normal text-muted-foreground mt-1">
                                    关闭后，所有用户将无法进行秒合约交易。
                                </p>
                            </div>
                            <Switch
                                id="enable-contract-trading"
                                checked={systemSettings.contractTradingEnabled}
                                onCheckedChange={(checked: boolean) => updateSetting('contractTradingEnabled', checked)}
                            />
                        </div>
                        
                        {supportedAssets.map((asset) => (
                            <div key={asset}>
                                <Label htmlFor={`deposit-address-${asset}`} className="text-sm font-medium">在线充币地址 ({asset})</Label>
                                <Input
                                    id={`deposit-address-${asset}`}
                                    type="text"
                                    className="mt-2"
                                    value={systemSettings.depositAddresses[asset] || ''}
                                    onChange={(e) => updateDepositAddress(asset, e.target.value)}
                                    placeholder={`请输入您的 ${asset} 钱包或账户地址`}
                                />
                            </div>
                        ))}
                    </CardContent>
                     <CardFooter>
                        <Button onClick={handleSaveSettings}>保存通用设置</Button>
                    </CardFooter>
                </Card>
            </div>
        </DashboardLayout>
    );
}
