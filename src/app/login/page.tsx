"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GraduationCap, WifiOff, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
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

    // Step 1: resolve username → internal email (server-side via service role)
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

    // Step 2: sign in client-side so Supabase SSR sets cookies correctly
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError("Invalid username or password.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand gradient */}
      <div
        className="hidden lg:flex lg:w-[420px] flex-col items-center justify-center px-12 text-white"
        style={{ background: "var(--gradient-brand)" }}
      >
        <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center mb-6">
          <GraduationCap size={32} className="text-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-center leading-tight tracking-tight mb-4">
          Compunerd EduSys
        </h1>
        <p className="text-white/75 text-center text-[15px] leading-relaxed max-w-xs">
          The school operating system that works even without internet — built for Ghana and Africa.
        </p>

        <div className="mt-12 flex items-start gap-3 bg-white/10 rounded-2xl px-5 py-4 max-w-xs">
          <WifiOff size={18} className="text-white/70 mt-0.5 shrink-0" />
          <p className="text-sm text-white/80 leading-relaxed">
            Work offline all day. Your records synchronise automatically when connectivity returns.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 bg-[var(--bg)]">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-brand)" }}>
              <GraduationCap size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-[var(--text-strong)]">Compunerd EduSys</span>
          </div>

          <h2 className="text-2xl font-bold text-[var(--text-strong)] mb-1">Sign in</h2>
          <p className="text-sm text-[var(--text-muted)] mb-8">
            Use the username and password set up by your school administrator.
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

            {/* Password with eye toggle */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-[var(--text-strong)]">
                Password
              </label>
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
                  aria-label={showPassword ? "Hide password" : "Show password"}
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

          <p className="text-xs text-[var(--text-subtle)] mt-4 text-center">
            Compunerd Ghana · {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
