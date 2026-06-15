import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PromotionsClient } from "./PromotionsClient";

export default async function PromotionsPage() {
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

  const [promoRes, staffRes] = await Promise.all([
    admin.from("staff_promotion_history")
      .select("id, profile_id, previous_designation, new_designation, previous_salary, new_salary, effective_date, reason, created_at")
      .eq("school_id", schoolId).order("effective_date", { ascending: false }).limit(200),
    admin.from("profiles").select("id, full_name").eq("school_id", schoolId).neq("role", "parent").order("full_name"),
  ]);

  const tableNotReady = isMissing(promoRes.error);
  const staffMap = Object.fromEntries((staffRes.data ?? []).map((s) => [s.id, s.full_name]));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const records = tableNotReady ? [] : (promoRes.data ?? []).map((r: any) => ({
    ...r, staff_name: staffMap[r.profile_id] ?? "Unknown",
  }));

  return (
    <PromotionsClient
      schoolId={schoolId}
      userId={user.id}
      isAdmin={["owner", "headmaster"].includes(profile.role)}
      staff={staffRes.data ?? []}
      initialRecords={records}
      tableNotReady={tableNotReady}
    />
  );
}
