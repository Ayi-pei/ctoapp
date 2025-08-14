
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
import { User, Menu, LogOut, Home } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMarket } from "@/context/market-data-context";
import { useAuth } from "@/context/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from '@/lib/utils';

// Simple SVG Logo component
const Logo = () => (
    <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{stopColor: 'hsl(var(--primary))', stopOpacity:1}} />
            <stop offset="100%" style={{stopColor: 'hsl(var(--accent))', stopOpacity:1}} />
            </linearGradient>
        </defs>
        <path d="M50 0C22.38 0 0 22.38 0 50C0 77.62 22.38 100 50 100C77.62 100 100 77.62 100 50C100 22.38 77.62 0 50 0ZM72.5 65.5C70.36 65.5 68.5 67.36 68.5 69.5C68.5 71.64 70.36 73.5 72.5 73.5C74.64 73.5 76.5 71.64 76.5 69.5C76.5 67.36 74.64 65.5 72.5 65.5ZM50 24C41.16 24 34 31.16 34 40C34 48.84 41.16 56 50 56C58.84 56 66 48.84 66 40C66 31.16 58.84 24 50 24Z" fill="url(#grad1)"/>
    </svg>
)


export function TradeHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { tradingPair, availablePairs, changeTradingPair } = useMarket();
  const { logout, user } = useAuth();

  const isTradePage = pathname === '/trade';
  const showLogo = ['/dashboard', '/market', '/finance', '/promotion', '/download'].includes(pathname);
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
    <header className="flex items-center justify-between p-4 border-b border-border flex-shrink-0 h-16">
      <div className="flex items-center gap-3 w-1/3">
         {showLogo ? <Logo /> : <div className="md:hidden w-6 h-6" />}
      </div>
      
      <div className="flex-grow flex justify-center w-1/3">
         {isTradePage && (
            <div className="w-[150px]">
                <Select value={tradingPair} onValueChange={changeTradingPair}>
                    <SelectTrigger className="w-full">
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
         {showTitle && <h1 className="text-lg font-semibold">{getTitle()}</h1>}
      </div>

      <div className="flex items-center justify-end gap-4 w-1/3">
        <Home className="h-6 w-6 text-foreground cursor-pointer" onClick={handleHomeClick} />
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar>
                        <AvatarImage src={undefined} alt={user?.username} />
                        <AvatarFallback>
                            {user?.username ? user.username.charAt(0).toUpperCase() : <User />}
                        </AvatarFallback>
                    </Avatar>
                    <span className="sr-only">Profile</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>我的账户 ({user?.username})</DropdownMenuLabel>
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
