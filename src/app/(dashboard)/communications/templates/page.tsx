import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TemplatesClient } from "./TemplatesClient";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("school_id, role").eq("id", user.id).single();
  if (!profile?.school_id) redirect("/dashboard");
  const schoolId = profile.school_id as string;

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data, error } = await admin.from("communication_templates")
    .select("id, name, channel, category, subject, body, variables, is_system, is_active, created_at")
    .or(`school_id.eq.${schoolId},is_system.eq.true`)
    .eq("is_active", true)
    .order("is_system", { ascending: false })
    .order("name");

  const tableNotReady = error?.code === "42P01" || !!error?.message?.includes("does not exist");

  return (
    <TemplatesClient
      schoolId={schoolId}
      userId={user.id}
      initialTemplates={tableNotReady ? [] : (data ?? [])}
      tableNotReady={tableNotReady}
    />
  );
}
