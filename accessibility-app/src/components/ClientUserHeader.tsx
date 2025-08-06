'use client';

import dynamic from 'next/dynamic';

// Dynamically import UserHeader with no SSR to avoid hydration issues
const UserHeader = dynamic(() => import('./UserHeader'), {
  ssr: false,
});

export default function ClientUserHeader() {
  return <UserHeader />;
} 