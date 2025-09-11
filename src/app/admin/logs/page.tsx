
"use client";

import { useState } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLogs } from "@/context/logs-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

// Disable SSR for this page to avoid context issues
export const dynamic = 'force-dynamic';

export default function AdminLogsPage() {
    const { logs } = useLogs();
    const [searchTerm, setSearchTerm] = useState("");

    const filteredLogs = logs.filter(log => 
        log.operator_username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6">
                <h1 className="text-2xl font-bold">系统日志</h1>
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>管理员操作日志</CardTitle>
                                <CardDescription>所有对请求和交易的后台操作记录。</CardDescription>
                            </div>
                            <Input 
                                placeholder="搜索日志..." 
                                className="max-w-xs"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[calc(100vh-18rem)]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>操作员</TableHead>
                                    <TableHead>操作</TableHead>
                                    <TableHead>详情</TableHead>
                                    <TableHead className="text-right">时间</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredLogs.length > 0 ? filteredLogs.map(log => (
                                    <TableRow key={log.id}>
                                        <TableCell>{log.operator_username}</TableCell>
                                        <TableCell>
                                            <Badge variant={log.action === 'approve' ? 'default' : log.action === 'reject' ? 'destructive' : 'secondary'} className={cn(log.action === 'approve' && 'bg-green-500/80')}>
                                                {log.action}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{log.details}</TableCell>
                                        <TableCell className="text-right text-xs">{new Date(log.created_at).toLocaleString()}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                            没有找到日志记录。
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    )
}
