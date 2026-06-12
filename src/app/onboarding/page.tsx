"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function OnboardingPage() {
  const [targetRole, setTargetRole] = useState("");
  const [customRole, setCustomRole] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/roles")
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setRoles(data.map((r: any) => r.name)); })
      .catch(err => console.error("Failed to load roles", err));
    // Fetch existing name silently
    fetch("/api/auth/me")
      .then(r => r.ok ? r.json() : null)
      .then(u => { if (u?.name) setUserName(u.name); if (u?.targetRole) setTargetRole(u.targetRole); })
      .catch(() => {});
  }, []);

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalRole = targetRole === "Other" ? customRole : targetRole;
    if (!finalRole) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: userName || "User", targetRole: finalRole }),
      });
      if (res.ok) router.push("/resume");
      else setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-black">
      {/* Background textures */}
      <div className="absolute inset-0" style={{
        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 4px)`,
      }} />
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#e63329] rounded-full blur-[150px] opacity-20 pointer-events-none" />

      <Link href="/" className="absolute top-8 left-8 brush-text text-white text-2xl tracking-widest hover:text-[#e63329] transition-colors">
        SKILLVIVA
      </Link>

      <div className="card-gritty w-full max-w-md relative z-10 fade-up">
        <div className="tag tag-red mb-6">CHANGE ROLE</div>
        <h1 className="brush-text text-white text-5xl mb-2">SELECT<br/>YOUR TARGET.</h1>
        <p className="font-body text-[#888] text-sm mb-8">
          Pick the role you want to be interviewed for. Your resume will be analyzed against it.
        </p>

        <form onSubmit={handleComplete} className="flex flex-col gap-5">
          <div>
            <label className="font-body text-xs text-[#555] uppercase tracking-widest mb-2 block">
              Your Name
            </label>
            <input
              type="text"
              className="input-gritty"
              placeholder="e.g. John Doe"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="font-body text-xs text-[#555] uppercase tracking-widest mb-2 block">
              Dream Job Title
            </label>
            <select
              className="input-gritty appearance-none"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              required
            >
              <option value="" disabled>Select your target role</option>
              {roles.map((r, i) => (
                <option key={i} value={r}>{r}</option>
              ))}
              <option value="Other">Other (Type manually)</option>
            </select>
          </div>

          {targetRole === "Other" && (
            <div>
              <label className="font-body text-xs text-[#555] uppercase tracking-widest mb-2 block">
                Type Your Custom Role
              </label>
              <input
                type="text"
                className="input-gritty"
                placeholder="e.g. Blockchain Developer"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "INITIALIZING..." : "▶ ENTER THE ARENA"}
          </button>
        </form>
      </div>
    </main>
  );
}