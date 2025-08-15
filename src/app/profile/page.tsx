
"use client";

import React from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronRight, Bell, LogOut, FileText, Share2, Shield, Globe, MessageSquare, CreditCard, Check } from "lucide-react";
import { DepositDialog } from "@/components/deposit-dialog";
import { WithdrawDialog } from "@/components/withdraw-dialog";
import { useBalance } from "@/context/balance-context";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

const ProfileHeader = () => {
    const { user } = useAuth();
    const { balances } = useBalance();
    const [isDepositOpen, setIsDepositOpen] = useState(false);
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

    // Using the same logic as dashboard page for consistency
    const getUsdtValue = (assetName: string, amount: number) => {
        if (assetName === 'USDT') return amount;
        if (assetName === 'BTC') return amount * 68000; // Mock price
        if (assetName === 'ETH') return amount * 3800; // Mock price
        return 0;
    }

    const totalBalance = Object.entries(balances).reduce((acc, [name, balance]) => {
        return acc + getUsdtValue(name, balance.available);
    }, 0);

     return (
        <div className="relative bg-gradient-to-b from-blue-400 to-blue-600 p-6 text-white text-center rounded-b-3xl -mx-4 -mt-4 mb-6">
            <div className="absolute top-4 right-4">
                 <Bell className="w-6 h-6" />
            </div>
            <div className="flex flex-col items-center">
                <Avatar className="h-20 w-20 mb-3 border-2 border-white">
                    <AvatarImage src={undefined} alt={user?.username} />
                    <AvatarFallback>{user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <h2 className="font-semibold text-lg">{user?.username}</h2>
                <p className="text-sm">余额: {totalBalance.toFixed(2)} USDT</p>
                 <div className="text-sm mt-1"><div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">信誉分: 100</div></div>

                 <div className="flex gap-4 mt-4">
                    <Button onClick={() => setIsDepositOpen(true)} className="bg-white/20 hover:bg-white/30 text-white">充值</Button>
                    <Button onClick={() => setIsWithdrawOpen(true)} className="bg-white/20 hover:bg-white/30 text-white">提现</Button>
                </div>
            </div>
            <DepositDialog isOpen={isDepositOpen} onOpenChange={setIsDepositOpen} />
            <WithdrawDialog isOpen={isWithdrawOpen} onOpenChange={setIsWithdrawOpen} />
        </div>
    );
};


const ListItem = ({ icon, label, children }: { icon: React.ElementType, label: string, children?: React.ReactNode }) => {
    return (
        <div className="flex items-center justify-between p-4 bg-card rounded-lg hover:bg-muted cursor-pointer">
            <div className="flex items-center gap-4">
                {React.createElement(icon, { className: "w-6 h-6 text-primary" })}
                <span className="font-medium">{label}</span>
            </div>
            {children || <ChevronRight className="w-5 h-5 text-muted-foreground" />}
        </div>
    );
};

const languages = [
    { code: 'zh', name: '中文' },
    { code: 'en', name: 'English' },
    { code: 'ja', name: '日本語' },
    { code: 'ko', name: '한국어' },
    { code: 'ru', name: 'Русский' },
    { code: 'id', name: 'Bahasa Indonesia' },
]

const LanguageSwitcher = () => {
    const [selectedLanguage, setSelectedLanguage] = useState(languages[0]);
    const { toast } = useToast();

    const handleSelectLanguage = (language: typeof languages[0]) => {
        setSelectedLanguage(language);
        toast({
            title: "语言已切换",
            description: `语言已切换至 ${language.name}`,
        });
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                    <span>{selectedLanguage.name}</span>
                    <ChevronRight className="w-5 h-5" />
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {languages.map(lang => (
                    <DropdownMenuItem key={lang.code} onClick={() => handleSelectLanguage(lang)}>
                        <div className="flex items-center justify-between w-full">
                           <span>{lang.name}</span>
                           {selectedLanguage.code === lang.code && <Check className="w-4 h-4 text-primary" />}
                        </div>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}


export default function ProfilePage() {
    const { logout } = useAuth();
    
    const menuItems = [
        { label: "交易订单", icon: FileText, href: "/profile/orders" },
        { label: "支付方式", icon: CreditCard, href: "/profile/payment" },
        { label: "推广分享海报", icon: Share2, href: "/promotion" },
        { label: "安全设置", icon: Shield, href: "/profile/settings" },
        { label: "平台公告", icon: Bell, href: "/announcements" },
    ];

    const actionItems = [
        { label: "更换语言", icon: Globe, customComponent: <LanguageSwitcher /> },
        { label: "退出登陆", icon: LogOut, onClick: logout },
    ];


    return (
        <DashboardLayout>
            <div className="p-4 space-y-6">
                <ProfileHeader />
                
                <div className="space-y-2">
                    {menuItems.map(item => (
                        <Link href={item.href} key={item.label}>
                            <ListItem label={item.label} icon={item.icon} />
                        </Link>
                    ))}
                    {actionItems.map(item => (
                         <div key={item.label} onClick={item.onClick}>
                            <ListItem label={item.label} icon={item.icon}>
                                {item.customComponent ? item.customComponent : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                            </ListItem>
                        </div>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
}
