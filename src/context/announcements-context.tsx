
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

const ANNOUNCEMENTS_STORAGE_KEY = 'tradeflow_announcements_v2'; // Updated key

export type Announcement = {
    id: string;
    title: string;
    content: string;
    date: string;
    user_id?: string;
    is_read?: boolean;
};

export type CarouselItemData = {
    title: string;
    description: string;
    href: string;
    imgSrc: string;
};

export type HornAnnouncement = {
    id: string;
    theme: '更新公告' | '重磅通知' | '庆贺';
    content: string;
};


// Default static data if nothing is in storage
const defaultCarouselItems: CarouselItemData[] = [
    {
        title: "智能秒合约",
        description: "预测市场，秒速盈利",
        href: "/trade?tab=contract",
        imgSrc: "/images/lun.png",
    },
    {
        title: "高收益理财",
        description: "稳定增值，安心之选",
        href: "/finance",
        imgSrc: "/images/lun01.png",
    },
    {
        title: "邀请好友赚佣金",
        description: "分享链接，共享收益",
        href: "/profile/promotion",
        imgSrc: "/images/lun02.png",
    }
];

const defaultHornAnnouncements: HornAnnouncement[] = [
    { id: 'horn-1', theme: '重磅通知', content: '平台已于2024年8月5日正式上线 DOGE/USDT, ADA/USDT, 和 SHIB/USDT 交易对。' },
    { id: 'horn-2', theme: '更新公告', content: '为了提供更优质的服务，我们将在2024年8月15日凌晨2:00至4:00进行系统升级维护。' },
];


interface AnnouncementsContextType {
    // General Announcements
    announcements: Announcement[];
    platformAnnouncements: Announcement[];
    addAnnouncement: (announcement: Omit<Announcement, 'id' | 'date'>) => void;
    // Carousel
    carouselItems: CarouselItemData[];
    updateCarouselItem: (index: number, updates: Partial<CarouselItemData>) => void;
    // Horn Announcements
    hornAnnouncements: HornAnnouncement[];
    addHornAnnouncement: () => void;
    removeHornAnnouncement: (id: string) => void;
    updateHornAnnouncement: (id: string, updates: Partial<HornAnnouncement>) => void;
    reorderHornAnnouncements: (id: string, direction: 'up' | 'down') => void;
    // General Save
    saveAllAnnouncements: () => void;
}

const AnnouncementsContext = createContext<AnnouncementsContextType | undefined>(undefined);

export function AnnouncementsProvider({ children }: { children: ReactNode }) {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [carouselItems, setCarouselItems] = useState<CarouselItemData[]>(defaultCarouselItems);
    const [hornAnnouncements, setHornAnnouncements] = useState<HornAnnouncement[]>(defaultHornAnnouncements);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from localStorage
    useEffect(() => {
        try {
            const storedData = localStorage.getItem(ANNOUNCEMENTS_STORAGE_KEY);
            if (storedData) {
                const parsed = JSON.parse(storedData);
                // Update state only with what was stored, falling back to defaults if keys are missing
                setAnnouncements(parsed.announcements || []);
                // Important: Keep default images for carousel, only update text content
                setCarouselItems(prevItems => 
                    prevItems.map((item, index) => ({
                        ...item, // Keep default imgSrc
                        ...(parsed.carouselItems?.[index] || {}) // Overwrite with saved text
                    }))
                );
                setHornAnnouncements(parsed.hornAnnouncements || defaultHornAnnouncements);
            }
        } catch (error) {
            console.error("Failed to load announcements from localStorage", error);
        }
        setIsLoaded(true);
    }, []);

    // Save all announcement data to localStorage
    const saveAllAnnouncements = useCallback(() => {
        if (isLoaded) {
            try {
                const dataToStore = {
                    announcements,
                    carouselItems,
                    hornAnnouncements,
                };
                localStorage.setItem(ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(dataToStore));
            } catch (error) {
                console.error("Failed to save announcements to localStorage", error);
            }
        }
    }, [isLoaded, announcements, carouselItems, hornAnnouncements]);
    
    // --- General Announcement Methods ---
    const addAnnouncement = useCallback((announcement: Omit<Announcement, 'id' | 'date'>) => {
        const newAnnouncement: Announcement = {
            ...announcement,
            id: `anno-${Date.now()}`,
            date: new Date().toISOString(),
        };
        setAnnouncements(prev => [newAnnouncement, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }, []);

    // --- Carousel Methods ---
    const updateCarouselItem = useCallback((index: number, updates: Partial<CarouselItemData>) => {
        setCarouselItems(prev => prev.map((item, i) => i === index ? { ...item, ...updates } : item));
    }, []);

    // --- Horn Announcement Methods ---
    const addHornAnnouncement = useCallback(() => {
        if (hornAnnouncements.length >= 3) return;
        const newHorn: HornAnnouncement = {
            id: `horn-${Date.now()}`,
            theme: '更新公告',
            content: '新的公告内容...'
        };
        setHornAnnouncements(prev => [...prev, newHorn]);
    }, [hornAnnouncements.length]);

    const removeHornAnnouncement = useCallback((id: string) => {
        setHornAnnouncements(prev => prev.filter(ann => ann.id !== id));
    }, []);

    const updateHornAnnouncement = useCallback((id: string, updates: Partial<HornAnnouncement>) => {
        setHornAnnouncements(prev => prev.map(ann => ann.id === id ? { ...ann, ...updates } : ann));
    }, []);

    const reorderHornAnnouncements = useCallback((id: string, direction: 'up' | 'down') => {
        setHornAnnouncements(prev => {
            const index = prev.findIndex(ann => ann.id === id);
            if (index === -1) return prev;

            const newIndex = direction === 'up' ? index - 1 : index + 1;
            if (newIndex < 0 || newIndex >= prev.length) return prev;
            
            const newArray = [...prev];
            const [movedItem] = newArray.splice(index, 1);
            newArray.splice(newIndex, 0, movedItem);
            return newArray;
        });
    }, []);


    const value = {
        announcements,
        platformAnnouncements: announcements.filter(a => !a.user_id),
        addAnnouncement,
        carouselItems,
        updateCarouselItem,
        hornAnnouncements,
        addHornAnnouncement,
        removeHornAnnouncement,
        updateHornAnnouncement,
        reorderHornAnnouncements,
        saveAllAnnouncements,
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
