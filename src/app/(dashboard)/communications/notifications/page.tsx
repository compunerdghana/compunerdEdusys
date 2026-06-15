import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NotificationsClient } from "./NotificationsClient";

export default async function NotificationsPage() {
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

  const { data, error } = await admin.from("notifications")
    .select("id, title, body, type, category, link, is_read, read_at, created_at, recipient_id")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false })
    .limit(100);

  const tableNotReady = error?.code === "42P01" || error?.message?.includes("does not exist");

  return (
    <NotificationsClient
      schoolId={schoolId}
      userId={user.id}
      initialNotifications={tableNotReady ? [] : (data ?? [])}
      tableNotReady={tableNotReady}
      userRole={profile.role}
    />
  );
}
