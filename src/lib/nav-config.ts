import { Home, LineChart, CandlestickChart, Landmark, User, Download, Users, Bell, FileText, Settings, Gem, SlidersHorizontal, ListChecks, Coins, Gift, Package } from 'lucide-react';

export const userNavItems = [
  { href: '/dashboard', label: '首页', icon: Home },
  { href: '/trade', label: '交易', icon: CandlestickChart },
  { href: '/staking', label: '矿投', icon: Gem },
  { href: '/finance', label: '理财', icon: Landmark },
  { href: '/profile', label: '我的', icon: User },
];

export const adminNavItems = [
    { href: '/admin/users', label: '用户管理', icon: Users },
    { href: '/admin/requests', label: '审核请求', icon: Bell },
    { 
        href: '/admin/finance', 
        label: '运营相关', 
        icon: Landmark,
        subItems: [
            { href: '/admin/settings', label: '活动福利', icon: Gift },
            { href: '/admin/settings/investment', label: '理财产品', icon: Package },
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
            { href: '/admin/settings/investment', label: '理财产品', icon: Coins },
            { href: '/admin/settings/presets', label: '定时预设', icon: ListChecks },
        ]
    },
]
