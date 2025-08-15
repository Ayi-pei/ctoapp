
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


const registerSchema = z.object({
  username: z.string().min(5, '用户名必须至少5个字符').max(10, '用户名不能超过10个字符').regex(/^[a-zA-Z0-9]+$/, '用户名只能包含字母和数字'),
  password: z.string().min(8, '密码必须至少8个字符').max(12, '密码不能超过12个字符'),
  invitationCode: z.string().min(1, '请输入邀请码'),
});


export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      password: '',
      invitationCode: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof registerSchema>) => {
    const success = await registerUser(values.username, values.password, values.invitationCode);

    if (success) {
        router.push('/login');
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
                       <div className="relative">
                        <Input placeholder="5-10位字母或数字" {...field} className="pr-28" />
                         <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
                            @noemail.app
                        </span>
                      </div>
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
            <Link href="/login" className="underline">
              立即登录
            </Link>
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
