'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function SignOut() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  
  // Auto-redirect to the callback URL
  useEffect(() => {
    // Allow time for the page to load before redirecting
    const timer = setTimeout(() => {
      router.push(callbackUrl);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [callbackUrl, router]);
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Signed out</h1>
          <p className="mt-2 text-gray-600">
            You have been successfully signed out.
          </p>
          <div className="mt-6 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Redirecting...
          </p>
        </div>
      </div>
    </div>
  );
} 