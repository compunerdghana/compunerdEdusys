import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TeacherDashboardShell } from "@/components/layout/TeacherDashboardShell";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, school_id")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "teacher" && profile?.role !== "super_admin") {
    redirect("/access-denied");
  }

  let schoolName: string | undefined;
  let schoolLogo: string | undefined;
  if (profile?.school_id) {
    const { data: school } = await supabase.from("schools").select("name, logo_url").eq("id", profile.school_id).single();
    schoolName = school?.name;
    schoolLogo = school?.logo_url ?? undefined;
  }

  return (
    <TeacherDashboardShell
      userName={profile?.full_name ?? user.email ?? "Teacher"}
      schoolName={schoolName}
      schoolLogo={schoolLogo}
    >
      {children}
    </TeacherDashboardShell>
  );
}
