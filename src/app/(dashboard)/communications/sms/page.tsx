import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SMSClient } from "./SMSClient";

export default async function SMSPage() {
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

  const [settingsRes, templatesRes, parentsRes] = await Promise.all([
    admin.from("communication_settings")
      .select("sms_enabled, sms_provider, sms_sender_name, sms_credits")
      .eq("school_id", schoolId).maybeSingle(),
    admin.from("communication_templates")
      .select("id, name, body").or(`school_id.eq.${schoolId},is_system.eq.true`)
      .eq("channel", "sms").eq("is_active", true).order("name"),
    admin.from("profiles")
      .select("id, full_name, phone").eq("school_id", schoolId).eq("role", "parent").eq("is_active", true),
  ]);

  const tableNotReady = !!(settingsRes.error?.code === "42P01" || settingsRes.error?.message?.includes("does not exist"));

  return (
    <SMSClient
      schoolId={schoolId}
      userId={user.id}
      tableNotReady={tableNotReady}
      smsEnabled={settingsRes.data?.sms_enabled ?? false}
      smsProvider={settingsRes.data?.sms_provider ?? "arkesel"}
      smsSenderName={settingsRes.data?.sms_sender_name ?? ""}
      smsCredits={settingsRes.data?.sms_credits ?? 0}
      templates={templatesRes.data ?? []}
      parents={parentsRes.data ?? []}
    />
  );
}
