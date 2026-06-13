import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SubjectsManager } from "./SubjectsManager";

export default async function SubjectsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("school_id, role").eq("id", user.id).single();
  if (profile?.role !== "headmaster" && profile?.role !== "owner") redirect("/settings");
  if (!profile?.school_id) redirect("/settings/school");

  const { data: subjects } = await supabase
    .from("subjects")
    .select("*")
    .eq("school_id", profile.school_id)
    .order("name");

  return <SubjectsManager schoolId={profile.school_id} subjects={subjects ?? []} />;
}
