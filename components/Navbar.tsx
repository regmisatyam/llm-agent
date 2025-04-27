"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { useState, useEffect } from "react";

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Add scroll event listener
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [scrolled]);

  // Reduce the number of navigation items
  const navItems = [
    { name: "Home", path: "/" },
    { name: "Email", path: "/email" },
    { name: "Calendar", path: "/calendar" },
    { name: "Chat", path: "/chat" },
  ];

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled ? "bg-white/80 backdrop-blur-md shadow-lg" : "bg-white shadow-md"
    }`}>
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-6">
            <Link 
              href="/" 
              className="flex items-center space-x-2"
            >
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
                GAgent
              </span>
            </Link>
           
          </div>

           <div className="hidden lg:flex space-x-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    pathname === item.path
                      ? "text-white bg-blue-600 shadow-md"
                      : "text-gray-700 hover:text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
            
          <div className="hidden md:flex items-center">
            {session ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                
                  <span className="text-sm font-medium text-gray-700 hidden md:inline">
                    {session.user?.name || session.user?.email}
                  </span>
                </div>
                <button
                  onClick={() => signOut()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn("google")}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg flex items-center"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 12C6 8.68629 8.68629 6 12 6C13.6569 6 15.1569 6.67428 16.2426 7.75736L19.0711 5.05025C17.2957 3.19718 14.8216 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C16.7307 22 20.7308 18.8377 21.7817 14.5065C21.9169 13.8616 22 13.1948 22 12.5C22 11.6996 21.8919 10.9448 21.6453 10.2436H12V14.5H17.5C16.8555 16.5 14.6659 18 12 18C8.68629 18 6 15.3137 6 12Z" fill="currentColor"/>
                </svg>
                Sign In
              </button>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-blue-600 focus:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                )}
              </svg>
            </button>
          </div>
        </div>
        
        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden py-3 pb-4 border-t border-gray-200 animate-fadeIn">
            <div className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block px-4 py-2 rounded-md text-base font-medium ${
                    pathname === item.path
                      ? "text-white bg-blue-600"
                      : "text-gray-700 hover:text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              
              {session ? (
                <div className="px-4 pt-4 pb-2 border-t border-gray-200 mt-2">
                  <div className="flex items-center space-x-2 mb-3">
                    {session.user?.image && (
                      <img 
                        src={session.user.image} 
                        alt={session.user.name || "User"}
                        className="w-8 h-8 rounded-full border-2 border-blue-200"
                      />
                    )}
                    <span className="text-sm font-medium text-gray-700">
                      {session.user?.name || session.user?.email}
                    </span>
                  </div>
                  <button
                    onClick={() => signOut()}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="px-4 pt-4">
                  <button
                    onClick={() => signIn("google")}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 12C6 8.68629 8.68629 6 12 6C13.6569 6 15.1569 6.67428 16.2426 7.75736L19.0711 5.05025C17.2957 3.19718 14.8216 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C16.7307 22 20.7308 18.8377 21.7817 14.5065C21.9169 13.8616 22 13.1948 22 12.5C22 11.6996 21.8919 10.9448 21.6453 10.2436H12V14.5H17.5C16.8555 16.5 14.6659 18 12 18C8.68629 18 6 15.3137 6 12Z" fill="currentColor"/>
                    </svg>
                    Sign In
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
} 