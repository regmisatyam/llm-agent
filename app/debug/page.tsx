'use client';

import { useState, useEffect } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';

export default function DebugPage() {
  const { data: session, status, update } = useSession();
  const [authStatus, setAuthStatus] = useState<any>(null);
  const [emailTest, setEmailTest] = useState<any>(null);
  const [refreshStatus, setRefreshStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch auth verification data
  const checkAuth = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/verify');
      const data = await res.json();
      setAuthStatus(data);
    } catch (error) {
      console.error('Error checking auth:', error);
      setAuthStatus({ error: String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  // Test email API
  const testEmailApi = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/email');
      const status = res.status;
      const data = await res.json();
      setEmailTest({ status, data });
    } catch (error) {
      console.error('Error testing email API:', error);
      setEmailTest({ error: String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  // Manually refresh token
  const refreshToken = async () => {
    setIsLoading(true);
    setRefreshStatus(null);
    try {
      const res = await fetch('/api/auth/refresh');
      const status = res.status;
      const data = await res.json();
      setRefreshStatus({ status, data });
      
      if (status === 200) {
        // Force session update to get the new token
        await update();
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      setRefreshStatus({ error: String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  // Run auth check on mount
  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Authentication Debug</h1>
      
      {/* Session status */}
      <div className="mb-8 p-4 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-2">Session Status</h2>
        <div className="mb-2">
          <span className="font-medium">Status:</span> 
          <span className={`ml-2 px-2 py-1 rounded ${
            status === 'authenticated' ? 'bg-green-100 text-green-800' : 
            status === 'loading' ? 'bg-yellow-100 text-yellow-800' : 
            'bg-red-100 text-red-800'
          }`}>
            {status}
          </span>
        </div>
        
        {session ? (
          <div>
            <p><span className="font-medium">User:</span> {session.user?.name} ({session.user?.email})</p>
            <p><span className="font-medium">Has access token:</span> {session.accessToken ? 'Yes' : 'No'}</p>
            {session.error && (
              <p className="mt-2 text-red-600">Error: {session.error}</p>
            )}
          </div>
        ) : status !== 'loading' && (
          <p>No active session</p>
        )}
        
        <div className="mt-4 flex space-x-4">
          {!session ? (
            <button 
              onClick={() => signIn('google')} 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Sign In with Google
            </button>
          ) : (
            <>
              <button 
                onClick={() => signOut()} 
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Sign Out
              </button>
              <button 
                onClick={refreshToken} 
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                Refresh Token
              </button>
            </>
          )}
        </div>
        
        {/* Refresh Status */}
        {refreshStatus && (
          <div className="mt-4 p-3 bg-gray-100 rounded">
            <h3 className="font-medium mb-2">Token Refresh Result:</h3>
            <p className="mb-1">
              <span className="font-medium">Status:</span>{' '}
              <span className={refreshStatus.status === 200 ? 'text-green-600' : 'text-red-600'}>
                {refreshStatus.status}
              </span>
            </p>
            <pre className="text-xs bg-gray-200 p-2 rounded overflow-auto">
              {JSON.stringify(refreshStatus.data || refreshStatus.error, null, 2)}
            </pre>
          </div>
        )}
      </div>
      
      {/* Auth verification */}
      <div className="mb-8 p-4 bg-white rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Auth Verification</h2>
          <button 
            onClick={checkAuth}
            disabled={isLoading}
            className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {isLoading ? 'Checking...' : 'Refresh'}
          </button>
        </div>
        
        {authStatus && (
          <div className="overflow-auto max-h-96">
            <pre className="bg-gray-100 p-4 rounded text-sm whitespace-pre-wrap">
              {JSON.stringify(authStatus, null, 2)}
            </pre>
          </div>
        )}
      </div>
      
      {/* Email API test */}
      <div className="mb-8 p-4 bg-white rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Email API Test</h2>
          <button 
            onClick={testEmailApi}
            disabled={isLoading || status !== 'authenticated'}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? 'Testing...' : 'Test API'}
          </button>
        </div>
        
        {status !== 'authenticated' && (
          <p className="text-yellow-600 mb-4">Sign in first to test the Email API</p>
        )}
        
        {emailTest && (
          <div className="overflow-auto max-h-96">
            <p className="mb-2">
              <span className="font-medium">Status code:</span>{' '}
              <span className={emailTest.status === 200 ? 'text-green-600' : 'text-red-600'}>
                {emailTest.status}
              </span>
            </p>
            <pre className="bg-gray-100 p-4 rounded text-sm whitespace-pre-wrap">
              {JSON.stringify(emailTest.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
      
      {/* Environment Info */}
      <div className="p-4 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-2">Environment Info</h2>
        <p><span className="font-medium">Next.js Version:</span> 14.x</p>
        <p><span className="font-medium">NextAuth.js Version:</span> 4.x</p>
        <p><span className="font-medium">Current URL:</span> {typeof window !== 'undefined' ? window.location.href : ''}</p>
        <p><span className="font-medium">Base URL:</span> {typeof window !== 'undefined' ? window.location.origin : ''}</p>
      </div>
    </div>
  );
} 