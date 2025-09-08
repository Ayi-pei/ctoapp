
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AuthLayout from '@/components/auth-layout';
import { useSimpleAuth } from '@/context/simple-custom-auth';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';


const registerSchema = z.object({
  username: z.string().min(4, '用户名必须至少4个字符').max(20, '用户名不能超过20个字符'),
  password: z.string().min(6, '密码必须至少6个字符').max(20, '密码不能超过20个字符'),
  confirmPassword: z.string(),
  invitationCode: z.string().min(1, '请输入邀请码'),
}).refine(data => data.password === data.confirmPassword, {
    message: "两次输入的密码不匹配",
    path: ["confirmPassword"],
});

export default function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useSimpleAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
      invitationCode: searchParams.get('code') || '',
    },
  });

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      form.setValue('invitationCode', code);
    }
  }, [searchParams, form]);


  const onSubmit = async (values: z.infer<typeof registerSchema>) => {
    const { success, error } = await register(values.username, values.password, values.invitationCode);

    if (success) {
        toast({ title: '注册成功', description: '您的账户已创建，正在跳转到登录页面...' });
        
        // 延迟跳转，让用户看到提示（与其他操作保持一致）
        setTimeout(() => {
          router.replace('/login');
        }, 1500);
    } else {
        let description = '注册失败，请稍后重试。';
        
        switch (error) {
            case '用户名已存在':
                description = '该用户名已被占用，请换一个。';
                break;
            case '邀请码无效':
                description = '无效的邀请码，请检查后重试。';
                break;
            case '注册失败':
                description = '注册过程中发生错误，请稍后重试。';
                break;
            default:
                description = error || '未知错误，请稍后重试。';
        }
        
        toast({ 
          variant: 'destructive', 
          title: '注册失败', 
          description: description
        });
    }
  };

  return (
    <AuthLayout>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">注册</CardTitle>
          <p className="text-center text-sm text-muted-foreground">
            创建新账户，无需邮箱验证
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>账号</FormLabel>
                    <FormControl>
                       <Input placeholder="请输入4-20位用户名" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>密码</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="请输入6-20位密码" {...field} />
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
                    <FormLabel>确认密码</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="请再次输入密码" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="invitationCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>邀请码</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入您的邀请码" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                注册
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            已有账户?{' '}
            <Link href="/login" className="underline">
              立即登录
            </Link>
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
