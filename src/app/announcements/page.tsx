
"use client";

import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";


export const announcements = [
    {
        id: 1,
        title: "系统维护通知",
        date: "2024-08-10",
        content: "为了提供更优质的服务，我们将在2024年8月15日凌晨2:00至4:00进行系统升级维护。届时交易、充值、提现等功能将暂停使用。给您带来的不便，敬请谅解。"
    },
    {
        id: 2,
        title: "新交易对上线通知",
        date: "2024-08-05",
        content: "我们高兴地宣布，平台已于2024年8月5日正式上线 DOGE/USDT, ADA/USDT, 和 SHIB/USDT 交易对。欢迎广大用户前来交易！"
    },
    {
        id: 3,
        title: "关于加强账户安全的提醒",
        date: "2024-07-28",
        content: "近期网络钓鱼和诈骗活动猖獗，请广大用户务必保管好自己的账户密码和私钥，不要点击来路不明的链接，不要向任何人透露您的验证码。平台工作人员不会以任何理由向您索要密码。"
    }
]

export default function AnnouncementsPage() {
    const router = useRouter();

    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <h1 className="text-2xl font-bold">平台公告</h1>
                </div>

                <div className="space-y-4">
                    {announcements.map(announcement => (
                        <Card key={announcement.id}>
                            <CardHeader>
                                <CardTitle>{announcement.title}</CardTitle>
                                <CardDescription>{announcement.date}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">{announcement.content}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
}
