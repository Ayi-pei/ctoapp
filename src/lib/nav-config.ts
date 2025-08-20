import { Home, LineChart, CandlestickChart, Landmark, User, Download, Users, Bell, FileText, Settings, Gem, SlidersHorizontal, ListChecks, Coins, Gift, Package, BarChart2, PartyPopper, Megaphone } from 'lucide-react';
import type { NavItem } from '@/types';

export const userNavItems: NavItem[] = [
  { href: '/dashboard', label: '首页', icon: Home },
  { href: '/trade', label: '交易', icon: CandlestickChart },
  { href: '/staking', label: '矿投', icon: Gem },
  { href: '/finance', label: '理财', icon: Landmark },
  { href: '/profile', label: '我的', icon: User },
];

export const adminNavItems: NavItem[] = [
    { href: '/admin/users', label: '用户管理', icon: Users },
    { href: '/admin/requests', label: '审核请求', icon: Bell },
    { 
        href: '/admin/finance', 
        label: '运营相关', 
        icon: Landmark,
        subItems: [
            { href: '/admin/finance/dashboard', label: '数据报表', icon: BarChart2 },
            { href: '/admin/finance/tasks', label: '日常任务', icon: ListChecks },
            { href: '/admin/finance/announcements', label: '公告发布', icon: Megaphone },
            { href: '/admin/finance/activities', label: '限时活动', icon: PartyPopper },
        ]
    },
    { href: '/admin/orders', label: '订单详情', icon: FileText },
    { 
        href: '/admin/settings', 
        label: '系统设置', 
        icon: Settings,
        subItems: [
            { href: '/admin/settings/general', label: '通用设置', icon: SlidersHorizontal },
            { href: '/admin/settings/market', label: '市场设置', icon: LineChart },
            { href: '/admin/settings/investment', label: '理财产品', icon: Package },
        ]
    },
]
