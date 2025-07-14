'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function StyleQuizRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center text-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
        <h1 className="text-2xl font-headline mt-6">Redirecting...</h1>
    </div>
  );
}
