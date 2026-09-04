"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface NavbarProps {
  userName?: string;
  targetRole?: string;
  activeTab?: "dashboard" | "resume" | "interview" | "report" | "profile";
}

export function getCustomApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("skillviva_custom_api_key") || "";
}

export default function Navbar({ userName, targetRole, activeTab }: NavbarProps) {
  const router = useRouter();
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [savedKeyActive, setSavedKeyActive] = useState(false);

  useEffect(() => {
    const key = localStorage.getItem("skillviva_custom_api_key");
    if (key) {
      setApiKey(key);
      setSavedKeyActive(true);
    }
  }, []);

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      localStorage.setItem("skillviva_custom_api_key", apiKey.trim());
      setSavedKeyActive(true);
    } else {
      localStorage.removeItem("skillviva_custom_api_key");
      setSavedKeyActive(false);
    }
    setShowApiKeyModal(false);
  };

  const handleClearApiKey = () => {
    localStorage.removeItem("skillviva_custom_api_key");
    setApiKey("");
    setSavedKeyActive(false);
    setShowApiKeyModal(false);
  };

  return (
    <>
      {/* Top Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#1a1a1a] bg-black/95 backdrop-blur-md">
        <div className="max-w-7xl w-full mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="brush-text text-white text-2xl tracking-widest hover:text-[#e63329] transition-colors mt-1">
              SKILLVIVA
            </Link>
            <span className="hidden md:inline-block font-body text-[9px] bg-[#e63329]/10 border border-[#e63329]/30 text-[#e63329] px-2 py-0.5 tracking-widest uppercase">
              OPEN PLATFORM
            </span>
          </div>

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

          {/* Right: API Key + User + Profile */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowApiKeyModal(true)}
              className={`font-body text-[10px] uppercase tracking-widest px-2.5 py-1 border transition-colors flex items-center gap-1.5 ${
                savedKeyActive
                  ? "border-[#00ff66]/40 text-[#00ff66] bg-[#00ff66]/10"
                  : "border-[#333] text-[#888] hover:border-white hover:text-white"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${savedKeyActive ? "bg-[#00ff66]" : "bg-[#555]"}`} />
              {savedKeyActive ? "API KEY ACTIVE" : "⚙️ SET API KEY"}
            </button>

            {userName && (
              <div className="hidden sm:flex flex-col items-end mr-1">
                <Link href="/profile" className="font-body text-xs text-white font-semibold hover:underline cursor-pointer">
                  {userName}
                </Link>
                {targetRole && <span className="font-body text-[10px] text-[#e63329] uppercase tracking-widest">{targetRole}</span>}
              </div>
            )}
            
            <Link href="/profile" className="w-8 h-8 rounded-full bg-[#111] border border-[#333] hover:border-[#e63329] flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer">
              <span className="font-body text-xs font-bold text-white">
                {(userName || "U").charAt(0).toUpperCase()}
              </span>
            </Link>
          </div>
        </div>
      </nav>

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card-gritty max-w-md w-full relative border-[#e63329]/30 fade-up">
            <button
              onClick={() => setShowApiKeyModal(false)}
              className="absolute top-4 right-4 text-[#666] hover:text-white font-body text-sm"
            >
              ✕
            </button>
            <div className="tag tag-red mb-3">OPEN PLATFORM</div>
            <h3 className="brush-text text-white text-2xl mb-2">CONFIGURE API KEY</h3>
            <p className="font-body text-[#888] text-xs leading-relaxed mb-6">
              SkillViva is an open platform. Input your Sarvam AI / Gemini API subscription key to use your custom quota, or leave empty to use server default credentials.
            </p>

            <form onSubmit={handleSaveApiKey} className="space-y-4">
              <div>
                <label className="font-body text-[10px] text-[#555] uppercase tracking-widest block mb-2">
                  Sarvam / AI Subscription Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk_..."
                  className="input-gritty text-sm"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="btn-primary flex-1 justify-center py-2.5 text-xs bg-[#e63329] text-white border-0"
                >
                  SAVE KEY
                </button>
                {savedKeyActive && (
                  <button
                    type="button"
                    onClick={handleClearApiKey}
                    className="btn-outline py-2.5 text-xs border-[#333] text-[#888]"
                  >
                    CLEAR
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

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