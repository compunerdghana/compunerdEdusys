import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TrainingClient } from "./TrainingClient";

export default async function StaffTrainingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("school_id, role").eq("id", user.id).single();
  if (!profile?.school_id) redirect("/dashboard");
  const schoolId = profile.school_id as string;

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const isMissing = (e: { code?: string; message?: string } | null) =>
    e?.code === "42P01" || e?.message?.includes("does not exist");

  const [trainingRes, staffRes] = await Promise.all([
    admin.from("staff_training_records")
      .select("id, profile_id, training_type, title, organizer, start_date, end_date, location, certificate_url, notes, created_at")
      .eq("school_id", schoolId).order("start_date", { ascending: false }).limit(200),
    admin.from("profiles").select("id, full_name").eq("school_id", schoolId).neq("role", "parent").order("full_name"),
  ]);

  const tableNotReady = isMissing(trainingRes.error);
  const staffMap = Object.fromEntries((staffRes.data ?? []).map((s) => [s.id, s.full_name]));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const records = tableNotReady ? [] : (trainingRes.data ?? []).map((r: any) => ({
    ...r, staff_name: staffMap[r.profile_id] ?? "Unknown",
  }));

  return (
    <TrainingClient
      schoolId={schoolId}
      userId={user.id}
      role={profile.role}
      isAdmin={["owner", "headmaster"].includes(profile.role)}
      staff={staffRes.data ?? []}
      initialRecords={records}
      tableNotReady={tableNotReady}
    />
  );
}
