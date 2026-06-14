import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FeeStructureManager } from "./FeeStructureManager";

export default async function FeesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("school_id, role").eq("id", user.id).single();
  if (!["headmaster","owner","accountant","admin"].includes(profile?.role ?? "")) redirect("/settings");
  if (!profile?.school_id) redirect("/settings/school");

  const [{ data: feeTypes }, { data: terms }, { data: classes }, structuresRes, { data: items }] = await Promise.all([
    supabase.from("fee_types").select("*, term:terms(name)").eq("school_id", profile.school_id).order("name"),
    supabase.from("terms").select("id, name, academic_year_id, academic_years(name)").eq("school_id", profile.school_id).order("start_date"),
    supabase.from("classrooms").select("id, name, level").eq("school_id", profile.school_id).order("name"),
    supabase.from("fee_structures").select("*").eq("school_id", profile.school_id).order("created_at", { ascending: false }),
    supabase.from("fee_structure_items").select("*").eq("school_id", profile.school_id),
  ]);

  // Attach items to structures
  const structures = (structuresRes.data ?? []).map(s => ({
    ...s,
    items: (items ?? []).filter(i => i.fee_structure_id === s.id).sort((a, b) => a.sort_order - b.sort_order),
  }));

  return (
    <FeeStructureManager
      schoolId={profile.school_id}
      feeTypes={feeTypes ?? []}
      terms={terms ?? []}
      classes={classes ?? []}
      structures={structures}
    />
  );
}
