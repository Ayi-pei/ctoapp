
"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "./ui/skeleton";
import { Badge } from "./ui/badge";
import type { DownlineMember } from "@/types";

type DownlineTreeProps = {
    userId: string;
};

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
        if (!userId) return;
        setIsLoading(true);
        // Mock data since Supabase is removed
        const mockDownline: DownlineMember[] = [
            { id: 'user2', username: 'testuser2', level: 1, created_at: new Date().toISOString(), email: 'test2@test.com', inviter_id: 'user1', is_admin: false, is_frozen: false, is_test_user: true, invitation_code: 'ABC', nickname: 'user2', credit_score: 100 },
            { id: 'user3', username: 'testuser3', level: 2, created_at: new Date().toISOString(), email: 'test3@test.com', inviter_id: 'user2', is_admin: false, is_frozen: false, is_test_user: true, invitation_code: 'DEF', nickname: 'user3', credit_score: 100 },
        ];
        setDownline(mockDownline);
        setIsLoading(false);
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
