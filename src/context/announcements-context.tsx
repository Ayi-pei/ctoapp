
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

const ANNOUNCEMENTS_STORAGE_KEY = 'tradeflow_announcements';

export type Announcement = {
    id: string;
    title: string;
    content: string;
    date: string;
    user_id?: string; // Optional: for user-specific announcements
    is_read?: boolean;
};

// Initial platform announcements
export const initialPlatformAnnouncements: Announcement[] = [
    {
        id: "pa-1",
        title: "系统维护通知",
        date: "2024-08-10T10:00:00Z",
        content: "为了提供更优质的服务，我们将在2024年8月15日凌晨2:00至4:00进行系统升级维护。届时交易、充值、提现等功能将暂停使用。给您带来的不便，敬请谅解。"
    },
    {
        id: "pa-2",
        title: "新交易对上线通知",
        date: "2024-08-05T10:00:00Z",
        content: "我们高兴地宣布，平台已于2024年8月5日正式上线 DOGE/USDT, ADA/USDT, 和 SHIB/USDT 交易对。欢迎广大用户前来交易！"
    },
    {
        id: "pa-3",
        title: "关于加强账户安全的提醒",
        date: "2024-07-28T10:00:00Z",
        content: "近期网络钓鱼和诈骗活动猖獗，请广大用户务必保管好自己的账户密码和私钥，不要点击来路不明的链接，不要向任何人透露您的验证码。平台工作人员不会以任何理由向您索要密码。"
    }
];


interface AnnouncementsContextType {
    announcements: Announcement[];
    platformAnnouncements: Announcement[];
    addAnnouncement: (announcement: Omit<Announcement, 'id' | 'date'>) => void;
}

const AnnouncementsContext = createContext<AnnouncementsContextType | undefined>(undefined);

export function AnnouncementsProvider({ children }: { children: ReactNode }) {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        try {
            const storedAnnouncements = localStorage.getItem(ANNOUNCEMENTS_STORAGE_KEY);
            const allAnnouncements = [...initialPlatformAnnouncements];
            if (storedAnnouncements) {
                const userAnnouncements = JSON.parse(storedAnnouncements);
                allAnnouncements.push(...userAnnouncements);
            }
            // Sort all by date descending
            allAnnouncements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setAnnouncements(allAnnouncements);
        } catch (error) {
            console.error("Failed to load announcements:", error);
            setAnnouncements(initialPlatformAnnouncements);
        }
        setIsLoaded(true);
    }, []);

    useEffect(() => {
        if (isLoaded) {
            try {
                // Only store user-specific announcements in localStorage
                const userAnnouncements = announcements.filter(a => a.user_id);
                localStorage.setItem(ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(userAnnouncements));
            } catch (error) {
                console.error("Failed to save announcements:", error);
            }
        }
    }, [announcements, isLoaded]);

    const addAnnouncement = useCallback((announcement: Omit<Announcement, 'id' | 'date'>) => {
        const newAnnouncement: Announcement = {
            ...announcement,
            id: `anno-${Date.now()}`,
            date: new Date().toISOString(),
        };
        setAnnouncements(prev => [newAnnouncement, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }, []);

    const value = {
        announcements,
        platformAnnouncements: announcements.filter(a => !a.user_id),
        addAnnouncement,
    };

    return (
        <AnnouncementsContext.Provider value={value}>
            {children}
        </AnnouncementsContext.Provider>
    );
}

export function useAnnouncements() {
    const context = useContext(AnnouncementsContext);
    if (context === undefined) {
        throw new Error('useAnnouncements must be used within an AnnouncementsProvider');
    }
    return context;
}
