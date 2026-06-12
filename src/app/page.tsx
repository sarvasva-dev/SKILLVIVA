"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

/* ── Counter Animation Hook ── */
function useCountUp(target: number, duration: number = 2000, start: boolean = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // If logged in, redirect to dashboard
    fetch("/api/auth/me")
      .then(res => {
        if (res.ok) router.replace("/dashboard");
        else setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router]);

  useEffect(() => {
    if (checking) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setStatsVisible(true);
    }, { threshold: 0.3 });
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, [checking]);

  const interviews = useCountUp(10000, 2000, statsVisible);
  const improvement = useCountUp(94, 1500, statsVisible);
  const questions = useCountUp(500, 2500, statsVisible);

  if (checking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#222] border-t-[#e63329] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="bg-black min-h-screen w-full overflow-x-hidden">

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#111] bg-black/90 backdrop-blur-md w-full">
        <div className="max-w-7xl w-full mx-auto px-6 h-16 flex items-center justify-between">
          <span className="brush-text text-white text-2xl tracking-widest">SKILLVIVA</span>
          <div className="flex items-center gap-3">
            <Link href="/login" className="font-body text-xs text-[#888] uppercase tracking-widest hover:text-white transition-colors">
              Login
            </Link>
            <Link href="/login" className="btn-primary py-2 px-4 text-xs">
              GET STARTED
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen w-full flex flex-col items-center justify-center px-4 pt-14 text-center overflow-hidden">
        {/* Glow blobs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#e63329] rounded-full blur-[160px] opacity-15 pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-[#e63329] rounded-full blur-[120px] opacity-10 pointer-events-none" />
        {/* Grid */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 border border-[#e63329]/30 bg-[#e63329]/10 px-3 py-1.5 mb-8 rounded-sm">
            <span className="w-1.5 h-1.5 bg-[#e63329] rounded-full animate-pulse" />
            <span className="font-body text-xs text-[#e63329] uppercase tracking-widest">Powered by Sarvam AI Voice</span>
          </div>

          <h1 className="brush-text text-white leading-none mb-6" style={{ fontSize: "clamp(3rem, 12vw, 7rem)" }}>
            STOP<br/>PRACTICING.<br/><span className="text-[#e63329]">START</span><br/>PERFORMING.
          </h1>

          <p className="font-body text-[#888] text-base sm:text-lg max-w-xl mx-auto leading-relaxed mb-10">
            SkillViva grills you with AI-powered voice interviews tailored to your resume. 
            Get brutally honest feedback. Improve your scores. Land the job.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login" className="btn-primary py-4 px-8 text-base justify-center">
              ▶ GET STARTED FREE
            </Link>
            <a href="#how-it-works" className="btn-outline py-4 px-8 text-base justify-center">
              SEE HOW IT WORKS ↓
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <span className="font-body text-[10px] text-[#444] uppercase tracking-widest">Scroll</span>
          <svg className="w-4 h-4 text-[#444]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="w-full py-24 px-4 border-t border-[#111]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="tag tag-red mb-4 inline-block">THE PROCESS</div>
            <h2 className="brush-text text-white text-4xl sm:text-5xl">HOW IT WORKS</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step: "01", title: "Upload Resume", desc: "Drop your PDF. Our AI reads every line and identifies gaps, mismatches, and strengths against your target role.", icon: "📄" },
              { step: "02", title: "AI Analyzes You", desc: "We map your experience to real interview patterns. Missing skills, misaligned roles, weak spots — all exposed.", icon: "🧠" },
              { step: "03", title: "Get Grilled", desc: "Live voice interview. AI asks role-specific questions, detects hesitation, tracks filler words, scores in real-time.", icon: "🎙️" },
            ].map(({ step, title, desc, icon }) => (
              <div key={step} className="card-gritty relative">
                <div className="brush-text text-6xl text-[#1a1a1a] absolute top-4 right-4 leading-none select-none">{step}</div>
                <div className="text-3xl mb-4">{icon}</div>
                <h3 className="brush-text text-white text-xl mb-3">{title}</h3>
                <p className="font-body text-[#666] text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="w-full py-24 px-4 border-t border-[#111] bg-[#050505]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="tag tag-red mb-4 inline-block">FEATURES</div>
            <h2 className="brush-text text-white text-4xl sm:text-5xl">BUILT DIFFERENT.</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: "🎙️", title: "Voice AI", desc: "Real microphone. Real speech. Sarvam AI transcribes and evaluates every word." },
              { icon: "🎯", title: "Resume-Targeted Qs", desc: "Questions built from YOUR resume. Not generic. Not templated. Hyper-personal." },
              { icon: "⚡", title: "Brutal Feedback", desc: "No sugar-coating. Score, what went wrong, what you should've said — all of it." },
              { icon: "📈", title: "Adaptive Difficulty", desc: "Level 1 to 3. AI adjusts difficulty based on your answers in real-time." },
              { icon: "📊", title: "Performance Reports", desc: "Full Q&A breakdown. Strengths, weaknesses, recommendations after every session." },
              { icon: "🔐", title: "Your Data, Secure", desc: "Resume and interviews stored only for you, under your account." },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="border border-[#1a1a1a] p-5 hover:border-[#e63329]/40 transition-colors group">
                <div className="text-2xl mb-3">{icon}</div>
                <h4 className="font-body text-white text-sm font-bold uppercase tracking-widest mb-2 group-hover:text-[#e63329] transition-colors">{title}</h4>
                <p className="font-body text-[#555] text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section ref={statsRef} className="w-full py-24 px-4 border-t border-[#111]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            <div>
              <div className="brush-text text-white leading-none mb-2" style={{ fontSize: "clamp(3rem, 10vw, 5rem)" }}>
                {interviews.toLocaleString()}+
              </div>
              <div className="font-body text-xs text-[#555] uppercase tracking-widest">Interviews Conducted</div>
            </div>
            <div>
              <div className="brush-text text-[#e63329] leading-none mb-2" style={{ fontSize: "clamp(3rem, 10vw, 5rem)" }}>
                {improvement}%
              </div>
              <div className="font-body text-xs text-[#555] uppercase tracking-widest">Average Improvement Rate</div>
            </div>
            <div>
              <div className="brush-text text-white leading-none mb-2" style={{ fontSize: "clamp(3rem, 10vw, 5rem)" }}>
                {questions}+
              </div>
              <div className="font-body text-xs text-[#555] uppercase tracking-widest">Role-Specific Questions</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="w-full py-32 px-4 border-t border-[#111] bg-[#050505] text-center">
        <div className="max-w-4xl mx-auto">
          <div className="tag tag-red mb-6 inline-block">YOUR MOVE</div>
          <h2 className="brush-text text-white mb-6" style={{ fontSize: "clamp(2.5rem, 10vw, 5rem)" }}>
            READY TO GET<br/><span className="text-[#e63329]">GRILLED?</span>
          </h2>
          <p className="font-body text-[#666] text-sm mb-8 leading-relaxed">
            Upload your resume. Pick your role. Answer to the AI.<br/>No shortcuts. No excuses. Just results.
          </p>
          <Link href="/login" className="btn-primary py-5 px-12 text-lg inline-flex" style={{ background: "#e63329", color: "#fff" }}>
            ▶ START YOUR FIRST INTERVIEW
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="w-full border-t border-[#111] py-12 px-4 text-center">
        <span className="brush-text text-white text-3xl tracking-widest">SKILLVIVA</span>
        <p className="font-body text-[#444] text-xs mt-2">© 2025 SkillViva. Built with Sarvam AI.</p>
      </footer>

    </main>
  );
}