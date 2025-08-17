
"use client";

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
import { useRequests } from "@/context/requests-context";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTheme } from "@/context/theme-context";
import { Sun, Moon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";


const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "请输入当前密码"),
    newPassword: z.string().min(8, "新密码必须至少8个字符"),
    confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "两次输入的新密码不匹配",
    path: ["confirmPassword"],
});


export default function ProfileSettingsPage() {
    const { toast } = useToast();
    const { user } = useAuth();
    const { addPasswordResetRequest } = useRequests();
    const { theme, setTheme } = useTheme();


    const form = useForm<z.infer<typeof changePasswordSchema>>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
    });

    const onSubmit = async (values: z.infer<typeof changePasswordSchema>) => {
        if (!user) return;
        
        // This is a mocked check. In a real app, you'd verify the currentPassword against the backend.
        if (values.currentPassword !== user.password) {
            toast({
                variant: "destructive",
                title: "错误",
                description: "当前密码不正确。",
            });
            return;
        }

        try {
            await addPasswordResetRequest(values.newPassword);
            toast({
                title: "请求已提交",
                description: "您的密码修改请求已提交给管理员审核。",
            });
            form.reset();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "提交失败",
                description: error.message || "提交请求时出错。",
            });
        }
    }


    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6">
                 <h1 className="text-2xl font-bold">安全设置</h1>
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

                 <Card>
                    <CardHeader>
                        <CardTitle>主题设置</CardTitle>
                        <CardDescription>选择您喜欢的界面主题。</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RadioGroup
                            value={theme}
                            onValueChange={setTheme}
                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        >
                            <Label htmlFor="light-theme" className="flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer data-[state=checked]:border-primary">
                                <RadioGroupItem value="light" id="light-theme" className="sr-only"/>
                                <Sun className="w-8 h-8 mb-2"/>
                                <span className="font-semibold">白昼</span>
                            </Label>
                             <Label htmlFor="dark-theme" className="flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer data-[state=checked]:border-primary">
                                <RadioGroupItem value="dark" id="dark-theme" className="sr-only"/>
                                <Moon className="w-8 h-8 mb-2"/>
                                <span className="font-semibold">夜间</span>
                            </Label>
                        </RadioGroup>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
