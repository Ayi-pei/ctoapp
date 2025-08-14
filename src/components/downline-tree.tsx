
"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "./ui/skeleton";
import { supabase } from "@/lib/supabase";
import { Badge } from "./ui/badge";
import type { DownlineMember } from "@/types";


const DownlineList = ({ members }: { members: DownlineMember[] }) => {
    if (!members || members.length === 0) {
        return <p className="text-sm text-muted-foreground p-4 text-center">无下级成员。</p>;
    }
    return (
        <ul className="space-y-2 p-2">
            {members.map(member => (
                 <li key={member.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                    <Badge variant="outline">LV {member.level}</Badge>
                    <span>{member.username}</span>
                </li>
            ))}
        </ul>
    );
};

export const DownlineTree = ({ userId }: DownlineTreeProps) => {
    const [downline, setDownline] = useState<DownlineMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDownline = async () => {
            if (!userId) return;
            setIsLoading(true);
            try {
                // Call the RPC function to get the multi-level downline
                const { data, error } = await supabase
                    .rpc('get_user_downline', { p_user_id: userId });
                
                if (error) throw error;
                
                setDownline(data as DownlineMember[]);

            } catch (error) {
                console.error("Failed to load user downline:", error);
                setDownline([]);
            } finally {
                setIsLoading(false);
            }
        }
        fetchDownline();
    }, [userId]);
    
    if (isLoading) {
        return (
            <div className="space-y-2 p-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
            </div>
        )
    }

    return <DownlineList members={downline} />;
};
