
"use client";
import { useEffect } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Gift, Package, Users, ClipboardList, Megaphone, ShieldCheck, BarChart, Settings } from "lucide-react";

type FeatureCardProps = {
    title: string;
    icon: React.ElementType;
    href: string;
};

const FeatureCard = ({ title, icon: Icon, href }: FeatureCardProps) => (
    <Link href={href} passHref>
        <Card className="hover:bg-muted/50 hover:border-primary/50 transition-all cursor-pointer h-full flex flex-col justify-center items-center">
            <CardContent className="p-6 flex flex-col items-center gap-4 text-center">
                <div className="bg-primary/10 p-4 rounded-full">
                    <Icon className="h-8 w-8 text-primary" />
                </div>
                <p className="font-semibold text-foreground">{title}</p>
            </CardContent>
        </Card>
    </Link>
);

export default function AdminOperationsPage() {
    const { isAdmin } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isAdmin === false) {
            router.push('/login');
        }
    }, [isAdmin, router]);
    
    if (!isAdmin) {
        return (
             <DashboardLayout>
                <div className="p-8 text-center">
                    <p>您需要以管理员身份登录才能访问此页面。</p>
                </div>
            </DashboardLayout>
        )
    }

    const features: FeatureCardProps[] = [
        { title: "活动福利", icon: Gift, href: "/admin/settings" },
        { title: "理财产品", icon: Package, href: "/admin/settings" },
        { title: "代理团队", icon: Users, href: "/admin/users" },
        { title: "日常任务", icon: ClipboardList, href: "/coming-soon" },
        { title: "推广 & 更新", icon: Megaphone, href: "/coming-soon" },
        { title: "安全审计", icon: ShieldCheck, href: "/coming-soon" },
        { title: "数据报表", icon: BarChart, href: "/coming-soon" },
        { title: "玩法配置", icon: Settings, href: "/admin/settings" },
    ];

    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6">
                 <h1 className="text-2xl font-bold">运营相关</h1>
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {features.map((feature) => (
                        <FeatureCard 
                            key={feature.title}
                            title={feature.title}
                            icon={feature.icon}
                            href={feature.href}
                        />
                    ))}
                 </div>
            </div>
        </DashboardLayout>
    );
}
