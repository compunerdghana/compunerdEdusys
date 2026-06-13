import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AcademicYearManager } from "./AcademicYearManager";

export default async function AcademicYearPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "headmaster" && profile?.role !== "owner") redirect("/settings");
  if (!profile?.school_id) redirect("/settings/school");

  const [{ data: years }, { data: terms }] = await Promise.all([
    supabase.from("academic_years").select("*").eq("school_id", profile.school_id).order("start_date", { ascending: false }),
    supabase.from("terms").select("*").eq("school_id", profile.school_id).order("start_date"),
  ]);

  return (
    <AcademicYearManager
      schoolId={profile.school_id}
      years={years ?? []}
      terms={terms ?? []}
    />
  );
}
