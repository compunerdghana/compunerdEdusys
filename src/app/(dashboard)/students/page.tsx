import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StudentsClient } from "./StudentsClient";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; class?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("school_id, role").eq("id", user.id).single();
  const schoolId = profile?.school_id;
  if (!schoolId) redirect("/settings/school");

  const [studentsRes, classesRes] = await Promise.all([
    (() => {
      let q = supabase
        .from("students")
        .select("*, classrooms(name, level)")
        .eq("school_id", schoolId)
        .order("last_name");
      if (params.q) q = q.or(`first_name.ilike.%${params.q}%,last_name.ilike.%${params.q}%,admission_number.ilike.%${params.q}%`);
      if (params.status) q = q.eq("status", params.status);
      if (params.class) q = q.eq("class_id", params.class);
      return q;
    })(),
    supabase.from("classrooms").select("id, name, level").eq("school_id", schoolId).order("level").order("name"),
  ]);

  return (
    <StudentsClient
      students={studentsRes.data ?? []}
      classes={classesRes.data ?? []}
      schoolId={schoolId}
      filters={params}
      role={profile?.role ?? "teacher"}
    />
  );
}
