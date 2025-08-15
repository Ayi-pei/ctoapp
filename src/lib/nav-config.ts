
import { Home, LineChart, CandlestickChart, Landmark, User, Download, Users, Bell, FileText, Settings } from 'lucide-react';

export const userNavItems = [
  { href: '/dashboard', label: '首页', icon: Home },
  { href: '/market', label: '行情', icon: LineChart },
  { href: '/trade', label: '交易', icon: CandlestickChart },
  { href: '/finance', label: '理财', icon: Landmark },
  { href: '/profile', label: '我的', icon: User },
  { href: '/download', label: '下载', icon: Download },
];

export const adminNavItems = [
    { href: '/admin/users', label: '用户管理', icon: Users },
    { href: '/admin/requests', label: '审核请求', icon: Bell },
    { href: '/admin/finance', label: '资金管理', icon: Landmark },
    { href: '/admin/orders', label: '订单详情', icon: FileText },
    { href: '/admin/settings', label: '系统设置', icon: Settings },
]
