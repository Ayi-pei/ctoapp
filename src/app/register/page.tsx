"use client";

import React, { Suspense } from 'react';
import RegisterPageContent from './register-page-content';

// Disable SSR for this page to avoid context issues
export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterPageContent />
    </Suspense>
  );
}
