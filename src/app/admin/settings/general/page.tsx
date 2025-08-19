"use client";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSystemSettings } from "@/context/system-settings-context";

const supportedAssets: (keyof ReturnType<typeof useSystemSettings>['systemSettings']['depositAddresses'])[] = ["USDT", "ETH", "BTC", "USD"];

export default function AdminGeneralSettingsPage() {
    const { systemSettings, updateDepositAddress } = useSystemSettings();
    
    const handleSaveSettings = (section: string) => {
        alert(`${section} settings saved!`);
    };

    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6">
                <h1 className="text-2xl font-bold">通用设置</h1>
                <Card>
                    <CardHeader>
                        <CardTitle>通用设置</CardTitle>
                        <CardDescription>影响整个平台的全局配置</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        
                        {supportedAssets.map((asset) => (
                            <div className="space-y-2" key={asset}>
                                <Label htmlFor={`deposit-address-${asset}`}>在线充币地址 ({asset})</Label>
                                <Input
                                    id={`deposit-address-${asset}`}
                                    type="text"
                                    value={systemSettings.depositAddresses[asset] || ''}
                                    onChange={(e) => updateDepositAddress(asset, e.target.value)}
                                    placeholder={`请输入您的 ${asset} 钱包或账户地址`}
                                />
                            </div>
                        ))}
                    </CardContent>
                     <CardFooter>
                        <Button onClick={() => handleSaveSettings('通用')}>保存通用设置</Button>
                    </CardFooter>
                </Card>
            </div>
        </DashboardLayout>
    );
}
