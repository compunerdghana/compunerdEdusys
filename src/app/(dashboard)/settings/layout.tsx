import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Calendar, BookOpen, LayoutGrid, DollarSign, School, User } from "lucide-react";

const nav = [
  { label: "School profile", href: "/settings/school", icon: School },
  { label: "Academic year", href: "/settings/academic-year", icon: Calendar },
  { label: "Classes", href: "/settings/classes", icon: LayoutGrid },
  { label: "Subjects", href: "/settings/subjects", icon: BookOpen },
  { label: "Fee structure", href: "/settings/fees", icon: DollarSign },
  { label: "My account", href: "/settings", icon: User },
];

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isHeadmaster = profile?.role === "headmaster" || profile?.role === "owner";

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-strong)]">Settings</h2>
        <p className="text-sm text-[var(--text-muted)]">Manage school configuration and your account.</p>
      </div>

      {isHeadmaster && (
        <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-4">
          {nav.map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href}>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--brand-subtle)] hover:text-[var(--brand)] transition-all">
                <Icon size={14} />
                {label}
              </div>
            </Link>
          ))}
        </div>
      )}

      {children}
    </div>
  );
}
