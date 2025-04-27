"use client";

import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  

  return (
    <footer className="bg-gray-900 text-white ">
      <div className="container mx-auto px-4 max-w-6xl">
        
        
        <div className="border-t border-gray-800 p-5">
          <div className="flex flex-col justify-between items-center">
            <p className="text-gray-400 text-sm">
              &copy; {currentYear} GAgent. All rights reserved.
            </p>
      
          </div>
        </div>
      </div>
    </footer>
  );
} 