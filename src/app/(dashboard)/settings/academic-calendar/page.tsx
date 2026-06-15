import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EventCalendarClient } from "./EventCalendarClient";

export default async function AcademicCalendarSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.school_id) redirect("/settings/school");

  const { data: terms } = await supabase
    .from("terms")
    .select("id, name, start_date, end_date, is_current, academic_years(name)")
    .eq("school_id", profile.school_id)
    .order("start_date");

  const isHeadmaster = ["headmaster", "owner"].includes(profile?.role ?? "");

  return (
    <EventCalendarClient
      schoolId={profile.school_id}
      terms={terms ?? []}
      isHeadmaster={isHeadmaster}
    />
  );
}
