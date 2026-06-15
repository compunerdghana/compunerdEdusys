import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CommSettingsClient } from "./CommSettingsClient";

export default async function CommSettingsPage() {
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

  const { data, error } = await admin.from("communication_settings")
    .select("*").eq("school_id", schoolId).maybeSingle();

  const tableNotReady = error?.code === "42P01" || !!error?.message?.includes("does not exist");

  return (
    <CommSettingsClient
      schoolId={schoolId}
      initialSettings={tableNotReady ? null : data}
      tableNotReady={tableNotReady}
    />
  );
}
