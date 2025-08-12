
"use client";

import React from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronRight, Bell, LogOut, FileText, Share2, Shield, Globe, MessageSquare, CreditCard } from "lucide-react";
import { DepositDialog } from "@/components/deposit-dialog";
import { WithdrawDialog } from "@/components/withdraw-dialog";
import { useBalance } from "@/context/balance-context";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useState } from "react";

const ProfileHeader = () => {
    const { user } = useAuth();
    const { balances } = useBalance();
    const [isDepositOpen, setIsDepositOpen] = useState(false);
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

    const totalBalance = Object.values(balances).reduce((acc, b) => acc + b.available, 0);

     return (
        <div className="relative bg-gradient-to-b from-blue-400 to-blue-600 p-6 text-white text-center rounded-b-3xl -mx-4 -mt-4 mb-6">
            <div className="absolute top-4 right-4">
                 <Bell className="w-6 h-6" />
            </div>
            <div className="flex flex-col items-center">
                <Avatar className="h-20 w-20 mb-3 border-2 border-white">
                    <AvatarImage src={user?.avatar} alt={user?.username} />
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


const ListItem = ({ icon, label, href, onClick }: { icon: React.ElementType, label: string, href?: string, onClick?: () => void }) => {
    const content = (
         <div className="flex items-center justify-between p-4 bg-card rounded-lg hover:bg-muted cursor-pointer">
            <div className="flex items-center gap-4">
                {React.createElement(icon, { className: "w-6 h-6 text-primary" })}
                <span className="font-medium">{label}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
    );

    if (href) {
        return <Link href={href}>{content}</Link>;
    }
    return <div onClick={onClick}>{content}</div>;
};

export default function ProfilePage() {
    const { logout } = useAuth();
    
    const menuItems = [
        { label: "交易订单", icon: FileText, href: "/profile/orders" },
        { label: "支付方式", icon: CreditCard, href: "/coming-soon" },
        { label: "推广分享海报", icon: Share2, href: "/promotion" },
        { label: "安全设置", icon: Shield, href: "/profile/settings" },
        { label: "更换语言", icon: Globe, href: "/coming-soon" },
        { label: "用户消息", icon: MessageSquare, href: "/coming-soon" },
        { label: "平台公告", icon: Bell, href: "/coming-soon" },
    ]

    return (
        <DashboardLayout>
            <div className="p-4 space-y-6">
                <ProfileHeader />
                
                <div className="space-y-2">
                    {menuItems.map(item => (
                        <ListItem key={item.label} {...item} />
                    ))}
                    <ListItem icon={LogOut} label="退出登陆" onClick={logout} />
                </div>
            </div>
        </DashboardLayout>
    );
}
