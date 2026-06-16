/**
 * School targeting utility for the Communication Center.
 * Resolves target audience identifiers into arrays of school contact records.
 */

import { createClient } from "@supabase/supabase-js";

export type TargetAudience =
  | "all"
  | "active"
  | "trial"
  | "premium"
  | "expiring"
  | "expired"
  | "selected";

export interface SchoolTarget {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  owner_email: string | null;
  region: string | null;
  subscription_status: string | null;
  expires_at: string | null;
}

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/**
 * Resolve a target audience string + optional selected school IDs into
 * a list of school contact records.
 */
export async function resolveTargetSchools(
  audience: TargetAudience,
  selectedIds?: string[],
): Promise<SchoolTarget[]> {
  const admin = getAdmin();
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  let query = admin
    .from("schools")
    .select("id, name, phone, email, region, subscription_status, subscription_expires_at, status");

  // Apply audience filter
  if (audience === "selected" && selectedIds?.length) {
    query = query.in("id", selectedIds);
  } else if (audience === "active") {
    query = query.eq("status", "active");
  } else if (audience === "trial") {
    query = query.eq("subscription_status", "trial");
  } else if (audience === "premium") {
    query = query.eq("subscription_status", "active").neq("status", "trial");
  } else if (audience === "expiring") {
    query = query
      .eq("status", "active")
      .lte("subscription_expires_at", in30.toISOString())
      .gte("subscription_expires_at", now.toISOString());
  } else if (audience === "expired") {
    query = query.eq("status", "expired");
  }
  // "all" — no extra filter

  const { data, error } = await query.order("name");
  if (error || !data) return [];

  // Get owner/headmaster contact info for each school
  const schoolIds = data.map((s) => s.id);
  let ownerMap: Record<string, { name: string; phone: string | null; email: string | null }> = {};

  if (schoolIds.length > 0) {
    const { data: owners } = await admin
      .from("profiles")
      .select("school_id, full_name, phone, email, role")
      .in("school_id", schoolIds)
      .in("role", ["school_owner", "owner", "headmaster"])
      .eq("is_active", true);

    if (owners) {
      // Prefer school_owner > owner > headmaster
      const priority: Record<string, number> = { school_owner: 0, owner: 1, headmaster: 2 };
      for (const o of owners) {
        const sid = o.school_id as string;
        const existing = ownerMap[sid];
        const existingPriority = existing ? (priority[existing.name] ?? 99) : 99;
        if ((priority[o.role] ?? 99) < existingPriority) {
          ownerMap[sid] = { name: o.full_name, phone: o.phone, email: o.email };
        }
      }
    }
  }

  return data.map((s) => {
    const owner = ownerMap[s.id];
    return {
      id: s.id,
      name: s.name,
      phone: s.phone ?? null,
      email: s.email ?? null,
      owner_name: owner?.name ?? null,
      owner_phone: owner?.phone ?? null,
      owner_email: owner?.email ?? null,
      region: s.region ?? null,
      subscription_status: s.subscription_status ?? null,
      expires_at: s.subscription_expires_at ?? null,
    };
  });
}

/**
 * Interpolate template variables in a message body.
 * Replaces {school_name}, {expiry_date}, etc.
 */
export function interpolateTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}
