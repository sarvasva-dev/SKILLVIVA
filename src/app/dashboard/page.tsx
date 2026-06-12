"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  targetRole: string;
  resumeAnalysis?: {
    feedback: string;
    atsFriendly: boolean;
    missingSkills: string[];
    mismatches: string[];
    improvements: string[];
    suggestedDifficulty: number;
  };
}

interface InterviewSession {
  _id: string;
  role: string;
  status: string;
  createdAt: string;
  history: Array<{ score: number; question: string; answer: string; feedback: string; hesitation: number }>;
  reportData?: {
    overall_feedback: string;
    strong_areas: string[];
    weak_areas: string[];
    recommendations: string[];
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [interviews, setInterviews] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [customRole, setCustomRole] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [meRes, interviewsRes, rolesRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/interviews/user"),
          fetch("/api/roles"),
        ]);

        if (!meRes.ok) { router.push("/login"); return; }

        const userData = await meRes.json();
        setUser(userData);
        setSelectedRole(userData.targetRole || "");
        // if (userData.resumeAnalysis?.suggestedDifficulty) {
        //   setSelectedDifficulty(userData.resumeAnalysis.suggestedDifficulty);
        // }

        if (interviewsRes.ok) {
          const interviewsData = await interviewsRes.json();
          setInterviews(Array.isArray(interviewsData) ? interviewsData : []);
        }

        if (rolesRes.ok) {
          const rolesData = await rolesRes.json();
          if (Array.isArray(rolesData)) {
            const roleNames = rolesData.map((r: any) => r.name);
            setRoles(roleNames);
            if (userData.targetRole && !roleNames.includes(userData.targetRole)) {
              setSelectedRole("Other");
              setCustomRole(userData.targetRole);
            }
          }
        }
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

  const handleStartInterview = async () => {
    if (!user?.resumeAnalysis) {
      router.push("/resume");
      return;
    }
    const finalRole = selectedRole === "Other" ? customRole : selectedRole;
    if (!finalRole) {
      alert("Please select your target role before starting.");
      return;
    }

    setIsGenerating(true);
    try {
      if (user && finalRole !== (user.targetRole || "")) {
        await fetch("/api/auth/me", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: user.name, targetRole: finalRole })
        });
      }

      // Pre-generate custom questions before starting
      const genRes = await fetch("/api/questions/generate-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: finalRole, resumeContext: JSON.stringify(user?.resumeAnalysis || {}) })
      });

      if (!genRes.ok) {
        alert("Failed to prepare your customized arena. Please try again.");
        return;
      }
    } catch (err) {
      console.error("Failed during interview initialization", err);
      alert("Network error occurred. Please check your connection.");
      return;
    } finally {
      setIsGenerating(false);
    }

    localStorage.setItem("skillviva_interview_config", JSON.stringify({ role: finalRole, diff: String(selectedDifficulty) }));
    router.push("/interview");
  };

  const handleClearHistory = async () => {
    if (!confirm("Are you sure you want to clear your entire interview history?")) return;
    try {
      const res = await fetch("/api/interviews/user/clear", { method: "DELETE" });
      if (res.ok) {
        setInterviews([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Computed stats — include ALL interviews that have any scores
  const totalInterviews = interviews.length;
  const allScores = interviews.flatMap(i => i.history?.map(h => h.score).filter(s => typeof s === "number") || []);
  const avgScore = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
  const bestScore = allScores.length > 0 ? Math.max(...allScores) : 0;
  const completedInterviews = interviews.filter(i => i.status === "CONCLUDED");

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-[#00ff66]";
    if (score >= 40) return "text-yellow-400";
    return "text-[#e63329]";
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#222] border-t-[#e63329] rounded-full animate-spin mx-auto mb-4" />
          <p className="font-body text-[#555] text-sm">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar userName={user?.name} targetRole={user?.targetRole} activeTab="dashboard" />

      <main className="max-w-7xl w-full mx-auto px-4 py-8 pb-24 sm:pb-10 sm:pt-8 pt-6">

        {/* ── WELCOME HEADER ── */}
        <div className="mb-8">
          <div className="tag tag-red mb-2 inline-block">YOUR ARENA</div>
          <h1 className="brush-text text-white text-4xl sm:text-5xl leading-tight">
            WELCOME BACK,<br/><span className="text-[#e63329]">{user?.name?.toUpperCase() || "RECRUIT"}.</span>
          </h1>
          {user?.targetRole && (
            <p className="font-body text-[#555] text-sm mt-2 uppercase tracking-widest">
              Target: {user.targetRole}
            </p>
          )}
        </div>

        {/* ── STATS ROW ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Interviews", value: totalInterviews, suffix: "" },
            { label: "Avg Score", value: avgScore, suffix: "/10" },
            { label: "Best Score", value: bestScore, suffix: "/10" },
            { label: "Level", value: selectedDifficulty, suffix: "" },
          ].map(({ label, value, suffix }) => (
            <div key={label} className="card-gritty p-4 text-center">
              <div className={`brush-text text-4xl sm:text-5xl leading-none mb-1 ${value === 0 ? "text-[#333]" : "text-white"}`}>
                {value}{suffix}
              </div>
              <div className="font-body text-[10px] text-[#555] uppercase tracking-widest">{label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT COLUMN: Resume + Start Interview ── */}
          <div className="lg:col-span-1 space-y-4">

            {/* Resume Health */}
            <div className="card-gritty">
              <div className="flex items-center justify-between mb-4">
                <h3 className="brush-text text-white text-lg">RESUME HEALTH</h3>
                <Link href="/resume" className="font-body text-[10px] text-[#e63329] uppercase tracking-widest hover:underline">
                  {user?.resumeAnalysis ? "Update" : "Upload"} →
                </Link>
              </div>
              {user?.resumeAnalysis ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-body text-xs text-[#888]">ATS Friendly</span>
                    <span className={`font-body text-xs font-bold ${user.resumeAnalysis.atsFriendly ? "text-[#00ff66]" : "text-[#e63329]"}`}>
                      {user.resumeAnalysis.atsFriendly ? "✓ YES" : "✗ NO"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-body text-xs text-[#888]">Missing Skills</span>
                    <span className="font-body text-xs font-bold text-orange-400">
                      {user.resumeAnalysis.missingSkills?.length || 0} gaps
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-body text-xs text-[#888]">Mismatches</span>
                    <span className="font-body text-xs font-bold text-[#e63329]">
                      {user.resumeAnalysis.mismatches?.length || 0} found
                    </span>
                  </div>
                  {user.resumeAnalysis.missingSkills?.length > 0 && (
                    <div className="border-t border-[#222] pt-3">
                      <p className="font-body text-[10px] text-[#555] uppercase tracking-widest mb-2">Top Gaps</p>
                      <div className="flex flex-wrap gap-1">
                        {user.resumeAnalysis.missingSkills.slice(0, 3).map((s, i) => (
                          <span key={i} className="px-2 py-0.5 bg-orange-400/10 border border-orange-400/20 font-body text-[10px] text-orange-400 rounded-sm">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="font-body text-[#555] text-xs mb-4 leading-relaxed">
                    No resume uploaded yet. Upload to get personalized AI questions.
                  </p>
                  <Link href="/resume" className="btn-outline text-xs py-2 px-4">
                    ↑ UPLOAD RESUME
                  </Link>
                </div>
              )}
            </div>

            {/* Start Interview */}
            <div className="card-gritty border-[#e63329]/20">
              <h3 className="brush-text text-white text-lg mb-4">START INTERVIEW</h3>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="font-body text-[10px] text-[#555] uppercase tracking-widest mb-1.5 block">Role</label>
                  <select
                    className="input-gritty text-sm appearance-none"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                  >
                    <option value="" disabled>Select role</option>
                    {roles.map((r, i) => <option key={i} value={r}>{r}</option>)}
                    <option value="Other">Other (type manually)</option>
                  </select>
                </div>

                {selectedRole === "Other" && (
                  <input
                    type="text"
                    className="input-gritty text-sm"
                    placeholder="e.g. Blockchain Developer"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                  />
                )}

                <div>
                  <label className="font-body text-[10px] text-[#555] uppercase tracking-widest mb-1.5 block">Difficulty</label>
                  <div className="flex gap-2">
                    {[1, 2, 3].map(level => (
                      <button
                        key={level}
                        onClick={() => setSelectedDifficulty(level)}
                        className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest border transition-all ${
                          selectedDifficulty === level
                            ? "border-[#e63329] bg-[#e63329] text-white"
                            : "border-[#333] text-[#555] hover:border-[#e63329]/50 hover:text-white"
                        }`}
                      >
                        L{level}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleStartInterview}
                disabled={isGenerating}
                className="btn-primary w-full justify-center py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "#e63329", color: "#fff" }}
              >
                {isGenerating ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    PREPARING INTERVIEW...
                  </span>
                ) : (
                  <>▶ {(selectedRole === "Other" ? customRole : selectedRole) !== (user?.targetRole || "") ? "SAVE & START INTERVIEW" : "START INTERVIEW"}</>
                )}
              </button>

              {!user?.resumeAnalysis && (
                <p className="font-body text-[10px] text-[#444] text-center mt-2">
                  Upload resume first for personalized questions
                </p>
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN: Interview History ── */}
          <div className="lg:col-span-2">
            <div className="card-gritty h-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="brush-text text-white text-lg">INTERVIEW HISTORY</h3>
                <div className="flex items-center gap-4">
                  <span className="font-body text-[10px] text-[#555] uppercase tracking-widest">
                    {totalInterviews} session{totalInterviews !== 1 ? "s" : ""}
                  </span>
                  {totalInterviews > 0 && (
                    <button onClick={handleClearHistory} className="font-body text-[10px] text-[#e63329] uppercase tracking-widest hover:text-white transition-colors">
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* ── PERFORMANCE BAR CHART ── */}
              {completedInterviews.length > 0 && (
                <div className="mb-8 border border-[#1a1a1a] p-4 bg-[#0a0a0a]">
                  <h4 className="font-body text-[10px] text-[#555] uppercase tracking-widest mb-4">Performance Trend</h4>
                  <div className="flex items-end gap-2 h-24">
                    {completedInterviews.slice(-12).map((interview, i) => {
                      const scores = interview.history?.map(h => h.score) || [];
                      const sessionAvg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
                      const height = `${Math.max(5, sessionAvg * 10)}%`;
                      const color = sessionAvg >= 70 ? "bg-[#00ff66]" : sessionAvg >= 40 ? "bg-yellow-400" : "bg-[#e63329]";
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                          <div className={`w-full ${color} opacity-60 group-hover:opacity-100 transition-opacity rounded-t-sm`} style={{ height }} />
                          <span className="absolute -top-5 left-1/2 -translate-x-1/2 font-body text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            {sessionAvg}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {interviews.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-4xl mb-4">🎙️</div>
                  <h4 className="brush-text text-white text-xl mb-2">NO INTERVIEWS YET</h4>
                  <p className="font-body text-[#555] text-sm">
                    Your interview history will appear here after your first session.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {interviews.map((interview) => {
                    const scores = interview.history?.map(h => h.score) || [];
                    const sessionAvg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
                    const questionsAnswered = scores.length;
                    return (
                      <div key={interview._id} className="border border-[#1a1a1a] p-4 hover:border-[#333] transition-colors">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="tag text-[10px]">{interview.role || "Unknown Role"}</span>
                              <span className={`font-body text-[10px] uppercase tracking-widest ${interview.status === "CONCLUDED" ? "text-[#00ff66]" : "text-yellow-400"}`}>
                                {interview.status === "CONCLUDED" ? "✓ Complete" : "In Progress"}
                              </span>
                            </div>
                            <p className="font-body text-[#555] text-xs">
                              {formatDate(interview.createdAt)} · {questionsAnswered} Q{questionsAnswered !== 1 ? "s" : ""} answered
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className={`brush-text text-3xl leading-none ${getScoreColor(sessionAvg)}`}>
                              {sessionAvg > 0 ? sessionAvg : "—"}
                            </div>
                            {sessionAvg > 0 && <div className="font-body text-[10px] text-[#444]">/10 avg</div>}
                          </div>
                        </div>
                        {interview.status === "CONCLUDED" && interview.reportData && (
                          <div className="mt-3 pt-3 border-t border-[#111]">
                            <p className="font-body text-xs text-[#666] italic line-clamp-2">
                              &ldquo;{interview.reportData.overall_feedback}&rdquo;
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

    </div>
  );
}