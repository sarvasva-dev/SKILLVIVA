"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

interface DetailedFeedback {
  feedback: string;
  atsFriendly: boolean;
  atsReason: string;
  pageCount: string;
  pageAnalysis: string;
  missingSkills: string[];
  extraSkills: string[];
  mismatches: string[];
  improvements: string[];
  suggestedDifficulty: number;
}

export default function ResumePage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<"IDLE" | "ANALYZING" | "DONE">("IDLE");
  const [detailedFeedback, setDetailedFeedback] = useState<DetailedFeedback | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userStr = localStorage.getItem("skillviva_user");
        if (!userStr) { router.push("/login"); return; }
        const data = JSON.parse(userStr);
        setUserProfile(data);
        if (data.resumeAnalysis) {
          setDetailedFeedback(data.resumeAnalysis);
          setStatus("DONE");
        }
      } catch {
        router.push("/login");
      }
    };
    fetchUser();
  }, [router]);

  const handleFileChange = async (selectedFile: File) => {
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      await analyzeResume(selectedFile);
    } else {
      alert("Please upload a valid PDF file.");
    }
  };

  const analyzeResume = async (pdfFile: File) => {
    setStatus("ANALYZING");
    try {
      const targetRole = userProfile?.targetRole || "Unknown";
      
      const formData = new FormData();
      formData.append("file", pdfFile);
      formData.append("targetRole", targetRole);

      const response = await fetch("/api/resume", {
        method: "POST",
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze resume");
      }

      if (data.feedback) {
        // Exclude the extractedText from the feedback object to keep it clean, but save it separately
        const { extractedText, ...feedbackDetails } = data;
        
        setDetailedFeedback(feedbackDetails as DetailedFeedback);
        
        // Save resume context for interview
        if (extractedText) {
           localStorage.setItem("skillviva_resume_context", JSON.stringify({
             text: extractedText,
             expires: Date.now() + 1000 * 60 * 60 * 24
           }));
        }

        // Update user profile
        if (userProfile) {
          const updatedUser = { ...userProfile, resumeAnalysis: feedbackDetails as DetailedFeedback };
          setUserProfile(updatedUser);
          localStorage.setItem("skillviva_user", JSON.stringify(updatedUser));
        }
      }
    } catch (error: any) {
      console.error("Analysis error:", error);
      alert(error.message || "Something went wrong during analysis.");
      setFile(null);
    } finally {
      setStatus("DONE");
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <Navbar userName={userProfile?.name} targetRole={userProfile?.targetRole} activeTab="resume" />

      <main className="max-w-7xl w-full mx-auto px-4 py-6 pb-24 sm:pb-10">

        {/* Header */}
        <div className="mb-8">
          <div className="tag tag-red mb-2 inline-block">STEP 1</div>
          <h1 className="brush-text text-white text-4xl sm:text-5xl leading-tight">
            YOUR<br/>RESUME.
          </h1>
          <p className="font-body text-[#666] text-sm mt-2 leading-relaxed">
            Upload your PDF. AI will analyze it against <strong className="text-white">{userProfile?.targetRole || "your role"}</strong>.
          </p>
        </div>

        {/* Upload Zone */}
        {status === "IDLE" && (
          <div
            className={`card-gritty cursor-pointer border-dashed border-2 flex flex-col items-center justify-center py-20 transition-all ${isDragging ? "border-white bg-[#111]" : "border-[#333] hover:border-[#555]"}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]); }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={(e) => e.target.files && handleFileChange(e.target.files[0])} />
            <div className="text-5xl mb-4 opacity-40">📄</div>
            <h3 className="brush-text text-2xl text-white mb-2">UPLOAD RESUME PDF</h3>
            <p className="font-body text-[#555] text-xs uppercase tracking-widest">or tap to browse</p>
          </div>
        )}

        {/* Loading */}
        {status === "ANALYZING" && (
          <div className="card-gritty py-20 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 border-4 border-[#222] border-t-[#e63329] rounded-full animate-spin mb-6" />
            <h3 className="brush-text text-2xl text-white mb-2">
              EVALUATION IN PROGRESS...
            </h3>
            <p className="font-body text-[#555] text-sm">
              Extracting and comparing against {userProfile?.targetRole || "your role"}...
            </p>
          </div>
        )}

        {/* Results */}
        {status === "DONE" && detailedFeedback && (
          <div className="space-y-4 fade-up">

            {/* Overall */}
            <div className="card-gritty border-[#e63329]/20">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <div className="tag tag-red">AI EVALUATION</div>
                <span className={`font-body text-xs font-bold px-3 py-1 border ${detailedFeedback.atsFriendly ? "text-[#00ff66] border-[#00ff66]/30 bg-[#00ff66]/10" : "text-orange-400 border-orange-400/30 bg-orange-400/10"}`}>
                  ATS: {detailedFeedback.atsFriendly ? "✓ PASS" : "✗ FAIL"}
                </span>
              </div>
              <p className="font-body text-[#ccc] text-sm leading-relaxed">{detailedFeedback.feedback}</p>
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-[#222]">
                <div>
                  <p className="font-body text-[10px] text-[#555] uppercase tracking-widest mb-1">ATS Reason</p>
                  <p className="font-body text-xs text-[#888]">{detailedFeedback.atsReason}</p>
                </div>
                <div>
                  <p className="font-body text-[10px] text-[#555] uppercase tracking-widest mb-1">Pages</p>
                  <p className="font-body text-xs text-[#888]">{detailedFeedback.pageCount} — {detailedFeedback.pageAnalysis}</p>
                </div>
              </div>
            </div>

            {/* Skills Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="card-gritty">
                <h4 className="brush-text text-lg text-white mb-3 border-b border-[#222] pb-2">MISSING SKILLS</h4>
                {detailedFeedback.missingSkills?.length > 0 ? (
                  <ul className="space-y-1">
                    {detailedFeedback.missingSkills.map((s, i) => <li key={i} className="font-body text-xs text-orange-400 flex items-center gap-2"><span className="text-[#333]">▸</span>{s}</li>)}
                  </ul>
                ) : <p className="font-body text-xs text-[#555]">Fully loaded.</p>}
              </div>
              <div className="card-gritty">
                <h4 className="brush-text text-lg text-white mb-3 border-b border-[#222] pb-2">MISMATCHES</h4>
                {detailedFeedback.mismatches?.length > 0 ? (
                  <ul className="space-y-1">
                    {detailedFeedback.mismatches.map((s, i) => <li key={i} className="font-body text-xs text-[#e63329] flex items-center gap-2"><span className="text-[#333]">▸</span>{s}</li>)}
                  </ul>
                ) : <p className="font-body text-xs text-[#555]">Clean alignment.</p>}
              </div>
              <div className="card-gritty">
                <h4 className="brush-text text-lg text-white mb-3 border-b border-[#222] pb-2">EXTRA / IRRELEVANT</h4>
                {detailedFeedback.extraSkills?.length > 0 ? (
                  <ul className="space-y-1">
                    {detailedFeedback.extraSkills.map((s, i) => <li key={i} className="font-body text-xs text-[#555] flex items-center gap-2"><span className="text-[#333]">▸</span>{s}</li>)}
                  </ul>
                ) : <p className="font-body text-xs text-[#555]">No fluff.</p>}
              </div>
              <div className="card-gritty">
                <h4 className="brush-text text-lg text-white mb-3 border-b border-[#222] pb-2">IMPROVEMENTS</h4>
                {detailedFeedback.improvements?.length > 0 ? (
                  <ul className="space-y-1">
                    {detailedFeedback.improvements.map((s, i) => <li key={i} className="font-body text-xs text-[#888] flex items-center gap-2"><span className="text-[#e63329]">▸</span>{s}</li>)}
                  </ul>
                ) : <p className="font-body text-xs text-[#555]">Looking good.</p>}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => { setDetailedFeedback(null); setFile(null); setStatus("IDLE"); }}
                className="btn-outline flex-1 justify-center py-4"
              >
                ↺ UPLOAD NEW RESUME
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="btn-primary flex-1 justify-center py-4"
                style={{ background: "#e63329", color: "#fff" }}
              >
                GO TO DASHBOARD →
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}