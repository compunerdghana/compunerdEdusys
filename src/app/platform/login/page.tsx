"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Loader2, ShieldCheck, Lock, Globe, BarChart3, Users, ArrowRight } from "lucide-react";

export default function PlatformLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If already logged in as a platform user, go straight to dashboard
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const res = await fetch("/api/platform/auth/check");
      if (res.ok) {
        const data = await res.json();
        if (data.isPlatformUser) router.replace("/platform/dashboard");
      }
    })();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError("Invalid email or password.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/platform/auth/check");
      if (!res.ok) {
        await supabase.auth.signOut();
        setError("Not authorized for platform access.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (!data.isPlatformUser) {
        await supabase.auth.signOut();
        setError("Not authorized for platform access.");
        setLoading(false);
        return;
      }

      router.push("/platform/dashboard");
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <style>{`
        @keyframes pl-float-a {
          0%,100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(-20px, -30px) scale(1.1); }
        }
        @keyframes pl-float-b {
          0%,100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(20px, 20px) scale(0.9); }
        }
        @keyframes pl-float-c {
          0%,100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(15px, -15px) scale(1.05); }
          66% { transform: translate(-10px, 10px) scale(0.95); }
        }
        @keyframes pl-slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pl-pulse-border {
          0%,100% { border-color: rgba(255,255,255,0.15); }
          50%      { border-color: rgba(255,255,255,0.30); }
        }
        @keyframes pl-scan-line {
          0%   { top: 0%; opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .pl-stat-card {
          transition: all 0.2s ease;
        }
        .pl-stat-card:hover {
          background: rgba(255,255,255,0.12) !important;
          transform: translateY(-2px);
        }
        .pl-submit-btn {
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }
        .pl-submit-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%);
          transform: translateX(-100%);
          transition: transform 0.4s ease;
        }
        .pl-submit-btn:hover::after {
          transform: translateX(100%);
        }
        .pl-submit-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 30px rgba(79,70,229,0.4);
        }
        .pl-input:focus {
          border-color: rgba(124,58,237,0.7);
          box-shadow: 0 0 0 3px rgba(124,58,237,0.18);
        }
      `}</style>

      {/* ── Left panel: Platform brand ── */}
      <div
        className="hidden lg:flex lg:w-[460px] xl:w-[500px] flex-col justify-between px-12 py-10 relative overflow-hidden"
        style={{ background: "linear-gradient(165deg, #0d0b2e 0%, #1a1854 30%, #2e1a6b 60%, #6b1f8a 85%, #92278F 100%)" }}
      >
        {/* Animated background orbs */}
        <div
          className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(79,70,229,0.35) 0%, transparent 65%)",
            animation: "pl-float-a 10s ease-in-out infinite",
          }}
        />
        <div
          className="absolute bottom-[-80px] right-[-80px] w-[350px] h-[350px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(107,31,138,0.4) 0%, transparent 65%)",
            animation: "pl-float-b 13s ease-in-out infinite",
          }}
        />
        <div
          className="absolute top-[50%] left-[-50px] w-[250px] h-[250px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(45,27,105,0.5) 0%, transparent 65%)",
            animation: "pl-float-c 15s ease-in-out infinite 2s",
          }}
        />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Scan-line effect */}
        <div
          className="absolute left-0 right-0 h-[2px] pointer-events-none z-10"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(124,58,237,0.4), transparent)",
            animation: "pl-scan-line 8s linear infinite",
          }}
        />

        {/* Top section */}
        <div className="relative z-10" style={{ animation: "pl-slide-up 0.6s ease both" }}>
          <div className="flex items-center gap-3 mb-10">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 0 0 3px rgba(255,255,255,0.15), 0 8px 20px rgba(79,70,229,0.4)" }}
            >
              <ShieldCheck size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white font-extrabold text-[15px] leading-tight">CompunerdEduSys</p>
              <span
                className="text-[9px] font-extrabold uppercase tracking-[0.18em] px-2 py-0.5 rounded-full"
                style={{ background: "rgba(124,58,237,0.35)", color: "#c4b5fd" }}
              >
                Platform Admin
              </span>
            </div>
          </div>

          <h1 className="text-[32px] font-extrabold text-white leading-[1.15] tracking-tight mb-3">
            Platform<br />
            <span style={{ backgroundImage: "linear-gradient(135deg, #a78bfa, #e879f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Administration
            </span>
          </h1>
          <p className="text-white/55 text-[14px] leading-relaxed max-w-xs font-medium">
            Manage schools, subscriptions, users, and platform-wide settings from a single secure console.
          </p>
        </div>

        {/* Middle: Feature stats */}
        <div className="relative z-10 space-y-3" style={{ animation: "pl-slide-up 0.6s ease 0.1s both" }}>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>
            Admin Capabilities
          </p>

          {[
            { icon: Globe,     title: "Multi-School Management",  desc: "Onboard and manage unlimited schools" },
            { icon: BarChart3, title: "Revenue & Analytics",      desc: "Real-time financial and usage insights" },
            { icon: Lock,      title: "Security & Audit Logs",    desc: "Full audit trail and access control" },
            { icon: Users,     title: "Platform User Management", desc: "Granular role and permission control" },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="pl-stat-card flex items-center gap-3.5 px-4 py-3.5 rounded-2xl cursor-default"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.5), rgba(124,58,237,0.5))" }}
              >
                <Icon size={14} className="text-white/90" />
              </div>
              <div className="min-w-0">
                <p className="text-white text-[12px] font-bold leading-tight">{title}</p>
                <p className="text-white/45 text-[11px] font-medium mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom: footer */}
        <div className="relative z-10" style={{ animation: "pl-slide-up 0.6s ease 0.2s both" }}>
          <div
            className="flex items-center gap-2 mb-3"
            style={{
              borderTop: "1px solid rgba(255,255,255,0.08)",
              paddingTop: "16px",
            }}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>
              All systems operational
            </span>
          </div>
          <p className="text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.22)" }}>
            Powered by Compunerd Ghana · {new Date().getFullYear()}
          </p>
        </div>
      </div>

      {/* ── Right panel: Login form ── */}
      <div
        className="flex-1 flex items-center justify-center px-6 py-12"
        style={{ background: "#f8f7ff" }}
      >
        <div className="w-full max-w-[380px]" style={{ animation: "pl-slide-up 0.5s ease 0.05s both" }}>
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            >
              <ShieldCheck size={18} className="text-white" />
            </div>
            <div>
              <p className="text-slate-900 font-extrabold text-[15px] leading-tight">CompunerdEduSys</p>
              <p className="text-slate-500 text-[11px] font-semibold">Platform Administration</p>
            </div>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-[26px] font-extrabold text-slate-900 leading-tight">Sign in</h2>
            <p className="text-[14px] text-slate-500 mt-1.5 font-medium">
              Access the platform admin console.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="mb-5 px-4 py-3 rounded-xl text-sm font-semibold flex items-start gap-2.5"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#dc2626" }}
            >
              <span className="mt-0.5 shrink-0">⚠</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-slate-700 text-[13px] font-bold mb-1.5">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@compunerd.com"
                className="pl-input w-full px-4 py-2.5 rounded-xl text-slate-800 text-[13px] font-semibold outline-none transition-all bg-white"
                style={{ border: "1.5px solid #e8e4f3" }}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-slate-700 text-[13px] font-bold mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="pl-input w-full px-4 py-2.5 pr-12 rounded-xl text-slate-800 text-[13px] font-semibold outline-none transition-all bg-white"
                  style={{ border: "1.5px solid #e8e4f3" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="pl-submit-btn w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-white font-extrabold text-[13px] mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign In to Platform
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Disclaimer */}
          <div
            className="mt-8 p-4 rounded-xl"
            style={{ background: "rgba(79,70,229,0.05)", border: "1px solid rgba(79,70,229,0.1)" }}
          >
            <p className="text-center text-slate-500 text-[12px] font-semibold leading-relaxed">
              🔒 This portal is restricted to{" "}
              <span className="text-indigo-600 font-bold">Compunerd Ghana</span> platform administrators only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
