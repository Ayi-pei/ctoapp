
"use client";

import { AuthProvider, useAuth } from '@/context/auth-context';
import LoginPage from './login/page';
import TradePage from './trade/page';

function App() {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? <TradePage /> : <LoginPage />;
}

export default function Home() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
