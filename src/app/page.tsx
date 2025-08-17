"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import AuthLayout from '@/components/auth-layout';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const loginSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
});

export default function LoginPage() {
  const { login, isAuthenticated, isAdmin, isLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    const success = await login(values.username, values.password);

    if (success) {
       toast({
        title: '登录成功',
      });
      // Redirect logic will be handled by the effect below.
    } else {
      toast({
        variant: 'destructive',
        title: '登录失败',
        description: '用户名或密码错误。',
      });
    }
  };

  useEffect(() => {
    // If the user is authenticated, redirect them away from the login page.
    if (!isLoading && isAuthenticated) {
        if (isAdmin) {
            router.replace('/admin');
        } else {
            router.replace('/dashboard');
        }
    }
  }, [isAuthenticated, isAdmin, isLoading, router]);

  // If the user is already authenticated, show a loader while redirecting.
  // This prevents the login form from flashing on the screen for already logged-in users.
  if (isAuthenticated) {
     return (
        <AuthLayout>
            <Card className="w-full max-w-md">
                <CardContent className="p-10 flex flex-col items-center justify-center">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-10 w-1/2 mt-4" />
                </CardContent>
            </Card>
        </AuthLayout>
     )
  }

  // If loading the auth state, show a skeleton.
  if (isLoading) {
     return (
        <AuthLayout>
            <Card className="w-full max-w-md">
                <CardHeader>
                    <Skeleton className="h-8 w-24 mx-auto" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        </AuthLayout>
     )
  }

  // Render the login form if not authenticated and not loading.
  return (
    <AuthLayout>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">登录</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>用户名</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入您的用户名" {...field} />
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
                      <Input type="password" placeholder="请输入您的密码" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">
                登录
              </Button>
            </form>
          </Form>
           <div className="mt-4 text-center text-sm">
            没有账户?{' '}
            <Link href="/register" className="underline">
              立即注册
            </Link>
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
