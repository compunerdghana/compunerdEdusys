"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GraduationCap, WifiOff, Eye, EyeOff, Shield, Zap, Users } from "lucide-react";

interface Props {
  schoolName: string | null;
  schoolLogo: string | null;
}

export function LoginForm({ schoolName, schoolLogo }: Props) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (username.includes("@")) {
      setError("Please use your username instead of an email address.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim() }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Invalid username or password.");
      setLoading(false);
      return;
    }

    const { email } = await res.json();
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError("Invalid username or password.");
      setLoading(false);
      return;
    }

    // Check if this is a platform admin
    const platformCheck = await fetch("/api/platform/auth/check");
    if (platformCheck.ok) {
      const platformData = await platformCheck.json();
      if (platformData.isPlatformUser) {
        router.push("/platform/dashboard");
        router.refresh();
        return;
      }
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profile?.role === "teacher") {
          router.push("/teacher");
          router.refresh();
          return;
        }
      }
    } catch (err) {
      console.error("Error checking role on login:", err);
    }

    router.push("/dashboard");
    router.refresh();
  }

  const displayName = schoolName ?? "Compunerd EduSys";

  return (
    <div className="min-h-screen flex">
      <style>{`
        @keyframes float-orb {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.15; }
          50% { transform: translateY(-30px) scale(1.08); opacity: 0.25; }
        }
        @keyframes float-orb-reverse {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.1; }
          50% { transform: translateY(25px) scale(0.92); opacity: 0.2; }
        }
        @keyframes shimmer-badge {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.15); }
          50% { box-shadow: 0 0 0 12px rgba(255,255,255,0); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .login-feature-card {
          transition: all 0.25s ease;
        }
        .login-feature-card:hover {
          background: rgba(255,255,255,0.14) !important;
          transform: translateX(4px);
        }
        .login-sign-in-btn:hover {
          filter: brightness(1.08);
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(107,31,138,0.4);
        }
        .login-sign-in-btn {
          transition: all 0.2s ease;
        }
      `}</style>

      {/* ── Left panel ── brand gradient */}
      <div
        className="hidden lg:flex lg:w-[440px] xl:w-[480px] flex-col justify-between px-12 py-10 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(160deg,#1a1854 0%,#2e1a6b 40%,#6b1f8a 80%,#92278F 100%)" }}
      >
        {/* Animated background orbs */}
        <div
          className="absolute top-[-80px] left-[-80px] w-[320px] h-[320px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(107,31,138,0.5) 0%, transparent 70%)",
            animation: "float-orb 8s ease-in-out infinite",
          }}
        />
        <div
          className="absolute bottom-[-60px] right-[-60px] w-[280px] h-[280px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(45,27,105,0.6) 0%, transparent 70%)",
            animation: "float-orb-reverse 10s ease-in-out infinite",
          }}
        />
        <div
          className="absolute top-[40%] right-[-40px] w-[200px] h-[200px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(146,39,143,0.3) 0%, transparent 70%)",
            animation: "float-orb 12s ease-in-out infinite 3s",
          }}
        />

        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Top: Logo & School name */}
        <div className="relative z-10" style={{ animation: "slide-up 0.6s ease both" }}>
          <div className="flex flex-col items-start gap-5">
            {/* Logo */}
            {schoolLogo ? (
              <div
                className="w-20 h-20 rounded-2xl overflow-hidden bg-white/10 flex items-center justify-center"
                style={{ boxShadow: "0 0 0 4px rgba(255,255,255,0.15)", animation: "pulse-ring 4s ease infinite" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={schoolLogo} alt={displayName} className="w-full h-full object-contain p-2" />
              </div>
            ) : (
              <div
                className="w-20 h-20 rounded-2xl bg-white/12 flex items-center justify-center shrink-0"
                style={{
                  boxShadow: "0 0 0 4px rgba(255,255,255,0.12), 0 8px 32px rgba(0,0,0,0.2)",
                  animation: "pulse-ring 4s ease infinite",
                }}
              >
                <GraduationCap size={40} className="text-white" />
              </div>
            )}

            <div>
              <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-white drop-shadow-sm">
                {displayName}
              </h1>
              {schoolName ? (
                <p className="text-white/60 text-[13px] mt-1.5 font-semibold tracking-wide">School Management Portal</p>
              ) : (
                <p className="text-white/55 text-[13px] mt-1.5 font-semibold tracking-wide">School Management OS</p>
              )}
            </div>
          </div>

          {/* Tagline */}
          <p className="text-white/70 text-[14px] leading-relaxed mt-8 max-w-xs font-medium">
            {schoolName
              ? `Welcome to ${displayName}. Sign in with your credentials to access the school management system.`
              : "The school operating system built for Ghana and Africa. Works offline, syncs automatically."}
          </p>
        </div>

        {/* Middle: Feature highlights */}
        <div className="relative z-10 space-y-3" style={{ animation: "slide-up 0.6s ease 0.1s both" }}>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-white/35 mb-4">Platform Features</p>

          {[
            {
              icon: WifiOff,
              title: "Works Offline",
              desc: "Full functionality without internet. Syncs when connectivity returns.",
            },
            {
              icon: Shield,
              title: "Secure & Reliable",
              desc: "Role-based access control with enterprise-grade security.",
            },
            {
              icon: Zap,
              title: "Real-time Sync",
              desc: "Instant data synchronisation across all devices automatically.",
            },
            {
              icon: Users,
              title: "Multi-role Access",
              desc: "Tailored dashboards for admins, teachers, and staff.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="login-feature-card flex items-start gap-3.5 px-4 py-3.5 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.09)" }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: "rgba(255,255,255,0.12)" }}
              >
                <Icon size={15} className="text-white/80" />
              </div>
              <div>
                <p className="text-white text-[13px] font-bold leading-tight">{title}</p>
                <p className="text-white/50 text-[11px] font-medium mt-0.5 leading-snug">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom: Footer */}
        <div className="relative z-10" style={{ animation: "slide-up 0.6s ease 0.2s both" }}>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-extrabold tracking-widest uppercase mb-3"
            style={{
              background: "linear-gradient(90deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 100%)",
              backgroundSize: "200% auto",
              border: "1px solid rgba(255,255,255,0.12)",
              animation: "shimmer-badge 4s linear infinite",
              color: "rgba(255,255,255,0.55)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            System Online
          </div>
          <p className="text-[11px] text-white/25 font-semibold">
            Powered by Compunerd Ghana · {new Date().getFullYear()}
          </p>
        </div>
      </div>

      {/* ── Right panel ── form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12" style={{ background: "var(--bg)" }}>
        <div className="w-full max-w-sm" style={{ animation: "slide-up 0.5s ease 0.05s both" }}>
          {/* Mobile branding */}
          <div className="flex flex-col items-center gap-3 mb-8 lg:hidden">
            {schoolLogo ? (
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white shadow-lg ring-2 ring-[#262262]/10 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={schoolLogo} alt={displayName} className="w-full h-full object-contain p-1" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#262262,#92278F)" }}>
                <GraduationCap size={26} className="text-white" />
              </div>
            )}
            <div className="text-center">
              <p className="text-[16px] font-extrabold text-[var(--text-strong)]">{displayName}</p>
              {schoolName && <p className="text-[12px] text-[var(--text-muted)]">School Management Portal</p>}
            </div>
          </div>

          {/* Form header */}
          <div className="mb-7">
            <h2 className="text-[24px] font-extrabold text-[var(--text-strong)]">Welcome back</h2>
            <p className="text-[14px] text-[var(--text-muted)] mt-1">
              Sign in with your school credentials to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username"
              type="text"
              placeholder="e.g. ama.mensah"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-[var(--text-strong)]">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 pr-10 text-sm text-[var(--text-strong)] placeholder:text-[var(--text-subtle)] outline-none transition-all focus:border-[var(--ring)] focus:shadow-[var(--shadow-focus)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-strong)] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-[var(--danger)] bg-[var(--danger-bg)] px-4 py-3 rounded-[10px] flex items-start gap-2">
                <span className="mt-0.5 shrink-0">⚠</span>
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              loading={loading}
              className="w-full mt-2 login-sign-in-btn"
            >
              Sign in
            </Button>
          </form>

          <p className="text-xs text-[var(--text-subtle)] mt-8 text-center leading-relaxed">
            Forgot your username?{" "}
            <span className="text-[var(--text-muted)] font-semibold">Contact your school administrator.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
