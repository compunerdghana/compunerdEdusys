"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";

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
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #1a0533, #2d1b69, #6b1f8a)" }}
    >
      {/* Decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #6b1f8a, transparent)" }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #2d1b69, transparent)" }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo / Wordmark */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}>
            <ShieldCheck size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">CompunerdEduSys</h1>
          <p className="text-white/60 font-semibold mt-1 text-sm tracking-wide uppercase">Platform Administration</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8 shadow-2xl"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(12px)" }}>

          <h2 className="text-xl font-extrabold text-white mb-6">Sign in to your account</h2>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl text-sm font-semibold text-red-200"
              style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-white/80 text-sm font-bold mb-1.5">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@compunerd.com"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-white/30 text-sm font-semibold outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
                onFocus={e => (e.target.style.borderColor = "rgba(107,31,138,0.8)")}
                onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.15)")}
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm font-bold mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full px-4 py-3 pr-12 rounded-xl text-white placeholder-white/30 text-sm font-semibold outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                  onFocus={e => (e.target.style.borderColor = "rgba(107,31,138,0.8)")}
                  onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.15)")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-extrabold text-sm transition-all disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #2d1b69, #6b1f8a)" }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign In to Platform"
              )}
            </button>
          </form>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-white/35 text-xs font-semibold mt-6 leading-relaxed px-4">
          This portal is restricted to Compunerd Ghana platform administrators only.
        </p>
      </div>
    </div>
  );
}
