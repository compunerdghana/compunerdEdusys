import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ClassesManager } from "./ClassesManager";

export default async function ClassesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("school_id, role").eq("id", user.id).single();
  if (profile?.role !== "headmaster" && profile?.role !== "owner") redirect("/settings");
  if (!profile?.school_id) redirect("/settings/school");

  const [{ data: classes }, { data: teachers }] = await Promise.all([
    supabase.from("classrooms").select("*").eq("school_id", profile.school_id).order("level").order("name"),
    supabase.from("profiles").select("id, full_name").eq("school_id", profile.school_id).eq("role", "teacher").order("full_name"),
  ]);

  return <ClassesManager schoolId={profile.school_id} classes={classes ?? []} teachers={teachers ?? []} />;
}
