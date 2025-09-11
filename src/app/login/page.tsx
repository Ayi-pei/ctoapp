
"use client";


// Disable SSR for this page to avoid context issues
export const dynamic = 'force-dynamic';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useSimpleAuth } from '@/context/simple-custom-auth';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoaderCircle } from 'lucide-react';
import AuthLayout from '@/components/auth-layout';

const loginSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
});

export default function LoginPage() {
  const { login, isAuthenticated, isAdmin, isLoading } = useSimpleAuth();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  useEffect(() => {
    // If the user is already authenticated, redirect them from the login page.
    if (!isLoading && isAuthenticated) {
      toast({
        title: '您已登录',
        description: `正在跳转到 ${isAdmin ? '管理员' : ''} 仪表盘...`,
      });
      router.replace(isAdmin ? '/admin' : '/dashboard');
    }
  }, [isAuthenticated, isAdmin, isLoading, router, toast]);

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
              const { success, isAdmin: loggedInIsAdmin, error } = await login(values.username, values.password);

              if (success) {
                  toast({
                      title: '登录成功',
                      description: '正在跳转到您的仪表盘...',
                  });

                  // 延迟跳转，让用户看到提示（与退出登录保持一致）
                  setTimeout(() => {
                      if (loggedInIsAdmin) {
                          router.replace('/admin');
                      } else {
                          router.replace('/dashboard');
                      }
                  }, 1500);
              } else {
                  toast({
                      variant: 'destructive',
                      title: '登录失败',
                      description: error || '用户名或密码错误',
      });
    }
  };

  // While loading auth state or if already logged in, show a loader.
  // The useEffect above will handle the redirect.
  if (isLoading || isAuthenticated) {
     return (
        <AuthLayout>
            <div className="flex flex-col items-center gap-4">
                <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">正在验证您的身份...</p>
            </div>
        </AuthLayout>
     )
  }

  // Render the login form only if not authenticated and not loading.
  return (
      <AuthLayout>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">登录</CardTitle>
          <p className="text-center text-sm text-muted-foreground">
            使用用户名和密码登录
          </p>
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
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                 {form.formState.isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
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
