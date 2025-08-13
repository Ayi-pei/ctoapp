
"use client";

import { useState, useEffect } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { User as AuthUser } from "@/context/auth-context";
import { Skeleton } from "./ui/skeleton";

type DownlineMember = Omit<AuthUser, 'downline'> & {
    level: number;
    children?: DownlineMember[];
};

type DownlineTreeProps = {
    username: string;
};

// This component is no longer recursive as we only show one level for admin.
const DownlineList = ({ members }: { members: DownlineMember[] }) => {
    if (!members || members.length === 0) {
        return <p className="text-sm text-muted-foreground p-4 text-center">无下级成员。</p>;
    }
    return (
        <ul className="space-y-2 p-2">
            {members.map(member => (
                 <li key={member.username} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-md bg-muted text-muted-foreground`}>
                        LV {member.level}
                    </span>
                    <span>{member.username}</span>
                </li>
            ))}
        </ul>
    );
};

export const DownlineTree = ({ username }: DownlineTreeProps) => {
    const [downline, setDownline] = useState<DownlineMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        try {
            const allUsers: AuthUser[] = JSON.parse(localStorage.getItem('users') || '[]');
            const userMap = new Map(allUsers.map(u => [u.username, u]));
            
            // Only the admin can have a downline now.
            const currentUser = userMap.get(username);
            let userDownline: DownlineMember[] = [];
            
            if (currentUser && currentUser.isAdmin) {
                userDownline = allUsers
                    .filter(u => u.inviter === currentUser.username)
                    .map(u => ({
                        ...u,
                        level: 1, // All users invited by admin are level 1
                        children: [],
                    }));
            }
            
            setDownline(userDownline);

        } catch (error) {
            console.error("Failed to load user downline:", error);
            setDownline([]);
        } finally {
            setIsLoading(false);
        }
    }, [username]);
    
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

    