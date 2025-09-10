"use client";

import React, { Suspense } from 'react';
import RegisterPageContent from './register-page-content';

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterPageContent />
    </Suspense>
  );
}
