
"use client";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSystemSettings } from "@/context/system-settings-context";
import { useToast } from "@/hooks/use-toast";

const supportedAssets: (keyof ReturnType<typeof useSystemSettings>['systemSettings']['depositAddresses'])[] = ["USDT", "ETH", "BTC", "USD"];

export default function AdminGeneralSettingsPage() {
    const { systemSettings, updateDepositAddress } = useSystemSettings();
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
                <Card>
                    <CardHeader>
                        <CardTitle>充值地址设置</CardTitle>
                        <CardDescription>配置用户端用于充值的收款地址</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
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
                        <Button onClick={handleSaveSettings}>保存设置</Button>
                    </CardFooter>
                </Card>
            </div>
        </DashboardLayout>
    );
}
