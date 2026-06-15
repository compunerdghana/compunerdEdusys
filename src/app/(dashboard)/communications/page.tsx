import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CommunicationClient } from "./CommunicationClient";

export default async function CommunicationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile?.school_id) redirect("/settings/school");

  const schoolId = profile.school_id;
  const isAdmin = ["headmaster", "owner", "teacher"].includes(profile?.role ?? "");

  const { data: classes } = await supabase
    .from("classrooms")
    .select("id, name, level")
    .eq("school_id", schoolId)
    .order("level")
    .order("name");

  return (
    <CommunicationClient
      schoolId={schoolId}
      userId={user.id}
      userRole={profile.role ?? ""}
      isAdmin={isAdmin}
      classes={classes ?? []}
    />
  );
}
