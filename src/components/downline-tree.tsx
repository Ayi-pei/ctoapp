
"use client";

import { useState, useEffect } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { User as AuthUser } from "@/context/auth-context";

type DownlineMember = AuthUser & {
    level: number;
    children?: DownlineMember[];
};

type DownlineTreeProps = {
    username: string;
};

const DownlineRecursive = ({ members }: { members: DownlineMember[] }) => {
    if (!members || members.length === 0) {
        return <p className="text-sm text-muted-foreground p-4 text-center">无下级成员。</p>;
    }
    return (
        <Accordion type="multiple" className="w-full">
            {members.map(member => (
                <AccordionItem value={member.username} key={member.username} className="border-b-0">
                    <AccordionTrigger className="py-2 hover:no-underline [&[data-state=open]>svg]:-rotate-90">
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold px-2 py-1 rounded-md bg-muted text-muted-foreground`}>
                                LV {member.level}
                            </span>
                            <span>{member.username}</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-6 border-l border-dashed ml-[7px]">
                        <DownlineRecursive members={member.children || []} />
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
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
            
            const getDownlineRecursive = (currentUsername: string, level: number): DownlineMember[] => {
                if (level > 3) return [];
                
                const upline = userMap.get(currentUsername);
                if (!upline || !upline.downline) return [];
                
                return upline.downline.map(downlineName => {
                    const downlineUser = userMap.get(downlineName);
                    if (!downlineUser) return null;
                    return {
                        ...downlineUser,
                        level,
                        children: getDownlineRecursive(downlineName, level + 1),
                    };
                }).filter((member): member is DownlineMember => member !== null);
            };

            const userDownline = getDownlineRecursive(username, 1);
            setDownline(userDownline);
        } catch (error) {
            console.error("Failed to load user downline:", error);
            setDownline([]);
        } finally {
            setIsLoading(false);
        }
    }, [username]);
    
    if (isLoading) {
        return <p>Loading team data...</p>
    }

    return <DownlineRecursive members={downline} />;
};
