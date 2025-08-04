
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

const registerSchema = z.object({
  username: z.string().min(6, 'Username must be at least 6 characters').max(10, 'Username cannot exceed 10 characters').regex(/^[a-zA-Z0-9]+$/, 'Username can only contain letters and numbers'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(12, 'Password cannot exceed 12 characters'),
  invitationCode: z.string().refine(code => code === '111222', {
    message: 'Incorrect invitation code',
  }),
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

  const onSubmit = (values: z.infer<typeof registerSchema>) => {
    try {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const existingUser = users.find((user: any) => user.username === values.username);

      if (existingUser) {
        toast({
          variant: 'destructive',
          title: 'Registration Failed',
          description: 'Username already exists.',
        });
        return;
      }
      
      users.push({ username: values.username, password: values.password });
      localStorage.setItem('users', JSON.stringify(users));

      toast({
        title: 'Registration Successful',
        description: 'You can now log in.',
      });
      router.push('/login');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: 'An unknown error occurred. Please try again.',
      });
    }
  };

  return (
    <AuthLayout>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Register</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="6-10 letters or numbers" {...field} />
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="8-12 characters" {...field} />
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
                    <FormLabel>Invitation Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter invitation code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">
                Register
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="underline">
              Login now
            </Link>
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
