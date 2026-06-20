import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, school_id")
    .eq("id", user.id)
    .single();

  let schoolName: string | undefined;
  let schoolLogo: string | undefined;
  if (profile?.school_id) {
    const { data: school } = await supabase.from("schools").select("name, logo_url").eq("id", profile.school_id).single();
    schoolName = school?.name;
    schoolLogo = school?.logo_url ?? undefined;
  }

  if (profile?.role === "teacher") {
    return <>{children}</>;
  }

  return (
    <DashboardShell
      userName={profile?.full_name ?? user.email ?? "User"}
      userRole={profile?.role}
      schoolName={schoolName}
      schoolLogo={schoolLogo}
    >
      {children}
    </DashboardShell>
  );
}
