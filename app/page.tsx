'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

export default function HomePage() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState('all');

  const features = [
    {
      title: "Face Recognition",
      description: "Register faces for identification and recognize them in real-time through your camera",
      icon: "👁️",
      path: "/image-save",
      color: "bg-blue-100 border-blue-500",
      category: "recognition"
    },
    {
      title: "Object Detection",
      description: "Detect and identify 80+ everyday objects in real-time using your camera",
      icon: "🔍",
      path: "/object-detection",
      color: "bg-amber-100 border-amber-500",
      category: "recognition"
    },
    {
      title: "Chat Assistant",
      description: "Talk to our GAgent about anything or get help with your Google services",
      icon: "💬",
      path: "/chat",
      color: "bg-purple-100 border-purple-500",
      category: "productivity"
    },
    {
      title: "Email Management",
      description: "Check your inbox and manage your emails with AI assistance",
      icon: "📧",
      path: "/email",
      color: "bg-yellow-100 border-yellow-500",
      category: "productivity"
    },
    {
      title: "Calendar Events",
      description: "Check your schedule and manage your calendar events",
      icon: "📅",
      path: "/calendar",
      color: "bg-red-100 border-red-500",
      category: "productivity"
    },
    {
      title: "Voice Typing",
      description: "Use your voice to dictate text and commands",
      icon: "🎤",
      path: "/voice",
      color: "bg-orange-100 border-orange-500",
      category: "productivity"
    }
  ];

  const filteredFeatures = activeTab === 'all' 
    ? features 
    : features.filter(feature => feature.category === activeTab);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold mb-2">Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-12">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-20 px-4 -mt-8 rounded-b-3xl shadow-xl">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="md:w-1/2">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                Your Smart Personal Assistant for Google Services and Daily Tasks
              </h1>
              <p className="text-xl text-blue-100 mb-8 max-w-lg">
                GAgent combines AI Mail Summarization, AI integration in Google Calendar, face recognition, and voice commands to make your Google experience smarter and more efficient.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link 
                  href="/chat" 
                  className="px-6 py-3 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition-colors shadow-lg hover:shadow-xl"
                >
                  Try GAgent Now
                </Link>
                {!session && (
                  <Link 
                    href="/api/auth/signin" 
                    className="px-6 py-3 bg-transparent text-white font-bold rounded-lg border-2 border-white hover:bg-white/10 transition-colors"
                  >
                    Sign In with Google
                  </Link>
                )}
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <div className="relative w-72 h-72">
                {/* Placeholder for hero image - replace with actual image */}
                <div className="w-full h-full bg-blue-800/30 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

  
      
      {/* Our Products Section */}
      <div className="bg-gray-50 py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Our Products</h2>
            <div className="w-20 h-1 bg-blue-600 mx-auto mb-6"></div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Explore our suite of AI-powered tools designed to enhance your productivity and experience with Google services.
            </p>
          </div>
          
          {/* Category Tabs */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
              <button
                onClick={() => setActiveTab('all')}
                className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-medium ${
                  activeTab === 'all' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                All Products
              </button>
              <button
                onClick={() => setActiveTab('recognition')}
                className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-medium ${
                  activeTab === 'recognition' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Recognition Tools
              </button>
              <button
                onClick={() => setActiveTab('productivity')}
                className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-medium ${
                  activeTab === 'productivity' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Productivity Tools
              </button>
            </div>
          </div>
          
          {/* Product Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredFeatures.map((feature) => (
              <Link key={feature.path} href={feature.path} className="block group">
                <div className={`h-full rounded-xl shadow-md hover:shadow-xl transition-all duration-300 bg-white overflow-hidden transform group-hover:-translate-y-1 ${feature.color.replace('bg-', 'hover:border-t-')}`}>
                  <div className={`h-2 ${feature.color.replace('bg-blue-100', 'bg-blue-500').replace('bg-green-100', 'bg-green-500').replace('bg-amber-100', 'bg-amber-500').replace('bg-purple-100', 'bg-purple-500').replace('bg-yellow-100', 'bg-yellow-500').replace('bg-red-100', 'bg-red-500').replace('bg-orange-100', 'bg-orange-500')}`}></div>
                  <div className="p-6">
                    <div className="flex items-start mb-4">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full ${feature.color} flex items-center justify-center text-2xl mr-4`}>
                        {feature.icon}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold mb-2 group-hover:text-blue-600 transition-colors">{feature.title}</h3>
                        <p className="text-gray-600">{feature.description}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <span className="inline-flex items-center text-sm font-medium text-blue-600 group-hover:underline">
                        Try it now
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>


          {/* About Us Section */}
      <div id="about" className="container mx-auto max-w-6xl py-16 px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Who We Are</h2>
          <div className="w-20 h-1 bg-blue-600 mx-auto mb-6"></div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We're a team of 4 university students passionate about making technology accessible and efficient. 
            GAgent is our hackathon project that aims to streamline your Daily Tasks and Google services interaction using the latest in AI technology.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
          <div className="bg-white rounded-xl shadow-md p-6 border-t-4 border-blue-600 hover:shadow-lg transition-shadow">
            <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Innovation First</h3>
            <p className="text-gray-600">
              We constantly push the boundaries of what's possible with AI and Google services integration.
            </p>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6 border-t-4 border-green-600 hover:shadow-lg transition-shadow">
            <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Privacy Focused</h3>
            <p className="text-gray-600">
              Your data security is our priority. We ensure all your information is protected and handled responsibly.
            </p>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6 border-t-4 border-purple-600 hover:shadow-lg transition-shadow">
            <div className="w-14 h-14 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Time Saving</h3>
            <p className="text-gray-600">
              Our tools are designed to save you time and make your digital life more efficient and productive.
            </p>
          </div>
        </div>
      </div>
      {/* Call To Action Section */}
      {!session && (
        <div className="container mx-auto max-w-5xl mt-16 px-4">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-8 md:p-12 text-center md:text-left flex flex-col md:flex-row items-center">
              <div className="md:w-2/3 mb-6 md:mb-0">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  Ready to experience the full power of GAgent?
                </h2>
                <p className="text-blue-100 md:text-lg mb-0 md:pr-12">
                  Sign in with your Google account now to unlock all features and start enhancing your productivity.
                </p>
              </div>
              <div className="md:w-1/3 flex justify-center md:justify-end">
                <Link
                  href="/api/auth/signin"
                  className="px-6 py-3 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition-colors shadow-lg hover:shadow-xl inline-flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 12C6 8.68629 8.68629 6 12 6C13.6569 6 15.1569 6.67428 16.2426 7.75736L19.0711 5.05025C17.2957 3.19718 14.8216 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C16.7307 22 20.7308 18.8377 21.7817 14.5065C21.9169 13.8616 22 13.1948 22 12.5C22 11.6996 21.8919 10.9448 21.6453 10.2436H12V14.5H17.5C16.8555 16.5 14.6659 18 12 18C8.68629 18 6 15.3137 6 12Z" fill="currentColor"/>
                  </svg>
                  Sign In with Google
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
