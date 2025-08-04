
"use client";

import { useAuth } from '@/context/auth-context';
import LoginPage from './login/page';
import TradePage from './trade/page';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else {
      router.push('/trade');
    }
  }, [isAuthenticated, router]);

  return null; // or a loading spinner
}
