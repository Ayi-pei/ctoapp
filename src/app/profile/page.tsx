
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label";
import { PasswordResetRequest } from "@/types";


const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "请输入当前密码"),
    newPassword: z.string().min(8, "新密码必须至少8个字符"),
    confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "两次输入的新密码不匹配",
    path: ["confirmPassword"],
});


export default function ProfilePage() {
    const { toast } = useToast();
    const { user, updateUser } = useAuth();
    const router = useRouter();
    const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '');


    const form = useForm<z.infer<typeof changePasswordSchema>>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
    });

    const onSubmit = (values: z.infer<typeof changePasswordSchema>) => {
        if (!user) return;
        try {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const currentUser = users.find((u: any) => u.username === user.username);

            if (!currentUser || currentUser.password !== values.currentPassword) {
                toast({ variant: "destructive", title: "密码错误", description: "当前密码不正确。" });
                return;
            }
            
            const newRequest: PasswordResetRequest = {
                id: `pwd_reset_${Date.now()}`,
                userId: user.username,
                type: 'password_reset',
                newPassword: values.newPassword,
                status: 'pending',
                createdAt: new Date().toISOString(),
            }

            const existingRequests = JSON.parse(localStorage.getItem('adminRequests') || '[]');
            existingRequests.push(newRequest);
            localStorage.setItem('adminRequests', JSON.stringify(existingRequests));

            toast({
                title: "请求已提交",
                description: "您的密码修改请求已提交给管理员审核。",
            });

            form.reset();

        } catch (error) {
            toast({
                variant: "destructive",
                title: "操作失败",
                description: "发生未知错误，请重试。",
            });
        }
    }
    
    const handleAvatarChange = () => {
        updateUser({ avatar: avatarUrl });
        toast({
            title: "头像已更新",
            description: "您的头像已成功更新。",
        });
        setIsAvatarDialogOpen(false);
    };


    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6">
                 <h1 className="text-2xl font-bold">个人中心</h1>
                <Card>
                    <CardHeader>
                        <CardTitle>账户信息</CardTitle>
                        <CardDescription>这里是您的基本账户信息。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center space-x-4">
                            <Avatar className="h-20 w-20">
                                <AvatarImage src={user?.avatar} alt={user?.username} />
                                <AvatarFallback>{user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline">更换头像</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>更换头像</DialogTitle>
                                        <DialogDescription>
                                            输入新的头像URL。这是一个模拟功能，图片不会被上传。
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="avatar-url" className="text-right">
                                                图片URL
                                            </Label>
                                            <Input
                                                id="avatar-url"
                                                value={avatarUrl}
                                                onChange={(e) => setAvatarUrl(e.target.value)}
                                                className="col-span-3"
                                                placeholder="https://example.com/avatar.png"
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button type="button" variant="secondary" onClick={() => setIsAvatarDialogOpen(false)}>取消</Button>
                                        <Button type="button" onClick={handleAvatarChange}>保存</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <div className="flex items-center">
                            <span className="w-24 text-muted-foreground">用户名</span>
                            <span>{user?.username}</span>
                        </div>
                         <div className="flex items-center">
                            <span className="w-24 text-muted-foreground">账户类型</span>
                             <span className="px-2 py-1 text-xs font-semibold rounded-full bg-primary/20 text-primary">
                                {user?.isTestUser ? "测试账户" : "真实账户"}
                            </span>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>修改密码</CardTitle>
                        <CardDescription>提交修改密码请求，等待管理员审核。</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-md">
                                <FormField
                                    control={form.control}
                                    name="currentPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>当前密码</FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder="请输入当前密码" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="newPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>新密码</FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder="请输入8-12位的新密码" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="confirmPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>确认新密码</FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder="请再次输入新密码" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit">提交审核</Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
