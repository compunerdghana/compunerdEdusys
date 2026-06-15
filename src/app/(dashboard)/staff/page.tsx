import { createClient } from "@/lib/supabase/server";
import { StaffClient } from "./StaffClient";

export default async function StaffPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("school_id, role").eq("id", user!.id).single();
  const schoolId = profile?.school_id;

  const { data: staff } = await supabase
    .from("profiles")
    .select("id, full_name, username, role, phone, is_active, created_at")
    .eq("school_id", schoolId)
    .neq("id", user!.id)
    .order("full_name");

  const isHeadmaster = profile?.role === "headmaster" || profile?.role === "owner" || profile?.role === "admin";

  return (
    <StaffClient
      initialStaff={staff ?? []}
      schoolId={schoolId}
      isHeadmaster={isHeadmaster}
    />
  );
}
