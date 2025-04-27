'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function HomePage() {
  const { data: session, status } = useSession();

  const features = [
    {
      title: "Face Registration",
      description: "Upload a photo and save a person's face for later recognition",
      icon: "📷",
      path: "/image-save",
      color: "bg-blue-100 border-blue-500"
    },
    {
      title: "Live Face Recognition",
      description: "Use your camera to detect and recognize registered faces in real-time",
      icon: "👁️",
      path: "/live-camera",
      color: "bg-green-100 border-green-500"
    },
    {
      title: "Chat Assistant",
      description: "Talk to our AI assistant about anything or get help with your Google services",
      icon: "💬",
      path: "/chat",
      color: "bg-purple-100 border-purple-500"
    },
    {
      title: "Email Management",
      description: "Check your inbox and manage your emails with voice commands",
      icon: "📧",
      path: "/email",
      color: "bg-yellow-100 border-yellow-500"
    },
    {
      title: "Calendar Events",
      description: "Check your schedule and manage your calendar events",
      icon: "📅",
      path: "/calendar",
      color: "bg-red-100 border-red-500"
    },
    {
      title: "Voice Typing",
      description: "Use your voice to dictate text and commands",
      icon: "🎤",
      path: "/voice",
      color: "bg-orange-100 border-orange-500"
    }
  ];

  if (status === 'loading') {
    return (
      <div className="text-center py-10">
        <h1 className="text-3xl font-bold mb-4">AI Assistant</h1>
        <p className="mb-4">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">AI Assistant</h1>
        <p className="text-xl text-gray-600">
          Your all-in-one personal assistant with face recognition, voice commands, and Google integration
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => (
          <Link key={feature.path} href={feature.path} className="block">
            <div className={`h-full border-l-4 ${feature.color} rounded-lg bg-white shadow-md hover:shadow-lg transition-shadow p-6`}>
              <div className="flex items-start">
                <span className="text-4xl mr-4">{feature.icon}</span>
                <div>
                  <h2 className="text-xl font-bold mb-2">{feature.title}</h2>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      {!session && (
        <div className="mt-12 text-center p-6 bg-gray-100 rounded-lg">
          <p className="mb-4 text-lg">Sign in with your Google account to unlock all features</p>
          <Link
            href="/api/auth/signin"
            className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700"
          >
            Sign In
          </Link>
        </div>
      )}
    </div>
  );
}
