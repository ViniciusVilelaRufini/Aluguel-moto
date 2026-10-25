'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { homeFor } from '@/lib/permissions';

export default function Home() {
  const { ready, token, groups } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!ready) return;
    if (!token) router.replace('/login');
    else router.replace(homeFor(groups) ?? '/login');
  }, [ready, token, groups, router]);
  return null;
}
