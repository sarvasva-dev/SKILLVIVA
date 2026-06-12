"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface NavbarProps {
  userName?: string;
  targetRole?: string;
  activeTab?: "dashboard" | "resume" | "interview" | "report" | "profile";
}

export default function Navbar({ userName, targetRole, activeTab }: NavbarProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("skillviva_resume_context");
    localStorage.removeItem("skillviva_interview_config");
    router.push("/login");
  };

  return (
    <>
      {/* Top Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#1a1a1a] bg-black/95 backdrop-blur-md">
        <div className="max-w-7xl w-full mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="brush-text text-white text-2xl tracking-widest hover:text-[#e63329] transition-colors mt-1">
            SKILLVIVA
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden sm:flex items-center gap-6">
            <Link 
              href="/dashboard" 
              className={`font-body text-xs uppercase tracking-widest transition-colors ${activeTab === "dashboard" ? "text-[#e63329]" : "text-[#555] hover:text-[#888]"}`}
            >
              Dashboard
            </Link>
            <Link 
              href="/resume" 
              className={`font-body text-xs uppercase tracking-widest transition-colors ${activeTab === "resume" ? "text-[#e63329]" : "text-[#555] hover:text-[#888]"}`}
            >
              Resume
            </Link>
            <Link 
              href="/interview" 
              className={`font-body text-xs uppercase tracking-widest transition-colors ${activeTab === "interview" ? "text-[#e63329]" : "text-[#555] hover:text-[#888]"}`}
            >
              Interview
            </Link>
          </div>

          {/* Right: User + Profile + Logout */}
          <div className="flex items-center gap-3">
            {userName && (
              <div className="hidden sm:flex flex-col items-end mr-2">
                <Link href="/profile" className="font-body text-xs text-white font-semibold hover:underline cursor-pointer">
                  {userName}
                </Link>
                {targetRole && <span className="font-body text-[10px] text-[#e63329] uppercase tracking-widest">{targetRole}</span>}
              </div>
            )}
            
            {userName && (
              <Link href="/profile" className="w-8 h-8 rounded-full bg-[#111] border border-[#333] hover:border-[#e63329] flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer">
                <span className="font-body text-xs font-bold text-white">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </Link>
            )}

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="font-body text-xs text-[#555] hover:text-[#e63329] uppercase tracking-widest transition-colors disabled:opacity-50 ml-2"
            >
              {loggingOut ? "..." : "Logout"}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Tab Bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-[#1a1a1a] bg-black/95 backdrop-blur-md pb-safe">
        <div className="flex items-center justify-around h-16 px-2">
          <Link href="/dashboard" className={`flex flex-col items-center justify-center flex-1 h-full ${activeTab === "dashboard" ? "text-white" : "text-[#444]"}`}>
            <svg className="w-5 h-5 mb-1" fill="currentColor" viewBox="0 0 24 24"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>
            <span className="font-body text-[9px] uppercase tracking-widest">Home</span>
          </Link>

          <Link href="/resume" className={`flex flex-col items-center justify-center flex-1 h-full ${activeTab === "resume" ? "text-white" : "text-[#444]"}`}>
            <svg className="w-5 h-5 mb-1" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>
            <span className="font-body text-[9px] uppercase tracking-widest">Resume</span>
          </Link>

          <Link href="/interview" className={`flex flex-col items-center justify-center flex-1 h-full ${activeTab === "interview" ? "text-[#e63329]" : "text-[#444]"}`}>
            {/* Removed the -mt-4 to prevent overlap on small screens */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${activeTab === "interview" ? "bg-[#e63329] text-white" : "bg-transparent border border-[#333] text-[#444]"}`}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
            </div>
            <span className="font-body text-[9px] uppercase tracking-widest">Start</span>
          </Link>

          <Link href="/profile" className={`flex flex-col items-center justify-center flex-1 h-full ${activeTab === "profile" ? "text-white" : "text-[#444]"}`}>
            <svg className="w-5 h-5 mb-1" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2a7.2 7.2 0 0 1-6-3.22c.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08a7.2 7.2 0 0 1-6 3.22z"/></svg>
            <span className="font-body text-[9px] uppercase tracking-widest">Profile</span>
          </Link>
        </div>
      </nav>

      {/* Spacer for fixed top navbar */}
      <div className="h-16" />
    </>
  );
}