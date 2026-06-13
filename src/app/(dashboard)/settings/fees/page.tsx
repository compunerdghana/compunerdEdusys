import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FeeStructureManager } from "./FeeStructureManager";

export default async function FeesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("school_id, role").eq("id", user.id).single();
  if (profile?.role !== "headmaster" && profile?.role !== "owner" && profile?.role !== "accountant") redirect("/settings");
  if (!profile?.school_id) redirect("/settings/school");

  const [{ data: feeTypes }, { data: terms }] = await Promise.all([
    supabase.from("fee_types").select("*, term:terms(name)").eq("school_id", profile.school_id).order("name"),
    supabase.from("terms").select("id, name, academic_year_id, academic_years(name)").eq("school_id", profile.school_id).order("start_date"),
  ]);

  return <FeeStructureManager schoolId={profile.school_id} feeTypes={feeTypes ?? []} terms={terms ?? []} />;
}
