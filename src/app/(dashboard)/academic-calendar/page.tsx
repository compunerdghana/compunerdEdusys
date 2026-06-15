import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AcademicCalendarClient } from "./AcademicCalendarClient";

export default async function AcademicCalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("school_id, role, full_name").eq("id", user.id).single();
  const schoolId = profile?.school_id;
  if (!schoolId) redirect("/settings/school");

  // Ensure school_documents table exists (idempotent)
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/admin/setup-school-docs`, { method: "POST" }).catch(() => null);

  const [termsRes, docsRes] = await Promise.all([
    supabase.from("terms")
      .select("id, name, start_date, end_date, is_current, academic_years(name)")
      .eq("school_id", schoolId)
      .order("start_date"),
    supabase.from("school_documents")
      .select("*")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .then(r => r, () => ({ data: [] as never[] })),
  ]);

  const isHeadmaster = ["headmaster", "owner"].includes(profile?.role ?? "");

  return (
    <AcademicCalendarClient
      terms={termsRes.data ?? []}
      documents={docsRes.data ?? []}
      schoolId={schoolId}
      isHeadmaster={isHeadmaster}
      role={profile?.role ?? "teacher"}
    />
  );
}
