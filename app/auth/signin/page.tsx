'use client';

import { useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

export default function SignIn() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  
  // Auto-redirect to Google sign-in
  useEffect(() => {
    // Allow time for the page to load before redirecting
    const timer = setTimeout(() => {
      signIn('google', { callbackUrl });
    }, 100);
    
    return () => clearTimeout(timer);
  }, [callbackUrl]);
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Signing in...</h1>
          <p className="mt-2 text-gray-600">
            Redirecting to Google authentication...
          </p>
          <div className="mt-6 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            If you are not redirected automatically,{' '}
            <button
              onClick={() => signIn('google', { callbackUrl })}
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              click here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
} 