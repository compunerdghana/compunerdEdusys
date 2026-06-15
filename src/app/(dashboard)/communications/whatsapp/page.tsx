import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WhatsAppClient } from "./WhatsAppClient";

export default async function WhatsAppPage() {
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

  const [settingsRes, templatesRes, classesRes, studentsRes] = await Promise.all([
    admin.from("communication_settings")
      .select("whatsapp_enabled, whatsapp_phone_id, whatsapp_token, whatsapp_waba_id, whatsapp_credits")
      .eq("school_id", schoolId).maybeSingle(),
    admin.from("communication_templates")
      .select("id, name, body, variables")
      .or(`school_id.eq.${schoolId},is_system.eq.true`)
      .eq("channel", "whatsapp").eq("is_active", true).order("name"),
    admin.from("classes").select("id, name, level").eq("school_id", schoolId).order("level"),
    admin.from("profiles")
      .select("id, full_name, phone")
      .eq("school_id", schoolId).eq("role", "parent").eq("is_active", true),
  ]);

  const tableNotReady = !!(settingsRes.error?.code === "42P01" || settingsRes.error?.message?.includes("does not exist"));

  return (
    <WhatsAppClient
      schoolId={schoolId}
      userId={user.id}
      tableNotReady={tableNotReady}
      whatsappEnabled={settingsRes.data?.whatsapp_enabled ?? false}
      whatsappCredits={settingsRes.data?.whatsapp_credits ?? 0}
      templates={templatesRes.data ?? []}
      classes={classesRes.data ?? []}
      parents={studentsRes.data ?? []}
    />
  );
}
