"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

interface ReportData {
  strong_areas: string[];
  weak_areas: string[];
  overall_feedback: string;
  recommendations: string[];
}

interface HistoryItem {
  question: string;
  answer: string;
  score: number;
  feedback: string;
  hesitation: number;
}

interface StoredReport {
  reportData: ReportData;
  history: HistoryItem[];
  role: string;
  interviewId: string | null;
}

export default function ReportPage() {
  const router = useRouter();
  const [data, setData] = useState<StoredReport | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch user for navbar
    fetch("/api/auth/me")
      .then(r => r.ok ? r.json() : null)
      .then(u => setUser(u))
      .catch(() => {});

    // Read report from sessionStorage
    const stored = sessionStorage.getItem("skillviva_report");
    if (stored) {
      try {
        setData(JSON.parse(stored));
      } catch {
        router.push("/dashboard");
      }
    } else {
      router.push("/dashboard");
    }
    
    // Simulate slight loading delay for animation setup
    setTimeout(() => setLoading(false), 500);
  }, [router]);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#222] border-t-[#e63329] rounded-full animate-spin" />
          <p className="brush-text text-[#888] tracking-widest animate-pulse">COMPILING REPORT...</p>
        </div>
      </div>
    );
  }

  const { reportData, history, role } = data;
  const allScores = history.map(h => h.score);
  const avgScore = allScores.length > 0 ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10 : 0;

  // Fixed scoring thresholds (out of 10)
  const getScoreColor = (score: number) => {
    if (score >= 7.5) return "text-[#00ff66]";
    if (score >= 5.0) return "text-yellow-400";
    return "text-[#e63329]";
  };

  const getScoreBg = (score: number) => {
    if (score >= 7.5) return "bg-[#00ff66] shadow-[0_0_15px_rgba(0,255,102,0.3)]";
    if (score >= 5.0) return "bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)]";
    return "bg-[#e63329] shadow-[0_0_15px_rgba(230,51,41,0.3)]";
  };

  const getScoreBorder = (score: number) => {
    if (score >= 7.5) return "border-[#00ff66]";
    if (score >= 5.0) return "border-yellow-400";
    return "border-[#e63329]";
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar userName={user?.name} targetRole={user?.targetRole} activeTab="report" />

      <main className="max-w-[1400px] mx-auto px-4 xl:px-8 py-8 pb-24 space-y-8 animate-fade-in">
        
        {/* Top Header Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Main Title Card */}
          <div className="lg:col-span-12 card-gritty relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <svg className="w-48 h-48" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 22h20L12 2zm0 4.5l6.5 13h-13L12 6.5z"/></svg>
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 relative z-10 h-full">
              <div>
                <div className="tag tag-red mb-3 inline-block animate-slide-up">ASSESSMENT CONCLUDED</div>
                <h1 className="brush-text text-5xl sm:text-7xl leading-none tracking-tight">
                  YOUR<br/>PERFORMANCE
                </h1>
                <p className="font-body text-[#777] text-sm uppercase tracking-widest mt-4">Role Evaluated: <span className="text-white font-bold">{role}</span></p>
              </div>
              <div className="text-left sm:text-right mt-4 sm:mt-0">
                <div className={`brush-text leading-none ${getScoreColor(avgScore)}`} style={{ fontSize: "clamp(3.5rem, 10vw, 7rem)" }}>
                  {avgScore}
                </div>
                <div className="font-body text-xs text-[#555] uppercase tracking-widest border-t border-[#222] pt-2 mt-2 inline-block">AVG SCORE / 10</div>
              </div>
            </div>
          </div>

          {/* Removed Action Card from here, moved to the bottom right column */}
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column (Main Analytics) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Score Progression Graph */}
            <div className="card-gritty">
              <div className="flex justify-between items-center mb-6">
                <h3 className="brush-text text-2xl">SCORE PROGRESSION</h3>
                <span className="text-xs text-[#555] font-body tracking-widest uppercase">Performance over time</span>
              </div>
              
              <div className="relative h-64 mt-4 overflow-x-auto overflow-y-hidden custom-scrollbar pb-2">
                <div className="min-w-[600px] h-full relative">
                  {/* Y-axis guidelines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                    <div className="w-full border-t border-white border-dashed"></div>
                    <div className="w-full border-t border-white border-dashed"></div>
                    <div className="w-full border-t border-white border-dashed"></div>
                    <div className="w-full border-t border-white border-dashed"></div>
                    <div className="w-full border-t border-white border-dashed"></div>
                  </div>

                  {/* Graph Bars */}
                  <div className="absolute inset-0 flex items-end justify-between gap-1 sm:gap-2 px-2 pb-1">
                    {history.map((item, idx) => {
                      const heightPercent = Math.max(5, item.score * 10); // Fix: 8/10 -> 80%
                      return (
                        <div key={idx} className="relative flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                          
                          {/* Hover Tooltip */}
                          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[#111] border border-[#333] rounded px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none whitespace-nowrap shadow-xl">
                             <div className={`font-bold ${getScoreColor(item.score)}`}>Score: {item.score}/10</div>
                             <div className="text-[10px] text-[#888]">Hesitation: {item.hesitation}s</div>
                          </div>

                          {/* The Bar */}
                          <div
                            className={`w-full max-w-[40px] rounded-t-sm transition-all duration-1000 ease-out hover:brightness-125 ${getScoreBg(item.score)} relative`}
                            style={{ height: `${heightPercent}%` }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                          </div>
                          <span className="font-body text-[10px] text-[#666] group-hover:text-white transition-colors">Q{idx + 1}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Strengths & Weaknesses Grid */}
            {reportData && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="card-gritty bg-gradient-to-br from-[#00ff66]/5 to-transparent border-[#00ff66]/20">
                  <h4 className="brush-text text-[#00ff66] text-xl mb-4 flex items-center gap-2">
                    <span className="text-2xl">▲</span> STRENGTHS
                  </h4>
                  <ul className="space-y-3">
                    {reportData.strong_areas.map((s, i) => (
                      <li key={i} className="font-body text-sm text-[#ddd] flex gap-3 items-start bg-black/20 p-2 rounded">
                        <span className="text-[#00ff66] flex-shrink-0 mt-0.5">✦</span>
                        <span className="leading-relaxed">{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="card-gritty bg-gradient-to-br from-[#e63329]/5 to-transparent border-[#e63329]/20">
                  <h4 className="brush-text text-[#e63329] text-xl mb-4 flex items-center gap-2">
                    <span className="text-2xl">▼</span> WEAKNESSES
                  </h4>
                  <ul className="space-y-3">
                    {reportData.weak_areas.map((w, i) => (
                      <li key={i} className="font-body text-sm text-[#ddd] flex gap-3 items-start bg-black/20 p-2 rounded">
                        <span className="text-[#e63329] flex-shrink-0 mt-0.5">✦</span>
                        <span className="leading-relaxed">{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Executive Summary */}
            {reportData && (
              <div className="card-gritty relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#e63329] to-[#00ff66]"></div>
                <h3 className="brush-text text-2xl mb-4 ml-2">EXECUTIVE SUMMARY</h3>
                <p className="font-body text-[#ccc] text-base leading-loose ml-2">{reportData.overall_feedback}</p>
              </div>
            )}

            {/* Detailed Q&A Log */}
            <div className="card-gritty">
              <h3 className="brush-text text-2xl mb-6 flex items-center justify-between">
                <span>INTERVIEW LOG</span>
                <span className="text-xs font-body text-[#555] tracking-widest">{history.length} QUESTIONS</span>
              </h3>
              
              <div className="space-y-6 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                {history.map((item, idx) => (
                  <div key={idx} className={`p-5 bg-[#0a0a0a] border-l-2 ${getScoreBorder(item.score)} rounded-r-md hover:bg-[#111] transition-colors relative group`}>
                    <div className="absolute top-4 right-4 text-xs font-bold font-body text-[#555] bg-black px-2 py-1 rounded">
                      HESITATION: <span className="text-white">{item.hesitation}s</span>
                    </div>

                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-2 py-1 text-[10px] font-bold rounded bg-black border ${getScoreBorder(item.score)} ${getScoreColor(item.score)}`}>
                        Q{String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className={`font-body text-lg font-bold ${getScoreColor(item.score)}`}>
                        {item.score} / 10
                      </span>
                    </div>
                    
                    <p className="font-body text-base text-white font-semibold mb-4 leading-relaxed">&ldquo;{item.question}&rdquo;</p>
                    
                    <div className="bg-black/50 border border-[#222] p-4 rounded-sm mb-4">
                      <div className="text-[#555] uppercase tracking-widest text-[10px] mb-2 font-bold">Candidate Response:</div>
                      <p className="font-body text-sm text-[#aaa] leading-relaxed">
                        {item.answer || <span className="text-[#e63329] italic">No response recorded.</span>}
                      </p>
                    </div>
                    
                    <div className="flex gap-2 items-start">
                      <span className="text-[#e63329] mt-0.5">↳</span>
                      <p className="font-body text-sm text-[#ddd] leading-relaxed">
                        <span className="font-bold text-white">AI Feedback: </span>
                        {item.feedback}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column (Prep Plan) */}
          <div className="lg:col-span-4">
            <div className="sticky top-24">
              {reportData?.recommendations?.length > 0 && (
                <div className="card-gritty">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                    <div className="w-8 h-8 rounded-full bg-[#e63329]/20 flex items-center justify-center text-[#e63329]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    </div>
                    <h3 className="brush-text text-xl">AI PREP PLAN</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {reportData.recommendations.map((r, i) => (
                      <div key={i} className="flex gap-4 items-start group">
                        <div className="w-8 h-8 rounded bg-black border border-[#222] flex items-center justify-center flex-shrink-0 group-hover:border-[#e63329] transition-colors">
                          <span className="text-[#e63329] font-body text-xs font-bold">{String(i + 1).padStart(2, "0")}</span>
                        </div>
                        <p className="font-body text-sm text-[#999] leading-relaxed mt-1 group-hover:text-white transition-colors">{r}</p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-white/10">
                    <p className="font-body text-xs text-[#555] text-center uppercase tracking-widest leading-relaxed">
                      Implement these steps before your next session to drastically improve your score.
                    </p>
                  </div>
                </div>
              )}

              {/* Action Card (Moved from Top Header) */}
              <div className="card-gritty flex flex-col justify-between gap-6 mt-8">
                 <div>
                   <h3 className="brush-text text-xl mb-2">NEXT STEPS</h3>
                   <p className="font-body text-sm text-[#888]">Review your performance breakdown and AI prep plan before attempting the arena again.</p>
                 </div>
                 <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      sessionStorage.removeItem("skillviva_report");
                      router.push("/interview");
                    }}
                    className="btn-primary w-full justify-center py-4 bg-[#e63329] hover:bg-[#ff3329] text-white transition-colors shadow-[0_0_15px_rgba(230,51,41,0.3)]"
                  >
                    ↺ RETAKE ARENA
                  </button>
                  <button
                    onClick={() => {
                      sessionStorage.removeItem("skillviva_report");
                      router.push("/dashboard");
                    }}
                    className="btn-outline w-full justify-center py-4 hover:bg-white/5"
                  >
                    ◀ BACK TO DASHBOARD
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      <style jsx global>{`
        .animate-fade-in {
          animation: fadeIn 0.8s ease-out forwards;
        }
        .animate-slide-up {
          animation: slideUp 0.6s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #000;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #222;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #444;
        }
      `}</style>
    </div>
  );
}