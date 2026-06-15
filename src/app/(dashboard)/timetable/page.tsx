import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TimetableClient } from "./TimetableClient";

export default async function TimetablePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.school_id) redirect("/settings/school");

  const schoolId = profile.school_id;
  const isHeadmaster = profile?.role === "headmaster" || profile?.role === "owner";

  const [
    { data: classes },
    { data: subjects },
    { data: teachers },
    { data: terms },
    { data: currentTermData },
  ] = await Promise.all([
    supabase.from("classrooms").select("id, name, level").eq("school_id", schoolId).order("level").order("name"),
    supabase.from("subjects").select("id, name").eq("school_id", schoolId).order("name"),
    supabase.from("profiles").select("id, full_name").eq("school_id", schoolId).eq("role", "teacher").order("full_name"),
    supabase.from("terms").select("id, name, start_date, end_date, is_current").eq("school_id", schoolId).order("start_date", { ascending: false }),
    supabase.from("terms").select("id").eq("school_id", schoolId).eq("is_current", true).single(),
  ]);

  return (
    <TimetableClient
      schoolId={schoolId}
      isHeadmaster={isHeadmaster}
      classes={classes ?? []}
      subjects={subjects ?? []}
      teachers={teachers ?? []}
      terms={terms ?? []}
      currentTermId={currentTermData?.id ?? null}
    />
  );
}
