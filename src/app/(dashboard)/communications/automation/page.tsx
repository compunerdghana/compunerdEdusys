import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AutomationClient } from "./AutomationClient";

export default async function AutomationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("school_id").eq("id", user.id).single();
  if (!profile?.school_id) redirect("/dashboard");
  const schoolId = profile.school_id as string;

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const [rulesRes, templatesRes] = await Promise.all([
    admin.from("automation_rules")
      .select("id, name, description, trigger_event, channel, recipient_type, is_active, delay_minutes, created_at, communication_templates(name)")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false }),
    admin.from("communication_templates")
      .select("id, name, channel")
      .or(`school_id.eq.${schoolId},is_system.eq.true`)
      .eq("is_active", true),
  ]);

  const tableNotReady = !!(rulesRes.error?.code === "42P01" || rulesRes.error?.message?.includes("does not exist"));

  return (
    <AutomationClient
      schoolId={schoolId}
      userId={user.id}
      tableNotReady={tableNotReady}
      initialRules={tableNotReady ? [] : (rulesRes.data ?? [])}
      templates={templatesRes.data ?? []}
    />
  );
}
