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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = getAdmin();
    const { id } = await params;
    const now = new Date();
    const ago7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const ago30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch school with subscription
    const { data: school, error: schoolErr } = await admin
      .from("schools")
      .select(
        `id, phone, address, logo_url, last_active_at,
         school_subscriptions ( status, expires_at )`,
      )
      .eq("id", id)
      .single();

    if (schoolErr) {
      return NextResponse.json({ error: schoolErr.message }, { status: 404 });
    }

    // ── subscription_score ────────────────────────────────────────────────────
    const sub = Array.isArray(school.school_subscriptions)
      ? school.school_subscriptions[0]
      : school.school_subscriptions;

    let subscription_score = 0;
    if (sub?.status === "active") {
      subscription_score = 25;
    } else if (sub?.status === "trial") {
      subscription_score = 15;
    }

    // ── login_score ───────────────────────────────────────────────────────────
    let login_score = 0;
    if (school.last_active_at) {
      const lastActive = new Date(school.last_active_at);
      if (lastActive >= ago7) {
        login_score = 25;
      } else if (lastActive >= ago30) {
        login_score = 15;
      }
    }

    // ── student_score ─────────────────────────────────────────────────────────
    let student_score = 0;
    const { count: studentCount, error: studentErr } = await admin
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("school_id", id);

    if (!isMissing(studentErr)) {
      const count = studentCount ?? 0;
      if (count > 10) {
        student_score = 25;
      } else if (count > 0) {
        student_score = 10;
      }
    }

    // ── data_score ────────────────────────────────────────────────────────────
    const fieldsPresent = [school.phone, school.address, school.logo_url].filter(Boolean).length;
    let data_score = 5;
    if (fieldsPresent === 3) {
      data_score = 25;
    } else if (fieldsPresent >= 2) {
      data_score = 15;
    }

    // ── totals ────────────────────────────────────────────────────────────────
    const score = subscription_score + login_score + student_score + data_score;
    const status: "healthy" | "warning" | "critical" =
      score >= 75 ? "healthy" : score >= 40 ? "warning" : "critical";

    // Upsert into school_health_scores
    const { error: upsertErr } = await admin.from("school_health_scores").upsert(
      {
        school_id: id,
        score,
        status,
        subscription_score,
        login_score,
        student_score,
        data_score,
        calculated_at: now.toISOString(),
      },
      { onConflict: "school_id" },
    );
    if (upsertErr && !isMissing(upsertErr)) {
      console.error("school_health_scores upsert error", upsertErr);
    }

    // Update health_score on schools row
    await admin.from("schools").update({ health_score: score }).eq("id", id);

    return NextResponse.json({
      score,
      status,
      breakdown: {
        subscription_score,
        login_score,
        student_score,
        data_score,
      },
    });
  } catch (err) {
    console.error("GET platform/schools/[id]/health error", err);
    return NextResponse.json({ error: "Failed to calculate health score" }, { status: 500 });
  }
}
