
"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronRight, Bell, LogOut, FileText, Shield, Landmark, Users } from "lucide-react";
import { DepositDialog } from "@/components/deposit-dialog";
import { WithdrawDialog } from "@/components/withdraw-dialog";
import { useBalance } from "@/context/balance-context";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";


const ProfileHeader = () => {
    const { user, updateUser } = useAuth();
    const { balances } = useBalance();
    const { toast } = useToast();
    const [isDepositOpen, setIsDepositOpen] = useState(false);
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
    const [isEditingNickname, setIsEditingNickname] = useState(false);
    const [nickname, setNickname] = useState(user?.nickname || user?.username || "");
    const [avatarUrl, setAvatarUrl] = useState('');

    useEffect(() => {
        if (user) {
            setNickname(user.nickname || user.username);
            setAvatarUrl(`https://api.dicebear.com/8.x/initials/svg?seed=${user.id}`);
        }
    }, [user]);

    const getUsdtValue = (assetName: string, amount: number) => {
        if (assetName === 'USDT') return amount;
        if (assetName === 'BTC') return amount * 68000;
        if (assetName === 'ETH') return amount * 3800;
        return 0;
    }

    const totalBalance = Object.entries(balances).reduce((acc, [name, balance]) => {
        return acc + getUsdtValue(name, balance.available);
    }, 0);

    const handleNicknameBlur = async () => {
        setIsEditingNickname(false);
        if (user && nickname !== (user.nickname || user.username)) {
            const success = await updateUser(user.id, { nickname });
            if (success) {
                toast({ title: "成功", description: "昵称已更新。" });
            } else {
                toast({ variant: 'destructive', title: "失败", description: "无法更新您的昵称。" });
                setNickname(user.nickname || user.username);
            }
        }
    };
    
     const handleNicknameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
    };

    return (
        <div className="relative text-white w-full">
            <div className="flex items-center gap-4">
                {/* Left Column: Avatar */}
                <Avatar className="h-20 w-20 border-4 border-primary/50">
                    <AvatarImage src={avatarUrl} alt={user?.username} />
                    <AvatarFallback>
                        <Users className="h-10 w-10" />
                    </AvatarFallback>
                </Avatar>
                
                {/* Middle Column: User Info */}
                <div className="flex-grow space-y-1 text-left">
                    <div className="flex items-center gap-2">
                        {isEditingNickname ? (
                            <input
                                type="text"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                onBlur={handleNicknameBlur}
                                onKeyDown={handleNicknameKeyDown}
                                className="font-semibold text-xl bg-transparent text-white border-b-2 border-white/50 focus:outline-none focus:ring-0 h-auto p-1 max-w-[150px]"
                                autoFocus
                            />
                        ) : (
                            <h2 
                                className="font-semibold text-xl cursor-pointer"
                                onClick={() => setIsEditingNickname(true)}
                            >
                                {nickname}
                            </h2>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">ID: {user?.id}</p>
                    <p className="text-xs text-muted-foreground">总资产估值: {totalBalance.toFixed(2)} USDT</p>
                    <Badge variant="outline" className="border-green-500/50 bg-green-500/20 text-green-300 text-xs">信誉分: {user?.credit_score || 100}</Badge>
                </div>

                {/* Right Column: Actions */}
                <div className="flex flex-col gap-2">
                    <Button onClick={() => setIsDepositOpen(true)} className="bg-primary/80 hover:bg-primary text-primary-foreground h-9 text-sm">充值</Button>
                    <Button onClick={() => setIsWithdrawOpen(true)} className="bg-secondary/80 hover:bg-secondary h-9 text-sm">提现</Button>
                </div>
            </div>
            <DepositDialog isOpen={isDepositOpen} onOpenChange={setIsDepositOpen} />
            <WithdrawDialog isOpen={isWithdrawOpen} onOpenChange={setIsWithdrawOpen} />
        </div>
    );
};


const ListItem = ({ icon, label, href }: { icon: React.ElementType, label: string, href: string }) => {
    return (
        <Link href={href} passHref>
            <div className="flex items-center justify-between p-4 bg-card/50 rounded-lg hover:bg-muted/50 cursor-pointer border border-border/50">
                <div className="flex items-center gap-4">
                    {React.createElement(icon, { className: "[&_svg]:size-6 text-primary" })}
                    <span className="font-medium text-card-foreground">{label}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
        </Link>
    );
};


const ActionItem = ({ icon, label, onClick }: { icon: React.ElementType, label: string, onClick?: () => void }) => {
    return (
        <div onClick={onClick} className="flex items-center p-4 bg-card/50 rounded-lg hover:bg-muted/50 cursor-pointer border border-border/50">
            <div className="flex items-center gap-4 text-destructive">
                 {React.createElement(icon, { className: "[&_svg]:size-6" })}
                 <span className="font-medium">{label}</span>
            </div>
        </div>
    );
};


export default function ProfilePage() {
    const { logout } = useAuth();
    
    const menuItems = [
        { label: "交易订单", icon: FileText, href: "/profile/orders" },
        { label: "资产明细", icon: Landmark, href: "/profile/assets"},
        { label: "代理团队", icon: Users, href: "/profile/promotion" },
        { label: "安全设置", icon: Shield, href: "/profile/settings" },
        { label: "平台公告", icon: Bell, href: "/announcements" },
    ];


    return (
        <DashboardLayout>
            <div className="h-full w-full profile-background">
                <div className="p-4 space-y-8">
                    <ProfileHeader />
                    
                    <Card className="bg-card/50 border-border/30">
                        <CardContent className="p-2 space-y-2">
                             {menuItems.map(item => (
                                <ListItem key={item.label} label={item.label} icon={item.icon} href={item.href} />
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border/30">
                        <CardContent className="p-2">
                            <ActionItem label="退出登陆" icon={LogOut} onClick={logout} />
                        </CardContent>
                    </Card>

                </div>
            </div>
        </DashboardLayout>
    );
}
