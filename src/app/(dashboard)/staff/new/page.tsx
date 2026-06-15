import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AddStaffForm } from "./AddStaffForm";

export default async function NewStaffPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles")
    .select("school_id, role").eq("id", user.id).single();
  if (!profile?.school_id) redirect("/dashboard");
  if (!["headmaster","owner","admin"].includes(profile.role)) redirect("/staff");

  const [classRes, subRes, staffRes] = await Promise.all([
    supabase.from("classrooms").select("id,name").eq("school_id", profile.school_id).order("name"),
    supabase.from("subjects").select("id,name").eq("school_id", profile.school_id).order("name"),
    supabase.from("profiles").select("id,full_name,role").eq("school_id", profile.school_id).eq("is_active", true),
  ]);

  return (
    <AddStaffForm
      schoolId={profile.school_id}
      classes={classRes.data ?? []}
      subjects={subRes.data ?? []}
      allStaff={staffRes.data ?? []}
    />
  );
}
