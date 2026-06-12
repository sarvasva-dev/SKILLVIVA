"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email) {
      setError("Please enter your email.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send OTP");
        setLoading(false);
        return;
      }

      setMessage("Access code sent to your email.");
      setStep(2);
      setLoading(false);
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!otp || otp.length < 6) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid OTP");
        setLoading(false);
        return;
      }

      // Check if they need onboarding
      if (data.isNewUser || !data.isOnboarded) {
        router.push("/onboarding");
      } else {
        router.push("/upload");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
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
        <div className="tag tag-red mb-6">MEMBER ACCESS</div>
        <h1 className="brush-text text-white text-5xl mb-2">ACCESS<br/>GRANTED.</h1>
        <p className="font-body text-[#888] text-sm mb-8">
          {step === 1 ? "Enter your email to receive a passwordless access code." : "Enter the 6-digit code sent to your email."}
        </p>

        {step === 1 ? (
          <div className="flex flex-col gap-5">
            <div>
              <label className="font-body text-xs text-[#555] uppercase tracking-widest mb-2 block">
                Email Address
              </label>
              <input
                type="email"
                className="input-gritty"
                placeholder="e.g. jason@bourne.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRequestOTP(e as any); }}
                required
              />
            </div>

            {error && (
              <div className="text-[#e63329] font-body text-xs tracking-wide bg-[#e63329]/10 p-3 border left-0 border-[#e63329]/30">
                ⚠ {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleRequestOTP as any}
              disabled={loading}
              className="btn-primary w-full justify-center mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "INITIALIZING..." : "▶ REQUEST ACCESS CODE"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleVerifyOTP} className="flex flex-col gap-5">
            <div>
              <label className="font-body text-xs text-[#555] uppercase tracking-widest mb-2 block">
                6-Digit Access Code
              </label>
              <input
                type="text"
                className="input-gritty text-center text-xl tracking-[1em]"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
              />
            </div>

            {error && (
              <div className="text-[#e63329] font-body text-xs tracking-wide bg-[#e63329]/10 p-3 border left-0 border-[#e63329]/30">
                ⚠ {error}
              </div>
            )}

            {message && (
              <div className="text-green-500 font-body text-xs tracking-wide bg-green-500/10 p-3 border left-0 border-green-500/30">
                ✓ {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "VERIFYING..." : "▶ ENTER THE ARENA"}
            </button>
            
            <button 
              type="button" 
              onClick={() => {setStep(1); setOtp(""); setError(""); setMessage("");}}
              className="text-[#888] hover:text-white font-body text-xs uppercase tracking-widest mt-2"
            >
              ← Use a different email
            </button>
          </form>
        )}
      </div>
    </main>
  );
}