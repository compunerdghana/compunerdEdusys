"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CheckCircle2 } from "lucide-react";

interface Props {
  userId: string;
  initialName: string;
  initialPhone: string;
  role: string;
  email: string;
}

export function AccountForm({ userId, initialName, initialPhone, role, email }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name.trim(), phone: phone.trim() || null })
      .eq("id", userId);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setSaved(true);
    // Update TopBar immediately without waiting for server refresh
    window.dispatchEvent(new CustomEvent("user:namechange", { detail: name.trim() }));
    router.refresh();
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <Card>
      <h3 className="text-base font-bold text-[var(--text-strong)] mb-5">Account information</h3>
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+233 …"
          />
        </div>
        <div className="space-y-2 text-[15px]">
          <div className="flex justify-between py-2 border-b border-[var(--border)]">
            <span className="text-[var(--text-muted)]">Role</span>
            <span className="font-semibold text-[var(--text-strong)] capitalize">{role.replace("_", " ")}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-[var(--text-muted)]">Login email</span>
            <span className="font-semibold text-[var(--text-strong)]">{email}</span>
          </div>
        </div>
        {err && <p className="text-[15px] text-[var(--danger)]">{err}</p>}
        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" loading={saving}>Save changes</Button>
          {saved && (
            <span className="flex items-center gap-1.5 text-[15px] text-[var(--success)] font-medium">
              <CheckCircle2 size={16} /> Saved
            </span>
          )}
        </div>
      </form>
    </Card>
  );
}
