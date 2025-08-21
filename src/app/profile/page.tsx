
"use client";

import React, { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronRight, Bell, LogOut, FileText, Shield, Landmark, Users, Edit2, ShieldCheck, Crown } from "lucide-react";
import { DepositDialog } from "@/components/deposit-dialog";
import { WithdrawDialog } from "@/components/withdraw-dialog";
import { useBalance } from "@/context/balance-context";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";


const ProfileHeader = () => {
    const { user, updateUser } = useAuth();
    const { balances } = useBalance();
    const { toast } = useToast();
    const [isDepositOpen, setIsDepositOpen] = useState(false);
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
    const [isEditingNickname, setIsEditingNickname] = useState(false);
    const [nickname, setNickname] = useState(user?.nickname || "");
    const avatarInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setNickname(user?.nickname || "");
    }, [user?.nickname]);

    const getUsdtValue = (assetName: string, amount: number) => {
        if (assetName === 'USDT') return amount;
        if (assetName === 'BTC') return amount * 68000;
        if (assetName === 'ETH') return amount * 3800;
        return 0;
    }

    const totalBalance = Object.entries(balances).reduce((acc, [name, balance]) => {
        return acc + getUsdtValue(name, balance.available);
    }, 0);
    
    const handleNicknameBlur = () => {
        if (user && nickname.trim() && nickname !== user.nickname) {
            updateUser(user.id, { nickname: nickname });
            toast({ title: "成功", description: "昵称已更新。" });
        }
        setIsEditingNickname(false);
    }
    
    const handleNicknameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleNicknameBlur();
        }
    }

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && user) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const newAvatarUrl = reader.result as string;
                updateUser(user.id, { avatar_url: newAvatarUrl });
                 toast({ title: "成功", description: "头像已更新。" });
            };
            reader.readAsDataURL(file);
        }
    };

    const truncatedNickname = nickname.length > 4 ? `${nickname.substring(0, 4)}...` : nickname;

    return (
         <div className="bg-card/80 backdrop-blur-sm p-4 rounded-xl shadow-md border border-white/20">
            <div className="w-full flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                        <Avatar className="h-16 w-16 border-4 border-primary/50">
                            <AvatarImage src={user?.avatar_url} alt={user?.username} />
                            <AvatarFallback>
                                <Users className="h-8 w-8" />
                            </AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                            <span className="text-xs text-white">更换</span>
                        </div>
                        <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarUpload}
                        />
                    </div>
                    
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                             {isEditingNickname ? (
                                 <input 
                                    type="text"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    onBlur={handleNicknameBlur}
                                    onKeyDown={handleNicknameKeyDown}
                                    autoFocus
                                    className="bg-transparent border-b border-primary text-xl font-semibold text-foreground focus:outline-none"
                                 />
                            ) : (
                                <div className="flex items-center gap-2">
                                     <h2 className="font-semibold text-xl cursor-pointer text-foreground" onClick={() => setIsEditingNickname(true)}>{truncatedNickname}</h2>
                                     <Edit2 className="w-4 h-4 text-muted-foreground cursor-pointer" onClick={() => setIsEditingNickname(true)} />
                                </div>
                            )}
                            {user?.is_admin && <Badge variant="destructive" className="text-xs"><Crown className="w-3 h-3 mr-1"/>Admin</Badge>}
                        </div>
                       
                        <p className="text-sm font-semibold text-foreground/90">总资产估值: {totalBalance.toFixed(2)} USDT</p>
                        <Badge variant="outline" className="border-green-500/50 bg-green-500/20 text-green-300 text-xs">信誉分: {user?.credit_score || 100}</Badge>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <Button 
                        onClick={() => setIsDepositOpen(true)} 
                        className="bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-black font-bold h-10 px-6 text-sm rounded-md shadow-lg"
                    >
                        充值
                    </Button>
                    <Button 
                        onClick={() => setIsWithdrawOpen(true)} 
                        className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold h-10 px-6 text-sm rounded-md shadow-lg"
                    >
                        提现
                    </Button>
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
            <div className="flex items-center justify-between p-4 bg-card/80 rounded-lg hover:bg-muted/80 cursor-pointer border border-border/50">
                <div className="flex items-center gap-4">
                    {React.createElement(icon, { className: "w-5 h-5 text-primary" })}
                    <span className="font-medium text-card-foreground">{label}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
        </Link>
    );
};


const ActionItem = ({ icon, label, action }: { icon: React.ElementType, label: string, action?: () => void }) => {
    return (
        <div onClick={action} className="flex items-center justify-center p-4 bg-card/80 rounded-lg hover:bg-muted/80 cursor-pointer border border-border/50">
            <div className="flex items-center gap-2 text-destructive">
                 {React.createElement(icon, { className: "w-5 h-5" })}
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
                <div className="p-4 space-y-8 h-full">
                    <ProfileHeader />
                    
                    <div className="space-y-2">
                        {menuItems.map(item => (
                            <ListItem key={item.label} label={item.label} icon={item.icon} href={item.href} />
                        ))}
                    </div>

                    <div>
                        <ActionItem label="退出登陆" icon={LogOut} action={logout} />
                    </div>

                </div>
            </div>
        </DashboardLayout>
    );
}
