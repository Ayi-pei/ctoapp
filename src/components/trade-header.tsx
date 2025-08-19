
"use client";
import Link from 'next/link';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button";
import { User, LogOut, Home, CandlestickChart } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMarket } from "@/context/market-data-context";
import { useAuth } from "@/context/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useState, useEffect } from 'react';
import Image from 'next/image';


// Simple SVG Logo component
const Logo = () => (
    <div className="flex items-center gap-2">
       <CandlestickChart className="h-8 w-8 text-primary" />
       <h1 className="text-xl font-bold text-foreground hidden md:block">TradeFlow</h1>
    </div>
)


export function TradeHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { tradingPair, availablePairs, changeTradingPair } = useMarket();
  const { logout, user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    if (user) {
        setAvatarUrl(user.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${user.id}`);
    }
  }, [user]);

  const isTradePage = pathname === '/trade';
  const showLogo = ['/dashboard', '/market', '/finance', '/promotion', '/download', '/staking', '/announcements', '/coming-soon'].some(p => pathname.startsWith(p));
  const showTitle = !isTradePage && !showLogo;
  
  const getTitle = () => {
    if (pathname.startsWith('/profile')) return '我的';
    if (pathname.startsWith('/admin')) return '管理后台';
    return '';
  }

  const handleHomeClick = () => {
      router.push('/dashboard');
  }

  return (
    <header className="flex items-center justify-between p-4 flex-shrink-0 h-16 bg-gradient-to-r from-gray-200 via-gray-400 to-blue-500 shadow-lg">
      <div className="flex items-center gap-3 basis-1/3 justify-start">
         {showLogo && <Link href="/dashboard"><Logo /></Link>}
         {showTitle && <div className="md:hidden w-6 h-6" />}
      </div>
      
      <div className="flex-grow flex justify-center basis-1/3">
         {isTradePage && (
            <div className="w-[150px]">
                <Select value={tradingPair} onValueChange={changeTradingPair}>
                    <SelectTrigger className="w-full bg-black/20 border-white/30 text-white placeholder:text-gray-300 rounded-md">
                    <SelectValue placeholder="Select Pair" />
                    </SelectTrigger>
                    <SelectContent>
                    {availablePairs.map((pair) => (
                        <SelectItem key={pair} value={pair}>
                        {pair}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
            </div>
         )}
         {showTitle && <h1 className="text-lg font-semibold text-white border border-blue-300/80 rounded-lg px-4 py-1">{getTitle()}</h1>}
      </div>

      <div className="flex items-center justify-end gap-4 basis-1/3">
        <Home className="h-6 w-6 cursor-pointer text-white" onClick={handleHomeClick} />
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-black/10 focus-visible:ring-ring [&_svg]:size-8">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={avatarUrl} alt={user?.username} />
                        <AvatarFallback className="bg-transparent text-white">
                           <User />
                        </AvatarFallback>
                    </Avatar>
                    <span className="sr-only">Profile</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>我的账户 ({user?.nickname || user?.username})</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href="/profile" passHref>
                    <DropdownMenuItem>
                        个人资料
                    </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>退出登录</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
