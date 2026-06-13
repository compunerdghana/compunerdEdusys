import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { StaffProfileClient } from "./StaffProfileClient";

export default async function StaffProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: viewer } = await supabase.from("profiles")
    .select("school_id, role").eq("id", user.id).single();
  if (!viewer?.school_id) redirect("/dashboard");

  const [profileRes, detailsRes, docsRes, classesRes, subjectsRes] = await Promise.all([
    supabase.from("profiles")
      .select("id, full_name, username, role, phone, is_active, created_at, photo_url, bio, school_id")
      .eq("id", id).single(),
    supabase.from("staff_details").select("*").eq("profile_id", id).maybeSingle(),
    supabase.from("staff_documents").select("*").eq("profile_id", id).order("uploaded_at", { ascending: false }),
    supabase.from("staff_assigned_classes")
      .select("class_id, classrooms(id, name)").eq("profile_id", id),
    supabase.from("staff_assigned_subjects")
      .select("subject_id, subjects(id, name)").eq("profile_id", id),
  ]);

  if (!profileRes.data || profileRes.data.school_id !== viewer.school_id) notFound();

  const isHeadmaster = ["headmaster","owner"].includes(viewer.role);
  const isSelf = user.id === id;

  return (
    <StaffProfileClient
      profile={profileRes.data}
      details={detailsRes.data ?? null}
      docs={docsRes.data ?? []}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assignedClasses={(classesRes.data ?? []).map((r: any) => r.classrooms).filter(Boolean)}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assignedSubjects={(subjectsRes.data ?? []).map((r: any) => r.subjects).filter(Boolean)}
      isHeadmaster={isHeadmaster}
      isSelf={isSelf}
      viewerId={user.id}
    />
  );
}
