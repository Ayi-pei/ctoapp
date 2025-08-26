
"use client";

import { useState, useEffect }from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChevronLeft, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useAnnouncements } from "@/context/announcements-context";


export default function AnnouncementsPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { announcements, platformAnnouncements } = useAnnouncements();
    const [userAnnouncements, setUserAnnouncements] = useState<any[]>([]);

    useEffect(() => {
        if (user) {
            const filtered = announcements.filter(a => a.user_id === user.id);
            setUserAnnouncements(filtered);
        }
    }, [announcements, user]);


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
                    {userAnnouncements.map(announcement => (
                        <Card key={announcement.id} className="border-primary/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5 text-primary" />
                                    <span>{announcement.title}</span>
                                </CardTitle>
                                <CardDescription>{new Date(announcement.date).toLocaleString()}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">{announcement.content}</p>
                            </CardContent>
                        </Card>
                    ))}
                    {platformAnnouncements.map(announcement => (
                        <Card key={announcement.id}>
                            <CardHeader>
                                <CardTitle>{announcement.title}</CardTitle>
                                <CardDescription>{new Date(announcement.date).toLocaleString()}</CardDescription>
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
