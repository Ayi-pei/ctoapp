
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
import { supabase } from '@/lib/supabase';


const registerSchema = z.object({
  username: z.string().min(6, '用户名必须至少6个字符').max(10, '用户名不能超过10个字符').regex(/^[a-zA-Z0-9]+$/, '用户名只能包含字母和数字'),
  password: z.string().min(8, '密码必须至少8个字符').max(12, '密码不能超过12个字符'),
  invitationCode: z.string().min(1, '请输入邀请码'),
});


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

  const onSubmit = async (values: z.infer<typeof registerSchema>) => {
    try {
      // 1. Validate invitation code
      const { data: inviterData, error: inviterError } = await supabase
        .from('users')
        .select('id, username')
        .eq('invitation_code', values.invitationCode)
        .single();
      
      if (inviterError || !inviterData) {
        toast({ variant: 'destructive', title: '注册失败', description: '无效的邀请码。'});
        return;
      }
      
      // 2. Sign up the new user in Supabase Auth
      const email = `${values.username}@rsf.app`; // Create a dummy email
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: values.password,
        options: {
          data: {
            username: values.username,
            // other metadata if needed
          }
        }
      });
      
      if (authError) {
        throw new Error(authError.message);
      }
      
      if (!authData.user) {
        throw new Error("User registration did not return a user.");
      }
      
      // 3. Create a corresponding profile in the public.users table
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          username: values.username,
          email: email,
          is_admin: false,
          is_test_user: false,
          is_frozen: false,
          inviter: inviterData.username,
          registered_at: new Date().toISOString()
        });
        
      if (profileError) {
        // If profile creation fails, we should ideally delete the auth user
        // This is complex, for now, we just log the error.
         console.error("Failed to create user profile:", profileError.message);
         throw new Error("Failed to save user profile.");
      }


      toast({
        title: '注册成功',
        description: '您现在可以登录了。',
      });
      router.push('/login');

    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: '注册失败',
        description: error.message || '发生未知错误，请重试。',
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
                      <Input placeholder="请输入管理员提供的邀请码" {...field} />
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
