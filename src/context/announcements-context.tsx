"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { supabase, isSupabaseEnabled } from "@/lib/supabaseClient";
import { useAuthenticatedSupabase } from "@/context/enhanced-supabase-context";

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
  theme: "更新公告" | "重磅通知" | "庆贺";
  content: string;
  priority: number;
  expires_at?: string;
};

// Default static data for carousel images. Text content will come from DB.
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
  },
];

interface AnnouncementsContextType {
  announcements: Announcement[];
  platformAnnouncements: Announcement[];
  addAnnouncement: (
    announcement: Omit<Announcement, "id" | "date" | "is_read">
  ) => Promise<void>;
  carouselItems: CarouselItemData[];
  updateCarouselItem: (
    index: number,
    updates: Partial<CarouselItemData>
  ) => Promise<void>;
  hornAnnouncements: HornAnnouncement[];
  addHornAnnouncement: () => Promise<void>;
  removeHornAnnouncement: (id: string) => Promise<void>;
  updateHornAnnouncement: (
    id: string,
    updates: Partial<HornAnnouncement>
  ) => Promise<void>;
  reorderHornAnnouncements: (
    id: string,
    direction: "up" | "down"
  ) => Promise<void>;
}

const AnnouncementsContext = createContext<
  AnnouncementsContextType | undefined
>(undefined);

export function AnnouncementsProvider({ children }: { children: ReactNode }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [carouselItems, setCarouselItems] =
    useState<CarouselItemData[]>(defaultCarouselItems);
  const [hornAnnouncements, setHornAnnouncements] = useState<
    HornAnnouncement[]
  >([]);

  const authSb = useAuthenticatedSupabase();

  const fetchAnnouncements = useCallback(async () => {
    /**/
    if (!isSupabaseEnabled) return;
    const { data, error } = (await (authSb?.withContext
      ? authSb.withContext((sb) => sb.from("announcements").select("*"))
      : supabase.from("announcements").select("*"))) as any;
    if (error) {
      console.error(
        "Error fetching announcements:",
        (error as any)?.message || error
      );
    } else {
      type DbAnnouncement = {
        id: string;
        type: "personal_message" | "horn" | "carousel";
        content?: any;
        title?: string;
        user_id?: string | null;
        theme?: string | null;
        priority?: number | null;
        expires_at?: string | null;
        created_at: string;
      };
      const allAnns = data as DbAnnouncement[];

      // Map personal messages to Announcement shape
      const personalMessages: Announcement[] = allAnns
        .filter((a) => a.type === "personal_message")
        .map((a) => ({
          id: String(a.id),
          title: a.title ?? "通知",
          content:
            typeof a.content === "string"
              ? a.content
              : JSON.stringify(a.content ?? ""),
          date: a.created_at,
          user_id: a.user_id ?? undefined,
          is_read: false,
        }));
      setAnnouncements(personalMessages);

      // Carousel content mapping
      const dbCarousel = allAnns.find((a) => a.type === "carousel");
      if (dbCarousel && dbCarousel.content) {
        setCarouselItems((prevItems) =>
          prevItems.map((item, index) => ({
            ...item,
            ...(dbCarousel.content[index] || {}),
          }))
        );
      }

      // Map horn announcements
      const horns: HornAnnouncement[] = allAnns
        .filter((a) => a.type === "horn")
        .map((a) => ({
          id: String(a.id),
          theme: (a.theme as HornAnnouncement["theme"]) ?? "更新公告",
          content:
            typeof a.content === "string" ? a.content : String(a.content ?? ""),
          priority: a.priority ?? 0,
          expires_at: a.expires_at ?? undefined,
        }));
      setHornAnnouncements(horns);
    }
  }, [authSb]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const addAnnouncement = async (
    announcement: Omit<Announcement, "id" | "date" | "is_read">
  ) => {
    if (!isSupabaseEnabled) return;
    const { error } = await supabase.from("announcements").insert({
      ...announcement,
      type: "personal_message",
    });
    if (error) console.error("Error adding announcement:", error);
    else await fetchAnnouncements();
  };

  const updateCarouselItem = async (
    index: number,
    updates: Partial<CarouselItemData>
  ) => {
    const newCarouselState = [...carouselItems];
    newCarouselState[index] = { ...newCarouselState[index], ...updates };
    setCarouselItems(newCarouselState);

    const contentToSave = newCarouselState.map(
      ({ title, description, href }) => ({ title, description, href })
    );

    const { error } = await supabase.from("announcements").upsert(
      {
        type: "carousel",
        content: contentToSave,
      },
      { onConflict: "type" }
    );

    if (error) console.error("Error updating carousel:", error);
  };

  const addHornAnnouncement = async () => {
    if (hornAnnouncements.length >= 3 || !isSupabaseEnabled) return;
    const newHorn: Partial<HornAnnouncement> = {
      theme: "更新公告",
      content: "新的公告内容...",
      priority: 0,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const { error } = await supabase
      .from("announcements")
      .insert({ ...newHorn, type: "horn" });
    if (error) console.error("Error adding horn announcement:", error);
    else await fetchAnnouncements();
  };

  const removeHornAnnouncement = async (id: string) => {
    if (!isSupabaseEnabled) return;
    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id);
    if (error) console.error("Error removing horn announcement:", error);
    else await fetchAnnouncements();
  };

  const updateHornAnnouncement = async (
    id: string,
    updates: Partial<HornAnnouncement>
  ) => {
    if (!isSupabaseEnabled) return;
    const { error } = await supabase
      .from("announcements")
      .update(updates)
      .eq("id", id);
    if (error) console.error("Error updating horn announcement:", error);
    else await fetchAnnouncements();
  };

  const reorderHornAnnouncements = async (
    id: string,
    direction: "up" | "down"
  ) => {
    const sortedAnnouncements = [...hornAnnouncements].sort(
      (a, b) => b.priority - a.priority
    );
    const index = sortedAnnouncements.findIndex((ann) => ann.id === id);
    if (index === -1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sortedAnnouncements.length) return;

    // Swap priorities
    const currentPriority = sortedAnnouncements[index].priority;
    const otherPriority = sortedAnnouncements[newIndex].priority;

    if (!isSupabaseEnabled) return;
    const { error: error1 } = await supabase
      .from("announcements")
      .update({ priority: otherPriority })
      .eq("id", sortedAnnouncements[index].id);
    const { error: error2 } = await supabase
      .from("announcements")
      .update({ priority: currentPriority })
      .eq("id", sortedAnnouncements[newIndex].id);

    if (error1 || error2) {
      console.error("Error reordering announcements", error1, error2);
    } else {
      await fetchAnnouncements();
    }
  };

  const value = {
    announcements,
    platformAnnouncements: announcements.filter((a) => !a.user_id),
    addAnnouncement,
    carouselItems,
    updateCarouselItem,
    hornAnnouncements: hornAnnouncements.sort(
      (a, b) => a.priority - b.priority
    ),
    addHornAnnouncement,
    removeHornAnnouncement,
    updateHornAnnouncement,
    reorderHornAnnouncements,
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
    throw new Error(
      "useAnnouncements must be used within an AnnouncementsProvider"
    );
  }
  return context;
}
