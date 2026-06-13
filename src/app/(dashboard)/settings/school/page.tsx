import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SchoolProfileForm } from "./SchoolProfileForm";

export default async function SchoolProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "headmaster" && profile?.role !== "owner") {
    redirect("/settings");
  }

  const { data: school } = profile?.school_id
    ? await supabase.from("schools").select("*").eq("id", profile.school_id).single()
    : { data: null };

  return <SchoolProfileForm school={school} schoolId={profile?.school_id ?? null} />;
}
