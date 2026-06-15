import { createClient as createAdmin } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { SchoolProfileClient } from "./SchoolProfileClient";

export default async function SchoolProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const [{ data: school }, { data: sub }, { data: features }, { data: tickets }, { data: auditLogs }] = await Promise.all([
    admin.from("schools").select("*").eq("id", id).single(),
    admin.from("school_subscriptions").select("*").eq("school_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("school_features").select("*").eq("school_id", id).maybeSingle(),
    admin.from("support_tickets").select("*").eq("school_id", id).order("created_at", { ascending: false }).limit(10),
    admin.from("audit_logs").select("*").eq("school_id", id).order("created_at", { ascending: false }).limit(20),
  ]);

  if (!school) notFound();

  const [{ count: studentCount }, { count: staffCount }] = await Promise.all([
    admin.from("students").select("id", { count: "exact", head: true }).eq("school_id", id),
    admin.from("staff").select("id", { count: "exact", head: true }).eq("school_id", id),
  ]);

  return (
    <SchoolProfileClient
      school={school}
      subscription={sub}
      features={features}
      tickets={tickets ?? []}
      auditLogs={auditLogs ?? []}
      studentCount={studentCount ?? 0}
      staffCount={staffCount ?? 0}
    />
  );
}
