
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthLayout from '@/components/auth-layout';
import type { User } from '@/context/auth-context';

const registerSchema = z.object({
  username: z.string().min(6, '用户名必须至少6个字符').max(10, '用户名不能超过10个字符').regex(/^[a-zA-Z0-9]+$/, '用户名只能包含字母和数字'),
  password: z.string().min(8, '密码必须至少8个字符').max(12, '密码不能超过12个字符'),
  invitationCode: z.string().regex(/^[a-zA-Z0-9]{6}$/, {
    message: '邀请码必须是6位字母或数字',
  }),
});

// Helper to generate a random 6-digit alphanumeric code
const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export default function RegisterPage() {
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      password: '',
      invitationCode: '',
    },
  });

  const onSubmit = (values: z.infer<typeof registerSchema>) => {
    try {
      const users: User[] = JSON.parse(localStorage.getItem('users') || '[]');
      
      const existingUser = users.find((user: any) => user.username === values.username);
      if (existingUser) {
        toast({ variant: 'destructive', title: '注册失败', description: '用户名已存在。'});
        return;
      }

      const inviterIndex = users.findIndex((user: any) => user.invitationCode === values.invitationCode);
      if (inviterIndex === -1) {
         toast({ variant: 'destructive', title: '注册失败', description: '无效的邀请码。'});
        return;
      }
      const inviter = users[inviterIndex];
      
      const isTestUser = values.invitationCode === '111222'; // Keep this special code logic

      // Generate a unique invitation code for the new user
      let newInvitationCode = generateCode();
      while (users.some((user: any) => user.invitationCode === newInvitationCode)) {
          newInvitationCode = generateCode();
      }

      const newUser: User = { 
          username: values.username, 
          password: values.password,
          isAdmin: false,
          isTestUser: isTestUser,
          isFrozen: false,
          invitationCode: newInvitationCode,
          inviter: inviter.username,
          downline: [],
          registeredAt: new Date().toISOString(),
      };
      
      // Add the new user to the inviter's downline
      if (inviter.downline) {
        inviter.downline.push(newUser.username);
      } else {
        inviter.downline = [newUser.username];
      }
      
      // Update the users array with the modified inviter and the new user
      users[inviterIndex] = inviter;
      users.push(newUser);

      localStorage.setItem('users', JSON.stringify(users));

      toast({
        title: '注册成功',
        description: '您现在可以登录了。',
      });
      router.push('/login');
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: '注册失败',
        description: '发生未知错误，请重试。',
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
                    <FormLabel>用户名</FormLabel>
                    <FormControl>
                      <Input placeholder="6-10位字母或数字" {...field} />
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
                      <Input type="password" placeholder="8-12位字符" {...field} />
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
                      <Input placeholder="请输入6位邀请码" {...field} />
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
            <Link href="/login" className="underline">
              立即登录
            </Link>
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
