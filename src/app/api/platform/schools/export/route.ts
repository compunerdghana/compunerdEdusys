import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const isMissing = (e: unknown) =>
  (e as { code?: string; message?: string })?.code === "42P01" ||
  (e as { message?: string })?.message?.includes("does not exist");

function escapeCsv(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  try {
    const admin = getAdmin();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";

    let query = admin.from("schools").select(
      `id, name, school_code, school_type, region, status, student_count, staff_count,
       school_subscriptions (
         expires_at,
         subscription_plans ( display_name )
       )`,
    ).order("name", { ascending: true });

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data: schools, error } = await query;

    if (isMissing(error)) {
      // Return empty CSV if table not ready yet
      const emptyBody =
        "School Name,Code,Type,Region,Status,Plan,Students,Staff,Expiry\n";
      return new NextResponse(emptyBody, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="schools_export.csv"`,
        },
      });
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const headers = [
      "School Name",
      "Code",
      "Type",
      "Region",
      "Status",
      "Plan",
      "Students",
      "Staff",
      "Expiry",
    ];

    const rows = (schools ?? []).map((school) => {
      const sub = Array.isArray(school.school_subscriptions)
        ? school.school_subscriptions[0]
        : school.school_subscriptions;

      const plan = sub?.subscription_plans
        ? (Array.isArray(sub.subscription_plans)
            ? sub.subscription_plans[0]?.display_name
            : (sub.subscription_plans as { display_name?: string })?.display_name)
        : "";

      const expiry = sub?.expires_at
        ? new Date(sub.expires_at).toISOString().split("T")[0]
        : "";

      return [
        school.name,
        school.school_code ?? "",
        school.school_type ?? "",
        school.region ?? "",
        school.status ?? "",
        plan ?? "",
        school.student_count ?? 0,
        school.staff_count ?? 0,
        expiry,
      ]
        .map(escapeCsv)
        .join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="schools_export.csv"`,
      },
    });
  } catch (err) {
    console.error("GET platform/schools/export error", err);
    return NextResponse.json({ error: "Failed to export schools" }, { status: 500 });
  }
}
