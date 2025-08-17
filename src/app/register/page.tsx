"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthLayout from '@/components/auth-layout';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';


const registerSchema = z.object({
  username: z.string().min(1, '请输入账号'),
  password: z.string().min(1, '请输入密码'),
  invitationCode: z.string().min(1, '请输入邀请码'),
});


export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      password: '',
      invitationCode: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof registerSchema>) => {
    const success = await register(values.username, values.password, values.invitationCode);

    if (success) {
        toast({ title: '注册成功', description: '您的账户已创建，请登录。' });
        // After successful registration, always send to login page
        router.push('/');
    } else {
        toast({ 
          variant: 'destructive', 
          title: '注册失败', 
          description: '用户名可能已被占用，或邀请码无效。' 
        });
    }
  };

  return (
    <AuthLayout>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">注册</CardTitle>
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
                       <Input placeholder="请输入您的账号" {...field} />
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
              <Button type="submit" className="w-full">
                注册
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            已有账户?{' '}
            <Link href="/" className="underline">
              立即登录
            </Link>
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
