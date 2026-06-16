"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GraduationCap, WifiOff, Eye, EyeOff } from "lucide-react";

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

    router.push("/dashboard");
    router.refresh();
  }

  const displayName = schoolName ?? "Compunerd EduSys";

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand gradient */}
      <div
        className="hidden lg:flex lg:w-[420px] flex-col items-center justify-center px-12 text-white"
        style={{ background: "linear-gradient(160deg,#1a1854 0%,#2e1a6b 40%,#6b1f8a 80%,#92278F 100%)" }}
      >
        {/* School logo or default icon */}
        <div className="flex flex-col items-center gap-4 mb-8">
          {schoolLogo ? (
            <div className="w-24 h-24 rounded-3xl overflow-hidden bg-white/10 shadow-2xl ring-4 ring-white/20 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={schoolLogo} alt={displayName} className="w-full h-full object-contain p-2" />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-3xl bg-white/15 flex items-center justify-center shadow-2xl ring-4 ring-white/20">
              <GraduationCap size={44} className="text-white" />
            </div>
          )}
          <div className="text-center">
            <h1 className="text-[22px] font-extrabold text-center leading-tight tracking-tight">
              {displayName}
            </h1>
            {schoolName && (
              <p className="text-white/60 text-[13px] mt-1 font-medium tracking-wide">School Management Portal</p>
            )}
          </div>
        </div>

        <p className="text-white/70 text-center text-[14px] leading-relaxed max-w-xs mb-10">
          {schoolName
            ? `Welcome to ${displayName}. Sign in with your school credentials to continue.`
            : "The school operating system that works even without internet — built for Ghana and Africa."}
        </p>

        <div className="flex items-start gap-3 bg-white/10 rounded-2xl px-5 py-4 max-w-xs">
          <WifiOff size={18} className="text-white/70 mt-0.5 shrink-0" />
          <p className="text-sm text-white/75 leading-relaxed">
            Work offline all day. Records synchronise automatically when connectivity returns.
          </p>
        </div>

        <p className="text-[11px] text-white/30 mt-10 text-center">
          Powered by Compunerd Ghana · {new Date().getFullYear()}
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 bg-[var(--bg)]">
        <div className="w-full max-w-sm">
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

          <h2 className="text-[22px] font-extrabold text-[var(--text-strong)] mb-1">Sign in</h2>
          <p className="text-[14px] text-[var(--text-muted)] mb-7">
            Use the username and password set up by your administrator.
          </p>

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
              <div className="text-sm text-[var(--danger)] bg-[var(--danger-bg)] px-4 py-3 rounded-[10px]">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" loading={loading} className="w-full mt-2">
              Sign in
            </Button>
          </form>

          <p className="text-xs text-[var(--text-subtle)] mt-8 text-center">
            Forgot your username? Contact your school administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
