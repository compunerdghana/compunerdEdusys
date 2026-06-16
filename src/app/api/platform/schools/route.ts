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

export async function GET(request: NextRequest) {
  try {
    const admin = getAdmin();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const q = searchParams.get("q") || "";

    let query = admin
      .from("schools")
      .select(
        `id, name, logo_url, school_id, school_code, school_type, region, district,
         address, phone, website, status, student_count, staff_count,
         onboarding_complete, created_at,
         school_subscriptions (
           id, status, started_at, expires_at, trial_ends_at, billing_cycle, amount,
           subscription_plans ( name, display_name )
         )`,
      )
      .order("created_at", { ascending: false });

    if (status !== "all") {
      query = query.eq("status", status);
    }
    if (q) {
      query = query.ilike("name", `%${q}%`);
    }

    const { data, error } = await query;
    if (isMissing(error)) {
      return NextResponse.json({ schools: [] });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ schools: data ?? [] });
  } catch (err) {
    console.error("GET platform/schools error", err);
    return NextResponse.json({ error: "Failed to load schools" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = getAdmin();
    const body = await request.json();

    const {
      name,
      school_code,
      school_type,
      region,
      district,
      address,
      phone,
      website,
      motto,
      proprietor_name,
      // owner account
      owner_email,
      owner_name,
      owner_phone,
      owner_password,
      // subscription
      plan_id,
      plan_name,
      billing_cycle = "annual",
      trial_days = 30,
    } = body;

    if (!name || !owner_email || !owner_name) {
      return NextResponse.json(
        { error: "name, owner_email and owner_name are required" },
        { status: 400 },
      );
    }

    // Resolve plan_id if not explicitly provided
    let resolvedPlanId = plan_id;
    if (!resolvedPlanId) {
      const pName = plan_name || body.plan || "starter";
      const { data: planData } = await admin
        .from("subscription_plans")
        .select("id")
        .eq("name", pName)
        .single();
      
      if (planData) {
        resolvedPlanId = planData.id;
      } else {
        // Fallback: get first plan
        const { data: firstPlan } = await admin
          .from("subscription_plans")
          .select("id")
          .order("sort_order", { ascending: true })
          .limit(1)
          .single();
        if (firstPlan) {
          resolvedPlanId = firstPlan.id;
        }
      }
    }

    const resolvedSchoolCode = school_code || (name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Math.floor(1000 + Math.random() * 9000));

    // 1. Insert school
    const { data: school, error: schoolErr } = await admin
      .from("schools")
      .insert({
        name,
        school_code: resolvedSchoolCode,
        code: resolvedSchoolCode,
        school_type,
        region,
        district,
        address,
        phone,
        website,
        motto,
        proprietor_name,
        status: plan_id || plan_name ? "active" : "trial",
      })
      .select()
      .single();

    if (schoolErr) {
      return NextResponse.json({ error: schoolErr.message }, { status: 500 });
    }

    // 2. Create owner auth user
    const password =
      owner_password ||
      Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 4).toUpperCase() + "!";

    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
      email: owner_email,
      password,
      email_confirm: true,
      user_metadata: { full_name: owner_name, role: "owner", school_id: school.id },
    });

    if (authErr) {
      // Rollback school
      await admin.from("schools").delete().eq("id", school.id);
      return NextResponse.json({ error: authErr.message }, { status: 500 });
    }

    // 3. Insert profile
    await admin.from("profiles").upsert({
      id: authUser.user.id,
      full_name: owner_name,
      role: "owner",
      school_id: school.id,
      phone: owner_phone ?? null,
      is_active: true,
    });

    // 4. Insert subscription
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trial_days);

    const expiresAt = new Date();
    if (billing_cycle === "annual") {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    const isTrial = !(plan_id || plan_name) && trial_days > 0;

    await admin.from("school_subscriptions").insert({
      school_id: school.id,
      plan_id: resolvedPlanId,
      status: isTrial ? "trial" : "active",
      started_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      trial_ends_at: trialEndsAt.toISOString(),
      billing_cycle,
    });

    // 5. Insert onboarding
    await admin.from("school_onboarding").insert({ school_id: school.id });

    // 6. Audit log
    await admin.from("platform_audit_logs").insert({
      action: "school.created",
      target_type: "school",
      target_id: school.id,
      target_name: name,
      details: { owner_email, plan_id: resolvedPlanId, billing_cycle },
    });

    return NextResponse.json({
      school,
      credentials: {
        email: owner_email,
        password,
        note: "Share these credentials securely with the school admin.",
      },
    });
  } catch (err) {
    console.error("POST platform/schools error", err);
    return NextResponse.json({ error: "Failed to create school" }, { status: 500 });
  }
}
